# Validation Summary: How to Use cloud-init with Multipass for Custom VM Setup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cloud-init (user-data configuration)
- Multipass (Canonical's VM manager)
- Ubuntu 24.04
- YAML
- Docker / Docker Compose
- Python (pip, virtualenv)
- Node.js (NodeSource)
- systemd
- yamllint

## Sources Consulted
- cloud-init official documentation (modules reference): https://docs.cloud-init.io/en/latest/reference/modules.html
- Multipass launch command reference: https://documentation.ubuntu.com/multipass/en/latest/reference/command-line-interface/launch/
- Docker Compose standalone install docs: https://docs.docker.com/compose/install/standalone/
- Docker Compose GitHub release artifact naming conventions

## Issues Found
1. **Docker Compose download URL — case sensitivity bug.** In the "Complete Development Environment Example", the `runcmd` step used `$(uname -s)` to derive the platform name for the Docker Compose binary URL. On Linux, `uname -s` returns `Linux` (capitalised), while the GitHub release artifacts are lowercase (`docker-compose-linux-x86_64`), so the curl would have hit a 404. Changed `$(uname -s)` to `$(uname -s | tr A-Z a-z)` so the resolved filename matches the actual release asset name.

## Review Notes
- The statement that the `packages` directive handles both apt and snap packages is technically correct per current cloud-init docs — snaps can be installed through the same `packages:` directive using the `snap:` key syntax (e.g. `- snap: [certbot]`). The examples in this post only demonstrate the apt form, but the claim itself is accurate, so no change was made.
- The `users:` block in the "Managing Users" example does not include `- default` as the first entry. In cloud-init, omitting `- default` replaces the default user list entirely; on Multipass's Ubuntu images the `ubuntu` user is then re-created from the explicit entry rather than merged with the image defaults. This works in practice for the fields shown but is a common pitfall worth being aware of.
- `--memory` is the modern Multipass flag; older versions used `--mem`. The post correctly uses `--memory`, which is the recommended form on current Multipass releases.
- The Docker Compose v1-style standalone binary install is still functional but the modern recommendation is to install the `docker-compose-plugin` apt package (or use the `docker compose` subcommand bundled with Docker via `get.docker.com`). The standalone install demonstrated still works after the URL fix.
- The `break-system-packages = true` pip config is valid (PEP 668 escape hatch) and is reasonable for a disposable dev VM, though it disables the safety check that prevents pip from clobbering distro-managed Python packages.
