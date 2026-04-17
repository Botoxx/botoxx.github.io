+++
title = "Hello, world"
date = 2026-04-17
draft = false
summary = "Why I'm starting to write down what I learn — and what to expect on this blog."
tags = ["meta"]
+++

After spending the past few years moving production workloads to AWS,
shipping LLM integrations, and learning the hard way which Kubernetes
patterns hold up under real load, I figured it was time to start
writing some of it down.

## What this blog is for

Three kinds of posts, roughly:

1. **Field notes** — small, specific things I learned shipping a system.
   Usually 200–600 words. The opposite of a tutorial.
2. **Patterns** — when I notice the same shape solving the same problem
   across two or three projects, I'll write it up.
3. **Rants** — occasionally something annoys me enough that I have to
   put it in print. These will be tagged `opinion`.

## What this blog is not

A tutorial site. There are already excellent tutorials for AWS, Kubernetes,
and LangChain. I'd rather write the thing nobody else is writing.

## Subscribe

There's an [RSS feed](/blog/index.xml). Use it. It's the last good
syndication format we have.

```bash
$ curl -s https://cloudgeist.cloud/blog/index.xml | head
```

— Botond
