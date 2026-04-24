# Validation Summary: How to Use the --bind and --bind-https Flags in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker
- Docker Compose
- Container networking
- HTTPS / TLS

## Sources Consulted
- Portainer Docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer Docs: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer Docs: Deprecated and removed features - https://docs.portainer.io/advanced/deprecated
- Portainer Docs: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define and manage volumes in Docker Compose - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post listed the default bind values as `0.0.0.0:9000` and `0.0.0.0:9443`. Portainer's CLI documentation lists the defaults as `:9000` and `:9443`, so the defaults and surrounding explanation were corrected.
- The second example in Step 1 claimed to bind Portainer to localhost inside the container, but the command actually used `--bind=0.0.0.0:9000`. The wording was corrected to match the command's real behavior.
- Several shell examples were syntactically invalid because they placed inline comments after line-continuation backslashes. Those comments were moved so the `docker run` commands are valid shell syntax.
- The HTTPS-only example used the deprecated `--ssl` flag. Portainer's deprecated-features documentation marks `--ssl` as deprecated because HTTPS is enabled by default, so the example was corrected to use `--http-disabled` with `--bind-https` only.
- The original "specific IP inside the container" example was inaccurate because it checked the IP of a different temporary container and then hard-coded a dynamic bridge address. It was rewritten to use a user-defined bridge network with a fixed `--ip`, which is the reliable way to bind to a known container IP.
- The Compose example used the obsolete top-level `version` key and omitted the top-level declaration for the `portainer_data` named volume. The snippet was updated to current Compose conventions and the volume declaration was added.
- The reverse-proxy example needed an environment caveat. Docker's host-network driver is a Linux-host feature (and Docker Desktop opt-in), so the text was narrowed to a reverse proxy on the same Linux host.
- The verification example used `ss -tlnp | grep portainer`, which does not reliably show the Portainer process for bridge-networked containers. It was replaced with Docker-native inspection commands.
- `--snapshot-interval=300` was incorrect because Portainer expects a duration string such as `5m`. The example was corrected accordingly.

## Review Notes
- Portainer's documentation currently documents `--sslcert` and `--sslkey` for custom certificates, while the deprecated-features page separately notes deprecation activity around older SSL-related flags. The post now avoids the deprecated `--ssl` flag and keeps the focus on bind behavior.
- Portainer's current install and upgrade docs more commonly show `:lts` or `:sts` image tags than `:latest`. The post still uses `:latest`, which is not inherently incorrect, but version-pinned tags are generally clearer for production documentation.
