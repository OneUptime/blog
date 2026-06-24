# How to Automate Network Device Backups with Netmiko and Cron

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netmiko, Backup, Python, Cron, Network Automation, Cisco

Description: Learn how to automate daily configuration backups of Cisco and other network devices using Netmiko and a scheduled cron job, with versioned storage.

## Step 1: Create the Backup Script

```python
#!/usr/bin/env python3
# /usr/local/bin/network-backup.py

import os
import sys
import yaml
import logging
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from netmiko import ConnectHandler, NetmikoTimeoutException, NetmikoAuthenticationException

# Configuration

BACKUP_DIR = '/var/backups/network-configs'
INVENTORY_FILE = '/etc/network-automation/inventory.yaml'
LOG_FILE = '/var/log/network-backup.log'
MAX_WORKERS = 10

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger(__name__)

def backup_device(device_info):
    """Backup configuration of a single network device."""
    hostname = device_info.get('name', device_info['host'])
    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M%S')

    # Create backup directory
    device_dir = Path(BACKUP_DIR) / hostname
    device_dir.mkdir(parents=True, exist_ok=True)

    try:
        conn_params = {
            'device_type': device_info.get('device_type', 'cisco_ios'),
            'host': device_info['host'],
            'username': device_info['username'],
            'password': device_info['password'],
            'secret': device_info.get('enable_password', ''),
            'conn_timeout': 15,
        }

        with ConnectHandler(**conn_params) as conn:
            if device_info.get('enable_password'):
                conn.enable()

            # Get full running configuration
            config = conn.send_command('show running-config view full')

            # Write to timestamped file
            backup_file = device_dir / f"{hostname}_{timestamp}.cfg"
            backup_file.write_text(config)

            # Also create/update "latest" symlink
            latest_link = device_dir / f"{hostname}_latest.cfg"
            if latest_link.is_symlink():
                latest_link.unlink()
            latest_link.symlink_to(backup_file)

        log.info(f"SUCCESS: {hostname} backed up to {backup_file}")
        return {'hostname': hostname, 'status': 'success', 'file': str(backup_file)}

    except NetmikoAuthenticationException:
        log.error(f"FAILED: {hostname} - Authentication failed")
        return {'hostname': hostname, 'status': 'auth_failed'}

    except NetmikoTimeoutException:
        log.error(f"FAILED: {hostname} - Connection timed out")
        return {'hostname': hostname, 'status': 'timeout'}

    except Exception as e:
        log.error(f"FAILED: {hostname} - {e}")
        return {'hostname': hostname, 'status': 'error', 'error': str(e)}


def load_inventory(inventory_file):
    with open(inventory_file) as f:
        return yaml.safe_load(f)


def cleanup_old_backups(backup_dir, retain_days=30):
    """Remove backup files older than retain_days."""
    import time
    cutoff = time.time() - (retain_days * 86400)

    removed = 0
    for cfg_file in Path(backup_dir).rglob('*.cfg'):
        if cfg_file.is_file() and not cfg_file.is_symlink():
            if cfg_file.stat().st_mtime < cutoff:
                cfg_file.unlink()
                removed += 1

    log.info(f"Cleanup: removed {removed} backup files older than {retain_days} days")


if __name__ == '__main__':
    log.info("Starting network device backup")
    devices = load_inventory(INVENTORY_FILE)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = list(executor.map(backup_device, devices))

    # Summary
    success = sum(1 for r in results if r['status'] == 'success')
    failed = len(results) - success
    log.info(f"Backup complete: {success} succeeded, {failed} failed")

    # Clean up old backups
    cleanup_old_backups(BACKUP_DIR, retain_days=30)

    # Exit non-zero if any failures
    sys.exit(0 if failed == 0 else 1)
```

## Step 2: Create the Inventory File

```yaml
# /etc/network-automation/inventory.yaml
- name: router01
  host: 192.168.1.1
  device_type: cisco_ios
  username: backup_user
  password: backup_pass

- name: router02
  host: 192.168.1.2
  device_type: cisco_ios
  username: backup_user
  password: backup_pass

- name: switch01
  host: 192.168.1.10
  device_type: cisco_ios
  username: backup_user
  password: backup_pass
```

## Step 3: Set Up a Dedicated Backup User on Devices

```text
! Cisco IOS / IOS XE - create read-only backup user
username backup_user privilege 5 secret backup_pass

! Allow the user to view the full running configuration
privilege exec level 5 show running-config view full
file privilege 5
```

## Step 4: Schedule with Cron

```bash
# Test the script manually first
sudo chmod +x /usr/local/bin/network-backup.py
sudo /usr/bin/python3 /usr/local/bin/network-backup.py

# Add to root's cron for daily backups at 2am
sudo crontab -e
# Add:
# 0 2 * * * /usr/bin/python3 /usr/local/bin/network-backup.py >> /var/log/network-backup-cron.log 2>&1

# Verify cron entry
sudo crontab -l
```

## Step 5: Verify Backups and Check for Changes

```bash
# Check latest backups
ls -la /var/backups/network-configs/router01/

# View latest backup
head -20 /var/backups/network-configs/router01/router01_latest.cfg

# List the newest timestamped backups
ls -1t /var/backups/network-configs/router01/router01_20*.cfg | head -2

# Diff two specific backups to see what changed
diff /var/backups/network-configs/router01/router01_2026-03-19_020000.cfg \
     /var/backups/network-configs/router01/router01_2026-03-20_020000.cfg
```

## Conclusion

Automate network device backups with Netmiko by connecting to each device, running `show running-config view full`, and writing the output to timestamped files. Run the script as a cron job (daily at 2am), maintain 30-day retention with automatic cleanup, and create a `_latest.cfg` symlink for easy access. Use a dedicated read-only backup user on Cisco IOS and IOS XE devices to limit the blast radius of compromised credentials.
