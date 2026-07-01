# Ticket Handoff

Phase plan: docs/product/delivery/phase-1/implementation-plan.md
Ticket: P1.06 Lesson 1 Content — What is a Program?
Branch: agents/p1-06-lesson-1-content-what-is-a-program
Base branch: agents/p1-05-progress-tracking
Worktree: C:\Repos\anchor_p1_06

## Required Reads

- `docs/template/overview/start-here.md`
- `docs/product/delivery/phase-1/implementation-plan.md`
- `docs\product\delivery\phase-1\ticket-06-lesson-1-content.md`
- `docs/template/delivery/delivery-orchestrator.md`

## Context Reset Contract

- Re-read the required docs before implementing.
- Start from the current repository state and this handoff artifact, not from prior chat assumptions.
- Carry forward only explicit review notes, review artifacts, and committed branch state.
- Do not read ahead during the AI review wait window. The wait is free (LLM idle during subprocess sleep). Be sabaai sabaai.

## Carry Forward From Previous Ticket

- Previous ticket: `P1.05 Progress Tracking`
- Previous branch: `agents/p1-05-progress-tracking`
- Previous PR: https://github.com/czclaxton/anchor/pull/5
- Review outcome: `skipped`
- Review triage artifact: `C:\Repos\anchor_p1_05\docs\product\delivery\phase-1\reviews\P1.05-pr-review.triage.json`

## Stop Conditions

- Stop if the current ticket cannot be completed safely or prerequisite state is missing.
- Stop if review triage is ambiguous enough to require user input.
- Stop if the work requires a broader redesign beyond the ticket scope.

## RESUME COMMAND

`bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md subagent-review`
