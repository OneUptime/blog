# Validation Summary: How to Install Docker on openSUSE Leap

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker Compose
- openSUSE Leap
- Zypper
- systemd
- Btrfs
- Snapper
- firewalld
- Docker bridge networking

## Sources Consulted
- Docker Engine installation documentation: https://docs.docker.com/engine/install/
- Docker Engine binary installation documentation: https://docs.docker.com/engine/install/binaries/
- Docker Compose Linux installation documentation: https://docs.docker.com/compose/install/linux/
- Docker Btrfs storage driver documentation: https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker storage driver selection documentation: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker bridge networking documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker packet filtering and firewalld documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- openSUSE Docker wiki: https://en.opensuse.org/Docker
- openSUSE Leap Snapper documentation: https://doc.opensuse.org/documentation/leap/reference/html/book-reference/cha-snapper.html
- openSUSE Software package listings for docker, docker-compose, and docker-buildx: https://software.opensuse.org/

## Issues Found
- The original install command included `docker-buildx`, but the post does not use Buildx and official Leap package availability is version-dependent. Changed the primary install command to install the base `docker` package only.
- The post assumed Docker Compose was installed by the same zypper command. Changed Compose guidance to install it when available, verify `docker compose version`, and use Docker's documented manual CLI plugin install path when unavailable.
- The Docker CE zypper repository path was presented as an openSUSE Leap alternative. Docker's current Engine install docs do not list openSUSE/SLES as a tested repository install target, and the referenced SLES 15 x86_64 repository metadata returned 404 during review. Replaced it with Docker's upstream binary installation documentation link.
- The Snapper verification command checked `ALLOW_*` settings, which are user/group permission settings and do not verify excluded paths. Replaced it with a Btrfs subvolume check for `/var/lib/docker`.
- The Docker Compose YAML used folded scalar syntax for an embedded Python script, collapsing Python newlines and making the script invalid. Changed the command to a literal block and adjusted the embedded Python string quoting.
- The troubleshooting section hard-coded the Leap 15.5 OSS repository even though the prerequisites allow Leap 15.4+. Updated the example to Leap 15.6 and noted that users should adjust it for their release.

## Review Notes
- Docker's official docs now state that Docker Engine 29.0 and later defaults to the containerd image store, while the storage-driver discussion applies to classic storage drivers. The post's Btrfs section remains useful for systems using classic storage drivers, but it should be revisited when targeting Docker Engine 29+ specifically.
- Docker's firewalld behavior has improved: Docker creates its own `docker` firewalld zone when firewalld is enabled. The manual firewall commands remain a troubleshooting-oriented approach, but future revisions could clarify when they are needed.
