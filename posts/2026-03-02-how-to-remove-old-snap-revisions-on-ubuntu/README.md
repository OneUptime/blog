# How to Remove Old Snap Revisions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Disk Management, Linux, System Administration

Description: Reclaim disk space on Ubuntu by removing old snap package revisions that accumulate over time, with manual and automated cleanup methods.

---

Snap packages on Ubuntu keep multiple revisions installed simultaneously. When you install or update a snap, the previous version stays on disk so you can roll back if needed. By default, snapd keeps the two most recent revisions of each snap. On a system with many snaps, this doubles the disk space used by snap packages, and the old revisions contribute to `/var/lib/snapd/` growing without bound.

## Seeing the Problem

Start by understanding how much space old snap revisions are consuming:

```bash
# List all installed snaps with their revision numbers
snap list --all

# Example output:
# Name           Version  Rev   Tracking  Publisher   Notes
# code           1.85.0   168   latest/stable  vscode  -
# code           1.84.0   165   latest/stable  vscode  disabled
# firefox        122.0    3836  latest/stable  mozilla  -
# firefox        121.0    3804  latest/stable  mozilla  disabled
# core20         20231227 2182  latest/stable  canonical -
# core20         20231114 2105  latest/stable  canonical disabled

# The "disabled" ones are old revisions taking up space
# Check how much total space snap packages use
du -sh /var/lib/snapd/snaps/

# List snap loop devices to see individual packages
ls -lah /var/lib/snapd/snaps/
```

Each snap revision is stored as a squashfs image file. On a system with a dozen snaps each keeping two revisions, you might be using 5-10 GB for packages when half is redundant.

## Removing a Specific Old Revision

You can remove a specific revision with the `--revision` flag:

```bash
# Remove a specific revision number
sudo snap remove --purge code --revision 165
sudo snap remove --purge firefox --revision 3804

# Without --purge, snap keeps the snapshot data
# With --purge, everything for that revision is removed completely
```

## Cleaning Up All Disabled Revisions

The one-liner approach iterates through all disabled revisions and removes them:

```bash
# Remove all disabled (old) snap revisions in one command
snap list --all | \
  awk '/disabled/{print $1, $3}' | \
  while read snapname revision; do
    sudo snap remove --purge "$snapname" --revision "$revision"
  done
```

Breaking this down:
- `snap list --all` lists all revisions including disabled ones
- `awk '/disabled/{print $1, $3}'` extracts the name and revision number of disabled snaps
- The while loop removes each disabled revision

## Creating an Automated Cleanup Script

For regular maintenance, create a script and schedule it with cron:

```bash
sudo nano /usr/local/bin/clean-snap-revisions.sh
```

```bash
#!/bin/bash
# /usr/local/bin/clean-snap-revisions.sh
# Remove old snap revisions to reclaim disk space

set -euo pipefail

LOG_FILE="/var/log/snap-cleanup.log"
DRY_RUN="${1:-false}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Calculate space before cleanup
BEFORE=$(du -sh /var/lib/snapd/snaps/ 2>/dev/null | cut -f1)

log "Starting snap revision cleanup"
log "Space used before: $BEFORE"

# Find all disabled revisions
DISABLED=$(snap list --all | awk '/disabled/{print $1, $3}')

if [ -z "$DISABLED" ]; then
    log "No disabled revisions found. Nothing to clean."
    exit 0
fi

# Count how many will be removed
COUNT=$(echo "$DISABLED" | wc -l)
log "Found $COUNT disabled revision(s) to remove"

echo "$DISABLED" | while read -r snapname revision; do
    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would remove: $snapname revision $revision"
    else
        log "Removing: $snapname revision $revision"
        if sudo snap remove --purge "$snapname" --revision "$revision"; then
            log "Successfully removed $snapname rev $revision"
        else
            log "WARNING: Failed to remove $snapname rev $revision"
        fi
    fi
done

# Calculate space after cleanup
AFTER=$(du -sh /var/lib/snapd/snaps/ 2>/dev/null | cut -f1)
log "Space used after: $AFTER"
log "Cleanup complete"
```

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/clean-snap-revisions.sh

