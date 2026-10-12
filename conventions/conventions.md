# Review conventions

> **Illustrative entries.** The real knowledge base has 29 conventions mined
> from about 750 substantive review comments across 1,300+ pull requests, each
> grounded in direct quotes and links to the comments it came from. The quotes
> and links stay with the client; these entries show the format.

Each entry has an id (used in findings), a category, the rule, the evidence it
came from, and how to check it.

---

## ownership-check · Ownership checks on internal endpoints

**Category:** security · **Layer:** Go handlers

**Rule:** a handler that takes a resource id must check that the resource
belongs to the caller's organization, not only that the caller is signed in
(IDOR).

**Evidence:**
> "Any admin could read another org's record by changing the id." (PR link)
>
> "Same issue as last week, needs the ownership filter." (PR link)

**How to check:** the id comes from the request → an ownership filter runs
before the query.

---

## design-tokens · Colors come from design tokens

**Category:** style · **Layer:** frontend

**Rule:** no hardcoded hex colors in components or stylesheets; use the design
system's tokens, so a theme change is one edit.

**Evidence:**
> "Please use the token, this hex will drift from the theme." (PR link)

**How to check:** added lines in `.tsx`/`.css` files contain no `#rgb` or
`#rrggbb` literals.

---

## migration-numbering · Migration numbers checked against main as it is now

**Category:** data integrity · **Layer:** database

**Rule:** a new migration's number must not already exist on the default
branch **as it is today**, not as it was when the PR was opened. Two branches
each adding "the next" number both pass review, and the second one to merge
collides.

**Evidence:**
> "This clashes with the migration that merged yesterday." (PR link)

**How to check:** compare added files under `migrations/` against
`git ls-tree origin/main migrations/` after a fresh fetch.

---

## audit-logging · Audit log on privileged actions

**Category:** process · **Layer:** backend

**Rule:** any action an admin takes on another user's data writes an audit log
entry with who, what and when.

**Evidence:**
> "We need to be able to answer who changed this." (PR link)

**How to check:** new admin endpoints call the audit logger before returning.
