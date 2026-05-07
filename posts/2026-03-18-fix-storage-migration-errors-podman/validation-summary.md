# Validation Summary: How to Fix Storage Migration Errors in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- containers/storage
- Podman storage drivers
- Podman libpod database storage
- Linux shell commands

## Sources Consulted
- Podman `podman system reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `podman system migrate` documentation: https://docs.podman.io/en/stable/markdown/podman-system-migrate.1.html
- Podman `podman save` documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-save.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman release notes for BoltDB to SQLite migration behavior: https://github.com/containers/podman/releases
- Podman project README for storage architecture overview: https://github.com/containers/podman

## Issues Found
- The post described BoltDB as Podman's current general database. Current Podman releases use SQLite for the libpod database, while older installations may still have legacy BoltDB databases. Updated the explanation and database paths to include `db.sql` in the storage root and legacy `bolt_state.db`.
- The post said Podman stores image layers in the local database. Podman uses containers/storage for image and layer storage, with the libpod database tracking container-related metadata. Updated the wording accordingly.
- The multi-image backup command used `podman save -o images-backup.tar $(podman images -q)`, which requires `--multi-image-archive` for multiple images in a Docker archive. Added the documented flag.
- The raw image-layer backup instructions implied the copied directory could be restored like a normal image archive. Clarified that it is a last-resort raw storage copy and not a `podman load` archive.
- The downgrade diagnostic command inspected only `bolt_state.db`, which misses SQLite-based installations. Replaced it with a directory/file listing that covers current and legacy database locations.
- The incomplete migration cleanup command deleted `overlay-containers/*/userdata/` directly. Replaced it with the documented `podman system prune --external --force` command for external storage remainders.
- The process cleanup command used `pkill -9` and called the processes zombies. Reworded this as stopping stuck Podman-related processes and removed the immediate SIGKILL.

## Review Notes
Podman was not installed in the review workspace, so CLI verification was performed against official Podman documentation and upstream release notes rather than local `--help` output.
