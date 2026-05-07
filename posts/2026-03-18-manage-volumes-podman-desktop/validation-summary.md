# Validation Summary: How to Manage Volumes with Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman volumes
- Bind mounts
- SELinux volume labeling
- PostgreSQL and Node.js container examples

## Sources Consulted
- Podman Desktop documentation: Managing your application resources - https://podman-desktop.io/tutorial/managing-your-application-resources
- Podman documentation: podman-create / volume mount options - https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman documentation: podman-volume-create - https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman documentation: podman-volume-export - https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html
- Podman documentation: podman-volume-import - https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman documentation: podman-volume-rm - https://docs.podman.io/en/v4.3/markdown/podman-volume-rm.1.html
- Podman documentation: podman-system-df - https://docs.podman.io/en/latest/markdown/podman-system-df.1.html

## Issues Found
- The Node.js bind mount example mounted only the `src` directory into `/app/src`, then ran `npm start` from `/app`. With the base `node:18-alpine` image, this would normally fail unless the rest of the project, including `package.json`, was already present in the image. Changed the example to mount the whole project into `/app`.
- The bind mount example used a macOS-style `/Users/...` path while recommending `:Z`, which is relevant for SELinux on Linux hosts. Changed the path to a Linux-style `/home/...` path to match the SELinux note.
- The cleanup comment for `podman volume rm -f` said it force-removes a volume "even if referenced." Official Podman documentation states that if the volume is used by containers, those containers are removed first. Updated the comment to state this behavior explicitly.
- The cleanup comment for `podman volume rm --all` said "Remove all volumes." Because in-use volumes are not removed unless force is used, changed the comment to "Remove all volumes that are not in use."

## Review Notes
The CLI commands and flags reviewed are current in the official Podman documentation. Podman was not installed in the local review environment, so command behavior was verified against official documentation rather than local `--help` output.
