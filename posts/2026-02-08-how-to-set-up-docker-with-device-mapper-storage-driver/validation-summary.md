# Validation Summary: How to Set Up Docker with Device Mapper Storage Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker storage drivers
- Device Mapper / `devicemapper`
- LVM thin provisioning
- Linux systemd services
- Docker daemon configuration

## Sources Consulted
- Docker Docs: Device Mapper storage driver (deprecated): https://docs.docker.com/engine/storage/drivers/device-mapper-driver/
- Docker Docs: Deprecated Docker Engine features: https://docs.docker.com/engine/deprecated/
- Docker Docs: Select a storage driver: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: `dockerd` daemon configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: `docker container run` `--storage-opt` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Local Docker CLI help: `docker run --help`

## Issues Found
- The post implied `devicemapper` remains a generally viable storage-driver option. Docker documentation states that it was deprecated in Docker Engine 18.09, disabled by default in 23.0, and removed in 25.0. Updated the description, introduction, and prerequisites to make the guide explicitly apply to legacy Docker Engine versions that still include the driver.
- The LVM metadata logical volume used `-l 1%FREE`, which allocates 1% of the remaining free space after the data volume, not the documented/recommended 1% of the volume group. Changed it to `-l 1%VG`.
- The direct-lvm setup applied an LVM autoextension profile but did not explicitly enable thin-pool monitoring if it was reported as `not monitored`. Added `sudo lvchange --monitor y docker-vg/thinpool`, matching Docker's documented direct-lvm procedure.
- The post claimed `devicemapper` supports per-container storage limits with `docker run --storage-opt size=...`. Docker's current `docker run` documentation lists that `size` option for `btrfs`, `overlay2`, `windowsfilter`, and `zfs`, not `devicemapper`. Rewrote the section to describe the legacy daemon-level `dm.basesize` configuration instead.
- The troubleshooting text quoted an incomplete thin-pool error. Updated it to the documented form, where Docker reports that the number of free data blocks is less than the minimum required.

## Review Notes
The remaining procedure matches Docker's legacy `devicemapper` direct-lvm documentation, but this is not appropriate for current Docker Engine releases. For new deployments on supported Docker Engine versions, use `overlay2` or the current containerd image store instead.
