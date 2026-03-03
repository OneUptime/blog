# How to Set Up UFW Logging and Log Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, Logging

Description: Configure UFW logging on Ubuntu to capture blocked and allowed connections, then analyze the logs to identify threats, troubleshoot connectivity issues, and monitor network activity.

---

UFW (Uncomplicated Firewall) can log the traffic it handles, giving you visibility into what is hitting your server. By default, logging is disabled. Once enabled, you get records of blocked connection attempts, which helps identify port scans, brute-force attempts, and misconfigurations that block legitimate traffic.

## Enabling UFW Logging

UFW has multiple logging levels:

```bash
# Check current logging status
sudo ufw status verbose | grep Logging

# Enable logging (default level is 'low')
sudo ufw logging on

# Or set a specific level
sudo ufw logging low      # log blocked packets only
sudo ufw logging medium   # log blocked packets + new allowed connections
sudo ufw logging high     # log all packets including new and established
sudo ufw logging full     # all packets, verbose

# Check the logging status
sudo ufw status verbose
```

Be careful with `high` and `full` on busy servers - they generate enormous log volumes that can fill your disk.

For most use cases, `low` is the right default. Enable `medium` when troubleshooting connectivity issues to see both blocked and allowed connections.

## Where Logs Go

UFW logs go through the kernel's netfilter/iptables logging, which then routes to syslog. On Ubuntu with rsyslog:

```bash
# Primary log location
sudo tail -f /var/log/ufw.log

# UFW logs also appear in syslog
sudo grep "UFW" /var/log/syslog | tail -20

# And in kern.log (kernel messages)
sudo grep "UFW" /var/log/kern.log | tail -20
```

## Understanding UFW Log Entries

Each log entry has a consistent format. Here is an example:

```text
Mar  2 10:15:23 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC=xx:xx:xx:xx:xx:xx SRC=185.220.100.1 DST=192.168.1.100 LEN=44 TOS=0x00 PREC=0x00 TTL=242 ID=54321 PROTO=TCP SPT=52413 DPT=22 WINDOW=1024 RES=0x00 SYN URGP=0
```

Breaking it down:

```text
[UFW BLOCK]  - action taken (BLOCK = dropped, ALLOW = permitted)
IN=eth0      - interface traffic arrived on
OUT=         - interface traffic going out (empty for inbound)
SRC=...      - source IP address (where the packet came from)
DST=...      - destination IP address (your server)
PROTO=TCP    - protocol (TCP, UDP, ICMP)
SPT=52413    - source port
DPT=22       - destination port (22 = SSH in this case)
SYN          - TCP flags (SYN = new connection attempt)
```

`[UFW ALLOW]` indicates a permitted connection. `[UFW BLOCK]` or `[UFW AUDIT]` indicate blocked/logged packets.

## Analyzing UFW Logs

### Identify Most Blocked Source IPs

```bash
# Top IPs being blocked
sudo grep "UFW BLOCK" /var/log/ufw.log | \
  grep -oP 'SRC=\K[0-9.]+' | \
  sort | uniq -c | sort -rn | head -20

# If the log has rotated, check compressed logs too
sudo zcat /var/log/ufw.log.*.gz 2>/dev/null | \
  grep "UFW BLOCK" | \
  grep -oP 'SRC=\K[0-9.]+' | \
  sort | uniq -c | sort -rn | head -20
```

### Identify Most Targeted Ports

```bash
# What ports are most often targeted
sudo grep "UFW BLOCK" /var/log/ufw.log | \
  grep -oP 'DPT=\K[0-9]+' | \
  sort | uniq -c | sort -rn | head -20

# With protocol information
sudo grep "UFW BLOCK" /var/log/ufw.log | \
  grep -oP 'PROTO=\K[A-Z]+.*?DPT=\K[0-9]+' | \
  sort | uniq -c | sort -rn | head -20
```

Common targets you will see:
- Port 22: SSH brute force
- Port 3389: RDP scans
- Port 23: Telnet scans (bots looking for weak devices)
- Port 445: SMB (ransomware/worm scanning)
- Port 80/443: Web scanners
- Port 25: Mail relay attempts

### Find Port Scan Activity

Port scans show one source IP targeting many different ports:

```bash
# Find IPs hitting many different ports (potential port scan)
sudo grep "UFW BLOCK" /var/log/ufw.log | \
  grep -oP 'SRC=\K[0-9.]+ .*?DPT=\K[0-9]+' | \
  awk '{print $1}' | \
  sort | uniq -c | sort -rn | head -10
```

