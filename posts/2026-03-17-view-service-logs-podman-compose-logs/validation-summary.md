# Validation Summary: How to View Service Logs with podman-compose logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Container logging
- CLI debugging commands

## Sources Consulted
- Podman `podman logs` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman `podman compose` official documentation: https://docs.podman.io/en/v5.3.1/markdown/podman-compose.1.html
- Upstream `containers/podman-compose` source for `logs` and `ps` command parsing: https://github.com/containers/podman-compose/blob/main/podman_compose.py

## Issues Found
- The sample `podman-compose logs` output showed `web_1` and `db_1` style prefixes. Current upstream `podman-compose logs` formats log prefixes with the Compose service name in brackets, such as `[web] |`, unless `--no-log-prefix` is used. Updated the example output to match the implemented formatter.
- The debugging section used `podman-compose ps -a`. Current upstream `podman-compose ps` only accepts `-q/--quiet` directly and already passes `-a` to `podman ps` internally. Changed the command to `podman-compose ps`.

## Review Notes
The documented `logs` flags `-f/--follow`, `-t/--timestamps`, and `--tail`, service-name filtering, multiple-service selection, shell redirection, and direct `podman logs --since` examples match current Podman and upstream podman-compose behavior. The local environment did not have `podman` or `podman-compose` installed, so verification used official Podman documentation and upstream source.
