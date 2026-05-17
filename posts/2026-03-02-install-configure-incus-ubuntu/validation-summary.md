# Validation Summary: How to Install and Configure Incus on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Incus (system container and VM manager, LXD fork)
- LXC (system containers)
- QEMU (virtual machines)
- Ubuntu 22.04 / 24.04
- Zabbly APT repository
- BTRFS / ZFS storage backends
- macvlan / bridged networking
- AppArmor

## Sources Consulted
- Incus official docs: https://linuxcontainers.org/incus/docs/main/
- Incus instance options reference: https://linuxcontainers.org/incus/docs/main/reference/instance_options/
- Incus snapshot manpage: https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/snapshot/
- Incus storage info manpage: https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/storage/info/
- Incus top manpage: https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/top/
- Incus default image servers: https://linuxcontainers.org/incus/docs/main/reference/image_servers/
- Incus init interactive source: https://github.com/lxc/incus/blob/main/cmd/incus/admin_init_interactive.go
- Zabbly Incus repo README: https://github.com/zabbly/incus
- images.linuxcontainers.org image listing

## Issues Found
1. **Incorrect CPU pinning option.** The post used `incus config set limited-container limits.cpu.allowance 2-3` for "CPU pinning to specific cores". `limits.cpu.allowance` actually controls how much CPU time is permitted (accepting either a percentage like `50%` or a CFS time slice like `25ms/100ms`); supplying `2-3` would not be interpreted as a CPU range. CPU pinning uses `limits.cpu` with a list/range value via the `cpuset` cgroup controller. Changed to `incus config set limited-container limits.cpu 2-3`.

2. **Wrong product name in init wizard transcript.** The wizard transcript showed `Would you like the LXD server to be available over the network?`. The actual Incus prompt (per `cmd/incus/admin_init_interactive.go`) is `Would you like the server to be available over the network?` — it never says "LXD" since Incus dropped that branding after the fork. Updated to match real output.

## Review Notes
- The Zabbly install instructions (key URL, sources file format, `incus`/`incus-tools` packages) are correct and match Zabbly's current README.
- `images:ubuntu/22.04` still works: the `images:` remote (images.linuxcontainers.org, maintained by the Linux Containers team) continues to host Ubuntu builds. Note this is separate from Canonical's `ubuntu:` remote which was removed from upstream LXD/Incus default remotes in 2024.
- `incus snapshot create/list/restore`, `incus top`, and `incus storage info <pool>` are all valid current commands.
- `incus exec my-vm -- bash` requires `incus-agent` to be running inside the VM image — the post correctly calls this out.
- The `Architectures: amd64 arm64` line in the sources file is space-separated, which is the correct deb822 format.
- The preseed YAML for `incus admin init --preseed` is well-formed and the field names (`networks`, `storage_pools`, `profiles`, `devices`) match Incus's expected schema.
- Minor stylistic observation (not corrected): `# Should show: security.privileged: "false"` may show nothing on a fresh container, because `security.privileged` is only emitted when explicitly set; the default is unprivileged regardless. This is not technically wrong, just potentially confusing for readers who run the command and see no output.
