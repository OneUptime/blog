# Validation Summary: How to Audit Container Security with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker Bench for Security
- Docker Engine / Docker CLI
- Docker Compose
- Bash
- cron / crontab

## Sources Consulted
- Docker Bench for Security README (official repository): https://github.com/docker/docker-bench-security
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Portainer docs, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer docs, API usage examples: https://docs.portainer.io/api/examples
- Portainer docs, Activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer source, `/api/auth` handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- `crontab(5)` man page on the local system

## Issues Found
- The Docker Bench section used the published `docker/docker-bench-security` image directly. The upstream project now documents that image as out of date, so I updated the post to build the current image locally and run `docker-bench-security` with the current official flags.
- The Docker Bench command was missing the `--label docker_bench_security` flag shown in the official usage examples. I added it so the benchmark container is labeled consistently with upstream guidance.
- The custom audit script read container names through a pipeline-fed `while` loop, which causes the `PASS` and `WARN` counters to be updated in a subshell in Bash. I changed the loop to process substitution so the final totals are correct.
- The script used `docker exec ... id -u` to determine whether a container runs as root. That can fail or misclassify containers that do not include `id`. I replaced it with `docker inspect` against `.Config.User`, treating unset, `root`, and UID `0` values as root.
- The Docker socket check only looked at `.HostConfig.Binds`. I changed it to inspect `.Mounts` so it catches the mounted socket more reliably.
- The Portainer section claimed that activity logs could be queried via `https://.../api/audit` and parsed from `.logs[]`. Portainer’s current official documentation describes viewing activity logs in the UI and exporting filtered results as CSV, but does not document that public audit-log API. I replaced the section with the supported UI and CSV workflow.
- The cron example contained an ellipsis placeholder instead of a runnable command, and it used unescaped `%` characters inside `date`. In crontab entries, `%` must be escaped, so I replaced the line with a full command and corrected the date format to `+\%Y\%m\%d`.

## Review Notes
- Portainer currently supports both username/password login via `POST /api/auth` with a Bearer JWT and API access tokens passed in `X-API-Key`, but the official docs recommend per-user access tokens for normal automation.
- Docker Bench for Security is still documented upstream as being based on the CIS Docker Benchmark v1.6.0, and the upstream README explicitly notes that the published Docker Hub image is stale.
