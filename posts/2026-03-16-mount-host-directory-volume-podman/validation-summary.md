# Validation Summary: How to Mount a Host Directory as a Volume in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container bind mounts
- SELinux volume labeling
- Rootless container user namespaces
- Nginx containers
- Node.js containers
- Python containers

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman --mount option documentation: https://docs.podman.io/en/v4.4/markdown/options/mount.html

## Issues Found
- The post said Podman automatically creates a nonexistent host directory for a bind mount. Current Podman documentation says a specified host path must already exist and Podman returns an error if it does not. Changed the text to instruct readers to create the directory before mounting it.
- The Nginx examples used SELinux relabeling on paths under `/var/www`, `/etc/nginx`, and `/var/log/nginx`. Podman documentation warns against relabeling system files and directories because it can break other confined services. Changed the host-side example paths to `/srv/...` app-owned paths while keeping the same container-side paths.
- The `--mount` example used `readonly` without an explicit value. Podman documents `readonly` as a boolean option. Changed it to `readonly=true` for clarity and direct alignment with the documented syntax.

## Review Notes
The remaining commands and explanations match Podman's documented `-v`, `:ro`, `:rw`, `:z`, `:Z`, multiple volume mount, and `--userns=keep-id` behavior. Podman was not installed in the local workspace, so validation was performed against official documentation rather than local CLI help.
