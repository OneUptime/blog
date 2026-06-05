# Validation Summary: How to Migrate Docker Storage Drivers Without Data Loss

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine storage drivers
- overlay2 / OverlayFS
- btrfs
- zfs
- devicemapper
- vfs
- Docker CLI
- Docker volumes
- Docker daemon configuration
- systemd
- Bash

## Sources Consulted
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Device Mapper storage driver - https://docs.docker.com/engine/storage/drivers/device-mapper-driver/
- Docker Docs: Deprecated Docker Engine features - https://docs.docker.com/engine/deprecated/
- Docker Docs: docker image save reference - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: Volumes, backup and restore - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Local Docker CLI help for `docker info`, `docker save`, `docker load`, and `docker volume create`

## Issues Found
- The introduction implied changing the storage driver "wipes out" Docker data. Docker's documentation states existing images and containers become inaccessible to the new driver, and can be accessed again if the original driver is restored. Updated the wording to say objects become inaccessible rather than deleted.
- The storage driver list described `devicemapper` only as deprecated. Docker Engine documentation says it was removed in Docker Engine 25.0. Updated the description.
- The `xfs_info` check parsed the last field as `ftype`, which usually returns `ftype=1` rather than `1`, causing a false warning. Updated the command to extract the numeric value.
- The backup section claimed to protect container data but only preserved images, volumes, and inspect output. Added a warning that important data in container writable layers must be moved to persistent storage or exported before proceeding.
- The combined image archive skipped untagged images because it built the archive from repository/tag names excluding `<none>`. Updated it to save unique image IDs.
- The `docker stop $(docker ps -q)` command fails noisily when no containers are running. Updated it to stop containers only when the list is non-empty.
- The overlay2 daemon configuration used `overlay2.override_kernel_check=true`, which Docker documentation lists as deprecated in Docker Engine 19.03 and removed in Docker Engine 24.0. Removed the unsupported storage option.
- The migration, rollback, and cleanup snippets assumed `/var/lib/docker` after Docker was stopped. Updated the backup process to save the Docker root directory and later snippets to reuse it, preserving correctness for custom Docker root directories.
- The rollback script selected a backup by date suffix and assumed the default Docker root. Updated it to use the saved Docker root and newest matching backup directory.

## Review Notes
Docker Engine 29.0 and later uses the containerd image store by default on fresh installations, and Docker's storage-driver documentation now distinguishes classic storage drivers from containerd snapshotters. The post remains technically valid as a classic Docker Engine storage driver migration guide, but future revisions could add a version-specific note for Engine 29+ and Docker Desktop/rootless mode.
