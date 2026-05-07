# Validation Summary: How to Use podman system reset Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman CLI
- Bash shell scripting
- Container image, volume, network, and storage management
- Rootless and rootful container storage behavior

## Sources Consulted
- Podman `podman system reset` documentation: https://docs.podman.io/en/latest/markdown/podman-system-reset.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/latest/markdown/podman-system-prune.1.html
- Podman `podman system migrate` documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman `podman system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman volume export` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman `podman volume import` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman `podman network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/latest/markdown/podman-images.1.html
- Podman `podman volume ls` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-ls.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html

## Issues Found
- The post originally understated the scope of `podman system reset`. It now reflects the official behavior that reset also removes Podman machines and the configured `graphRoot` and `runRoot` directories.
- The original storage-path explanation was too broad and imprecise. It now points to the default storage locations more accurately and uses `podman info --format` to show the actual configured paths.
- The original “When to Use” section incorrectly treated rootless UID/GID remapping as a reset use case. It now reflects the documented reset use cases around storage-driver and storage-path changes.
- The original backup and restore scripts used an Alpine helper container for volume archival. They were updated to use the native `podman volume export` and `podman volume import` commands documented by Podman.
- The original backup section claimed to be a “complete backup,” but the example did not fully cover everything reset can remove. It now describes the script more accurately as a pre-reset backup and explicitly calls out that `podman machine` data must be handled separately.
- The original restore script would fail noisily when archive globs matched nothing. It now enables `nullglob` so empty backup directories do not break the example loops.
- The original `podman system prune --build` explanation described it as “remove build cache,” which is not precise. It now explains that the flag also removes interrupted build containers in addition to the usual prune targets.
- The original `podman system df` example included a `Build Cache` row and described the output as exact. It now matches the documented scope more closely and notes the official caveat that reclaimable image size can be overstated when layers are shared.
- The original `podman system migrate` explanation said it rebuilt the Podman database and fixed interrupted operations. It now matches the official documentation: migrate handles Podman-version migrations, rootless `/etc/subuid` and `/etc/subgid` changes, and OCI runtime changes.
- The original automation script could skip backups based only on container/image/volume counts, even though reset also affects other Podman-managed state. That early-exit path was removed.

## Review Notes
- The restore example still recreates network names only; custom network settings must be re-applied from the saved `podman network inspect` JSON because Podman does not provide a simple one-command network import workflow in the referenced docs.
- The backup example intentionally saves tagged images and skips dangling `<none>:<none>` images.
