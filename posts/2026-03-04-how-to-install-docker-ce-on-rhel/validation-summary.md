# Validation Summary: How to Install Docker CE on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Docker Engine / Docker CE
- DNF package management
- systemd
- Docker daemon configuration
- Docker storage drivers and XFS
- firewalld

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/

## Issues Found
- The XFS formatting command for a dedicated Docker filesystem did not explicitly enable `ftype=1`. Docker's `overlay2` storage driver requires XFS backing filesystems to have `d_type=true`, and Docker documents `mkfs.xfs -n ftype=1` as the correct format option. Changed `sudo mkfs.xfs /dev/sdb` to `sudo mkfs.xfs -n ftype=1 /dev/sdb`.
- The dedicated disk example moved `/var/lib/docker` aside and mounted a new filesystem, but did not restore the existing Docker data before starting Docker. Added `sudo cp -au /var/lib/docker.bak/. /var/lib/docker/` after mounting the new filesystem.
- The firewalld example instructed users to add `docker0` to the `trusted` zone. Current Docker documentation says Docker creates a `docker` firewalld zone with target `ACCEPT` and inserts bridge interfaces such as `docker0` into that zone automatically. Replaced the modifying commands with verification commands that inspect the `docker0` interface zone and the Docker-managed `docker` zone.

## Review Notes
Docker Engine 29.0 and later uses the containerd image store by default on fresh installations, while `overlay2` remains the classic storage driver. The post's explicit `storage-driver` configuration is valid for the classic driver path, but future revisions could mention the Docker 29 containerd image store behavior for newer installations.
