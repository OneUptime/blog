# How to Revert a Snap to a Previous Revision on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Package Management, Linux

Description: Learn how to revert a snap package to a previous revision on Ubuntu when an update breaks functionality, with practical commands and rollback strategies.

---

One of the practical advantages of snap packages over traditional `apt` packages is built-in rollback support. Snapd keeps the previous revision of every installed snap on disk, making it straightforward to revert when an update introduces a regression. This guide covers how to revert snaps, manage disk space from old revisions, and prevent automatic re-updates after rolling back.

## How Snap Revision Management Works

Every time a snap is updated, snapd downloads the new version but keeps the previous revision on disk. By default, snapd retains up to two revisions of each snap - the current one and one previous version. This means you can always roll back to the prior revision without downloading anything.

```bash
# See all installed revisions of a snap
snap list --all firefox

# Example output:
# Name     Version  Rev    Tracking       Publisher   Notes
# firefox  122.0    4123   latest/stable  mozilla     disabled
# firefox  123.0    4201   latest/stable  mozilla     current
```

The `disabled` entry is the previous revision, kept ready for rollback. The `current` entry is what's actively running.

## Reverting to the Previous Revision

The `snap revert` command switches back to the most recent disabled revision:

```bash
# Revert firefox to its previous revision
sudo snap revert firefox

# Verify the revert worked
snap list --all firefox
# Now the old revision will show as 'current' and the new one as 'disabled'
```

After reverting, the snap immediately runs the previous version. No reboot is required for command-line applications. GUI applications may need to be restarted if they were running during the revert.

```bash
# Verify which version is now active
snap list firefox
# Shows only the current revision

# If the snap has a --version flag, check it directly
firefox --version
```

## Reverting to a Specific Revision

If you need to go back further than one revision, or if you want to pin to a specific version, use the `--revision` flag:

```bash
# Revert to a specific revision number
sudo snap revert firefox --revision 4050

# List all available revisions to find the one you want
snap list --all firefox
```

Note that you can only revert to revisions that snapd still has on disk. If the old revision was purged (either manually or because it exceeded the retention limit), it cannot be restored without downloading it again from the Snap Store.

## Preventing Automatic Re-Update After Revert

After a revert, snapd will attempt to update the snap again on its next refresh cycle, which would undo your rollback. To prevent this, hold the snap's updates:

```bash
# Hold updates for firefox indefinitely
sudo snap refresh --hold=forever firefox

# Hold updates for a specific duration (e.g., 30 days)
sudo snap refresh --hold=720h firefox

# Check what holds are in place
snap refresh --time
snap get firefox refresh.hold
```

When a hold is set, snapd skips the snap during automatic refresh cycles. You can manually remove the hold when you're ready to update again:

```bash
# Remove the hold and allow updates
sudo snap refresh --unhold firefox

# Or explicitly refresh to the latest version
sudo snap refresh firefox
```

## Managing Disk Space from Old Revisions

Old snap revisions consume significant disk space. Each snap revision is a complete, self-contained package - there is no delta storage. A browser snap might be 200MB per revision, so two revisions means 400MB just for one application.

```bash
# See how much space snap revisions are using
du -sh /var/lib/snapd/snaps/

# List snap files with sizes
ls -lh /var/lib/snapd/snaps/*.snap

# Remove disabled (old) revisions for all snaps
sudo snap set system snapshots.automatic.retention=no
```

A more targeted approach is to adjust the number of retained revisions:

```bash
# Set global revision retention to 1 (current only, no rollback available)
sudo snap set system refresh.retain=1

# Set to 2 (default - current + one previous for rollback)
sudo snap set system refresh.retain=2

# Set to 3 (current + two previous revisions)
sudo snap set system refresh.retain=3
```

To manually remove specific disabled revisions without waiting for the retention policy:

```bash
# Remove a specific old revision
sudo snap remove firefox --revision 4050

# Remove all disabled revisions for a snap (keep only current)
# There's no single command for this - iterate through disabled revisions:
snap list --all firefox | grep disabled | awk '{print $3}' | while read rev; do
    sudo snap remove firefox --revision "$rev"
done
```

## Scripted Cleanup of Old Revisions

This script removes all disabled revisions across all installed snaps:

```bash
#!/bin/bash
# cleanup-snap-revisions.sh
# Removes all disabled snap revisions to reclaim disk space

echo "Cleaning up disabled snap revisions..."
echo "Space before:"
df -h /

# Get all disabled revisions
snap list --all | grep "disabled" | while read name version rev track publisher notes; do
    echo "Removing $name revision $rev..."
    sudo snap remove "$name" --revision "$rev"
done

echo ""
echo "Space after:"
df -h /
echo "Done."
```

```bash
chmod +x cleanup-snap-revisions.sh
sudo ./cleanup-snap-revisions.sh
```

## Reverting Data and Configuration

Rolling back a snap binary does not automatically roll back its data. User data lives in `~/snap/<snapname>/` and system data lives in `/var/snap/<snapname>/`. When you revert a snap, it uses the previous revision's binary but continues reading data from the current revision's data directory.

Most snaps handle this gracefully because they maintain backward-compatible data formats. However, if an update migrated your data to an incompatible format, reverting the binary alone may not be enough.

```bash
# Snap data directories
ls ~/snap/firefox/
# Shows numbered directories corresponding to revisions
# Plus 'common' and 'current' symlinks

ls /var/snap/firefox/
# System-wide snap data
```

For snaps that use snapshots for data backup:

```bash
# Create a snapshot before updating (captures current data state)
sudo snap save firefox

# List snapshots
snap saved

# Restore a snapshot (restores data, not binary revision)
sudo snap restore <snapshot-id>
```

Combining `snap revert` for the binary with `snap restore` for the data gives you a complete rollback to a previous state.

## When Revert Fails

Occasionally, a revert will fail because the previous revision's squashfs image is corrupted or missing:

```bash
# If revert fails, check snap logs
sudo journalctl -u snapd -n 50

# Force a fresh download of a specific revision
# First, note the revision number you want
# Then remove and reinstall from that revision
sudo snap remove firefox
sudo snap install firefox --revision 4050
```

The rollback capability in snaps is one of the more underappreciated features of the format. For production systems running snap-packaged software, testing updates in a staging environment and having a documented rollback procedure prevents downtime when a new version has unexpected issues.
