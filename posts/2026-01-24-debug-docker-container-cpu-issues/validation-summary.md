# Validation Summary: How to Debug Docker Container CPU Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux cgroups
- Node.js
- Python
- Java
- Go
- py-spy
- async-profiler

## Sources Consulted
- Docker Engine resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Docker CLI reference for `docker container stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference for `docker container update`: https://docs.docker.com/reference/cli/docker/container/update/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Node.js OS API documentation: https://nodejs.org/api/os.html
- Node.js Cluster API documentation: https://nodejs.org/api/cluster.html
- Node.js CLI documentation: https://nodejs.org/api/cli.html
- Python `concurrent.futures` documentation: https://docs.python.org/3/library/concurrent.futures.html
- Go `net/http/pprof` package documentation: https://pkg.go.dev/net/http/pprof
- Oracle `jstack` documentation: https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jstack.html
- py-spy project documentation: https://github.com/benfred/py-spy

## Issues Found
- The host-side cgroup command assumed a narrow cgroup v1 Docker path. I changed it to derive the container process cgroup path from `/proc/$PID/cgroup` and read the cgroup v2 `cpu.stat` file, matching the post's cgroup v2 throttling example.
- The Python py-spy example omitted Docker ptrace requirements that commonly affect profiling a running process in a container. I added a note that the container may need `--cap-add SYS_PTRACE` and an unconfined seccomp profile.
- The Compose example used the obsolete top-level `version` field. I removed it so the snippet follows the current Compose Specification.
- The Node.js worker example used `os.cpus().length`, which Node.js documentation says should not be used for application parallelism. I changed it to `os.availableParallelism()`.
- The Node.js worker example used deprecated `cluster.isMaster`. I changed it to `cluster.isPrimary`.

## Review Notes
Docker CLI flags and Compose CPU fields were checked against local CLI help and official Docker documentation. The Compose snippets validated with `docker compose config -q`; the JavaScript snippet passed `node --check`; and the Python snippet passed `py_compile`. `gofmt` was not installed locally, so the Go pprof snippet was reviewed against the official Go package documentation rather than formatted locally.
