# How to Use vnStat for Network Traffic Accounting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Monitoring, Bandwidth

Description: A complete guide to setting up vnStat on Ubuntu for persistent network traffic accounting, including daily, monthly, and yearly traffic reports and web interface setup.

---

vnStat is a network traffic monitor that keeps a persistent log of how much data passes through your network interfaces over time. Unlike packet sniffers that watch live traffic, vnStat reads statistics directly from the kernel's network counters - meaning it uses almost no CPU and does not need root access to query data after initial setup.

It is the right tool when you need to know how much data your server transferred this month, track trends over weeks, or get notified when you approach a data cap.

## Installing vnStat

vnStat is packaged in the Ubuntu repositories:

```bash
sudo apt update
sudo apt install vnstat -y
```

The package installs the `vnstat` binary for querying data and the `vnstatd` daemon that collects statistics in the background.

## Initial Setup

After installation, vnStatd starts automatically and begins monitoring interfaces listed in its configuration. Verify the daemon is running:

```bash
sudo systemctl status vnstat
```

Check which interfaces are being monitored:

```bash
vnstat --iflist
```

This lists all interfaces vnStat knows about. On a fresh install it may take a few minutes before data starts accumulating.

### Adding Interfaces Manually

If an interface is missing, add it explicitly:

```bash
# Add eth0 to vnstat monitoring
sudo vnstat --add -i eth0

# Or with the modern interface name
sudo vnstat --add -i enp0s3
```

The daemon picks up the new interface on its next check cycle.

## Querying Traffic Statistics

The `vnstat` command without arguments shows a summary for all monitored interfaces:

```bash
vnstat
```

Sample output:

```
                      rx      /      tx      /     total    /   estimated
 enp0s3:
       2026-02      45.21 GiB  /   12.83 GiB  /   58.04 GiB
         today       1.23 GiB  /  456.12 MiB  /    1.67 GiB  /    2.01 GiB
```

### Daily Statistics

```bash
# Show daily traffic for the default interface
vnstat -d

# For a specific interface
vnstat -i enp0s3 -d
```

### Monthly Statistics

```bash
vnstat -m
```

Monthly totals are especially useful for tracking against hosting or ISP data caps.

### Hourly Statistics

```bash
vnstat -h
```

This shows per-hour breakdown for the current day, helping identify when traffic peaks occur.

### Yearly Summary

```bash
vnstat -y
```

### Top 10 Traffic Days

```bash
vnstat --top10
```

This shows the ten days with the highest traffic since monitoring began.

### Live Traffic Rate

For a quick look at the current transfer rate (not historical):

```bash
vnstat -l
```

This displays a live updating bandwidth meter similar to nload, but vnStat is not meant to replace dedicated live monitors - it is primarily an accounting tool.

## Output Formats

vnStat supports several output formats for integration with scripts:

### JSON Output

```bash
# Full JSON output for all interfaces
vnstat --json

# JSON for a specific interface
vnstat --json -i enp0s3

# JSON for daily stats
vnstat --json d
```

JSON output is useful for feeding data into dashboards or alerting systems.

### XML Output

```bash
vnstat --xml
```

### Parsing with jq

```bash
# Extract this month's total traffic in bytes
vnstat --json m -i enp0s3 | jq '.interfaces[0].traffic.month[0].tx + .interfaces[0].traffic.month[0].rx'
```

## Configuration

The main configuration file is `/etc/vnstat.conf`. Key settings:

```bash
sudo nano /etc/vnstat.conf
```

```ini
# How often vnstatd updates the database (seconds)
UpdateInterval 20

# How often the database is saved to disk (minutes)
SaveInterval 5

# Day of month to use as the billing period boundary
# 1 = traffic month starts on the 1st
MonthRotate 1

# Maximum bandwidth for interface (Mbit/s) - used for estimations
# Set to 0 for auto-detection
MaxBandwidth 1000

# Database directory
DatabaseDir "/var/lib/vnstat"

# Log file location
LogFile "/var/log/vnstat/vnstat.log"
```

