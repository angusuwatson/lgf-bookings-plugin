## Version Bumping

When bumping the version number, update ALL 3 places:
1. `simple-hotel-crm.php` — the `Version:` header
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
   gh pr create --title "Task title" --body "Closes task \`task-id\`." --base main
   ```
6. Write ONLY the PR URL to the output file specified in the prompt
7. Do NOT modify `tasks.json` — the worker script handles that
