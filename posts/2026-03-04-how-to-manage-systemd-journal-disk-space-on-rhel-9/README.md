# How to Manage systemd Journal Disk Space on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Systemd, Logging

Description: Step-by-step guide on manage systemd journal disk space on rhel 9 with practical examples and commands.

---

The systemd journal can consume significant disk space on RHEL 9. This guide covers managing journal size and retention.

## Check Journal Disk Usage

```bash
journalctl --disk-usage
```

## View Journal Configuration

```bash
cat /etc/systemd/journald.conf
```

## Configure Journal Size Limits

Edit the journal configuration:

```bash
sudo vi /etc/systemd/journald.conf
```

Set size limits:

```ini
[Journal]
SystemMaxUse=500M
SystemKeepFree=1G
SystemMaxFileSize=50M
MaxRetentionSec=1month
```

## Apply Configuration Changes

```bash
sudo systemctl restart systemd-journald
```

## Manually Vacuum Old Entries

Remove journal entries by size:

```bash
sudo journalctl --vacuum-size=200M
```

Remove entries older than a time period:

```bash
sudo journalctl --vacuum-time=2weeks
```

Remove entries keeping only a number of files:

```bash
sudo journalctl --vacuum-files=5
```

## Configure Persistent vs Volatile Storage

By default, RHEL 9 stores journals persistently in /var/log/journal/.

For volatile storage (RAM only):

```ini
[Journal]
Storage=volatile
RuntimeMaxUse=100M
```

For persistent storage:

```ini
[Journal]
Storage=persistent
SystemMaxUse=500M
```

## Forward Journals to Syslog

```ini
[Journal]
ForwardToSyslog=yes
```

## Monitor Journal Health

```bash
# Check for corrupted journal files
journalctl --verify

# View journal file details
ls -lh /var/log/journal/*/
```

## Automate Journal Cleanup

Create a systemd timer for regular cleanup:

```bash
sudo tee /etc/systemd/system/journal-cleanup.service <<EOF
[Unit]
Description=Clean old journal entries

[Service]
Type=oneshot
ExecStart=/usr/bin/journalctl --vacuum-time=2weeks --vacuum-size=500M
EOF

sudo tee /etc/systemd/system/journal-cleanup.timer <<EOF
[Unit]
Description=Weekly journal cleanup

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl enable --now journal-cleanup.timer
```

## Conclusion

Managing systemd journal disk space prevents /var from filling up on RHEL 9 servers. Set appropriate size limits and retention periods based on your logging requirements and available disk space.

