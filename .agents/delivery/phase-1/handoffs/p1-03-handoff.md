# Ticket Handoff

Phase plan: docs/product/delivery/phase-1/implementation-plan.md
Ticket: P1.03 Site Shell
Branch: agents/p1-03-site-shell
Base branch: agents/p1-02-content-model-routing
Worktree: C:\Repos\anchor_p1_03

## Required Reads

- `docs/template/overview/start-here.md`
- `docs/product/delivery/phase-1/implementation-plan.md`
- `docs\product\delivery\phase-1\ticket-03-site-shell.md`
- `docs/template/delivery/delivery-orchestrator.md`

## Context Reset Contract

- Re-read the required docs before implementing.
- Start from the current repository state and this handoff artifact, not from prior chat assumptions.
- Carry forward only explicit review notes, review artifacts, and committed branch state.
- Do not read ahead during the AI review wait window. The wait is free (LLM idle during subprocess sleep). Be sabaai sabaai.

## Carry Forward From Previous Ticket

- Previous ticket: `P1.02 Content Model + Routing`
- Previous branch: `agents/p1-02-content-model-routing`
- Previous PR: https://github.com/czclaxton/anchor/pull/2
- Review outcome: `skipped`
- Review triage artifact: `C:\Repos\anchor_p1_02\docs\product\delivery\phase-1\reviews\P1.02-pr-review.triage.json`

## Stop Conditions

- Stop if the current ticket cannot be completed safely or prerequisite state is missing.
- Stop if review triage is ambiguous enough to require user input.
- Stop if the work requires a broader redesign beyond the ticket scope.

## RESUME COMMAND

`bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md subagent-review`
