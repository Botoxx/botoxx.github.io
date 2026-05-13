+++
title = 'Vault was the easy part'
date = 2026-05-13T20:52:30+02:00
draft = false
summary = "An Obsidian-style knowledge vault doesn't survive daily work on its own — it needs skills wrapped around it to stay alive."
tags = ["claude-code", "reflection"]
+++

Just handed over another project — AWS, Terraform, an agentic correction loop against Redshift, the kind of infra-heavy build where the moving parts outnumber the engineers. Five weeks, dense work, a knowledge graph spread across decisions, components, syncs, deferred follow-ups.

The plan was: use this one as the guinea pig for an Obsidian-style wikilinked knowledge vault. Markdown files, frontmatter, `[[wikilinks]]`, templates per type. Let the project knowledge graph itself be the artifact that survives handover.

It worked. Okay-ish.

The vault captured the WHY of every design choice, every deferred bug, every sync with the customer. First time someone asked "why did we pick managed Postgres over the alternatives," the answer was three wikilinks away. That felt good.

Three weeks in, the project root note's `last_event:` field — designed as a one-line state pointer — was a 22,000-character run-on paragraph. A chronological log dressed as frontmatter. The open-questions tracker had grown to 651 lines of inline `§N` items, half of them resolved-but-not-removed. Sync notes that should have been five-bullet meeting captures had become PR retrospectives mirroring the GitHub description verbatim.

The vault was write-only. New material got appended; nothing ever got compacted. Updates required ceremony but reads required search-by-grep.

The fix wasn't more discipline. Discipline doesn't scale across a long project — by week five you're on autopilot. The fix was building skills *around* the vault: a `vault-update` skill with size caps baked in, an anti-rot ruleset that refuses `last_event:` chains longer than one sentence, a `prep-for-compaction` orchestrator that bundles git-sync, code-graph reindex, vault batch update, and memory triage into one slash command before each session reset.

The lesson, on the other side of handover: **a vault is a habit, not a directory.** Wikilinks and templates get you 60%. The remaining 40% is the invocation layer — the skills and rituals that make the vault the path of least resistance during real work, instead of an after-hours bookkeeping chore.

Without that layer the vault is a graveyard of good intentions. With it, the vault is genuinely the place I check first when someone asks "wait, why did we do X."

Next project, I'll skip straight to building the skill layer alongside the vault on day one. The vault was the easy part.

— Botond
