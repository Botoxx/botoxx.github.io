// Lambda entry point: wires the handler to SES, DynamoDB and the environment. The AWS SDK v3 ships with the runtime.
import { createHash } from 'node:crypto';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createHandler } from './handler.mjs';
import { dynamoStore } from './store.mjs';

const ses = new SESv2Client({});
const env = process.env;

export const handler = createHandler({
  env,
  now: () => Date.now(),
  sendEmail: input => ses.send(new SendEmailCommand(input)),
  store: dynamoStore({ client: new DynamoDBClient({}), table: env.TABLE_NAME }),
  hashIp: ip => createHash('sha256').update(`${env.IP_SALT}:${ip}`).digest('hex').slice(0, 32),
});
