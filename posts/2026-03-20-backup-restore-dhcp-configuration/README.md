# How to Back Up and Restore DHCP Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Backup, Restore, Linux, Sysadmin, Network Management

Description: Regularly backing up the DHCP configuration file and lease database ensures you can quickly restore service after a server failure, with automated scripts to schedule backups and validate restores.

## Files to Back Up (Debian/Ubuntu ISC dhcpd)

| File | Purpose |
|------|---------|
| `/etc/dhcp/dhcpd.conf` | Scope and option configuration |
| `/etc/default/isc-dhcp-server` | Interface binding |
| `/var/lib/dhcp/dhcpd.leases` | Active lease database |
| `/var/lib/dhcp/dhcpd.leases~` | Previous lease file created during lease database rewrite (optional) |

## Manual Backup Script

```bash
#!/bin/bash
# dhcp-backup.sh - run daily via cron

BACKUP_DIR="/var/backups/dhcp"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Stop server briefly to ensure lease file consistency (optional)

# sudo systemctl stop isc-dhcp-server

if ! tar czf "$BACKUP_DIR/dhcp-backup-$DATE.tar.gz" \
    /etc/dhcp/dhcpd.conf \
    /etc/default/isc-dhcp-server \
    /var/lib/dhcp/dhcpd.leases; then
    echo "DHCP backup failed"
    exit 1
fi

# sudo systemctl start isc-dhcp-server

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "dhcp-backup-*.tar.gz" -mtime +30 -delete

echo "DHCP backup complete: dhcp-backup-$DATE.tar.gz"
```

Add to cron for daily execution:
```bash
# Run at 2 AM daily
echo "0 2 * * * root /usr/local/bin/dhcp-backup.sh" | \
  sudo tee /etc/cron.d/dhcp-backup
```

## Restore Procedure

```bash
#!/bin/bash
# dhcp-restore.sh

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

# Stop DHCP service
sudo systemctl stop isc-dhcp-server

# Extract backup
if ! sudo tar xzf "$BACKUP_FILE" -C /; then
    echo "Restore failed: unable to extract $BACKUP_FILE"
    exit 1
fi

# Validate configuration
if ! sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf; then
    echo "Configuration error! Please check dhcpd.conf"
    exit 1
fi

# Start DHCP service
sudo systemctl start isc-dhcp-server
sudo systemctl status isc-dhcp-server

echo "DHCP restore complete from $BACKUP_FILE"
```

## Windows Server Backup

```powershell
# Export DHCP database including leases
Export-DhcpServer -File "C:\Backup\DHCP\dhcp-$(Get-Date -Format 'yyyyMMdd').xml" -Leases

# Restore (on same or new server)
Stop-Service -Name DHCPServer
Import-DhcpServer -File "C:\Backup\DHCP\dhcp-20260320.xml" `
    -BackupPath "C:\Backup\DHCP\restore-tmp" -Leases -ScopeOverwrite -Force
Start-Service -Name DHCPServer
```

## Key Takeaways

- Back up both `dhcpd.conf` and `dhcpd.leases` - the config defines pools, leases define current assignments.
- Run `dhcpd -t -cf /etc/dhcp/dhcpd.conf` to validate the config before starting the restored service.
- Automate daily backups with cron; retain 30 days of history.
- Test the restore procedure on a non-production system to verify it works before you need it.
