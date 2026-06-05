# Validation Summary: How to Create Docker Container Monitoring Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker container health checks
- Docker container runtime metrics
- Bash scripting
- systemd services
- Slack webhook alerts

## Sources Consulted
- Docker CLI reference: `docker container stats` - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker CLI reference: `docker container ls` / `docker ps` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: `docker system events` / `docker events` - https://docs.docker.com/reference/cli/docker/system/events/
- Docker CLI reference: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Dockerfile reference: `HEALTHCHECK` - https://docs.docker.com/reference/dockerfile/#healthcheck
- systemd service unit reference - https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The health monitor used `docker ps --filter since=<timestamp>`, but Docker's `since` filter for `docker ps` expects a container ID or name, not a timestamp. Changed the script to inspect exited containers and compare `.State.FinishedAt` against a shell timestamp.
- The health monitor described showing the last health check log but selected index `0` from `.State.Health.Log`, which is not reliably the most recent entry. Changed it to render the stored health log entries and select the last line.
- Slack webhook JSON construction did not escape backslashes or double quotes in alert messages. Added basic escaping before building the payload.
- The metrics logger labeled memory, network, and block I/O columns as MB but left Docker's unit-suffixed values unconverted, and block I/O columns were always written as `0`. Added a unit conversion helper and populated the MB columns from `docker stats`.
- The restart loop detector described a restarts-per-hour threshold but compared against Docker's cumulative `.RestartCount`. Added per-container previous-count tracking and computed an approximate hourly restart rate from the observed delta.
- The volume monitor comment said it detected unusual growth rate, but the script only checked an absolute size threshold. Updated the comment to match the implemented behavior.
- The dashboard counted stopped containers without `docker ps -a`, which would not include exited containers in the default listing. Added `-a`.
- The dashboard's total count only added running and exited containers, omitting other Docker states such as created or paused. Changed it to count `docker ps -a -q`.

## Review Notes
The examples are Linux-oriented Bash scripts and use GNU utilities such as `date -d`, `awk`, `du`, `sort`, and `sed`. They are technically valid for typical Linux Docker hosts, but portability to macOS, BSD userlands, or Windows containers would require adjustments.
