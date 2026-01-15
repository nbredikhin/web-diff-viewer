---
name: gh-issues-repo
description: Manage GitHub issues in the current repository using the gh CLI. Use for issue triage, listing, viewing, creating, editing, commenting, closing, and reopening issues scoped to this repo only.
---

# GH Issues (Repo-Scoped)

## Scope guardrails

- Work only within the current repository.
- Do not use `-R/--repo` to target other repositories unless the user explicitly asks.
- Avoid destructive actions (delete, transfer, lock) unless explicitly requested.

## Quick workflow

1) Confirm repo context if ambiguous:
   - `gh repo view --json nameWithOwner -q .nameWithOwner`
   - `git remote get-url origin`
2) Choose the smallest `gh issue` subcommand that matches the task.
3) Run the command and report the result (issue number, title, URL, and state).
4) If the command needs more detail, run `gh issue <subcommand> --help`.

## Common tasks

- List issues: `gh issue list` with filters (assignee, label, milestone, state).
- View details: `gh issue view <number>`.
- Create: `gh issue create --title ... --body ...` (or `--editor`).
- Edit: `gh issue edit <number>` (labels, assignees, title/body).
- Comment: `gh issue comment <number> --body ...`.
- Close/reopen: `gh issue close <number>` / `gh issue reopen <number>`.

## Body text inputs (avoid literal \n)

**For issue creation and edits, always use `--body-file -` with a heredoc for multi-line text.**
This avoids literal `\n` sequences showing up in GitHub.

```sh
gh issue create --title "..." --body-file - <<'EOF'
## Summary
- ...

## Testing
- Not run
EOF
```

If you must inline (single-line or short comments), use ANSI-C quoting so `\n` is interpreted:

```sh
gh issue comment 123 --body $'Line 1\nLine 2\n'
```

## References

- Use `references/gh-issue-man.md` for subcommand flags and examples.
