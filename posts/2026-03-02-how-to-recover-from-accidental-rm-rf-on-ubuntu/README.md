# How to Recover from accidental rm -rf on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Data Recovery, System Administration, Troubleshooting

Description: Practical recovery options after running rm -rf accidentally on Ubuntu, covering backup restoration, filesystem recovery tools, and data salvage techniques.

---

Running `rm -rf` on the wrong directory is a sysadmin's nightmare. Unlike Windows where files go to a recycle bin, Linux deletes files immediately and the data isn't retrievable through the normal interface. But depending on how quickly you catch the mistake and what tools you have available, recovery is sometimes possible.

This guide goes through recovery options in order of reliability and safety.

## Stop Using the Filesystem Immediately

The single most important thing: stop writing to the affected filesystem right now. Every byte written after the deletion potentially overwrites recoverable data. If the deletion happened on the root partition and the system is running, you're in a difficult situation - the OS itself keeps writing logs and temporary files. If the data was on a separate partition, unmount it immediately:

```bash
# Unmount the affected partition to prevent further writes
sudo umount /dev/sda2

# If it won't unmount cleanly (busy)
sudo umount -l /dev/sda2   # lazy unmount
```

If it was on root, your best option is to power off (not shutdown - power off cuts writes faster) and boot from a live USB.

## Option 1: Restore from Backup

This is the only truly reliable recovery method. If you have a backup, use it.

```bash
# Restore from rsync backup
rsync -av /backup/path/ /destination/path/

# Restore from tar archive
tar -xzf /backup/archive.tar.gz -C /destination/

# If using timeshift
timeshift --restore --snapshot '2026-03-01_00-00-01'

# If using duplicati or similar, use its restore function
```

If you don't have a backup and you're reading this in panic - go to the next section, but also set up backups after you're through this.

## Option 2: Check if Files Are Still Open

On Linux, if a process has a file open, the inode persists even after `rm` removes the directory entry. The data is still accessible through `/proc`.

```bash
# Find open file descriptors for deleted files
lsof | grep deleted

# Or specifically look for recently deleted files
lsof 2>/dev/null | grep "(deleted)"
```

If a process has the file open, you can copy the data out:

```bash
# Example: process 1234 has file open on fd 5
# The path is /proc/1234/fd/5

# Copy it out
cp /proc/1234/fd/5 /tmp/recovered_file.txt

# If you deleted a log file that's still being written to
# Find the process writing to it
lsof | grep "/var/log/yourapp.log (deleted)"
# Note the PID and FD number from the output
cp /proc/PID/fd/FD /tmp/recovered.log
```

This is most useful for recovering log files, databases that are still running, and any file being actively used by a process.

## Option 3: Use extundelete for ext3/ext4 Recovery

`extundelete` can recover files from ext3 and ext4 filesystems by reading journal and inode data. It works best the sooner you run it.

```bash
# Install extundelete on a live USB system
sudo apt install extundelete

# Mount your backup disk or have space ready for recovered files
# Do NOT recover to the same partition you're recovering from

# Recover all deleted files from a partition
sudo extundelete /dev/sda2 --restore-all

# Recover a specific file
sudo extundelete /dev/sda2 --restore-file path/to/file.txt

# Recover a specific directory
sudo extundelete /dev/sda2 --restore-directory path/to/dir

# Files are recovered to ./RECOVERED_FILES/ in current directory
```

Run this from a live USB with the affected partition unmounted. Put the output on a different drive.

## Option 4: Use testdisk and photorec

`testdisk` is a broader filesystem recovery tool that can recover partition tables and directory structures. `photorec` (bundled with testdisk) does file carving - it ignores the filesystem and just looks for file signatures in raw disk data.

```bash
# Install
sudo apt install testdisk

# Run testdisk for filesystem-level recovery
sudo testdisk /dev/sda2

# Run photorec for file carving (recovers without filenames but works on corrupted filesystems)
sudo photorec /dev/sda2
```

testdisk walks you through an interactive menu. For `rm -rf` recovery:
1. Select your disk
2. Select partition type (usually Intel)
3. Select your partition
4. Choose "Undelete" or "Advanced" to browse inodes

photorec doesn't recover filenames but is very effective at recovering the actual file content for common formats (documents, images, code files, etc.). Choose an output directory on a different filesystem.

## Option 5: Use foremost for File Carving

`foremost` is another file carver similar to photorec, good at recovering specific file types:

```bash
sudo apt install foremost

# Recover all supported file types from a partition image
# First, make an image of the partition (to avoid further modification)
sudo dd if=/dev/sda2 of=/external/drive/sda2.img bs=4M status=progress

# Then run foremost on the image
sudo foremost -t all -i /external/drive/sda2.img -o /external/drive/recovered/
```

## Creating a Disk Image First

Before running any recovery tool directly on the partition, consider making a full image. This lets you try multiple recovery tools without risk:

```bash
# Create a raw image (requires space equal to partition size)
sudo dd if=/dev/sda2 of=/external/backup.img bs=4M status=progress

# Or use dc3dd which shows better progress and handles errors
sudo apt install dc3dd
sudo dc3dd if=/dev/sda2 of=/external/backup.img bs=4M log=/external/dd.log

# Verify the image
md5sum /dev/sda2 /external/backup.img
```

Now run all recovery tools against the image file rather than the live partition.

## Special Case: You Deleted /lib or /usr/lib

If you deleted critical system library directories while the system is still running, you might be able to copy them back from a running system with the same Ubuntu version before anything crashes:

```bash
# From another Ubuntu machine with the same version
# Find what packages provide the deleted files
dpkg -S /lib/x86_64-linux-gnu/

# On the affected system (if still running), reinstall packages
# that provided the deleted files
sudo apt install --reinstall libc6 libstdc++6 ...
```

If the system is already broken beyond recovery in this way, a live USB is your only option to reinstall or restore.

## After Recovery: Prevent Future Accidents

A few practices that help:

```bash
# Add a trash command instead of rm
sudo apt install trash-cli
alias rm='trash'   # in ~/.bashrc

# Or require interactive confirmation for certain operations
alias rm='rm -i'

# Use rsync for backups
rsync -av --delete /source/ /backup/

# Set up timeshift for system snapshots
sudo apt install timeshift
sudo timeshift --create --comments "Before risky operation"

# For important directories, use immutable flags
sudo chattr +i /etc/fstab   # prevents modification until flag is removed
```

Recovery from `rm -rf` is not guaranteed, but acting quickly and using the right tools gives you a reasonable chance of getting data back. The best insurance remains a regular, tested backup.
