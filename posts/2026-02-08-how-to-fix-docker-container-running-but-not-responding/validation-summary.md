# Validation Summary: How to Fix Docker Container Running But Not Responding

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Dockerfile health checks
- Linux process and networking diagnostics
- Java thread dumps
- Node.js diagnostic reports
- DNS resolver configuration

## Sources Consulted
- Docker CLI local help for `docker ps`, `docker port`, `docker exec`, `docker stats`, `docker inspect`, `docker events`, and `docker compose up`
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/builder/#healthcheck
- Docker `docker system events` reference: https://docs.docker.com/reference/cli/docker/system/events/
- Docker resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Official Image for Node.js: https://hub.docker.com/_/node
- Node.js release schedule: https://nodejs.org/en/about/releases/
- Node.js diagnostic report documentation: https://nodejs.org/download/release/v22.17.0/docs/api/report.html
- Linux `proc_pid_stack(5)` manual: https://man7.org/linux/man-pages/man5/proc_pid_stack.5.html
- Linux `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The original Node.js diagnostic report command started a new `node -e` process and generated a report for that short-lived process, not the already running application. Changed it to trigger a diagnostic report in PID 1 with `SIGUSR2`, with a note that the app must have been started with `--report-on-signal`.
- The quick recovery Compose command used `docker compose up -d my-container`, but Compose `up` takes service names, not Docker container names. Changed the example to `docker compose up -d app`.
- The scaling recovery example did not mention that scaling can fail when replicas bind the same fixed host port. Added a short caveat about service networking and host port conflicts.
- The summary said Docker can automatically restart unhealthy containers. Standalone Docker health checks mark health status but do not restart containers by themselves. Reworded this to say Docker plus monitoring or orchestration can detect unhealthy containers and take action.
- The Dockerfile health check example used `node:18-alpine`, but Node.js 18 is end-of-life. Updated it to `node:24-alpine`, a current LTS Docker Official Image tag.

## Review Notes
Most commands and configuration snippets are technically valid, but several diagnostics depend on tools being present in the image (`curl`, `strace`, `ss`, `netstat`, `nslookup`, `ping`, `wget`, `jstack`) and on container privileges or kernel settings. The `/proc/1/stack` file is only available when the kernel has `CONFIG_STACKTRACE` and access is permitted by ptrace checks. Health checks report container health status; restart behavior requires an external policy, orchestrator, or monitor.
