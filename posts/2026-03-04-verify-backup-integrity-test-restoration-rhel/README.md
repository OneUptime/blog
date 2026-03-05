# How to Verify Backup Integrity and Test Restoration Procedures on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Backup, Verification, Integrity, Restoration, Linux

Description: Verify backup integrity and test restoration procedures on RHEL to ensure your backups are usable when you actually need them.

---

A backup that cannot be restored is worthless. Regularly verifying backup integrity and testing restoration is essential for any RHEL disaster recovery plan.

## Verifying tar Backup Integrity

Test the archive without extracting:

```bash
# Test the integrity of a gzip-compressed tar archive
tar tzf /backup/full-backup-20260304.tar.gz > /dev/null
echo "Exit code: $?"
# Exit code 0 means the archive is intact

# For xz-compressed archives
tar tJf /backup/full-backup-20260304.tar.xz > /dev/null
```

## Using Checksums for Verification

Generate checksums when creating backups and verify them later:

```bash
# Generate a SHA-256 checksum after creating the backup
sha256sum /backup/full-backup-20260304.tar.gz > /backup/full-backup-20260304.sha256

# Later, verify the checksum matches
sha256sum -c /backup/full-backup-20260304.sha256
# Should output: /backup/full-backup-20260304.tar.gz: OK
```

## Automating Integrity Checks

Create a script that verifies all backups and reports issues:

```bash
#!/bin/bash
# /usr/local/bin/verify-backups.sh
BACKUP_DIR="/backup"
LOG="/var/log/backup-verify.log"
ERRORS=0

echo "=== Verification started: $(date) ===" >> "$LOG"

# Verify each tar.gz backup
for archive in "$BACKUP_DIR"/*.tar.gz; do
  [ -f "$archive" ] || continue
  if tar tzf "$archive" > /dev/null 2>&1; then
    echo "OK: $archive" >> "$LOG"
  else
    echo "FAILED: $archive" >> "$LOG"
    ERRORS=$((ERRORS + 1))
  fi
done

# Verify checksums if they exist
for checksum_file in "$BACKUP_DIR"/*.sha256; do
  [ -f "$checksum_file" ] || continue
  if sha256sum -c "$checksum_file" >> "$LOG" 2>&1; then
    echo "CHECKSUM OK: $checksum_file" >> "$LOG"
  else
    echo "CHECKSUM FAILED: $checksum_file" >> "$LOG"
    ERRORS=$((ERRORS + 1))
  fi
done

echo "=== Verification complete: $ERRORS errors ===" >> "$LOG"

# Alert on failures
if [ "$ERRORS" -gt 0 ]; then
  mail -s "Backup Verification FAILED" admin@example.com < "$LOG"
fi
```

## Test Restoration to a Temporary Location

Periodically restore backups to a separate directory and verify:

```bash
# Create a test restoration directory
mkdir -p /tmp/restore-test

# Extract the backup to the test location
tar xzf /backup/full-backup-20260304.tar.gz -C /tmp/restore-test

# Verify critical files exist and are readable
ls -la /tmp/restore-test/etc/passwd
ls -la /tmp/restore-test/etc/shadow
cat /tmp/restore-test/etc/hostname

# Compare restored files with current system
diff /etc/fstab /tmp/restore-test/etc/fstab

# Clean up
rm -rf /tmp/restore-test
```

Schedule backup verification as a weekly cron job to catch problems early.
