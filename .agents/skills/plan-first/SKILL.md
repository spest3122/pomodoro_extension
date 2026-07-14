---
name: plan-first
description: >
  Always create an implementation plan before writing code, fixing bugs,
  refactoring, or making any source-code changes. Triggers on all coding,
  debugging, and refactoring tasks.
---

# Plan-First Workflow

**This skill is MANDATORY for every task that involves writing, modifying, or
deleting source code — including bug fixes, new features, refactors, and
dependency changes.**

## Rules

1. **No code changes before a plan is approved.**
   - Before touching any source file, create or update the
     `implementation_plan.md` artifact with:
     - A summary of the problem or goal.
     - Research findings (relevant files, dependencies, architecture).
     - Proposed changes grouped by component / file.
     - Open questions or design decisions that need user input.
     - A verification plan (tests to run, manual checks).
   - Set `RequestFeedback = true` so the user can review and approve.

2. **Wait for explicit user approval.**
   - Do **not** proceed to code changes until the user confirms the plan.

3. **Track progress.**
   - After approval, create `task.md` with a checklist of items from the plan.
   - Update `task.md` as work progresses (`[ ]` → `[/]` → `[x]`).

4. **Verify after implementation.**
   - Run the verification steps from the plan (tests, builds, lint).
   - Summarize results in `walkthrough.md`.

## Exceptions

- **Trivial one-liners** (typo fixes, comment edits, formatting) may skip the
  full plan, but still briefly state intent before editing.
- **Investigatory / read-only tasks** (explaining code, searching, answering
  questions) do not require a plan.
