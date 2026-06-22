# Validation Summary: How to Fix 'Cannot Lock Ref' Errors in Git

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Git references and lock files
- Git CLI commands
- Git garbage collection and pruning
- Git worktrees
- Visual Studio Code Git integration
- Unix/Linux, macOS, and Windows shell commands

## Sources Consulted
- Git `git-update-ref` documentation: https://git-scm.com/docs/git-update-ref
- Git `git-gc` documentation: https://git-scm.com/docs/git-gc
- Git `git-prune` documentation: https://git-scm.com/docs/git-prune
- Git `git-fsck` documentation: https://git-scm.com/docs/git-fsck
- Git `git-worktree` documentation: https://git-scm.com/docs/git-worktree
- Git `git-fetch` documentation: https://git-scm.com/docs/git-fetch
- Visual Studio Code Source Control FAQ: https://code.visualstudio.com/docs/sourcecontrol/faq
- Local Git manual pages from Git 2.43.0

## Issues Found
- The post said lock removal is safe when no Git processes are running. I narrowed this to also require that no Git-enabled IDE or background job is using the repository, because background integrations can run Git outside the user's terminal.
- The post described `git gc` and `git prune` as resolving lock issues. I changed this to clarify that garbage collection is useful after stale locks are removed, but it does not replace removing the blocking lock file.
- The `git gc --prune=now --aggressive` example did not mention Git's documented concurrency risk for `--prune=now`. I added a warning to use it only when no other process is writing to the repository.
- The interruption section incorrectly referred to Ctrl+C as SIGTERM. I corrected it to SIGINT.
- The worktree section claimed there are no lock conflicts between worktrees. I changed this to explain that worktrees have separate working trees but still share the object database and most refs, so concurrent updates to shared refs can still conflict.

## Review Notes
The remaining commands and examples are technically valid for current Git usage. The script is acceptable as a simple interactive recovery helper, though a production version could be more precise by checking for processes using the specific repository rather than any process named `git`.
