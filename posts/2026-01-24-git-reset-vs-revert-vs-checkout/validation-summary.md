# Validation Summary: How to Handle Git Reset vs Revert vs Checkout

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Git
- Git reset
- Git revert
- Git checkout
- Git restore
- Git switch
- Git reflog

## Sources Consulted
- Official Git reset documentation: https://git-scm.com/docs/git-reset
- Official Git revert documentation: https://git-scm.com/docs/git-revert
- Official Git checkout documentation: https://git-scm.com/docs/git-checkout
- Official Git restore documentation: https://git-scm.com/docs/git-restore
- Official Git switch documentation: https://git-scm.com/docs/git-switch
- Official Git documentation on reset, restore, and revert: https://git-scm.com/docs/git
- Local Git CLI help output from Git 2.43.0 for `git reset -h`, `git revert -h`, `git checkout -h`, `git restore -h`, and `git switch -h`

## Issues Found
- The hard reset examples described `git reset --hard origin/main` as matching the remote exactly and discarding all local changes. This only resets tracked files in the index and working tree; it does not remove untracked files. Updated the wording to say tracked local changes and tracked files.
- The file restore example described `git checkout abc1234 -- .` as restoring all files from a commit. The `.` pathspec applies under the current directory, so the wording now says all files under the current directory.
- The discard example described `git checkout -- .` as discarding all uncommitted changes. This only discards unstaged changes to tracked files under the current directory and does not clear staged changes. Updated the comments to distinguish it from `git reset --hard HEAD`.
- The reflog best practice said commits are recoverable for approximately 30 days. Git reflog expiration is configurable and defaults vary by reachability, so the wording now says commits are often recoverable until reflog entries expire.

## Review Notes
The command syntax and option usage for reset, revert, checkout, restore, and switch are valid for current Git. `git checkout` remains available, while `git switch` and `git restore` provide clearer purpose-specific alternatives introduced in Git 2.23.
