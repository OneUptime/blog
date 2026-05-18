# Validation Summary: How to Understand Linux Namespaces on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Linux kernel namespaces (mount, UTS, IPC, PID, network, user, cgroup, time)
- `unshare(1)` (util-linux)
- `nsenter(1)` (util-linux)
- `lsns(1)` (util-linux)
- `ip netns` (iproute2)
- `ipcmk` / `ipcs` (util-linux)
- Docker (`docker run`, `docker inspect`, `docker exec`)
- `/proc/[pid]/ns/` interface
- `/proc/sys/kernel/unprivileged_userns_clone` sysctl
- `hidepid` mount option for procfs

## Sources Consulted
- Linux kernel namespaces(7) man page — https://man7.org/linux/man-pages/man7/namespaces.7.html
- unshare(1) man page (util-linux) — https://man7.org/linux/man-pages/man1/unshare.1.html
- nsenter(1) man page — https://man7.org/linux/man-pages/man1/nsenter.1.html
- lsns(8) man page — https://man7.org/linux/man-pages/man8/lsns.8.html
- ip-netns(8) man page — https://man7.org/linux/man-pages/man8/ip-netns.8.html
- user_namespaces(7) man page — https://man7.org/linux/man-pages/man7/user_namespaces.7.html
- pid_namespaces(7) man page — https://man7.org/linux/man-pages/man7/pid_namespaces.7.html
- proc(5) — hidepid mount option — https://man7.org/linux/man-pages/man5/proc.5.html
- Docker docs on namespaces / `--network=host` / `--pid=host`

## Issues Found
- **Misleading comment about `--map-root-user`** (User Namespace section). The original comment read "A simpler approach using newuidmap/newgidmap" immediately before `unshare --user --map-root-user bash`. Per the `unshare(1)` man page, `--map-root-user` does *not* invoke the setuid helpers `newuidmap`/`newgidmap`; it writes the current UID/GID directly to `/proc/PID/uid_map` and `/proc/PID/gid_map` (equivalent to `--map-user=0 --map-group=0`). The `newuidmap`/`newgidmap` helpers are used for *multi-range* mappings drawn from `/etc/subuid`/`/etc/subgid` and are a different mechanism. Updated the comment to accurately describe what `--map-root-user` does.

## Review Notes
- The eight namespace types and their `CLONE_NEW*` flags are correct as of Linux kernel 5.6+ (which added the time namespace). All flag names match `<linux/sched.h>`.
- `unshare --pid --fork --mount-proc bash` is correct usage: `--fork` is required so the child (the new bash) becomes PID 1 in the new PID namespace, and `--mount-proc` implies `--mount`.
- `kernel.unprivileged_userns_clone` is a Debian/Ubuntu-specific sysctl (not in vanilla upstream Linux). It is still present on current Ubuntu LTS releases. On Ubuntu 24.04+, AppArmor adds an additional restriction layer via `kernel.apparmor_restrict_unprivileged_userns`, which is *not* mentioned in the post — this is a minor omission rather than an error and was not added per the instruction to only fix technical errors.
- The "minimal container" example creates `/tmp/mycontainer` but does not pre-create `/tmp/mycontainer/proc`, which `--mount-proc=/tmp/mycontainer/proc` requires. The post explicitly frames this as illustrative ("In practice you'd populate this with a base OS"), so it was left as-is.
- `hidepid=2` is valid; modern kernels also accept the symbolic alias `hidepid=invisible`. The numeric form used in the post is still supported and correct.
- The `ipcmk -S 5` command creates a System V semaphore set with 5 semaphores — correct usage.
