+++
title = "Deep water"
date = 2026-04-17T14:41:10+02:00
draft = false
summary = "Three AI systems shipped via cognitive collab with Claude Code, and the meta-lesson I only saw by stopping to look back."
tags = ["ai", "claude-code", "reflection"]
+++

My probation at Apex Lab ended last week. It's the kind of place where
you're surrounded by sharp, curious people who casually solve hard
problems on the way to lunch — I'm glad to be in the ranks. Something
about wrapping that period made me sit down and actually look back at
the work.

A few months ago I was specced into building a Bedrock Agent with a
custom MCP server doing KNN retrieval against OpenSearch. I had used
Bedrock once. I had never written an MCP server. The reference
architecture I was half-following had been published the week before.
I shipped it.

Same quarter: a real-time voice agent for a fleet operator. Driver
speaks, model extracts a constraint, system pokes a scheduling API.
Nova Sonic, bidirectional streaming, low-latency audio. Hadn't touched
any of that stack. Shipped it.

Right now: a FastAPI service that helps analytics engineers write dbt
models against a warehouse with fourteen hundred existing models.
Shipping.

That's the deep water, and none of it would have happened solo three
years ago. What changed isn't me — it's that I got good at *cognitive
collab*: pair-thinking with Claude Code, which knows the territory I
don't. Claude is the bridge to a domain I haven't internalised yet; my
job is taste, scope, and the question "is this actually right." We
meet in the middle and the work happens there.

Three weeks into a project I'm catching Claude's mistakes. The real
output of working with a strong model isn't the artifact — it's the
model of the domain that ends up in *your* head.

Here's what I wouldn't have noticed without sitting down to write it:
that loop has a shape, and the shape is repeatable. Bedrock, voice,
dbt — different stacks, same collab. I'd been doing it three times
and it took stopping to look back to see it.

Reflection isn't a soft skill. It's the loop that makes the rest of
the loops compound. Without it the lessons stay implicit, and implicit
lessons don't transfer to the next project. They get re-learned at
full price.

So I'm putting it on a calendar. An hour at the end of every project to
write down what actually changed in my head. The exercise costs nothing;
the lessons compound.

— Botond
