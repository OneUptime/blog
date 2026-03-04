# How to Resolve 'Disk Full' Errors When /var/log Consumes All Space on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on resolve 'disk full' errors when /var/log consumes all space on rhel 9 with practical examples and commands.

---

/var/log consuming all disk space is a common issue on RHEL 9. Here is how to resolve it and prevent recurrence.

## Identify Space Usage

```bash
df -h /var
du -sh /var/log/*
du -sh /var/log/* | sort -rh | head -20
```

## Identify Large Log Files

```bash
find /var/log -type f -size +100M -exec ls -lh {} \;
```

## Clear Large Log Files Safely

Do not delete active log files. Truncate them instead:

```bash
sudo truncate -s 0 /var/log/messages
sudo truncate -s 0 /var/log/secure
sudo truncate -s 0 /var/log/maillog
```

## Remove Old Rotated Logs

```bash
sudo find /var/log -name "*.gz" -mtime +30 -delete
sudo find /var/log -name "*.[0-9]" -mtime +30 -delete
```

## Clean Journal Logs

```bash
sudo journalctl --vacuum-size=500M
sudo journalctl --vacuum-time=2weeks
```

## Configure Log Rotation

Edit logrotate configuration:

```bash
sudo vi /etc/logrotate.d/syslog
```

Set appropriate rotation:

```
/var/log/messages
/var/log/secure
/var/log/maillog
/var/log/cron
{
    rotate 4
    weekly
    maxsize 100M
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        /usr/bin/systemctl kill -s HUP rsyslog.service 2>/dev/null || true
    endscript
}
```

## Configure Journal Size Limits

```bash
sudo mkdir -p /etc/systemd/journald.conf.d/
sudo tee /etc/systemd/journald.conf.d/size.conf <<EOF
[Journal]
SystemMaxUse=500M
MaxRetentionSec=1month
EOF
sudo systemctl restart systemd-journald
```

## Set Up Alerts

```bash
# Add a cron job to alert on disk usage
echo '*/30 * * * * root [ $(df /var --output=pcent | tail -1 | tr -d " %") -gt 85 ] && echo "/var is over 85% full" | mail -s "Disk Alert" admin@example.com' | sudo tee /etc/cron.d/disk-alert
```

## Conclusion

A full /var/log partition disrupts logging and can cause service failures on RHEL 9. Truncate active files, clean old logs, configure proper rotation, and set up disk space alerts to prevent recurrence.

