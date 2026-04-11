# Validation Summary: How to Install Redis on Amazon Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Redis 6.x and 7.x
- Amazon Linux 2 (AL2)
- Amazon Linux 2023 (AL2023)
- AWS EC2
- systemd service management
- firewalld
- Transparent Huge Pages (THP) kernel tuning

## Sources Consulted
- Amazon Linux 2023 FAQs — https://aws.amazon.com/linux/amazon-linux-2023/faqs/ (confirms AL2023 does not support DNF modules)
- AL2023 Relationship to Fedora — https://docs.aws.amazon.com/linux/al2023/ug/relationship-to-fedora.html (confirms AL2023 is not RHEL 9)
- AWS Redis6 to Valkey Migration Tutorial — https://docs.aws.amazon.com/linux/al2023/ug/redis6-to-valkey-al2023.html (confirms `redis6` service name and `/etc/redis6/redis6.conf` config path)
- List of Amazon Linux 2 Extras — https://docs.aws.amazon.com/linux/al2/ug/al2-extras-list.html (confirms `redis6` is a valid extras topic)
- Remi Repository EL9 RPM dependencies — https://rpmfind.net/linux/RPM/remi/enterprise/9/x86_64/remi-release-9.4-2.el9.remi.noarch.html (confirms RHEL 9 dependencies)
- EPEL 9 on AL2023 GitHub Issue — https://github.com/amazonlinux/amazon-linux-2023/issues/225 (confirms EPEL 9 / Remi incompatibility with AL2023)

## Issues Found

1. **Remi repository section for AL2023 was completely wrong.** The post instructed users to install `remi-release-9.rpm` and run `dnf module enable redis:remi-7.2` on AL2023. Two problems: (a) `remi-release-9.rpm` requires `system-release(releasever) = 9` and `epel-release = 9`, neither of which AL2023 provides — the RPM won't install; (b) AL2023 does not support DNF modules at all, so `dnf module enable` would fail. **Fix:** Replaced the Remi section with a note explaining the incompatibility and directing users to build from source.

2. **AL2023 binary names were wrong.** The post used `redis-server --version` after `dnf install redis6`. On AL2023, the `redis6` package installs namespaced binaries: `redis6-server` and `redis6-cli`. No symlinks to `redis-server`/`redis-cli` are created. **Fix:** Changed `redis-server --version` to `redis6-server --version` in the AL2023 section, and added a separate AL2023 block in the Verify section using `redis6-cli`.

3. **AL2023 service name was wrong.** The post used `systemctl start redis` uniformly. On AL2023 with the `redis6` package, the service is named `redis6`, not `redis`. **Fix:** Split the service section into AL2 (`redis`) and AL2023 (`redis6`) blocks with clear labels.

4. **AL2023 config file path was wrong.** The post listed `/etc/redis/redis.conf` as the config path with a note that AL2 "may" use `/etc/redis.conf`. On AL2, the path is definitively `/etc/redis.conf`. On AL2023, the path is `/etc/redis6/redis6.conf`. **Fix:** Replaced with explicit paths for each OS.

5. **Summary paragraph was inaccurate.** Referenced the Remi repository for Redis 7.x on AL2023. **Fix:** Updated to mention building from source and noted the namespaced binary/service names.

## Review Notes
- Amazon Linux 2's `redis6` extras topic has a scheduled deprecation date of 2026-01-31. As of the post date (2026-03-31), this topic may already be deprecated. Authors should verify availability and consider noting this.
- The THP disabling approach using `/etc/rc.d/rc.local` works but is dated. A systemd unit or tmpfiles.d approach would be more robust and is the modern best practice. This is not incorrect, just a potential improvement.
- The build-from-source section uses `yum groupinstall` which works on both AL2 and AL2023 (AL2023 aliases `yum` to `dnf`), so this is technically correct. Using `dnf` directly would be more idiomatic on AL2023.
- The `firewall-cmd` commands are correct syntax but `firewalld` is not installed by default on either AL2 or AL2023. Most EC2 users rely on AWS security groups. The "If Needed" qualifier is appropriate.
- The download URL `https://download.redis.io/releases/redis-7.2.4.tar.gz` follows the correct Redis download URL pattern and Redis 7.2.4 is a valid release version.