# Test with dry run first
sudo /usr/local/bin/clean-snap-revisions.sh true

# Run the actual cleanup
sudo /usr/local/bin/clean-snap-revisions.sh

# Schedule weekly cleanup
echo "0 3 * * 0 root /usr/local/bin/clean-snap-revisions.sh" | \
  sudo tee /etc/cron.d/snap-cleanup
```

## Configuring snapd to Keep Fewer Revisions

Rather than cleaning up after the fact, tell snapd to keep fewer revisions from the start. The `refresh.retain` setting controls how many revisions to keep:

```bash
# Check current setting (default is 2)
sudo snap get system refresh.retain

# Set to keep only 1 revision (current + no backups)
# This means you cannot roll back after an update
sudo snap set system refresh.retain=1

# Verify the setting
sudo snap get system refresh.retain
```

With `refresh.retain=1`, the old revision is removed immediately after a successful update instead of being kept as a fallback. If an update breaks something, you cannot roll back without downloading the previous version again.

A balanced approach is keeping the default of 2 but running weekly cleanup - this gives you one revision of rollback ability while preventing indefinite accumulation.

## Understanding Snap Disk Usage in Detail

```bash
# See disk usage per snap package
snap list --all | awk 'NR>1 {print $1, $3}' | while read name rev; do
    SIZE=$(du -sh "/var/lib/snapd/snaps/${name}_${rev}.snap" 2>/dev/null | cut -f1)
    STATUS=$(snap list --all | awk -v n="$name" -v r="$rev" '$1==n && $3==r {print $NF}')
    echo "$SIZE  $name (rev $rev) [$STATUS]"
done | sort -rh

# Check the mounts directory
ls -lah /snap/

# Each snap creates a loop mount - see them
df -h | grep snap
losetup --list | grep snap | wc -l  # Count mounted snaps
```

## Reclaiming Space from Snap Cache

Beyond revisions, snap also uses space for downloaded packages and assertion data:

```bash
# Check the assertion store size
du -sh /var/lib/snapd/assertions/

# Snap download cache - not typically large, but worth checking
du -sh /var/lib/snapd/cache/ 2>/dev/null

# The main space users
du -sh /var/lib/snapd/snaps/     # The actual snap images
du -sh /var/lib/snapd/snap/      # Snap data directories
du -sh /var/lib/snapd/           # Total snapd usage

# Snapshots from removed snaps (if you used snap remove without --purge)
sudo snap saved

# Remove saved snapshots you no longer need
sudo snap forget <snapshot-id>
```

## Monitoring Snap Space Over Time

```bash
# Add to a cron job for trending
echo "$(date +%Y-%m-%d) $(du -sh /var/lib/snapd/snaps/ | cut -f1)" >> \
  /var/log/snap-size-history.log

# Create a simple weekly report
cat > /usr/local/bin/snap-size-report.sh << 'EOF'
#!/bin/bash
echo "=== Snap Storage Report $(date) ==="
echo ""
echo "Total snap storage: $(du -sh /var/lib/snapd/ | cut -f1)"
echo "Snap images: $(du -sh /var/lib/snapd/snaps/ | cut -f1)"
echo ""
echo "Active snaps:"
snap list | column -t
echo ""
echo "All revisions (including disabled):"
snap list --all | grep disabled | wc -l
echo "  disabled revisions consuming extra space"
EOF

chmod +x /usr/local/bin/snap-size-report.sh
/usr/local/bin/snap-size-report.sh
```

On a fresh Ubuntu Desktop installation with the default set of snaps (Firefox, Thunderbird, snap store, etc.), removing old revisions after a few months of updates typically recovers 2-4 GB of disk space. On servers with many installed snaps, the savings can be significantly larger.
