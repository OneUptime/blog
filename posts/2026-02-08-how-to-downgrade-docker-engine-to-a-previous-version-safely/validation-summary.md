# Validation Summary: How to Downgrade Docker Engine to a Previous Version Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose plugin
- containerd
- Ubuntu / Debian package management with apt
- CentOS / RHEL / Rocky Linux / Fedora package management with dnf
- DNF versionlock
- systemd services
- LVM and ZFS snapshots
- Cron

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Install Docker Engine on CentOS: https://docs.docker.com/engine/install/centos/
- Docker Docs: Select a storage driver: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker CLI help for `docker version` and `docker inspect`
- Local `apt-get(8)` documentation for `--allow-downgrades`
- Local `apt-mark(8)` documentation for `hold`, `unhold`, and `showhold`
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/versionlock.html
- Fedora package metadata for `python3-dnf-plugin-versionlock`: https://packages.fedoraproject.org/pkgs/dnf-plugins-core/python3-dnf-plugin-versionlock/

## Issues Found
- The post said Kubernetes may require a specific Docker version. Since Kubernetes removed direct Docker Engine integration and only legacy or cri-dockerd-based setups use Docker Engine this way, the wording was narrowed to legacy Kubernetes setups using cri-dockerd or other orchestrators.
- The backup and restore examples only handled `/var/lib/docker`. Docker's own uninstall documentation also calls out `/var/lib/containerd`, and Docker Engine 29.0+ uses the containerd image store by default for fresh installs, so the backup, restore, and clean-start examples now include `/var/lib/containerd`.
- The backup example stopped only `docker`, which can leave `docker.socket` or `containerd` active. The commands now stop `docker`, `docker.socket`, and `containerd` before copying or removing Docker data.
- The container stop command used `docker stop $(docker ps -q)`, which fails when there are no running containers. It now uses `docker ps -q | xargs -r docker stop`, which is appropriate for the Linux distributions covered by the guide.
- The install, hold, and versionlock examples did not include `docker-buildx-plugin` or `docker-compose-plugin`, even though the official Docker install commands include them and the post later uses `docker compose`. The examples now include these packages.
- The alert script attempted to write to `/usr/local/bin` and chmod the file without `sudo`, which fails for non-root users. The example now uses `sudo tee` and `sudo chmod`.
- The "Database Migration Issues" section was made more precise by referring to Docker and containerd metadata rather than a single internal Docker database.

## Review Notes
- The `apt-cache madison docker-ce` command is still valid, though Docker's current Ubuntu documentation now shows `apt list --all-versions docker-ce` for listing versions.
- The RPM package examples use the `.el9` suffix and Docker package epochs shown in Docker's CentOS documentation. Users on a different RHEL-family release must copy the exact version string from their own `dnf list --showduplicates` output.
- The `xargs -r` flag is GNU-specific, which is acceptable for the Linux distributions covered by this post.
