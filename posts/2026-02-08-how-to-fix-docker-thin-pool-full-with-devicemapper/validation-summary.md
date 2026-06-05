# Validation Summary: How to Fix Docker 'Thin Pool Full' with devicemapper

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker devicemapper storage driver
- Docker overlay2 storage driver
- LVM thin provisioning
- Linux systemd services
- Linux shell scripting

## Sources Consulted
- Docker Docs: Device Mapper storage driver (deprecated) - https://docs.docker.com/engine/storage/drivers/device-mapper-driver/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: Deprecated Docker Engine features - https://docs.docker.com/engine/deprecated/
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs: docker image prune CLI reference - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs: docker container prune CLI reference - https://docs.docker.com/reference/cli/docker/container/prune/
- Docker Docs: docker image save CLI reference - https://docs.docker.com/reference/cli/docker/image/save/
- lvmthin(7) manual page - https://manpages.debian.org/bookworm/lvm2/lvmthin.7.en.html

## Issues Found
- The post said LVM automatic thin pool extension prevents the pool-full scenario entirely. Updated this to state that it reduces the risk only while free space remains in the volume group.
- The LVM monitoring instructions only checked `seg_monitor`. Added `lvchange --monitor y docker/thinpool` so dmeventd monitoring can be explicitly enabled when needed.
- The overlay2 prerequisite check only mentioned Linux kernel 4.0+. Updated it to include the documented RHEL/CentOS 3.10.0-514+ exception and the XFS `ftype=1` requirement.
- The migration example used `docker stop $(docker ps -aq)`, which can fail when there are no containers and also includes stopped containers. Changed it to stop only running containers with `docker ps -q | xargs -r docker stop`.
- The migration example said to export containers while showing `docker save`, which saves images. Updated the comment to say it saves important images.

## Review Notes
The devicemapper driver is deprecated, disabled by default in Docker Engine 23.0, and removed in Docker Engine 25.0. Docker Engine 29.0 and later uses the containerd image store by default for fresh installations, so overlay2 remains a valid classic-storage migration target but may not be the default backend on new current Docker installs.
