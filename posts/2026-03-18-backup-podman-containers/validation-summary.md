# Validation Summary: How to Backup Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux shell scripting
- gzip
- rsync
- AWS CLI
- Object storage backup workflows

## Sources Consulted
- Podman export command reference: https://docs.podman.io/en/latest/markdown/podman-export.1.html
- Podman import command reference: https://docs.podman.io/en/latest/markdown/podman-import.1.html
- Podman inspect command reference: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect command reference: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman ps command reference: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman run command reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The post said the focus was backing up the writable layer and metadata. `podman export` exports the container filesystem, not only the writable layer, so this was changed to "container filesystem and metadata."
- The post said `podman export` captures base image layers. Official Podman documentation describes export as a container filesystem tar archive and points to `podman save` for preserving image parent layers. The wording now says export captures the merged filesystem but not the original image layer history.
- The post described running-container export as a point-in-time snapshot. This was softened to say Podman exports the filesystem as it exists during export and to recommend stopping or quiescing containers for application-consistent backups.
- The post said `podman inspect` contains "everything." This was changed to "low-level container configuration" to avoid overstating what inspect output guarantees.
- The restore caveat claimed the restored image "will be larger." This was changed to "can make the restored image use more storage" because storage impact depends on local layer sharing and image contents.
- The generated restore script was presented as making recovery straightforward. It does not fully reconstruct all possible container settings and can mishandle shell quoting, mounts, networking, users, labels, host IP bindings, entrypoints, or complex arguments. The text now presents it as a restore starting point that must be reviewed.
- The retention command `find /backups/podman -type d -mtime +30 -exec rm -rf {} +` could delete the parent backup directory if it matched the age condition. It now uses `-mindepth 1 -maxdepth 1` to target timestamped backup directories only.
- The verification script uses `gzip -t`, which validates gzip-compressed archives rather than all tar archives. The comment now says "compressed archive."

## Review Notes
The commands and flags reviewed are current in the official Podman documentation. The restore-script example remains intentionally simple and should be treated as a helper for simple containers, not a complete replacement for declarative container definitions such as Quadlet units, Kubernetes YAML, or source-controlled run scripts.
