# Validation Summary: How to Run podman auto-update Manually

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container auto updates
- systemd user services and timers
- Bash scripting

## Sources Consulted
- Podman `podman-auto-update` official documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman `podman-container-inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html

## Issues Found
- The verification command used `podman inspect webapp --format '{{.Image}}'`, which prints the container image ID in current Podman container inspect output. Changed it to `{{.ImageName}}`, the documented field for the container image name.
- The sample `podman auto-update` table showed only a bare container ID in the `CONTAINER` column. Updated the examples to match current Podman documentation, where the default output includes the container ID and name.

## Review Notes
- `podman auto-update --dry-run`, `podman auto-update`, `--format json`, and Go-template formatting are current and documented.
- Podman auto updates require containers or Kubernetes workloads to run inside systemd units, and only configured workloads with `io.containers.autoupdate` or the equivalent systemd `AutoUpdate` field are considered.
