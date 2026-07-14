+++
title = 'The build that remembered its mistakes'
date = 2026-07-14T14:33:52+02:00
draft = false
summary = "Seven weeks of AI-driven AWS work got better not from a bigger model but from three kinds of memory — and the scars mattered most."
tags = ["ai", "claude-code", "reflection"]
+++

Last time I wrote about a knowledge vault, the lesson was that a vault is a habit, not a directory — build the skill layer around it or it rots. I said the next project I'd build that layer on day one.

This is that next project. Seven weeks, one AWS proof-of-concept, 122 pull requests, driven end to end through an AI agent. The vault held up; the skills did their job. But the vault isn't what made the agent better at the work as the weeks wore on. Three separate memories did, and only one of them was the vault.

I kept them apart on purpose, because they have different jobs:

- **WHY** lived in the vault — architecture, decisions, why managed Postgres over the alternatives. Provenance-anchored, the layer that survives handover.
- **HOW** lived in a live code graph — functions, routes, call chains, queried *before* reading files, so "who calls this" wasn't grep-and-pray.
- **Scars** lived in a pile of one-fact files — the agent's own mistakes, one per file, reloaded at the start of every single session.

The third one is the interesting one.

Sixty-one of them by the end. Not domain knowledge — operational scar tissue. Editing a security group's description quietly destroys and recreates it, and on a VPC-attached Lambda that's a 45-minute ENI-detach deadlock. Two back-to-back merges cancel each other's Terraform apply because they share a CI mutex, so the infra silently doesn't ship. The local `ruff` isn't the `ruff` the commit hook runs, so you pass clean and fail the gate anyway.

Each of those cost real time — once. Then it became a single written-down fact, reloaded every session, and the agent stopped walking into it. By week six it wasn't rediscovering the same walls; it was routing around them before I'd remembered they were there.

That's the thing nobody tells you about long agentic builds: the model does not get smarter across a project. Capability is flat — the same model on day one and day forty. What compounds is memory. A frontier model with no memory re-derives the same wrong answer every session, cheerfully, forever. The whole delta between a mediocre seven-week build and a good one was that each expensive mistake got paid for exactly once.

That scar pile rots too, by the way — same as the vault did, appended-to and never pruned. But that's a habit problem, and it's a different post.

Bigger models are what everyone's buying. On this project the thing that actually mattered was smaller and dumber: a folder of text files, one scar each, read every morning.

— Botond