### Activity Over Time

```bash
# Block events per hour
sudo grep "UFW BLOCK" /var/log/ufw.log | \
  awk '{print $1, $2, substr($3,1,2)":00"}' | \
  sort | uniq -c | \
  awk '{print $2, $3, $4, $1}' | tail -24

# Block events per day
sudo grep "UFW BLOCK" /var/log/ufw.log | \
  awk '{print $1, $2}' | \
  sort | uniq -c | sort
```

### Troubleshoot Blocked Legitimate Traffic

When a service is not working and you suspect the firewall:

```bash
# Enable medium logging temporarily
sudo ufw logging medium

# Try the action that is failing, then look for it in the log
sudo grep "UFW" /var/log/ufw.log | tail -50

# Look for connections from specific IPs
sudo grep "UFW" /var/log/ufw.log | grep "SRC=192.168.1.50"

# Look for blocks on a specific destination port
sudo grep "UFW BLOCK" /var/log/ufw.log | grep "DPT=8080"
```

## Setting Up Automated Log Analysis

Create a daily report script:

```bash
sudo nano /usr/local/bin/ufw-daily-report.sh
```

```bash
#!/bin/bash
# UFW daily security report

LOG="/var/log/ufw.log"
YESTERDAY=$(date -d "yesterday" +"%b %_d")

echo "=== UFW Security Report for $(date -d yesterday +%Y-%m-%d) ==="
echo ""

echo "--- Top 10 Blocked Source IPs ---"
grep "UFW BLOCK" "$LOG" | grep "$YESTERDAY" | \
  grep -oP 'SRC=\K[0-9.]+' | \
  sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Top 10 Targeted Ports ---"
grep "UFW BLOCK" "$LOG" | grep "$YESTERDAY" | \
  grep -oP 'DPT=\K[0-9]+' | \
  sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Total Blocks ---"
grep "UFW BLOCK" "$LOG" | grep "$YESTERDAY" | wc -l

echo ""
echo "--- SSH Block Events ---"
grep "UFW BLOCK" "$LOG" | grep "$YESTERDAY" | grep "DPT=22" | wc -l
```

```bash
sudo chmod +x /usr/local/bin/ufw-daily-report.sh

# Schedule daily report via cron
sudo crontab -e
# Add:
# 0 7 * * * /usr/local/bin/ufw-daily-report.sh | mail -s "UFW Report $(date +%Y-%m-%d)" admin@example.com
```

## Using fail2ban with UFW Logging

fail2ban reads log files and automatically blocks IPs that show brute-force patterns. With UFW, fail2ban adds deny rules automatically:

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create local configuration (copy default to local to preserve across updates)
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure to use UFW as the ban action
sudo nano /etc/fail2ban/jail.local
```

Key settings to configure:

```ini
[DEFAULT]
# Use UFW for banning
banaction = ufw

# Ban duration
bantime = 3600      # 1 hour ban

# Window to count failures
findtime = 600      # 10 minute window

# Number of failures before ban
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
```

```bash
# Restart fail2ban
sudo systemctl restart fail2ban

# Check fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status sshd

# See current bans
sudo fail2ban-client status sshd | grep "Banned IP"
```

## Log Rotation Configuration

UFW logs can grow large. Configure rotation:

```bash
# Check current logrotate config for UFW
cat /etc/logrotate.d/ufw

# If it doesn't exist, create one
sudo nano /etc/logrotate.d/ufw
```

```text
/var/log/ufw.log {
    weekly
    rotate 13          # keep 13 weeks of logs
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        invoke-rc.d rsyslog rotate > /dev/null
    endscript
}
```

## Forwarding Logs to a Central System

For environments with multiple servers, forward UFW logs to a central syslog server:

```bash
# Configure rsyslog to forward UFW logs
sudo nano /etc/rsyslog.d/50-ufw-remote.conf
```

```text
# Forward kernel messages (which include UFW logs) to central syslog
kern.*    @192.168.1.200:514    # UDP
# or:
kern.*    @@192.168.1.200:514   # TCP (more reliable)
```

```bash
sudo systemctl restart rsyslog
```

At the central syslog receiver, filter and store UFW events separately:

```bash
# On the central syslog server, add to /etc/rsyslog.d/
:msg, contains, "UFW" /var/log/ufw-centralized.log
```

UFW logging gives you the raw data to understand what is hitting your servers. Even a quick daily review of the top blocked IPs and ports provides useful intelligence about attack patterns and helps validate that your firewall is working as intended.
