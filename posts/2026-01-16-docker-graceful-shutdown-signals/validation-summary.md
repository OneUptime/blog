# Validation Summary: How to Handle Docker Container Graceful Shutdown and Signal Handling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfile `CMD`/`ENTRYPOINT`
- Docker Compose
- Linux signals (`SIGTERM`, `SIGINT`, `SIGKILL`)
- Node.js HTTP servers
- Python `http.server` / `socketserver`
- Go `net/http` and `os/signal`
- Spring Boot graceful shutdown
- Bash entrypoint scripts
- `tini` and `dumb-init`
- Kubernetes pod termination lifecycle and lifecycle hooks

## Sources Consulted
- Docker CLI documentation for `docker container stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI documentation for `docker container kill`: https://docs.docker.com/reference/cli/docker/container/kill/
- Dockerfile reference for exec form, shell form, and `STOPSIGNAL`: https://docs.docker.com/reference/dockerfile/
- Docker Compose services reference for `stop_grace_period`: https://docs.docker.com/reference/compose-file/services/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Node.js HTTP server documentation: https://nodejs.org/api/http.html
- Python `socketserver` documentation: https://docs.python.org/3/library/socketserver.html
- Go `net/http` documentation: https://pkg.go.dev/net/http
- Go `os/signal` documentation: https://pkg.go.dev/os/signal
- Spring Boot graceful shutdown documentation: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Tini project documentation: https://github.com/krallin/tini
- dumb-init project documentation: https://github.com/Yelp/dumb-init

## Issues Found
- Docker stop lifecycle incorrectly said the container is removed. `docker stop` stops the container; it does not remove it. Changed the final lifecycle step to "Container exits."
- Docker stop wording implied SIGTERM is unconditional. Docker sends SIGTERM by default, but the first stop signal can be changed with `STOPSIGNAL` or runtime options. Updated the wording to "by default."
- Python `HTTPServer.shutdown()` was called directly from the signal handler while `serve_forever()` runs in the same thread. Python documents that this can deadlock. Updated the example to call `shutdown()` from a separate thread and close the server in `finally`.
- The `dumb-init` Dockerfile used `pip install dumb-init` in a Debian-based Python image. Updated it to install the Debian package with `apt-get`, which matches the image family and official project installation guidance.
- The Kubernetes Deployment snippet was missing required context such as `metadata.name`, a selector, matching pod labels, and a container image. Added the minimal required fields so the manifest shape is valid.
- The Kubernetes `preStop` hook example manually sent `SIGTERM` to PID 1 after sleeping. Kubernetes runs `preStop` before sending the termination signal, so the example could send a duplicate or premature signal. Updated the comment to rely on Kubernetes sending SIGTERM after the hook completes.
- The detailed Docker test used `curl http://localhost:8080` without publishing the container port. Added `-p 8080:8080` to the `docker run` command.
- The npm workaround suggested `"start": "exec node server.js"` as proper signal handling. Since `npm` remains the top-level process when using `CMD ["npm", "start"]`, that advice was misleading. Replaced it with a note to test signal behavior for the specific npm and Node.js versions, while preserving the recommendation to run Node directly.

## Review Notes
- The Node.js `server.close()` examples are broadly correct, but behavior around idle keep-alive connections varies by Node.js version. For older Node.js versions, applications may need `server.closeIdleConnections()` or a forced timeout, which the post already includes.
