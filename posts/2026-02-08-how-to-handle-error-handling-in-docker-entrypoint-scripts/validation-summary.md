# Validation Summary: How to Handle Error Handling in Docker Entrypoint Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker entrypoint scripts
- Bash shell scripting
- Docker Compose restart policies
- Kubernetes restart policies
- Netcat TCP checks
- curl
- PostgreSQL `pg_isready`

## Sources Consulted
- GNU Bash Reference Manual, The Set Builtin: https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html
- Docker Dockerfile reference, `ENTRYPOINT`: https://docs.docker.com/reference/dockerfile/#entrypoint
- Docker Compose file reference, `restart`: https://docs.docker.com/reference/compose-file/services/#restart
- Docker Engine documentation, restart policies: https://docs.docker.com/engine/containers/start-containers-automatically/
- Kubernetes documentation, Pod lifecycle and restart policy: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#restart-policy
- Local CLI help for Docker 29.4.2, Bash 5.2, and OpenBSD netcat 1.226

## Issues Found
- The signal-handling example used `wait` under `set -e`. If the child process exited non-zero after receiving SIGTERM, Bash could exit before the example captured and logged the status. Changed the example to temporarily disable `errexit` around `wait`, capture the exit code, then exit with that code.
- The Kubernetes exit-code sentence said restart policies can be configured based on exit codes. Standard Pod-level `restartPolicy` supports `Always`, `OnFailure`, and `Never`; `OnFailure` restarts on any non-zero exit status. Reworded the sentence to match Kubernetes behavior.
- The logging example used `tee` inside the logging functions and also redirected all output through `tee`, causing duplicated log-file entries. Updated the functions to write to stdout/stderr once and rely on the global redirection for file persistence.

## Review Notes
- The examples are Bash-specific and correctly use `#!/bin/bash` with Bash features such as `${!var}` and process substitution.
- The `nc -z` example is valid for common netcat implementations such as OpenBSD netcat, but minimal container images may need netcat installed explicitly.
