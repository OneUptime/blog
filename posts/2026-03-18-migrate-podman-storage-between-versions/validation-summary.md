# Validation Summary: How to Migrate Podman Storage Between Versions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- containers/storage
- Podman CLI
- Bash scripting
- Container image and volume backup workflows
- containers-storage.conf

## Sources Consulted
- Podman `podman-system-migrate` documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman `podman-system-reset` documentation: https://docs.podman.io/en/latest/markdown/podman-system-reset.1.html
- Podman `podman-save` documentation: https://docs.podman.io/en/v4.4/markdown/podman-save.1.html
- Podman `podman-load` documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman `podman-volume-export` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman `podman-volume-import` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman `podman-stop` documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `podman-pod-stop` documentation: https://docs.podman.io/en/v4.9.3/markdown/podman-pod-stop.1.html
- Podman `podman-pod-ps` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman `podman-info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- containers-storage.conf documentation: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md

## Issues Found
- The introduction overstated `podman system migrate` as a storage-format migration for containers, images, and volumes. Updated it to describe the documented behavior: migrating existing containers to the current Podman version and handling runtime/user namespace related changes.
- The pre-migration pod count used `podman pod ps -q`, which lists pods in multiple states. Changed it to `podman pod ps --filter status=running -q` so the "Running pods" count matches the label.
- The list of `podman system migrate` operations included storage driver reconfiguration and general storage metadata migration. Replaced it with documented behavior, including migrating existing containers, stopping the rootless pause process, and changing OCI runtime configuration when `--new-runtime` is used.
- The storage-driver migration section instructed readers to edit `storage.conf` and then run `podman system migrate`. Official `podman system reset` documentation says reset must be run before changing storage fields such as `driver`, and that reset removes local storage. Updated the section to reset first, then edit the config, then reload saved images.

## Review Notes
The image save/load and volume export/import examples align with the Podman documentation. The guide still treats image exports as the primary backup path; production users should also explicitly export important named volumes before any workflow that uses `podman system reset`, because reset removes volumes.
