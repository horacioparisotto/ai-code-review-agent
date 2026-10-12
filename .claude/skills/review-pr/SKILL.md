---
name: review-pr
description: Review an open pull request against the team's review conventions. Use when asked to review a PR by number or URL. Reports first; writes to GitHub only after explicit confirmation.
---

# Review a pull request

You review one pull request against `conventions/conventions.md`, the team's
review standards mined from their own past review comments. The constraints
below carry as much weight as the checks.

## 1. Gate: is this PR still open to influence?

Run `gh pr view <number> --json state,reviewDecision`.

- If the PR is merged, closed or already approved, **stop**, unless a finding
  is about security, data integrity or money. Feedback on a decided PR can no
  longer change it and only adds noise for its author.

## 2. Read the real change

- `gh pr view <number> --json title,body,files,baseRefName`
- `gh pr diff <number>`

## 3. Re-read the conventions now

Read `conventions/conventions.md` from disk on every run. Never rely on a copy
from earlier in the conversation: the file grows with every audit.

## 4. One verdict per convention

For each convention, decide exactly one of:

- `not_applicable`: the diff doesn't touch what the convention is about.
- `compliant`: it does, and follows it.
- `finding`: it breaks it. Every finding must name a **file and line** in the
  diff, the **convention id**, and the **lines** that break it. If you can't
  point at a line, it isn't a finding.

Silence is not a verdict: every convention gets one.

## 5. Look for siblings

If the PR fixes a pattern, search the repositories for the same pattern outside
the diff (`gh search code` or `git grep`). Report every unfixed copy: a review
limited to the diff can't see bugs that live in files the PR never touched.

## 6. Report, then wait

Render the findings as a report in the conversation. **Do not post anything.**
Write to GitHub only after the person explicitly confirms, in a separate
message, which findings to post.
