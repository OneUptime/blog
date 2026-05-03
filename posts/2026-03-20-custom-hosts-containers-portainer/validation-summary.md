# Validation Summary: How to Configure Custom Host File Entries for Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Portainer
- `extra_hosts` directive
- `--add-host` CLI flag
- `host-gateway` special value
- `host.docker.internal` hostname
- `/etc/hosts` file
- Shell scripting (entrypoint scripts)
- Dockerfile

## Sources Consulted
- Docker Compose specification — extra_hosts: https://docs.docker.com/reference/compose-file/services/#extra_hosts
- Docker run reference — --add-host: https://docs.docker.com/reference/cli/docker/container/run/#add-host
- Docker networking — host.docker.internal and host-gateway: https://docs.docker.com/desktop/features/networking/#use-cases-and-workarounds
- Docker Engine 20.10 release notes (host-gateway introduction)
- Linux man-pages: hosts(5) for /etc/hosts file format

## Issues Found
No technical issues found.

All technical claims and code examples were verified against official Docker documentation:

- The `extra_hosts` list syntax `"hostname:IP"` matches the Docker Compose specification.
- The `host-gateway` special value is correctly documented as resolving to the Docker host's IP (introduced in Docker 20.10, December 2020).
- The note that `host.docker.internal` must be added via `extra_hosts` on Linux (it is auto-provided on Docker Desktop) is correct.
- The `docker run --add-host="hostname:ip"` flag and `--add-host="host:host-gateway"` syntax are both supported.
- Multiple entries mapping different hostnames to the same IP work correctly — Docker simply appends each mapping to `/etc/hosts`.
- The default bridge network gateway IP `172.17.0.1` shown in the ping example is the standard default.
- The `/etc/hosts` entry format (`IP whitespace hostname`) shown in the verification output is correct per hosts(5).
- The entrypoint script that appends to `/etc/hosts` at container startup is a valid pattern; `/etc/hosts` is writable inside containers when the process has appropriate permissions (root by default).

## Review Notes
- The `version: "3.8"` Compose file declaration is now considered obsolete in modern Compose (the Compose Specification has dropped the version field), though it remains accepted for backwards compatibility. Not an error, but future revisions could omit it.
- `host.docker.internal` resolves to the host loopback gateway. On Linux this is whatever IP `host-gateway` resolves to (typically the bridge gateway, e.g., `172.17.0.1` for the default bridge). Behavior may differ on custom networks where the gateway IP varies.
- The Portainer-specific framing is light — most steps describe Docker / Compose mechanics rather than Portainer UI specifics. This is acceptable since `extra_hosts` in Portainer stack definitions uses the same Compose syntax.
- The mock-service patterns in Step 4 (e.g., redirecting `api.stripe.com` to `127.0.0.1`) only work for plain HTTP or when the mock presents a matching TLS certificate — TLS verification will otherwise fail. Worth noting in a future revision but not technically incorrect.
