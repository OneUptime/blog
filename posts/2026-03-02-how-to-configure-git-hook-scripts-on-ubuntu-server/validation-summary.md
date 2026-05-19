# Validation Summary: How to Configure Git Hook Scripts on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git hooks
- Ubuntu Server
- Bash scripting
- Git bare repositories
- sudo/systemd deployment commands
- npm
- Slack incoming webhooks
- Email notifications

## Sources Consulted
- Git githooks documentation: https://git-scm.com/docs/githooks
- Git init documentation: https://git-scm.com/docs/git-init
- Git rev-list documentation: https://git-scm.com/docs/git-rev-list
- Git merge-base documentation: https://git-scm.com/docs/git-merge-base
- Git checkout documentation: https://git-scm.com/docs/git-checkout
- Git command documentation for `--git-dir` and `--work-tree`: https://git-scm.com/docs/git
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks

## Issues Found
- The `pre-receive` example checked every commit reachable from a new branch tip, which can include commits already present elsewhere in the repository. Changed it to `git rev-list "$new_sha" --not --all` so new branches validate only commits newly introduced by the push.
- The `update` hook's force-push protection checked `refs/heads/main` twice and never checked `refs/heads/master`. Fixed the condition to cover both `main` and `master`.
- The `update` hook used `git merge-base --is-ancestor` without handling protected branch creation or deletion. Added explicit deletion rejection and allowed new protected branch creation after the earlier user authorization check because an all-zero old SHA cannot be used as a merge-base input.
- The `post-receive` deployment example set `GIT_DIR` and `GIT_WORK_TREE` in the hook environment, then invoked Git through `sudo`, which commonly does not preserve those environment variables. Changed the checkout command to pass `--git-dir` and `--work-tree` explicitly.
- The deployment example used `npm ci --production`. Updated it to `npm ci --omit=dev`, matching current npm documentation for omitting development dependencies.
- The Slack incoming webhook payload included a `channel` override. Current Slack app incoming webhooks post to the channel selected during installation and do not support overriding the channel in the payload, so the `channel` field was removed.
- The template configuration name was written as `init.templatedir`. Changed it to the documented `init.templateDir`.

## Review Notes
The post is technically relevant and now aligns with the official Git hook lifecycle and argument conventions. The deployment example still assumes the `deploy` user can read the bare repository and write to the application directory, and the sudoers example assumes the `systemctl` path matches the server's Ubuntu installation.
