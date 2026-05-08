# Validation Summary: How to Run a Container with Tmpfs Mounts in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux tmpfs
- Container filesystem mounts
- Podman volumes and bind mounts
- PostgreSQL and nginx container examples

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Linux kernel tmpfs documentation: https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html

## Issues Found
- The post stated that tmpfs data is never written to disk and framed tmpfs as inherently suitable for sensitive data. Linux tmpfs uses virtual memory and can use swap unless swap is disabled or a supported no-swap option is used, so I changed the explanation to say tmpfs is not persisted in the container writable layer and added the swap caveat.
- The sensitive data example said tmpfs ensures secrets are never written to disk and are "gone forever." I changed this to say the data is not persisted in the container filesystem and is removed with the tmpfs mount when the container stops.
- The summary described tmpfs as "secure" without caveat. I removed that overstatement while preserving the main guidance about fast, temporary storage.

## Review Notes
The Podman command examples use current documented syntax for `--tmpfs`, `--mount type=tmpfs`, size and mode options, `--read-only`, `podman inspect`, volumes, and bind mounts. Podman was not installed in the local environment, so commands were validated against official documentation rather than executed locally.
