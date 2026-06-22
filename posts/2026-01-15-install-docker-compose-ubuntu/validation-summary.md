# Validation Summary: How to Install Docker Compose on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu (20.04, 22.04, 24.04)
- Docker / docker.io
- Docker Compose (plugin v2, standalone binary, and pip/v1)
- Docker Compose YAML configuration (services, networks, volumes, secrets, profiles, healthchecks, resource limits)
- nginx, MySQL, PostgreSQL, Redis (example images)

## Sources Consulted
- Docker Compose GitHub releases API — https://api.github.com/repos/docker/compose/releases/latest (verified the exact release asset filenames)
- Docker Compose install documentation — https://docs.docker.com/compose/install/
- Docker Compose CLI reference — https://docs.docker.com/reference/cli/docker/compose/
- Compose file specification — https://docs.docker.com/reference/compose-file/

## Issues Found
- **Standalone binary download URL produced a 404 (broken in both Method 2 and the "Update Docker Compose" section).** The command used `docker-compose-$(uname -s)-$(uname -m)`. `uname -s` returns `Linux` (capital L), yielding the asset name `docker-compose-Linux-x86_64`. This matched Docker Compose v1's capitalized asset names, but Compose v2+ release assets are lowercase (verified via the releases API: `docker-compose-linux-x86_64`, `docker-compose-linux-aarch64`, etc.). The capitalized form no longer exists, so the download would fail with a 404. Fixed by lowercasing the OS string in both occurrences: `docker-compose-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)`, which now resolves correctly on both x86_64 and aarch64.

## Review Notes
- **`version: '3.8'` is obsolete.** Modern Compose (v2+) ignores the top-level `version:` field and prints a warning ("the attribute `version` is obsolete, it will be ignored"). It is harmless and still extremely common in examples, so it was left as-is, but the field could be dropped in a future revision.
- **Method 3 (pip) installs the deprecated Compose v1.** `pip3 install docker-compose` installs the legacy Python-based Compose v1, which reached end of life in July 2023. Additionally, on Ubuntu 23.04+ (including 24.04), this command fails with an "externally-managed-environment" error (PEP 668) unless run in a virtualenv or with `--break-system-packages`. The plugin (Method 1) or standalone binary (Method 2) should be preferred. Content left intact as it is presented as an alternative, but this method is best avoided on current Ubuntu.
- **`sudo apt install docker-compose-plugin` requires Docker's official APT repository.** This package lives in `download.docker.com`, not Ubuntu's default repos. A user who installed Docker via the `docker.io` package (as shown earlier in the post) without adding Docker's official repo will not find `docker-compose-plugin` available. On stock Ubuntu the equivalent package is `docker-compose-v2`. This is a common nuance; the command works once Docker's official repo is configured.
- **`docker compose top` comment.** It is labeled "Show container stats" but `top` shows the running processes of each container (akin to `ps`/`top`), not resource statistics (which would be `docker stats`). Minor wording nit, not a functional error; left unchanged.
- All other YAML examples, CLI commands, flags, profiles, healthchecks, secrets, network (`internal: true`), and `deploy.resources` limits are correct and current for Compose v2+ (`deploy.resources` limits are honored by `docker compose up` in v2, unlike v1).
