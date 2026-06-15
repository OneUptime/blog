# Validation Summary: How to Fix Docker 'Cannot Kill Container' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Compose
- Dockerfile CMD and ENTRYPOINT signal handling
- Linux process states and signals
- Linux cgroups, procfs, mounts, NFS, and devicemapper/overlay storage
- systemd service management

## Sources Consulted
- Docker CLI reference: docker container stop: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference: docker container kill: https://docs.docker.com/reference/cli/docker/container/kill/
- Docker CLI reference: docker container ls status filters: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: docker container rm: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Dockerfile reference for shell and exec forms and signal behavior: https://docs.docker.com/reference/dockerfile/
- Docker prune documentation: https://docs.docker.com/engine/manage-resources/pruning/
- Linux ps(1) manual for process state codes: https://man7.org/linux/man-pages/man1/ps.1.html
- Local Docker CLI help output for `docker stop`, `docker kill`, `docker ps`, `docker rm`, `docker inspect`, `docker volume prune`, `docker network prune`, and `docker system prune`.

## Issues Found
- `docker stop --time=60` used a deprecated long flag in the local Docker CLI. Changed it to `docker stop --timeout=60`, which matches current Docker CLI help and Docker's command reference.
- The post mapped Docker `dead` containers to zombie processes. Docker documents `dead` as a partially removed container whose resources may still be busy, so the Mermaid diagram and scenario text now describe cleanup failure instead.
- The PID lookup example used the old cgroup v1 memory path `/sys/fs/cgroup/memory/docker/.../cgroup.procs`, which is not valid on modern cgroup v2 hosts. Replaced it with `docker inspect ... '{{.State.Pid}}'`.
- The D-state diagnostic used `ps aux | grep $PID`, which can match the grep process and gives less direct state information. Replaced it with `ps -o pid,ppid,stat,wchan,comm,args -p "$PID"`.
- The overlay2 cleanup example assumed the overlay mount path used the container ID. Docker stores the actual merged directory in `GraphDriver.Data.MergedDir`, so the commands now read that value from `docker inspect`.
- The zombie process command only matched an exact `Z` state, missing common `STAT` values such as `Z+`. Changed it to match states beginning with `Z`.
- The manual cleanup sequence stopped Docker before running `docker inspect`, which would prevent the inspect command from working. Reordered the commands to capture the container ID before stopping Docker.
- The health check section said health checks prevent stuck containers. Health checks detect unhealthy containers, while restart policies restart failed containers. Updated the explanation accordingly.
- The Compose example used obsolete `version: '3.8'` and Swarm-style `deploy.restart_policy` for a general `docker-compose.yml` example. Removed `version` and changed the example to service-level `restart: on-failure:3`, validated with current `docker compose config`.

## Review Notes
The storage-driver cleanup commands are necessarily high-risk operational recovery steps. The post correctly frames manual file removal and forced unmounts as last-resort actions, but future revisions could add stronger warnings about backing up `/var/lib/docker` metadata and validating the affected mount/device before removal.
