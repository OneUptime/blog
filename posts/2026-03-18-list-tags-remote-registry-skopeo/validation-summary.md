# Validation Summary: How to List Tags in a Remote Registry with Skopeo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skopeo
- Podman
- Docker-compatible container registries
- GitHub Container Registry
- Quay.io
- Docker Hub
- jq
- Bash scripting
- Cron

## Sources Consulted
- Skopeo upstream `skopeo-list-tags(1)` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
- Podman `podman-login(1)` documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- `containers-auth.json(5)` documentation: https://www.mankier.com/5/containers-auth.json
- Red Hat documentation on Skopeo, Podman, and shared auth files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_running-skopeo-buildah-and-podman-in-a-container
- GitHub package page for `ghcr.io/actions/actions-runner`: https://github.com/actions/runner/pkgs/container/actions-runner

## Issues Found
- The GitHub Container Registry example used `docker://ghcr.io/actions/runner`, but the documented public GitHub Actions runner package is `ghcr.io/actions/actions-runner`. Updated the command to use `docker://ghcr.io/actions/actions-runner`.
- One `jq` example was labeled "Get the latest semantic version tags", but the command only filters semantic version-like tags and does not sort or select the latest version. Updated the comment to "Get semantic version-like tags" to match the command's behavior.

## Review Notes
- The local environment did not have `skopeo` or `podman` installed, so CLI flags and behavior were verified against upstream and vendor documentation rather than local `--help` output.
- The `--creds`, `--authfile`, `--tls-verify=false`, and `--cert-dir` examples match the current Skopeo `list-tags` documentation.
