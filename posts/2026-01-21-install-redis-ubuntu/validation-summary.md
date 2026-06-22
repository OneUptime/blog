# Validation Summary: How to Install and Configure Redis on Ubuntu/Debian

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Redis Open Source
- Ubuntu and Debian APT packaging
- systemd services
- Redis configuration (`redis.conf`)
- Redis CLI
- Python `redis` client
- Node.js `ioredis` client
- Go `go-redis/v9` client
- Linux kernel tuning for Redis
- UFW firewall rules

## Sources Consulted
- Redis official APT installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- Redis official configuration file (`redis.conf`): https://download.redis.io/redis-stable/redis.conf
- Redis official administration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- Redis official security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis official ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis official data types documentation: https://redis.io/docs/latest/develop/data-types/
- Redis official licensing page: https://redis.io/legal/licenses/
- Redis official Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Redis official Go client guide: https://redis.io/docs/latest/develop/clients/go/
- ioredis official repository and documentation: https://github.com/redis/ioredis
- systemd service documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html

## Issues Found
- The official Redis APT repository setup was missing `sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg`. Added it to match Redis' current Debian/Ubuntu installation instructions and avoid keyring readability issues during `apt update`.
- The source installation flow created Redis data and log directories but did not create `/etc/redis/redis.conf`, even though later configuration and the custom systemd unit referenced that path. Added `/etc/redis` creation and copied the built source `redis.conf` there.
- The configuration snippet used `daemonize yes`, which conflicts with foreground execution under systemd. Changed it to `daemonize no` and added `supervised systemd` for the custom source-install service.
- The post referred to package-managed Redis as `redis` in service-management commands. Redis' Debian/Ubuntu package service is canonically `redis-server`; updated package-management commands and noted that the custom source-install service remains `redis`.
- The custom systemd service used `ExecStop=/usr/local/bin/redis-cli shutdown`, which fails after authentication is enabled unless credentials are supplied. Removed the explicit `ExecStop` so systemd can stop Redis with normal process termination.
- The Go client installation command used `go get` without initializing or requiring a Go module. Added `go mod init redis-example` with a note to skip it inside an existing module, matching current `go-redis/v9` guidance.
- The performance tuning commands wrote directly to privileged kernel and sysctl paths without `sudo`, and used `/etc/rc.local` for persistence, which is unreliable on modern Ubuntu/Debian systems. Replaced these with `sudo tee`, a small systemd oneshot service for Transparent Huge Pages, and `/etc/sysctl.d/99-redis.conf`.
- Troubleshooting used `systemctl status redis`, `journalctl -u redis`, and `netstat`. Updated the package service name to `redis-server` and replaced `netstat` with `ss`, which is the modern default tool on Ubuntu/Debian.
- The uninstall commands stopped `redis` and removed only `redis-server redis-tools`, which missed Redis' official `redis` package name. Updated the stop command to `redis-server` and included `redis` in the package removal list.

## Review Notes
The remaining examples are technically plausible and use current client APIs. For future hardening, the security section could be expanded to prefer Redis ACL users over only `requirepass`, and production deployments that expose Redis beyond localhost should also discuss TLS or private-network-only access.
