# Validation Summary: How to Configure Incus Storage Pools on Ubuntu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubuntu
- Incus
- Incus storage pools and volumes
- Btrfs
- ZFS
- LVM
- Ceph
- Linux storage administration commands

## Sources Consulted
- Incus storage overview: https://linuxcontainers.org/incus/docs/main/explanation/storage/
- Incus storage driver comparison: https://linuxcontainers.org/incus/docs/main/reference/storage_drivers/
- Incus storage pool management: https://linuxcontainers.org/incus/docs/main/howto/storage_pools/
- Incus storage volume management: https://linuxcontainers.org/incus/docs/main/howto/storage_volumes/
- Incus move/copy storage volumes: https://linuxcontainers.org/incus/docs/main/howto/storage_move_volume/
- Incus Btrfs driver reference: https://linuxcontainers.org/incus/docs/main/reference/storage_btrfs/
- Incus ZFS driver reference: https://linuxcontainers.org/incus/docs/main/reference/storage_zfs/
- Incus LVM driver reference: https://linuxcontainers.org/incus/docs/main/reference/storage_lvm/
- Incus CLI manpages for `incus storage set`, `incus move`, and storage volume snapshots: https://linuxcontainers.org/incus/docs/main/reference/manpages/

## Issues Found
- The Btrfs examples created `btfs-pool` but later commands used `btrfs-pool`. I corrected the pool name to `btrfs-pool` consistently.
- The Btrfs section said no extra setup was required. Incus documents that `btrfs-progs` must be installed, so I added the package installation step and updated the comparison note.
- The ZFS example set `volume.block.filesystem=ext4` without enabling ZFS block mode. I added `volume.zfs.block_mode=true` so the filesystem option applies correctly.
- The LVM section described LVM as providing raw block devices to containers. Incus uses logical volumes underneath storage entities, and custom block volumes are not attachable to containers, so I corrected the description.
- The LVM section omitted the documented `lvm2` userspace dependency. I added the package installation step.
- The storage pool configuration section labeled ZFS refquota and rsync bandwidth settings as compression settings. I changed the comments to describe what those settings actually do.
- The ZFS tuning section described `zfs set compression=zstd incus/containers` as enabling compression globally. I changed it to set compression on the Incus ZFS pool/dataset instead.
- The Btrfs maintenance example derived the path from the pool `source`, which can be a block device or loop file. I changed it to the mounted local pool path under `/var/lib/incus/storage-pools/`.

## Review Notes
- The local environment did not have the `incus` CLI installed, so command validation was performed against the current official Incus documentation and manpages rather than local `--help` output.
- Some storage guidance remains version-sensitive, especially backend configuration keys and ZFS behavior. Re-check the current Incus storage driver references when updating the post.
