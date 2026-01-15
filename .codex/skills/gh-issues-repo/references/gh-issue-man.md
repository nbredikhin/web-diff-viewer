# GH Issue CLI (repo-scoped)

Use `gh issue <subcommand> --help` for the full manual. Summary below reflects current local help output.

## Top-level

`gh issue <command>`

General commands: `create`, `list`, `status`
Targeted commands: `view`, `edit`, `comment`, `close`, `reopen`, `delete`, `lock`, `unlock`, `pin`, `unpin`, `develop`, `transfer`

Repository override: `-R, --repo [HOST/]OWNER/REPO` (avoid unless user explicitly requests cross-repo work)

## list

`gh issue list [flags]`

Common flags:
- `-a, --assignee`
- `-A, --author`
- `-l, --label` (repeatable)
- `-m, --milestone`
- `-s, --state {open|closed|all}`
- `-S, --search` (GitHub search syntax)
- `-L, --limit`
- `-w, --web`
- `--json` / `-q` / `-t` for structured output

## view

`gh issue view <number|url> [flags]`

Common flags:
- `-c, --comments`
- `-w, --web`
- `--json` / `-q` / `-t`

## create

`gh issue create [flags]`

Common flags:
- `-t, --title`
- `-b, --body`
- `-F, --body-file`
- `-e, --editor`
- `-a, --assignee`
- `-l, --label`
- `-m, --milestone`
- `-p, --project`
- `-T, --template`
- `-w, --web`

## edit

`gh issue edit <numbers|urls> [flags]`

Common flags:
- `-t, --title`
- `-b, --body`
- `-F, --body-file`
- `--add-label` / `--remove-label`
- `--add-assignee` / `--remove-assignee`
- `-m, --milestone` / `--remove-milestone`
- `--add-project` / `--remove-project`

## comment

`gh issue comment <number|url> [flags]`

Common flags:
- `-b, --body`
- `-F, --body-file`
- `-e, --editor`
- `--edit-last` / `--create-if-none`
- `-w, --web`

## close / reopen

`gh issue close <number|url> [flags]`
- `-c, --comment`
- `-r, --reason {completed|not planned}`

`gh issue reopen <number|url> [flags]`
- `-c, --comment`
