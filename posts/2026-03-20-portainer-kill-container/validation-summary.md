# Validation Summary: How to Kill a Running Container in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Compose
- Linux signals
- Python logging and signal handling
- NGINX
- HAProxy

## Sources Consulted
- Docker CLI reference: `docker container kill` https://docs.docker.com/reference/cli/docker/container/kill/
- Docker CLI reference: `docker container stop` https://docs.docker.com/reference/cli/docker/container/stop/
- Docker Compose service attributes (`init`, `stop_grace_period`, `stop_signal`) https://docs.docker.com/reference/compose-file/services/
- Docker restart policies https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker deprecated features (`--time` renamed to `--timeout`) https://docs.docker.com/engine/deprecated/
- Docker container status and exit code `137` notes https://docs.docker.com/reference/cli/docker/container/ls/
- Python `logging` module docs https://docs.python.org/3.12/library/logging.html
- Python `signal` module docs https://docs.python.org/3.11/library/signal.html
- Linux `signal(7)` man page for signal numbering portability https://man7.org/linux/man-pages/man7/signal.7.html
- Portainer Docker roles and permissions docs https://docs.portainer.io/advanced/docker-roles-and-permissions
- Official Portainer source: container kill request implementation https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/containers.service.ts
- Official Portainer source: list view kill action https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/ListView/ContainersDatatable/ContainersDatatableActions.tsx
- Official Portainer source: container details kill action https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/ItemView/ContainerActionsSection/PrimaryActions/KillButton.tsx
- NGINX signal control docs https://nginx.org/en/docs/control.html
- HAProxy management guide (master-worker `SIGUSR2` reload behavior) https://docs.haproxy.org/3.2/management.html

## Issues Found
- The `docker stop` explanation said it always sends `SIGTERM`. Docker documents that `docker stop` sends the container's configured stop signal, which is `SIGTERM` only by default. I corrected the wording in the introduction and comparison section.
- The `bash` comparison block contained plain numbered prose inside a shell code block, which was not valid shell syntax. I converted those lines to shell comments so the example is syntactically valid.
- The post used `docker stop --time 5`. Docker documents `--timeout` as the current option name and marks `--time` as deprecated. I updated the command and the surrounding explanation to use `--timeout`.
- The line `docker kill --signal SIGTERM my-container  # Same as stop` was incorrect. `docker kill --signal SIGTERM` sends `SIGTERM` immediately and does not include `docker stop`'s grace period or stop-timeout behavior. I corrected the comment.
- The post implied Portainer could be used for signal-based reload workflows in the same way as `docker kill --signal`. Portainer's current UI kill action maps to a default container kill request and does not expose custom signal selection. I clarified that Portainer's Kill button is for the default hard kill, and that custom signals should be sent from the Docker CLI.
- The signal table presented numeric values as absolute. Linux signal numbers vary by architecture, so I changed the column to `Typical Linux Value` and added a note recommending signal names over numeric values.
- The HAProxy example presented `SIGUSR2` reload as a general behavior. HAProxy documents this for master-worker mode, so I added that caveat.
- The post said a killed container enters the stopped state unconditionally. Docker restart policies can move a killed container into `restarting`, so I updated the wording to account for restart policies.
- The exit-code explanation around `137` was broader than necessary. I revised it to say `137` indicates `SIGKILL`, and to use the `OOMKilled` field to distinguish OOM cases from other `SIGKILL` exits.
- The warning about in-flight transactions said kill drops transactions without rollback, which was too absolute. I changed it to the narrower and more accurate statement that kill interrupts in-flight work without allowing a graceful shutdown path.

## Review Notes
- `docker-compose.yml` remains a supported Compose filename, but `compose.yaml` is the default filename used in current Docker documentation and tooling.
- Portainer's public documentation is sparse on the exact Kill UI flow, so I cross-checked the official Portainer source to verify that current list and details views expose a Kill action and that it issues a default kill request.
