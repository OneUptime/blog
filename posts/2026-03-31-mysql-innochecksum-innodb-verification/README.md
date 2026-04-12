# How to Use innochecksum for InnoDB Checksum Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Checksum, Administration

Description: Learn how to use innochecksum to verify InnoDB tablespace file integrity, detect page corruption, and validate backups before restoring them to production.

---

## What Is innochecksum?

`innochecksum` is a MySQL offline utility that reads InnoDB tablespace files (`.ibd` files) and verifies the checksums of each page. It detects corrupt or damaged pages without starting the MySQL server, making it the primary tool for validating InnoDB data file integrity after hardware failures, crashes, or before restoring a backup.

The MySQL server must be stopped before running `innochecksum` on tablespace files that are in active use.

## Basic Syntax

```bash
innochecksum [options] tablespace_file
```

## Basic Usage

```bash
# Stop MySQL first
sudo systemctl stop mysql

# Verify a single tablespace file
innochecksum /var/lib/mysql/mydb/orders.ibd
```

If the file is clean, there is no output. A corrupt page produces:

```text
page 1234 invalid (fails log sequence number check)
```

## Verbose Output

The `--verbose` flag prints a progress indicator every five seconds but requires `--log` to specify a log file:

```bash
# Print page details to a log file
innochecksum --verbose --log=/tmp/innochecksum.log /var/lib/mysql/mydb/orders.ibd
cat /tmp/innochecksum.log
```

```text
Filename = /var/lib/mysql/mydb/orders.ibd
page 0 okay: 0.260% done
page 19 okay: 5.208% done
page 38 okay: 10.156% done
...
```

To print only the total page count, use `--count`:

```bash
innochecksum --count /var/lib/mysql/mydb/orders.ibd
```

## Checking a Specific Page Range

```bash
# Check only pages 0 through 99
innochecksum --start-page=0 --end-page=99 /var/lib/mysql/mydb/orders.ibd

# Check a single specific page
innochecksum --page=1234 /var/lib/mysql/mydb/orders.ibd
```

## Specifying the Checksum Algorithm

InnoDB supports multiple checksum algorithms. Specify the one your server uses:

```bash
# Use CRC32 (default in MySQL 5.7+ and 8.0)
innochecksum --no-check --write=crc32 /var/lib/mysql/mydb/orders.ibd

# Use innodb (legacy algorithm)
innochecksum --strict-check=innodb /var/lib/mysql/mydb/orders.ibd

# Check the server's innodb_checksum_algorithm setting
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_checksum_algorithm';"
```

## Checking the System Tablespace

```bash
# Check the main ibdata1 file
innochecksum /var/lib/mysql/ibdata1
```

## Scanning All Tablespace Files

Use a shell loop to check all `.ibd` files in a database:

```bash
#!/bin/bash
DB_DIR="/var/lib/mysql/mydb"
ERRORS=0

for ibd in "$DB_DIR"/*.ibd; do
  if ! innochecksum "$ibd" 2>&1; then
    echo "CORRUPTION in $ibd"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo "All tablespace files are clean."
else
  echo "$ERRORS file(s) have corruption."
fi
```

## Validating a Backup

Run `innochecksum` on backup files before restoring to production:

```bash
# After copying backup files to a staging directory
for ibd in /backups/mysql/mydb/*.ibd; do
  innochecksum "$ibd" || echo "FAILED: $ibd"
done
```

## Recalculating Checksums After a Repair

If you have manually patched corrupt bytes in a tablespace (last resort), recalculate checksums:

```bash
innochecksum --write=crc32 /var/lib/mysql/mydb/orders.ibd
```

## Important Notes

- Always stop MySQL before running `innochecksum` on live tablespace files.
- `innochecksum` operates at the page level; it cannot repair corruption, only detect it.
- For detected corruption, use `mysqldump` to export recoverable data and recreate the table.

## Summary

`innochecksum` is the offline InnoDB integrity checking tool built into MySQL. Run it after server crashes or hardware events to detect page corruption before restarting MySQL, and include it in your backup validation workflow to verify `.ibd` files before restoration. If corruption is found, export salvageable data with `mysqldump`, recreate the table, and reimport rather than attempting in-place repair.