After changing configuration, restart the daemon:

```bash
sudo systemctl restart vnstat
```

### Setting the Monthly Billing Cycle

If your hosting provider resets your data allowance on a day other than the 1st, adjust `MonthRotate`:

```bash
# If your billing cycle starts on the 15th
# In /etc/vnstat.conf:
MonthRotate 15
```

## Setting Up Bandwidth Alerts

vnStat itself does not send alerts, but you can build a simple script around its JSON output to notify you when traffic exceeds a threshold:

```bash
#!/bin/bash
# /usr/local/bin/check-bandwidth.sh
# Sends an alert if monthly traffic exceeds 900 GB

INTERFACE="enp0s3"
LIMIT_BYTES=$((900 * 1024 * 1024 * 1024))  # 900 GB in bytes

# Get current month's total traffic in bytes
CURRENT=$(vnstat --json m -i "$INTERFACE" | \
  jq '.interfaces[0].traffic.month[0].rx + .interfaces[0].traffic.month[0].tx')

if [ "$CURRENT" -gt "$LIMIT_BYTES" ]; then
    echo "WARNING: Monthly traffic on $INTERFACE has exceeded 900 GB" | \
    mail -s "Bandwidth Alert" admin@example.com
fi
```

Add this to cron for hourly checks:

```bash
# Add to crontab
crontab -e
```

```
# Check bandwidth every hour
0 * * * * /usr/local/bin/check-bandwidth.sh
```

## Setting Up the vnStat Web Interface (vnStat PHP)

vnStat has an optional PHP-based web interface that shows traffic graphs:

```bash
# Install dependencies
sudo apt install nginx php-fpm php-cli php-gd -y

# Download vnStat PHP
cd /tmp
wget https://github.com/sergeifilippov/vnstat-dashboard/archive/refs/heads/master.zip -O vnstat-web.zip
unzip vnstat-web.zip
sudo mv vnstat-dashboard-master /var/www/vnstat
```

Configure Nginx to serve it:

```nginx
server {
    listen 80;
    server_name stats.example.com;
    root /var/www/vnstat;
    index index.php;

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
    }
}
```

Alternatively, vnStat's built-in image generation works with just the command line:

```bash
# Generate PNG charts for daily and monthly traffic
vnstat --png d -o /var/www/html/daily-traffic.png
vnstat --png m -o /var/www/html/monthly-traffic.png
```

These can then be served by any web server or embedded in monitoring dashboards.

## Managing the Database

### Check Database Status

```bash
vnstat --dbiflist
```

### Remove an Interface

If you decommission an interface and want to remove its data:

```bash
sudo vnstat --remove -i eth0 --force
```

### Reset Statistics for an Interface

```bash
# Delete and re-add the interface to start fresh
sudo vnstat --remove -i enp0s3 --force
sudo vnstat --add -i enp0s3
```

### Database Location

The SQLite database lives at `/var/lib/vnstat/vnstat.db`. Back it up regularly if long-term traffic history matters:

```bash
# Backup the database
sudo cp /var/lib/vnstat/vnstat.db /backup/vnstat-$(date +%Y%m%d).db
```

## Comparing vnStat with Alternatives

| Tool | Approach | Storage | CPU Usage |
|------|----------|---------|-----------|
| vnStat | Reads kernel counters | SQLite | Minimal |
| Darkstat | Packet capture | Custom | Low |
| Prometheus node_exporter | Reads kernel counters | Time-series DB | Low |
| ntopng | Deep packet inspection | MySQL/Redis | Higher |

vnStat is the lowest-overhead option for persistent traffic accounting and the best fit when you simply need monthly totals and trends without running a full monitoring stack.

## Summary

vnStat handles the task of network traffic accounting efficiently and persistently. Install it, let the daemon run, and query reports with simple commands. The JSON output makes it scriptable for alerting or dashboard integration. For most Ubuntu servers where you need to track data usage over time without investing in a full monitoring platform, vnStat is a practical and proven choice.
