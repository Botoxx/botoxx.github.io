// DynamoDB store for the relay: one table, items expire through TTL on `expires`.
//   ip#<hash>#<hour>  hourly message counter per network (raw IPs are never stored)
//   day#<yyyy-mm-dd>  site-wide count of messages accepted that day (UTC)
//   msg#<uuid>        idempotency claim: 'pending' while sending, 'sent' after
import { UpdateItemCommand, PutItemCommand, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const STALE_MS = 60000;

export const dynamoStore = ({ client, table }) => {
  const send = cmd => client.send(cmd);
  const conditionFailed = err => err?.name === 'ConditionalCheckFailedException';
  return {
    async hit(ip, now, limit) {
      try {
        await send(new UpdateItemCommand({
          TableName: table, Key: { pk: { S: `ip#${ip}#${Math.floor(now / 3.6e6)}` } },
          UpdateExpression: 'ADD hits :one SET expires = :exp',
          ConditionExpression: 'attribute_not_exists(hits) OR hits < :limit',
          ExpressionAttributeValues: { ':one': { N: '1' }, ':limit': { N: String(limit) }, ':exp': { N: String(Math.floor(now / 1000) + 7200) } },
        }));
        return true;
      } catch (err) { if (conditionFailed(err)) return false; throw err; }
    },
    async daily(now, cap) {
      try {
        await send(new UpdateItemCommand({
          TableName: table, Key: { pk: { S: `day#${new Date(now).toISOString().slice(0, 10)}` } },
          UpdateExpression: 'ADD hits :one SET expires = :exp',
          ConditionExpression: 'attribute_not_exists(hits) OR hits < :cap',
          ExpressionAttributeValues: { ':one': { N: '1' }, ':cap': { N: String(cap) }, ':exp': { N: String(Math.floor(now / 1000) + 3 * 86400) } },
        }));
        return true;
      } catch (err) { if (conditionFailed(err)) return false; throw err; }
    },
    async claim(key, now) {
      const pk = { S: `msg#${key}` };
      try {
        await send(new PutItemCommand({
          TableName: table,
          Item: { pk, state: { S: 'pending' }, claimedAt: { N: String(now) }, expires: { N: String(Math.floor(now / 1000) + 86400) } },
          ConditionExpression: 'attribute_not_exists(pk) OR (#state = :pending AND claimedAt < :stale)',
          ExpressionAttributeNames: { '#state': 'state' },
          ExpressionAttributeValues: { ':pending': { S: 'pending' }, ':stale': { N: String(now - STALE_MS) } },
        }));
        return 'new';
      } catch (err) {
        if (!conditionFailed(err)) throw err;
        const { Item } = await send(new GetItemCommand({ TableName: table, Key: { pk }, ConsistentRead: true }));
        return Item?.state?.S === 'sent' ? 'sent' : 'pending';
      }
    },
    markSent: key => send(new UpdateItemCommand({
      TableName: table, Key: { pk: { S: `msg#${key}` } },
      UpdateExpression: 'SET #state = :sent', ExpressionAttributeNames: { '#state': 'state' }, ExpressionAttributeValues: { ':sent': { S: 'sent' } },
    })),
    release: key => send(new DeleteItemCommand({ TableName: table, Key: { pk: { S: `msg#${key}` } } })),
  };
};
