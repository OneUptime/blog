# Validation Summary: How to Fix 'container already exists' Errors in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Podman pods
- podman-compose
- Container lifecycle management
- Shell scripting for CI cleanup

## Sources Consulted
- Podman `run` / `create` official documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `rm` official documentation: https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Podman `stop` official documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `ps` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `container exists` official documentation: https://docs.podman.io/en/v4.4/markdown/podman-container-exists.1.html
- Podman `container prune` official documentation: https://docs.podman.io/en/v5.0.2/markdown/podman-container-prune.1.html
- Podman `pod create` official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `compose` official documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- podman-compose upstream source and command parser: https://github.com/containers/podman-compose

## Issues Found
- The `podman rm --depend -f myapp` example was described as a graceful stop followed by removal. The `--depend` flag removes dependent containers recursively, and `-f` forces removal of running or paused containers. I changed the lead-in text to say it removes containers that depend on the selected container.
- The podman-compose section said `podman-compose down` removes volumes defined in the compose file. Current podman-compose behavior only removes named compose volumes and anonymous attached volumes when `-v` / `--volumes` is used. I changed the text to explain that `podman-compose down` removes containers and networks, and that `podman-compose down -v` is required for volumes.
- The manual podman-compose cleanup command filtered on `com.docker.compose.project` without a project value. podman-compose applies the Podman-specific project label `io.podman.compose.project`, and its own down/orphan cleanup paths use that label with the current project name. I changed the command to filter on `io.podman.compose.project=$PROJECT_NAME` and guard the removal so it does not run `podman rm -f` with no container IDs.

## Review Notes
The core Podman commands and flags in the post are valid: `podman ps -a`, `--filter name=...`, `podman inspect --format`, `podman rm -f`, `podman run --replace`, `podman run --rm`, `podman container prune --filter until=...`, `podman container exists`, `podman pod create --replace`, and `podman pod rm -f` are supported by current Podman documentation. Podman was not installed in the local environment, so command verification was performed against official manuals and upstream podman-compose source instead of local `--help` output.
