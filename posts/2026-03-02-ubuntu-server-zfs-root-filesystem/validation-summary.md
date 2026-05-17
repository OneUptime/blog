# Validation Summary: How to Set Up Ubuntu Server with ZFS Root File System

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- ZFS (OpenZFS) on Linux
- Ubuntu Server 24.04 (noble)
- zsys (Canonical's ZFS state management tool)
- debootstrap
- sgdisk / GPT partitioning
- GRUB (UEFI)
- systemd ZFS units (zfs-import-cache, zfs-mount, zfs-import.target, zfs-zed)
- ZFS ARC tuning

## Sources Consulted
- OpenZFS documentation, `zfsprops(7)`: https://openzfs.github.io/openzfs-docs/man/master/7/zfsprops.7.html
- OpenZFS "Ubuntu 22.04 Root on ZFS" guide: https://openzfs.github.io/openzfs-docs/Getting%20Started/Ubuntu/
- `debootstrap(8)` man page for Ubuntu noble: https://manpages.ubuntu.com/manpages/noble/man8/debootstrap.8.html
- `zsysctl(1)`, `zsysctl-list(1)`, `zsysctl-show(1)` man pages on Ubuntu manpages
- Launchpad bug #1968150 (zsys removal from Ubuntu installer)
- Ubuntu Discourse: "Future of ZFS on Ubuntu Desktop"
- `sgdisk(8)` / `gdisk` partition type code reference
- Arch Wiki ZFS page (systemd unit conventions)

## Issues Found

1. **Mount-order bug for /mnt/boot and /mnt/boot/efi** — The script created `/mnt/boot/efi` *before* mounting the ext4 `/boot` partition over `/mnt/boot`. The overmount hides the freshly created `efi/` directory, so the subsequent `mount ${DISK}1 /mnt/boot/efi` would fail with "mount point does not exist." Reordered: mount `/boot` first, then `mkdir -p /mnt/boot/efi`, then mount the EFI partition.

2. **Missing mirror URL in debootstrap command** — `debootstrap --arch=amd64 noble /mnt` omits the mirror argument. Per the Ubuntu `debootstrap(8)` man page, the mirror is optional in syntax but defaults to `http://deb.debian.org/debian` when not specified, which has no Ubuntu suites. Added an explicit `http://archive.ubuntu.com/ubuntu` mirror so the bootstrap succeeds for `noble`.

3. **Missing `mkdir -p /mnt/etc/zfs`** — `cp /etc/zfs/zpool.cache /mnt/etc/zfs/` is run immediately after debootstrap, but debootstrap does not create `/etc/zfs/` in the target rootfs (that directory is created by `zfsutils-linux`, which has not yet been installed in the chroot). Added a `mkdir -p` to ensure the destination exists.

4. **Duplicate `zsysctl show` command** — Two consecutive code blocks both showed `zsysctl show`, one labeled "Check zsys status" and the other "List managed boot environments." The latter should be `zsysctl list` (alias for `zsysctl machine list`), which enumerates machine IDs / boot environments rather than detailed state.

5. **Confusing "disable record size compression" wording** — The phrase conflated two distinct ZFS tunables (`compression` and `recordsize`). Rephrased to "disable compression or increase the record size on the relevant dataset," which matches what the subsequent example actually does.

6. **No mention of zsys deprecation** — The post installs and recommends `zsys` without noting that Canonical removed it from the desktop installer in 23.04+ and that upstream development has been largely dormant since 2021. Added a short upfront note so readers don't build a 2026-era system on an unmaintained tool, while keeping the existing zsys sections intact for users who still want them.

## Review Notes

- `acltype=posixacl` is still valid; OpenZFS keeps it as an alias for `acltype=posix`. Either is acceptable, so this was left as-is.
- Partition type code `BF00` ("Solaris root") is used by the official OpenZFS Ubuntu Root-on-ZFS guide and works fine for ZFS pools; `BF01` is an alternative. Left as-is since the post matches the upstream guide.
- The post enables `zfs-import-cache.service`, `zfs-mount.service`, `zfs-import.target`, and `zfs-zed.service` individually. Idiomatic practice is to enable `zfs.target` (which pulls in the others). Functionally equivalent, so not changed.
- `compression=lz4` is fine and remains a widely used default; `zstd` is increasingly recommended for new pools but is not strictly necessary here.
- The post does not configure `/etc/apt/sources.list` inside the chroot before running `apt update`. On a fresh debootstrap, `sources.list` typically only contains the base suite without `universe`/`updates`/`security`, which can affect package availability. This is a minor omission rather than an outright error, so it was not changed.
- The post sets `bootfs=rpool/ROOT/ubuntu` on the pool. This is a legacy property that modern Ubuntu ZFS setups no longer require for boot, but setting it does no harm.
