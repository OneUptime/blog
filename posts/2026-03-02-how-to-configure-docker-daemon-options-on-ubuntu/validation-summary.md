# Validation Summary: How to Configure Docker Daemon Options on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker daemon (`dockerd`)
- Docker daemon JSON configuration
- systemd
- journald
- Docker logging drivers
- Docker storage drivers
- Docker networking and registry configuration

## Sources Consulted
- Docker Docs: dockerd CLI reference and daemon configuration file - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Journald logging driver - https://docs.docker.com/engine/logging/drivers/journald/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Deprecated Docker Engine features - https://docs.docker.com/engine/deprecated/
- Docker Docs: Docker Engine networking and subnet allocation - https://docs.docker.com/engine/network/
- Docker Docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker Docs: Read the daemon logs - https://docs.docker.com/engine/daemon/logs/
- Local Docker CLI: `Docker version 29.4.2`, `dockerd --help`, and `dockerd --validate --config-file`

## Issues Found
- Removed the `overlay2.override_kernel_check=true` example because Docker deprecated it in 19.03 and removed it in 24.0. Replaced it with the current xfs `ftype=1` verification guidance for `overlay2`.
- Corrected the IP address pools explanation. Docker's built-in default pools are broader than the original "Docker Compose networks use `172.18-172.31.x.x`" statement and also include part of `192.168.0.0/16`.
- Clarified live restore wording. The original text implied `systemctl restart docker` always restarts only the daemon without affecting containers; Docker documents caveats when daemon-level options such as network or storage settings change.
- Corrected the reload/signals section. `SIGUSR1` does not enable debug mode; it forces `dockerd` to write a stack trace to the daemon log. Docker reloads supported settings with `SIGHUP` or, under systemd, `systemctl reload docker`.

## Review Notes
The final production `daemon.json` example was validated successfully with `dockerd --validate --config-file` using Docker 29.4.2. The logging examples use string values for `log-opts`, which matches Docker's daemon JSON requirements. Changing daemon-level logging defaults only affects newly created containers, which is a useful future caveat but was not required to correct the post.
