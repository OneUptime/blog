# Validation Summary: How to Use Portainer with VS Code Dev Containers - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VS Code Dev Containers (devcontainer.json spec)
- Dev Container Features (ghcr.io/devcontainers/features/*)
- Docker / Docker Compose
- Portainer CE
- Microsoft dev container base images (typescript-node, python, go)
- Language tooling: Node/TypeScript, Python (Black, Pylint, Ruff, mypy), Go

## Sources Consulted
- Dev Containers spec and reference: https://containers.dev/implementors/json_reference/
- devcontainers/features repository: https://github.com/devcontainers/features
- `docker-outside-of-docker` feature manifest: https://github.com/devcontainers/features/blob/main/src/docker-outside-of-docker/devcontainer-feature.json
- `docker-in-docker` feature manifest: https://github.com/devcontainers/features/blob/main/src/docker-in-docker/devcontainer-feature.json
- Portainer CE install docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- VS Code Dev Containers docs: https://code.visualstudio.com/docs/devcontainers/containers
- VS Code 1.85 release notes (codeActionsOnSave): https://code.visualstudio.com/updates/v1_85
- Microsoft dev container images (mcr.microsoft.com/devcontainers/*): https://github.com/devcontainers/images

## Issues Found

1. **Incorrect Portainer URL scheme.** The post instructed readers to open Portainer at `http://localhost:9443`. Port 9443 is Portainer CE's HTTPS endpoint (port 9000 is the legacy HTTP port, not published by the default install command). Changed the URL to `https://localhost:9443`.

2. **Invalid feature option `enableNonRootDocker`.** In Step 5, the `docker-outside-of-docker` feature block included `"enableNonRootDocker": "true"`. This option does not exist on either the `docker-outside-of-docker` or `docker-in-docker` feature manifests; valid options are `version`, `moby`, `mobyBuildxVersion`, `dockerDashComposeVersion`, `installDockerBuildx`, `installDockerComposeSwitch`, `socketPath`. Removed the invalid option, leaving `"version": "latest"`.

## Review Notes
- The `editor.codeActionsOnSave` entries use the legacy boolean form `"source.organizeImports": true`. Since VS Code 1.85 (Nov 2023) the string enum values (`"explicit"`, `"always"`, `"never"`) are preferred; boolean values still work today but are marked deprecated and may be phased out. Not changed as it remains functionally correct.
- `version: "3.8"` in the Compose files is still accepted but is a no-op in Docker Compose v2 — the `version` key is considered obsolete. Left as-is since it is still valid and matches common examples in existing docs.
- The `ms-python.pylint` extension is still published but Microsoft recommends Ruff for most new Python projects; the post already lists Ruff alongside it, which is reasonable.
- Dev container feature pinning (`:1`, `:2`) refers to the major version tag and is correct.
- `git config --global --add safe.directory ${containerWorkspaceFolder}` uses a valid dev container variable and is appropriate guidance given Git's safe-directory check.
