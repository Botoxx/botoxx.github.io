---
title: "AWS FinOps Audit"
date: 2026-06-29
draft: false
---

**Find what's quietly draining your AWS bill — and get a plain-English plan to stop it.**

Built for SaaS teams with €20k–200k/year AWS spend and no dedicated FinOps function. Most accounts
leak 15–30% to idle compute, orphaned storage, and oversized instances nobody owns. This audit finds
it and tells you exactly what to do about it.

## What gets checked

| Area | What I look for |
|------|-----------------|
| **Compute** | Idle EC2 (<5% CPU over 7 days), oversized instance types, unused Elastic IPs |
| **Storage** | Unattached EBS volumes, S3 buckets without lifecycle rules, stale snapshots |
| **Networking** | Underutilised NAT Gateways, idle load balancers |
| **Database** | RDS instances under 10% CPU, unencrypted snapshots |
| **Spend** | Anomalies against your prior 30-day baseline |

## What you get back

1. **JSON findings** — machine-readable, drops straight into CI.
2. **Markdown report** — estimated monthly saving per finding, ranked by impact.
3. **Remediation narrative** — the top five actions in plain English, with the exact commands.

> ## Top findings — estimated savings: €1,840/month
>
> **1. Three unattached EBS volumes (gp2, 500GB total) — €47/month.** Not attached to any instance
> and untouched for 45+ days. Safe to snapshot and delete unless tied to a manual backup process.
>
> **2. NAT Gateway eu-west-1a — €127/month, 0.2GB/day throughput.** Carrying almost no traffic;
> a candidate for consolidation.

## Two ways to start

**Run it yourself.** The toolkit is open source, uses a read-only IAM policy, and no data ever leaves
your account: [github.com/Botoxx/aws-finops-toolkit](https://github.com/Botoxx/aws-finops-toolkit).

**Have me run it.** A managed audit — I run the analysis, validate every finding against your
context, and deliver the report with a prioritised remediation plan. Read-only access, fixed scope,
EU-based and GDPR-aware: your billing data stays in your account.

{{< calcom event="finops-audit" subject="FinOps audit enquiry" >}}

📍 CET timezone · 🇪🇺 EU invoicing · data stays in-region
