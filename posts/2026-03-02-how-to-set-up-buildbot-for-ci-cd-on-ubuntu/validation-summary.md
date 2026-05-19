# Validation Summary: How to Set Up Buildbot for CI/CD on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Buildbot (Python-based CI/CD framework)
- Python 3 / pip / venv
- Ubuntu (apt, useradd, systemd)
- Nginx (reverse proxy, TLS)
- Let's Encrypt / Certbot
- Git (GitPoller, Git source step)
- Docker (build/push via ShellCommand)
- GitHub webhooks (change_hook_dialects)
- SQLite / PostgreSQL (db_url)

## Sources Consulted
- Buildbot Web Server / Authz docs: https://docs.buildbot.net/current/manual/configuration/www.html
- Buildbot CLI reference: https://docs.buildbot.net/current/manual/cmdline.html
- Buildbot change hook dialects (GitHub): https://docs.buildbot.net/current/manual/configuration/wwwhooks.html
- Buildbot file transfer steps (FileUpload): https://docs.buildbot.net/current/manual/configuration/steps/file_transfer.html
- Buildbot Authz / role matchers: https://docs.buildbot.net/current/manual/configuration/www.html#authorization-rules

## Issues Found
1. **Mismatched auth/role-matcher combination in `master.cfg`.** The post paired `util.UserPasswordAuth({"admin": "admin-password"})` (which authenticates by username) with `util.RolesFromEmails(admins=["admin"])` (which matches against `userDetails["email"]`). With a non-email username, `RolesFromEmails` would not grant the `admins` role, leaving the admin user effectively unprivileged in the web UI. Changed to `util.RolesFromUsername(roles=["admins"], usernames=["admin"])`, which is the correct matcher for username-based authentication.

2. **Broken bash line-continuation in the `buildbot-worker create-worker` command.** The original snippet placed inline `# comment` text between the `\` continuation character and the newline, e.g. `localhost:9989 \         # Master host:port`. In bash, the `\` only escapes the immediately following character (the space), so the newline is not actually escaped; the `#` then starts a comment that terminates the command. As written, the command would only receive `/opt/buildbot/worker` as its argument and the subsequent indented tokens would be parsed as separate (failing) commands. Moved the explanatory comments to dedicated lines above the command so the continuation works.

3. **`buildbot statuslog` is not a current subcommand.** The post used `buildbot statuslog /opt/buildbot/master` to check master status, but `statuslog` is not listed among the present-day `buildbot` CLI subcommands (`create-master`, `upgrade-master`, `start`, `restart`, `stop`, `sighup`, `checkconfig`, `cleanupdb`, `copy-db`, `try`, `sendchange`, `user`). Replaced with tailing the existing `/opt/buildbot/master/twistd.log`, which is the documented way to inspect master activity from the CLI in modern Buildbot.

## Review Notes
- `pip install 'buildbot[bundle]' buildbot-worker buildbot-www` is correct but slightly redundant: the `bundle` extra already pulls in `buildbot-www`, `buildbot-worker`, and the three view plugins (`buildbot-waterfall-view`, `buildbot-console-view`, `buildbot-grid-view`). Left as-is since explicit naming is harmless and the user may prefer to be explicit.
- `steps.FileUpload(workersrc=..., masterdest=...)` uses the modern (Buildbot 3.x+) parameter naming. The older `slavesrc` form is deprecated; the post is up to date.
- The systemd `buildbot-worker.service` uses `After=buildbot-master.service`, which only enforces ordering, not readiness. The post mitigates this on first manual start with `sleep 5`, which is reasonable; in production a more robust solution would be the worker's own retry/reconnect logic (which Buildbot does have).
- The `buildbot sendchange ... yourrepo` example passes `yourrepo` as a trailing positional, which `sendchange` interprets as a changed file path. This is technically valid but a little misleading as an example; readers should treat the trailing argument as a file list, not a project name. Not changed because it still runs.
- The `c['www']['change_hook_dialects']` GitHub config with `secret` and `strict: True` matches the documented options for the GitHub change hook.
