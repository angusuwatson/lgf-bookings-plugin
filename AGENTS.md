## Version Bumping

When bumping the version number, update ALL 3 places:
1. `simple-hotel-crm.php` — the `Version:` header (the `SIMPLE_HOTEL_CRM_VERSION` constant reads this automatically)
2. `update.json` — the `"version"` field
3. `update.json` — the changelog section

After every version bump, commit and push to GitHub so the live site's updater can pull the new version.

## AI Task Automation

When spawned by `ai-worker.sh` to complete a task:

1. Understand the codebase and implement the task described
2. After making changes, run `php -l` on every `.php` file you modified
3. Stage and commit with a conventional commit message:
   ```
   git add -A
   git commit -m "feat(scope): short description"
   ```
4. Push to the branch: `git push origin <branch-name>`
5. Create a pull request:
   ```
   gh pr create --title "Task title" --body "Closes task \`task-id\`." --base master
   ```
6. Write ONLY the PR URL to the output file specified in the prompt
7. Do NOT modify `tasks.json` — the worker script handles that

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
