# Validation Summary: How to Set Up User Namespaces for Container Isolation on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Linux user namespaces
- Docker (userns-remap feature)
- Ubuntu (22.04 / 24.04)
- `/etc/subuid` and `/etc/subgid` subordinate ID files
- `usermod` (shadow-utils)
- `unshare` (util-linux)
- LXD / LXC
- AppArmor and seccomp (mentioned as complementary)

## Sources Consulted
- Docker userns-remap documentation: https://docs.docker.com/engine/security/userns-remap/
- user_namespaces(7) man page: https://man7.org/linux/man-pages/man7/user_namespaces.7.html
- unshare(1) man page: https://man7.org/linux/man-pages/man1/unshare.1.html
- usermod(8) man page: https://man7.org/linux/man-pages/man8/usermod.8.html
- LXD installation documentation: https://documentation.ubuntu.com/lxd/latest/installing/
- Ubuntu 23.10 restricted unprivileged user namespaces announcement: https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces
- CONFIG_USER_NS kernel option reference: https://cateee.net/lkddb/web-lkddb/USER_NS.html

## Issues Found
No technical issues found. All verified items are accurate:
- The `/proc/sys/kernel/unprivileged_userns_clone` sysctl is correctly described (it is a Debian/Ubuntu patch and defaults to 1).
- The `usermod --add-subuids FIRST-LAST` and `--add-subgids FIRST-LAST` long-form flags exist in shadow-utils on Ubuntu 22.04 and 24.04.
- Docker's `"userns-remap": "default"` setting correctly auto-creates the `dockremap` user and the `dockremap:100000:65536` subordinate range.
- The `/var/lib/docker/<UID>.<GID>/` storage layout (e.g., `100000.100000`) is correct for userns-remapped Docker.
- `--privileged` containers are correctly described as incompatible with userns-remap, and `--userns=host` is the right opt-out flag.
- `unshare --user --pid --mount --fork --map-root-user` is valid syntax, and `--map-root-user` maps the current user to UID 0 in the new namespace.
- `/proc/self/uid_map` format (`ns_uid host_uid count`) is correctly described.
- LXD install/init commands and the `lxc info` `Pid:` field are correct.
- `grep CONFIG_USER_NS /boot/config-$(uname -r)` correctly returns `CONFIG_USER_NS=y` on Ubuntu.
- Files owned by host root appearing as `nobody` (65534, the overflow UID) inside a userns-remapped container is accurate.

## Review Notes
- Ubuntu 23.10+ added an additional gate on unprivileged user namespace creation via AppArmor (`kernel.apparmor_restrict_unprivileged_userns`). The post's `unprivileged_userns_clone` check still works, but on very recent Ubuntu kernels this AppArmor restriction is the more relevant gate for unprivileged users; a future revision could mention it.
- The LXD example uses `ubuntu:22.04`. That image is still available and supported through 2027, but by 2026 `ubuntu:24.04` would be a more current LTS choice. Not a correctness issue.
- `sudo mkdir /data/myapp` in the bind-mount example assumes `/data` already exists; readers on a clean system may need `mkdir -p`. Minor, not a technical error.
- The performance overhead claim ("particularly when listing large directories") is plausible but somewhat narrow — UID/GID translation affects any operation that exposes ownership. Not incorrect, just a single example of many.
