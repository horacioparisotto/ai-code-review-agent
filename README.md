# ai-code-review-agent

[![CI](https://github.com/horacioparisotto/ai-code-review-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/horacioparisotto/ai-code-review-agent/actions/workflows/ci.yml)

A self-gating AI code review agent I built for a **confidential client**. I mined about **750 substantive review comments across 1,300+ pull requests** into an explicit knowledge base of 29 review conventions, then built a Claude Code skill that applies it to real, open pull requests from the team, safely and with a human in the loop. On live reviews the agent does the breadth, and I trace what it surfaces down to the root cause.

> **Rewritten from scratch to protect client code and the client's identity.** The real conventions, quotes and repositories stay with the client. In the real agent the LLM makes most judgment calls, guided by the skill and the knowledge base. This repo shows that workflow, plus the deterministic parts around it, as tested TypeScript.

Full case study: [horacioparisotto.com](https://www.horacioparisotto.com/)

```bash
npm ci && npm test
```

## Patterns

### 1. Conventions grounded in evidence · [`conventions/conventions.md`](conventions/conventions.md)

The team's review standards were tacit: they lived in past comments. I filtered the comment history to drop empty approvals and noise, then synthesized it into categorized conventions, from style (design tokens, camelCase JSON contracts) to structure (repository/service layering in Go, RBAC and IDOR checks) to process (when audit logging is required). Every entry is grounded in direct quotes and links back to the comments it came from. The entries here are illustrative.

### 2. A review skill with its own brakes · [`.claude/skills/review-pr/SKILL.md`](.claude/skills/review-pr/SKILL.md)

The agent is a Claude Code skill: a workflow it follows on every invocation. It checks whether the PR can still be influenced, reads the real diff, re-reads the conventions from disk every run (the base grows with every audit), gives every convention a verdict, looks for sibling bugs, and **never posts without a separate, explicit confirmation**. The constraints carry as much weight as the checks.

### 3. Is this PR still open to influence? · [`src/gate.ts`](src/gate.ts)

An early run posted valid findings on a PR another reviewer had already approved, where they could no longer change anything. The gate keeps that from happening again: on an approved or merged PR, only security, data-integrity and financial findings get through. `gh` is called with an argument list, never a shell string.

### 4. A verdict for every convention · [`src/verdict.ts`](src/verdict.ts) · [`src/diff.ts`](src/diff.ts)

Each convention gets exactly one verdict: not applicable, compliant, or a finding anchored to a file, a line and the convention behind it. Silence is not a verdict, and a finding without a line isn't a finding, so every comment is traceable rather than a generic lint warning.

### 5. When a fix lands, look for its siblings · [`src/siblings.ts`](src/siblings.ts)

When a PR fixes a pattern, the same mistake often lives in code the PR never touched, including sister codebases. A review limited to the diff can't see it by definition: with four hand-written copies of the same logic, fixing three silently leaves the fourth broken.

### 6. Checking against main as it is now · [`src/migrations.ts`](src/migrations.ts)

Two branches each add "the next" migration number, both pass review, and the second one to merge collides. The check fetches the default branch and compares against it as it is today, not as it was when the PR was opened. Findings come out in the same shape as every other check.

Everything ends in [`src/report.ts`](src/report.ts): a report for a person, which says plainly that nothing has been posted.

---

Horacio Parisotto · Senior Full-Stack & AI Engineer · [Portfolio](https://www.horacioparisotto.com/) · [LinkedIn](https://www.linkedin.com/in/horacioparisotto/)
