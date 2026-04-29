# How to Monitor FTP Server Connections by IPv4 Client Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FTP, IPv4, Monitoring, vsftpd, Logging, Linux, Security

Description: Learn how to monitor active FTP connections and track activity by client IPv4 address using vsftpd logs and system tools.

---

Monitoring FTP connections by client IPv4 address helps identify unauthorized access attempts, track transfer activity, and detect bandwidth abuse on your FTP server.

## Method 1: Real-Time Active Connections with ss

```bash
# Show all active FTP connections (port 21 and passive ports)

ss -tnp | grep :21

# Show connections to passive data ports
ss -tnp | grep ":4[0-9][0-9][0-9][0-9]"

# Count connections by remote IP
ss -tn | grep :21 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn
```

## Method 2: vsftpd Access Log

vsftpd's `xferlog` records all file transfers with client IP.

```ini
# /etc/vsftpd.conf (ensure these are set)
xferlog_enable=YES
xferlog_std_format=YES
xferlog_file=/var/log/vsftpd.log
log_ftp_protocol=YES
```

```bash
# View the transfer log
tail -f /var/log/vsftpd.log

# Example log line (xferlog standard format):
# Thu Mar 19 12:00:00 2026 1 192.168.1.50 54321 /pub/file.zip b _ i r ftp ftp 0 * c
# Fields: date/time, duration, client_ip, bytes, filename, type, flags, direction, ...
```

## Parsing the Log for Top Clients

```bash
# Top 10 client IPs by number of transfers
awk '{print $7}' /var/log/vsftpd.log | sort | uniq -c | sort -rn | head -10

# Top 10 clients by bytes transferred
awk '{sum[$7]+=$8} END {for (ip in sum) print sum[ip], ip}' /var/log/vsftpd.log | \
  sort -rn | head -10 | awk '{printf "%s MB from %s\n", $1/1048576, $2}'
```

## Method 3: vsftpd Session Log via syslog

```ini
# /etc/vsftpd.conf
syslog_enable=YES   # Send vsftpd messages to syslog instead of a dedicated log file
```

```bash
# View vsftpd syslog entries with client IPs
grep vsftpd /var/log/syslog | grep "CONNECT\|LOGIN"

# Filter for a specific client IP
grep vsftpd /var/log/syslog | grep "192.168.1.50"
```

## Method 4: Who is Connected Right Now (ftpwho / pure-ftpwho)

```bash
# For pure-ftpd: show currently logged-in FTP users with their IPs
pure-ftpwho

# Example output:
# User        !  Time      !  Size  ! Path
# john        !    0:02:15 !  50 MB ! /home/john/uploads/data.tar.gz (192.168.1.50)
```

```bash
# For vsftpd: parse the process list
ps aux | grep vsftpd | grep -v grep | awk '{print $0}'
```

## Method 5: fail2ban for Brute-Force Detection

```ini
# /etc/fail2ban/jail.local
[vsftpd]
enabled  = true
port     = ftp,ftp-data,ftps,ftps-data
logpath  = %(vsftpd_log)s
maxretry = 3
bantime  = 3600
```

```bash
# Check banned IPs
fail2ban-client status vsftpd
```

## Key Takeaways

- `ss -tnp | grep :21` shows active FTP control connections with remote IPv4 addresses in real time.
- vsftpd's `xferlog` records every file transfer; with awk's default field split, `$7` is the client IP and `$8` is the byte count (the date occupies `$1`–`$5`).
- Enable `log_ftp_protocol=YES` for verbose per-command logging including the client IP.
- Use fail2ban with the vsftpd log to automatically ban IPs that fail authentication repeatedly.
