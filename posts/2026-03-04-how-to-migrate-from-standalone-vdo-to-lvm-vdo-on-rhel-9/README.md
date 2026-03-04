# How to Migrate from Standalone VDO to LVM-VDO on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, VDO, Migration, LVM

Description: Step-by-step guide on migrate from standalone vdo to lvm-vdo on RHEL with practical examples and commands.

---

Red Hat deprecated standalone VDO in favor of LVM-managed VDO in RHEL. This guide covers migrating from standalone VDO volumes to LVM-VDO.

## Check Current VDO Status

```bash
sudo vdostats --all
sudo vdo status --name=my-vdo-volume
```

## Backup Your Data

Before migration, back up all data:

```bash
sudo mkdir -p /backup
sudo rsync -av /mnt/vdo-mount/ /backup/
```

## Unmount the VDO Volume

```bash
sudo umount /mnt/vdo-mount
```

## Stop the VDO Volume

```bash
sudo vdo stop --name=my-vdo-volume
```

## Note Current VDO Settings

Record these for the new LVM-VDO volume:

```bash
sudo vdo status --name=my-vdo-volume | grep -E "logical|physical|slab"
```

## Remove the Standalone VDO Volume

```bash
sudo vdo remove --name=my-vdo-volume
```

## Create an LVM-VDO Volume

Create a physical volume and volume group:

```bash
sudo pvcreate /dev/sdb
sudo vgcreate vdo_vg /dev/sdb
```

Create the LVM-VDO logical volume:

```bash
sudo lvcreate --type vdo --name vdo_lv \
  --size 50G --virtualsize 100G \
  vdo_vg
```

## Create a Filesystem

```bash
sudo mkfs.xfs -K /dev/vdo_vg/vdo_lv
```

## Mount and Restore Data

```bash
sudo mkdir -p /mnt/vdo-mount
sudo mount /dev/vdo_vg/vdo_lv /mnt/vdo-mount
sudo rsync -av /backup/ /mnt/vdo-mount/
```

## Add Persistent Mount

```bash
echo '/dev/vdo_vg/vdo_lv /mnt/vdo-mount xfs defaults,_netdev 0 0' | \
  sudo tee -a /etc/fstab
```

## Verify LVM-VDO Status

```bash
sudo lvs -o+vdo_compression,vdo_deduplication
sudo vdostats --human-readable
```

## Conclusion

Migrating from standalone VDO to LVM-VDO on RHEL takes advantage of integrated LVM management, including snapshots, resizing, and consistent administration. Plan a maintenance window and always back up data before migration.

