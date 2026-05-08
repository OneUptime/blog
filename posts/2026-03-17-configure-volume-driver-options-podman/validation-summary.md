# Validation Summary: How to Configure Volume Driver Options in Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Podman named volumes
- Local volume driver options
- Linux mount options
- tmpfs
- NFS
- Bind mounts
- Block device filesystems

## Sources Consulted
- Podman official documentation: `podman-volume-create` - https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman official documentation: `podman-run` - https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman official documentation: `podman-volume-inspect` - https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman official documentation: `podman-volume-ls` - https://docs.podman.io/en/latest/markdown/podman-volume-ls.1.html
- Podman official documentation: `podman-volume-mount` - https://docs.podman.io/en/stable/markdown/podman-volume-mount.1.html

## Issues Found
- The post described only `type`, `device`, and `o` as local driver options. Current Podman documentation also lists `copy` and `nocopy`, so the wording was updated to identify those three as the main mount-related options and mention `copy`/`nocopy`.
- Several examples used local-driver mount options without root privileges. Podman documents that local-driver `o` options other than ownership-related options require root privileges, so the affected volume creation, inspection, listing, and run commands were updated to use `sudo podman` consistently.
- The common mount option examples used only `--opt o=...` without a filesystem `type` and `device`, and reused the same volume name in multiple commands. They were updated to complete tmpfs-backed examples with unique volume names.
- The `--mount` example used Docker-style inline `volume-opt=...` parameters, which are not listed in Podman's current `--mount type=volume` options. It was changed to create the volume with driver options first, then mount the pre-created volume with Podman's supported `--mount type=volume,source=...,target=...` syntax.

## Review Notes
Podman was not installed in the local workspace, so commands could not be executed directly. Verification was performed against the current official Podman documentation.
