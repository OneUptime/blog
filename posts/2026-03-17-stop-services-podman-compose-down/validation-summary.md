# Validation Summary: How to Stop Services with podman-compose down

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose files
- Container cleanup
- Podman volumes, images, and networks

## Sources Consulted
- Podman Compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- containers/podman-compose README: https://github.com/containers/podman-compose
- containers/podman-compose source for `down` command options and behavior: https://github.com/containers/podman-compose/blob/main/podman_compose.py
- Docker Compose `down` command reference, used because podman-compose implements Compose behavior and mirrors these flags: https://docs.docker.com/reference/cli/docker/compose/down/
- Podman `stop` command documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `system prune` command documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html

## Issues Found
- The post described `podman-compose stop` as pausing containers. Changed this to say it stops containers but keeps them so they can be restarted, matching Podman stop behavior.
- The default removal list omitted the default network and did not mention anonymous volumes. Updated the lists to include the default network when used, and to state that named and anonymous volumes are preserved by default.
- The `down -v` explanation only mentioned named volumes. Updated it to mention both named and anonymous volumes, matching the `--volumes` option behavior.
- The cleanup verification command used `podman ps -a` with the comment "no containers remain", which can be misleading on a host with unrelated containers. Updated it to `podman-compose ps` and clarified that it checks project containers.

## Review Notes
The examples use current podman-compose options: `down`, `-v/--volumes`, `--rmi all`, `--rmi local`, `-t/--timeout`, `stop`, `start`, and `rm`. The local environment did not have `podman-compose` installed, so CLI behavior was verified against upstream podman-compose source and official Podman/Docker Compose documentation.
