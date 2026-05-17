# Validation Summary: How to Version Control /etc with etckeeper on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- etckeeper
- Git
- Ubuntu (apt package management)
- Bash scripting / shell aliases
- Cron (daily autocommit)
- Slack webhooks (notification example)

## Sources Consulted
- etckeeper upstream README: https://etckeeper.branchable.com/README/
- etckeeper Ubuntu manpage: https://manpages.ubuntu.com/manpages/trusty/man8/etckeeper.8.html
- etckeeper Arch Wiki: https://wiki.archlinux.org/title/Etckeeper
- Ubuntu Server docs - etckeeper: https://ubuntu.com/server/docs/tools-etckeeper/
- Distributed Remote Backups with Git and Etckeeper (hobo.house): https://hobo.house/2017/07/15/distributed-remote-backups-with-git-and-etckeeper/
- etckeeper source mirrors (eli-schwartz/etckeeper, wertarbyte/etckeeper, PKRoma/etckeeper) for hook directory layout and config option names

## Issues Found

1. **Incorrect hook directory `post-commit.d/`** — The post originally instructed readers to drop scripts in `/etc/etckeeper/post-commit.d/` for both the auto-push and the webhook notification examples. etckeeper does not ship a `post-commit.d/` hook directory. The standard hook directories are `pre-commit.d/`, `commit.d/`, `init.d/`, `pre-install.d/`, `post-install.d/`, `unclean.d/`, and `update-ignore.d/`. Scripts that should run after the actual commit belong in `commit.d/` with a numeric prefix greater than `50` (since `50vcs-commit` is the script that performs the VCS commit itself).

   Fix: Changed both example paths from `post-commit.d/10push` and `post-commit.d/20notify` to `commit.d/60push` and `commit.d/70notify` respectively (numbered above 50 so they run after the commit is made). Also added a one-line aside pointing readers at the simpler, modern `PUSH_REMOTE` configuration option in `etckeeper.conf`, which is the idiomatic way to auto-push and is supported by current etckeeper releases.

## Review Notes

- The `AVOID_DAILY_AUTOCOMMITS`, `AVOID_COMMIT_BEFORE_INSTALL`, `VCS`, and `GIT_COMMIT_OPTIONS` settings shown in the `etckeeper.conf` snippet are all real, current options.
- `etckeeper unclean` exit-code semantics (exit 0 when the repo *is* unclean, i.e. has uncommitted changes) match the `&& echo` usage in the post.
- The default branch is shown as `master`, which matches what the etckeeper postinst produces on most current Ubuntu installs (git's `init.defaultBranch` is not overridden on Ubuntu server by default). On systems where the operator has switched the default to `main`, the `git push backup master` example would need to be adjusted; this is not flagged in the post but is a minor caveat.
- The initial-commit message is described loosely as "a commit like `\"initial checkin\"`". In practice the message produced by the Ubuntu/Debian package's postinst is closer to `Initial commit`, but the hedged wording and the long-standing "initial checkin" convention in etckeeper's own documentation make this acceptable.
- The "Find large files in history" one-liner uses `awk '/^blob/ {print substr($0,6)}' | sort -k2 -n -r`, which is correct: after stripping the leading `blob ` prefix, field 2 is the object size.
- The webhook example uses `curl ... || true` so a failed POST will not break the commit pipeline — good defensive practice for a commit hook.
