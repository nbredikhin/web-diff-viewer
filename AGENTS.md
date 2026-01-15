# Repository Guidelines

## Scope & Intent
This directory is `~/.codex`, the local configuration and state for the Codex CLI, not a programming project. Changes here directly affect how Codex runs, so make edits conservatively and only when necessary.

Before modifying any files, consult the Codex docs to avoid breaking the CLI or changing behavior unintentionally. Primary references:
- `https://developers.openai.com/codex/cli`
- `https://developers.openai.com/codex/local-config`

## Project Structure & Module Organization
- `config.toml` is the main Codex configuration (features, approval/sandbox defaults, MCP servers, trusted projects).
- `skills/` contains reusable skills; system skills live under `skills/.system/`.
- `sessions/` and `history.jsonl` store session transcripts and activity history.
- `log/` contains runtime logs; `shell_snapshots/` stores captured shell scripts.
- `auth.json` and `version.json` hold local auth/state metadata; `tmp/` is scratch space.

## Build, Test, and Development Commands
There is no build or test pipeline in this repository. Use search and inspection tools only.
- Example: `rg --files` to inventory files.
- Example: `rg "pattern" skills` to find skill references.

## Coding Style & Naming Conventions
- Prefer ASCII text and minimal edits; keep files small and focused.
- Use valid TOML in `config.toml`; keep JSON/JSONL files strictly structured.
- New skills should live under `skills/<name>/` with a `SKILL.md` entry point.

## Testing Guidelines
No automated tests are defined. If you add scripts or validation steps, document them here.

## Commit & Branch Naming
- Commits: use imperative, Title Case summaries (for example, "Fix diff horizontal scroll backgrounds"). Include the PR/issue number in parentheses when applicable (for example, "(#10)"). Prefer short, action-first titles; avoid prefixes like "WIP".
- Branches: use lowercase kebab-case with short, descriptive slugs. Mirror existing patterns in this repo: `add-<slug>`, `feat-<slug>`, `issue-<num>-<slug>`, `pages-issue-<num>`, and `qol-<slug>`. Use issue numbers when relevant.

## Commit & Pull Request Guidelines
This directory is not a Git repository, so there is no local commit history to follow. If you later add Git tracking, use concise, conventional messages (e.g., `chore: adjust config defaults`) and explain the motivation in the PR description.

## Security & Configuration Tips
- Treat `auth.json`, `history.jsonl`, and `sessions/` as sensitive; avoid sharing or committing them.
- Keep `config.toml` changes small and reversible; prefer explicit, documented settings over implicit defaults.

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- gh-issues-repo: Manage GitHub issues in the current repository using the gh CLI. Use for issue triage, listing, viewing, creating, editing, commenting, closing, and reopening issues scoped to this repo only. (file: /Users/nikita/projects/web-diff-viewer/.codex/skills/gh-issues-repo/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/nikita/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/nikita/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  3) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  4) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
