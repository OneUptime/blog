# Validation Summary: How to Fix Docker Container Exit Code 143 (SIGTERM)

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker CLI
- Dockerfile CMD and ENTRYPOINT forms
- Docker Compose
- Kubernetes pod restart policy and termination behavior
- Linux signals and PID 1 behavior
- Node.js signal handling
- Python signal handling
- Go HTTP server graceful shutdown
- tini / Docker init process

## Sources Consulted
- Docker CLI reference for `docker container run --init`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference for `docker container kill --signal`: https://docs.docker.com/reference/cli/docker/container/kill/
- Dockerfile reference for shell form vs exec form and ENTRYPOINT signal behavior: https://docs.docker.com/reference/builder
- Docker build check `JSONArgsRecommended`: https://docs.docker.com/reference/build-checks/json-args-recommended/
- Docker Compose services reference for `init`, `stop_grace_period`, and `stop_signal`: https://docs.docker.com/reference/compose-file/services/
- Docker documentation for running multiple processes and `--init`: https://docs.docker.com/engine/containers/multi-service_container/
- Kubernetes Pod lifecycle documentation for termination and `restartPolicy`: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Linux `signal(7)` and `kill(1)` manual pages: https://man7.org/linux/man-pages/man7/signal.7.html and https://man7.org/linux/man-pages/man1/kill.1.html
- Node.js process signal events documentation: https://nodejs.org/api/process.html#signal-events
- Python `signal` module documentation: https://docs.python.org/3/library/signal.html
- Go `net/http.Server.Shutdown` documentation: https://pkg.go.dev/net/http#Server.Shutdown

## Issues Found
- The description said exit code 143 means SIGTERM was "not handled properly." This was too strong because 143 can be a normal result of container shutdown. Changed it to say SIGTERM was received during container shutdown.
- The PID 1 explanation said all signals sent to PID 1 are ignored unless a handler is registered. This overgeneralized Linux PID 1 behavior. Changed it to specifically describe terminating signals whose default action would terminate a regular process.
- The shell-form Dockerfile example said `/bin/sh` ignores SIGTERM. Docker's documented issue is that shell-form CMD/ENTRYPOINT starts the executable under `/bin/sh -c`, and that shell does not pass signals to the child process. Updated the wording accordingly.
- The `tini` section implied `tini` can solve lack of application signal handling. `tini` forwards signals and reaps child processes, but application-specific cleanup still requires the application to handle SIGTERM. Clarified this.
- The Kubernetes section said restart policy can be configured "to not restart on 143." Standard `restartPolicy: OnFailure` does not treat 143 as success; it avoids restart only when the container exits with code 0. Updated the text and YAML comment to reflect that behavior.

## Review Notes
- The Docker CLI commands, Compose fields, Dockerfile exec-form examples, `docker run --init`, and `docker kill --signal SIGTERM` examples are valid.
- The Node.js, Python, and Go examples are syntactically valid illustrative graceful-shutdown patterns. In a production Node.js server, guard the shutdown handler against repeated SIGTERM/SIGINT delivery to avoid running cleanup twice.
