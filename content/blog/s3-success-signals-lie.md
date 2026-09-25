+++
title = 'S3 says it worked. Check anyway.'
date = 2026-09-25T12:10:21+02:00
draft = false
summary = "Five times S3 or its tooling gave me a signal that looked like proof and wasn't, and the second check that caught each one."
tags = ["aws"]
+++

I just finished an S3 cost-optimisation job for a client whose data
can't be regenerated. Five times, S3 or its tooling gave me a signal that
looked like proof and wasn't.

**`head-bucket` says the bucket is still there.** S3 queues a bucket
delete and lets it propagate. After `delete-bucket` returned,
`head-bucket` kept answering 200, and my verify step reported a failed
delete on a bucket that was gone. `list-buckets` showed it gone, but AWS
says `list-buckets` can lag too. No single read settles it. Poll until
they agree.

**Quiet mode is quiet about success too.** `delete-objects` with
`Quiet: true` returns only errors. No errors means empty stdout. My jq
guard tried to count errors, found nothing to parse, and aborted the
batch. The deletion had already run. The guard was right to be paranoid
and wrong about what it was reading.

**`--query` runs per page.** The CLI auto-paginates, and JMESPath runs
against each 1000-item page, not the whole result. `length(Versions)` on
a big bucket prints one number per page, one per line. Read the first
line and you've counted 1000. Use `--output json` and count in jq.

**The detach that detached nothing.** I revoked a policy from a user.
My revoke step reported done. It had no-oped: the policy was attached to
their group, not to them. My check tested only the grants that should
survive, so it passed.

**A Deny that covers everyone you listed.** I built a bucket-policy Deny
from `iam list-users`. It denied exactly those users, and nobody else:
not roles, not tomorrow's new user. The simulator agreed with me, because
I only asked it about principals I'd listed. The fix is to invert it:
`Principal: "*"` with an `ArnNotLike` on `aws:PrincipalArn` for the few
allowed through, starting with your own admin role, or you lock yourself
out. Then prove it with a throwaway key doing a real `PUT`.

Every one of these is the same mistake: I took one signal as proof. The
fix is a second check that can't share the first one's bug. `head-bucket`
shows that a different call isn't enough by itself. It has to see the
state some other way.

```text
delete-bucket      → list-buckets, polled until head-bucket agrees
delete-objects     → list-object-versions
--query length()   → --output json | jq length
detach-user-policy → list-attached-user-policies AND list-attached-group-policies
put-bucket-policy  → a real request from a principal you didn't enumerate
```

It's slower. On data nobody can regenerate, that's the job.

— Botond
