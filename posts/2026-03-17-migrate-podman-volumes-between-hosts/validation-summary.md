# Validation Summary: How to Migrate Podman Volumes Between Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman volumes
- SSH and scp
- rsync
- gzip
- Linux shell commands

## Sources Consulted
- Podman volume export documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman volume import documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman volume inspect documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman volume ls documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman volume command overview: https://docs.podman.io/en/v4.3/markdown/podman-volume.1.html

## Issues Found
- The compressed SSH streaming example piped directly into `podman volume import mydata -` without first creating the destination volume. Official Podman documentation states that `podman volume import` imports into an existing volume and does not create the volume. Updated the command to run `podman volume create mydata` before `podman volume import`.

## Review Notes
- The other Podman volume commands were consistent with the official documentation: `podman volume export` writes to stdout by default and supports `--output`, `podman volume import` accepts `-` for stdin, `podman volume inspect --format '{{ .Mountpoint }}'` uses a documented field, and `podman volume ls --format '{{ .Name }}'` uses a documented field.
- For production migrations, operators should still ensure the source workload is stopped or quiesced before export or rsync, especially for databases and applications with active writes.
