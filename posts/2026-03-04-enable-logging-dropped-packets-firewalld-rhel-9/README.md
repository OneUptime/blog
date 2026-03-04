# How to Enable Logging for Dropped Packets in Firewalld on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Firewalld, Logging, Security, Linux

Description: How to configure firewalld on RHEL to log dropped and rejected packets for security auditing, troubleshooting, and intrusion detection.

---

By default, firewalld silently drops or rejects packets that do not match any allow rule. This is fine for security, but terrible for visibility. You have no idea what traffic is being blocked, whether it is a legitimate connection being denied by mistake or an attack you should know about. Enabling logging gives you that visibility.

## Method 1: LogDenied Setting

Firewalld has a built-in `LogDenied` option that logs all denied packets:

```bash
# Check the current LogDenied setting
firewall-cmd --get-log-denied

# Enable logging for all denied packets
firewall-cmd --set-log-denied=all
```

Available values for LogDenied:

| Value | What It Logs |
|---|---|
| off | Nothing (default) |
| all | All denied packets |
| unicast | Only denied unicast packets |
| broadcast | Only denied broadcast packets |
| multicast | Only denied multicast packets |

For most environments, `all` is what you want:

```bash
# Log all denied packets
firewall-cmd --set-log-denied=all
```

This setting takes effect immediately and persists across reboots.

## Viewing the Logs

Denied packets are logged to the kernel log:

```bash
# View firewall log entries
journalctl -k | grep "FINAL_REJECT\|FINAL_DROP"

# Follow logs in real time
journalctl -kf | grep -i "reject\|drop"

# Or check dmesg
dmesg | grep "FINAL_REJECT\|FINAL_DROP"
```

Log entries look something like this:

```
kernel: filter_IN_public_REJECT: IN=eth0 OUT= MAC=... SRC=203.0.113.50 DST=10.0.1.100 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=12345 DF PROTO=TCP SPT=54321 DPT=3306 WINDOW=64240 RES=0x00 SYN URGP=0
```

This tells you the source IP, destination IP, protocol, source port, destination port, and the interface it arrived on.

## Method 2: Rich Rules for Selective Logging

If `LogDenied=all` generates too much noise, use rich rules to log specific traffic:

### Log Dropped SSH Attempts

```bash
# Log SSH connection attempts that get dropped
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" service name="ssh" log prefix="SSH-ATTEMPT: " level="warning" limit value="5/m"' --permanent
firewall-cmd --reload
```

### Log Traffic from a Suspicious Subnet

```bash
# Log all traffic from a specific subnet
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.100.0/24" log prefix="SUSPECT-NET: " level="info" limit value="10/m" drop' --permanent
firewall-cmd --reload
```

### Log All Dropped Traffic on a Specific Port

```bash
# Log attempts to connect to MySQL from unauthorized sources
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" port port="3306" protocol="tcp" log prefix="MYSQL-DENIED: " level="warning" limit value="5/m" drop' --permanent
firewall-cmd --reload
```

## Rate Limiting Logs

Always use rate limiting on log rules to prevent log flooding from scans or attacks:

```bash
# Limit to 5 entries per minute
limit value="5/m"

# Limit to 1 entry per second
limit value="1/s"

# Limit to 10 entries per hour
limit value="10/h"
```

Without rate limiting, a port scan can fill your disk with log entries.

## Log Levels

Available syslog levels for the `level` parameter:

- emerg
- alert
- crit
- error
- warning
- notice
- info
- debug

```bash
# Use different levels for different severity
# Critical security events
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="22" protocol="tcp" log prefix="SSH-ALL: " level="warning" limit value="10/m"' --permanent

# Informational logging
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" port port="80" protocol="tcp" log prefix="HTTP-DROP: " level="info" limit value="20/m" drop' --permanent
```

## Sending Logs to a Separate File

By default, firewall logs mix with other kernel messages. You can redirect them to a separate file using rsyslog:

```bash
# Create an rsyslog rule for firewall logs
cat > /etc/rsyslog.d/firewall.conf << 'EOF'
:msg, contains, "FINAL_REJECT" /var/log/firewall.log
:msg, contains, "FINAL_DROP" /var/log/firewall.log
:msg, contains, "SSH-ATTEMPT" /var/log/firewall.log
:msg, contains, "MYSQL-DENIED" /var/log/firewall.log
:msg, contains, "SUSPECT-NET" /var/log/firewall.log
EOF

# Restart rsyslog
systemctl restart rsyslog
```

Set up log rotation:

```bash
# Create logrotate config for firewall logs
cat > /etc/logrotate.d/firewall << 'EOF'
/var/log/firewall.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        /usr/bin/systemctl kill -s HUP rsyslog.service 2>/dev/null || true
    endscript
}
EOF
```

## Analyzing Firewall Logs

### Find the Most Blocked Source IPs

```bash
# Top 10 blocked source IPs
journalctl -k --no-pager | grep "FINAL_REJECT\|FINAL_DROP" | grep -oP 'SRC=\K[0-9.]+' | sort | uniq -c | sort -rn | head -10
```

### Find the Most Targeted Ports

```bash
# Top 10 targeted destination ports
journalctl -k --no-pager | grep "FINAL_REJECT\|FINAL_DROP" | grep -oP 'DPT=\K[0-9]+' | sort | uniq -c | sort -rn | head -10
```

### Count Drops per Hour

```bash
# Drops per hour for the last 24 hours
journalctl -k --since "24 hours ago" --no-pager | grep "FINAL_REJECT\|FINAL_DROP" | awk '{print $1, $2, substr($3,1,2)":00"}' | sort | uniq -c
```

## Monitoring Integration

### Simple Alert Script

```bash
#!/bin/bash
# alert-on-drops.sh - Alert if drop rate exceeds threshold

THRESHOLD=100
INTERVAL=300  # 5 minutes

COUNT=$(journalctl -k --since "$INTERVAL seconds ago" --no-pager | grep -c "FINAL_REJECT\|FINAL_DROP")

if [ "$COUNT" -gt "$THRESHOLD" ]; then
    echo "WARNING: $COUNT firewall drops in the last $((INTERVAL/60)) minutes"
    # Add your alerting mechanism here (email, webhook, etc.)
fi
```

## Disabling Logging

If logging becomes too noisy:

```bash
# Turn off LogDenied
firewall-cmd --set-log-denied=off

# Remove specific log rich rules
firewall-cmd --zone=public --list-rich-rules
firewall-cmd --zone=public --remove-rich-rule='...' --permanent
firewall-cmd --reload
```

## Summary

Logging dropped packets gives you visibility into what your firewall is blocking. Use `LogDenied=all` for comprehensive logging, or rich rules with log actions for targeted logging. Always rate-limit log rules to prevent disk flooding. Redirect logs to a separate file for easier analysis, and set up log rotation. Use simple scripts to analyze the logs for top blocked sources and targeted ports. This data is valuable for both security auditing and troubleshooting legitimate connectivity issues.
