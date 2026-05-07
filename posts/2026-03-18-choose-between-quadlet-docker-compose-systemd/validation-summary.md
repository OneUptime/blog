# Validation Summary: How to Choose Between Quadlet and Docker Compose for systemd

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman Quadlet
- Docker Compose
- Docker Engine
- systemd
- journald
- Podman auto-update
- YAML and INI-style service configuration

## Sources Consulted
- Podman `podman-systemd.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-auto-update(1)` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Docker Engine documentation: https://docs.docker.com/engine/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose file services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose profiles documentation: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose `up`, `down`, `restart`, and `scale` command references: https://docs.docker.com/reference/cli/docker/compose/

## Issues Found
- The opening quote said Docker Compose manages containers through its own daemon. Docker Compose is a client/tool that uses Docker Engine; Docker Engine has the long-running `dockerd` daemon. Updated the wording to say Docker Compose manages containers through the Docker Engine daemon.
- The Quadlet overview listed only `.container`, `.pod`, `.network`, and `.volume` units and claimed support for all systemd features including socket activation. Current Podman docs list additional Quadlet unit types, and the socket-activation claim was too broad for the examples shown. Updated the text to include current unit types and describe standard systemd integration more precisely.
- Several examples used `systemctl enable web` for generated Quadlet services. Podman documents generated Quadlet services as transient and says their `[Install]` sections are applied by the generator during reload/boot instead of enabling them directly. Removed the direct enable commands and replaced them with `systemctl daemon-reload` guidance.
- Quadlet dependency examples referenced generated `.service` unit names (`db.service`, `api.service`). Podman documents dependencies between Quadlet units using the source Quadlet unit names such as `db.container`, which the generator translates. Updated the examples accordingly.
- The Docker Compose service management section said Compose manages all services together. Docker Compose can operate on whole projects and on individual services. Adjusted the wording while keeping the original examples.

## Review Notes
- The Compose `depends_on` example with `condition: service_healthy`, `healthcheck`, `restart`, `stop_grace_period`, profiles, and service scaling claims match current Docker Compose documentation.
- The Quadlet `AutoUpdate=registry` example is valid, and Podman documents that registry auto-update requires a fully qualified image reference.
- The post remains focused on single-host operational tradeoffs. Future updates could mention `loginctl enable-linger` for rootless user services that must start before interactive login, but the current text is technically correct as written.
