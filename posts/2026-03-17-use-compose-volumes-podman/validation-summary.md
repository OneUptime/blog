# Validation Summary: How to Use Compose Volumes with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Named volumes
- Bind mounts
- tmpfs mounts
- SELinux volume labels
- Podman volume management commands

## Sources Consulted
- Podman `--volume` option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `podman volume create` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `podman volume` command documentation: https://docs.podman.io/en/v5.2.3/markdown/podman-volume.1.html
- Podman `podman volume ls` documentation: https://docs.podman.io/en/v4.2/markdown/podman-volume-ls.1.html
- Podman `podman volume rm` documentation: https://docs.podman.io/en/v4.3/markdown/podman-volume-rm.1.html
- Podman `podman volume prune` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman `podman run --tmpfs` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Compose Specification volumes documentation: https://compose-spec.github.io/compose-spec/spec.html#volumes
- Compose Specification top-level volumes documentation: https://compose-spec.github.io/compose-spec/spec.html#volumes-top-level-element
- Docker Compose file volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- podman-compose project README and implementation: https://github.com/containers/podman-compose

## Issues Found
- The named volume example implied that `podman volume ls` would show the exact name `pgdata`. Compose implementations, including podman-compose, project-scope named volumes by default, so the actual volume is typically named like `<project>_pgdata`. Updated the example output comment accordingly.
- The cleanup section used `podman volume rm pgdata`, which would not remove the default project-scoped Compose volume. Updated it to `podman volume rm <project>_pgdata`.
- The shared-volume reader service used `tail -f /data/log.txt`, which can fail if the reader starts before the writer creates the file. Updated the command to wait until the file exists before tailing it.
- The introduction said podman-compose supports "all major volume types" from the Compose specification. The Compose spec includes additional mount types beyond the three covered in the article. Updated the wording to "common Linux volume types" to avoid overstating support.

## Review Notes
The examples use the legacy top-level `version: "3.8"` key. This is still commonly accepted by Compose tooling, but the current Compose Specification no longer requires it. No change was made because it does not make the examples invalid for podman-compose.
