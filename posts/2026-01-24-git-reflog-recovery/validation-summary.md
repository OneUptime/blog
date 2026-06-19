# Validation Summary: How to Handle Git Reflog for Recovery

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Git reflog
- Git reset, checkout, branch, rebase, stash, fsck, gc, config, log
- Git remote-tracking refs and force push recovery

## Sources Consulted
- Official Git `git-reflog` documentation: https://git-scm.com/docs/git-reflog
- Official Git `git-gc` documentation: https://git-scm.com/docs/git-gc
- Official Git `git-config` documentation: https://git-scm.com/docs/git-config
- Official Git `git-log` documentation: https://git-scm.com/docs/git-log
- Official Git `git-reset` documentation: https://git-scm.com/docs/git-reset
- Official Git `git-rebase` documentation: https://git-scm.com/docs/git-rebase
- Official Git `git-stash` documentation: https://git-scm.com/docs/git-stash
- Official Git `git-fsck` documentation: https://git-scm.com/docs/git-fsck
- Local Git CLI help and behavior checks with Git 2.43.0.

## Issues Found
- The post initially said reflog entries are automatically pruned after 90 days. Updated this to distinguish reachable reflog entries, which default to 90 days, from unreachable entries, which default to 30 days.
- The deleted-branch recovery example suggested `git reflog | grep feature-important` as the main recovery path. Branch deletion removes that branch ref, and HEAD checkout entries containing the branch name do not necessarily point at the deleted branch tip. Updated the example to prefer the SHA printed by `git branch -D`, then use HEAD's reflog around the relevant time to identify candidate commits.
- The dropped-stash recovery example implied `git reflog show stash` works after a stash is dropped. If the stash ref no longer exists, that command may fail. Updated the wording to say this is only useful if the stash reference still exists.
- The force-push recovery example said `origin/main` reflog shows where the branch pointed before fetch. Updated this to say it shows previous local values of the remote-tracking ref, when that reflog exists.
- The `ORIG_HEAD` section overstated that Git sets `ORIG_HEAD` before operations without caveats. Updated the claim to include merge, pull, reset, and the start of rebase, while noting that another command during rebase can overwrite `ORIG_HEAD`.
- The summary repeated the 90-day-only expiration claim. Updated it to include both reachable and unreachable defaults.

## Review Notes
The commands are current Git syntax and were spot-checked against Git 2.43.0. `git checkout -b` remains valid, though newer Git versions often prefer `git switch -c` for branch creation and switching.
