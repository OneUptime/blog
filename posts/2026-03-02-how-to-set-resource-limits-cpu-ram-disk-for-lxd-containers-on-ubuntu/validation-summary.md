# Validation Summary: How to Set Resource Limits (CPU, RAM, Disk) for LXD Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LXD (Linux Containers daemon)
- Linux cgroups (v1 and v2)
- Ubuntu (24.04 used in examples)
- ZFS / btrfs / LVM storage backends
- `lxc` CLI

## Sources Consulted
- LXD Instance options reference: https://documentation.ubuntu.com/lxd/en/latest/reference/instance_options/
- LXD Disk device reference: https://documentation.ubuntu.com/lxd/en/latest/reference/devices_disk/
- LXD 2.0: Resource control (Stéphane Graber): https://stgraber.org/2016/03/26/lxd-2-0-resource-control-412/
- LXD blog post on resource control: https://ubuntu.com/blog/lxd-2-0-resource-control-412
- Linux kernel cgroup memory controller docs: https://docs.kernel.org/admin-guide/cgroup-v1/memory.html
- LXD profile / device add CLI reference

## Issues Found

1. **`limits.cpu.priority` default value was wrong.** The post claimed "default is 1024" in a code comment. The actual LXD user-facing default for `limits.cpu.priority` is `10` (range 0-10); 1024 is the underlying cgroup v1 `cpu.shares` value, not the LXD config default. Fixed the comment to say "10 is the maximum and the default".

2. **Inaccurate cgroup-shares range claim.** The post stated "LXD translates to cgroup shares 1-9999". The actual translation does not produce that range. Reworded to a more accurate, generic description.

3. **`limits.memory.enforce hard` description was incorrect.** The post said it "kills the entire container when memory is exceeded (not just the OOM process)". Hard enforcement causes the kernel OOM killer to terminate processes within the container's cgroup; it does not kill the container as a whole. Reworded to describe per-process OOM kills and noted that `hard` is the default.

4. **Invalid disk-device IOPS keys.** The post used `limits.read.iops` and `limits.write.iops` as separate device keys. These are not valid LXD keys — IOPS limits are specified as a value suffix on `limits.read` / `limits.write` (e.g., `limits.read=1000iops`). Replaced with the correct suffix-style syntax.

5. **Misleading `limits.memory.swap.priority` comment.** The post described this option as "Or limit the swap amount". The option actually controls swap likelihood (higher value = less likely to be swapped), not the swap amount. Reworded the comment.

6. **OOM kill count lookup path was wrong.** The post suggested `cat /proc/meminfo | grep -i oom`. `/proc/meminfo` does not contain OOM counters. Replaced with `cat /sys/fs/cgroup/memory.events | grep oom`, which is the correct cgroup v2 location.

## Review Notes

- The disk I/O limits section notes that "granular I/O limits ... require LVM backend"; in practice, I/O limits depend on the kernel's blkio/io cgroup controller and are usually associated with block-backed storage (LVM, Ceph). The note is a reasonable approximation but could be expanded in the future to mention other block-based backends.
- The CPU priority example uses `limits.cpu.priority 10`, which is the default value. Setting it to 10 only gives the container a relative priority advantage if other containers are set to a lower value. This nuance is not a technical error but could be clarified.
- Examples consistently use `ubuntu:24.04`, which is current as of the post's date.
- The `limits.memory.swap` boolean default is `true` (swap enabled), which matches the post's wording ("By default, containers can use swap if memory is exhausted").
- `-d root,size=...` shorthand on `lxc launch` is correct for overriding device properties at launch time.
