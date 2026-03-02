# How to Set Up Apache mod_evasive for DDoS Protection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, DDoS Protection, Security, Web Server

Description: Install and configure Apache mod_evasive on Ubuntu to detect and block HTTP-level DDoS attacks and brute force attempts automatically.

---

HTTP-layer denial of service attacks - flooding a web server with requests until it falls over - are among the most common attacks facing public-facing servers. Apache's mod_evasive module provides a fast, lightweight defense by tracking request rates per IP and per URL, and automatically blocking sources that exceed defined thresholds. It does not replace a CDN or a network-level firewall, but it is a practical first line of defense for any Apache server.

## How mod_evasive Works

mod_evasive maintains an in-memory hash table tracking:

- Requests per second from each IP address (DOSPageCount/DOSPageInterval)
- Requests per second to each URL (DOSSiteCount/DOSSiteInterval)
- IP addresses that have been blocked (DOSBlockingPeriod)

When a client exceeds the threshold, mod_evasive returns a 403 response and can optionally run a custom command (like adding the IP to a firewall blocklist).

## Install mod_evasive

```bash
# Update packages and install mod_evasive
sudo apt-get update
sudo apt-get install -y libapache2-mod-evasive

# Verify the module is installed
ls /etc/apache2/mods-available/evasive*

# Enable the module
sudo a2enmod evasive

# Create a log directory for mod_evasive
sudo mkdir -p /var/log/mod_evasive
sudo chown www-data:www-data /var/log/mod_evasive
sudo chmod 750 /var/log/mod_evasive
```

## Basic Configuration

The module configuration file is created at installation. Edit it to set your thresholds:

```bash
sudo nano /etc/apache2/mods-enabled/evasive.conf
```

```apache
<IfModule mod_evasive20.c>
    # Maximum requests to the same URL within the interval
    DOSPageCount        5

    # Time window in seconds for page count
    DOSPageInterval     1

    # Maximum requests from a single IP within the interval
    DOSSiteCount        50

    # Time window for site count (seconds)
    DOSSiteInterval     1

    # How long to block an offending IP (seconds)
    DOSBlockingPeriod   10

    # Email address to notify on attack detection (requires mail command)
    # DOSEmailNotify      admin@example.com

    # Log file for blocked requests
    DOSLogDir           /var/log/mod_evasive

    # Command to run when blocking an IP
    # The %s is replaced with the offending IP address
    # DOSSystemCommand    "sudo /usr/local/bin/block-ip.sh %s"

    # Whitelist trusted IPs that should never be blocked
    DOSWhitelist        127.0.0.1
    DOSWhitelist        10.0.0.0/8
    DOSWhitelist        192.168.0.0/16
</IfModule>
```

The values above are conservative starting points. For a busy production site, increase `DOSSiteCount` and `DOSSiteInterval` to avoid false positives on legitimate traffic spikes.

```bash
# Test the configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2

# Verify the module loaded
apache2ctl -M | grep evasive
```

## Tune Thresholds for Your Traffic

Setting thresholds too low causes false positives for legitimate users. Too high and attackers get through. Analyze your normal traffic patterns first:

```bash
# Look at requests per second from the top IPs in the access log
sudo awk '{print $1}' /var/log/apache2/access.log | \
    sort | uniq -c | sort -rn | head -20

# Look at requests per URL
sudo awk '{print $7}' /var/log/apache2/access.log | \
    sort | uniq -c | sort -rn | head -20

# Look at requests in a narrow time window (last 60 seconds)
sudo awk -v d="$(date -d '60 seconds ago' '+%d/%b/%Y:%H:%M:%S')" \
    '$0 > d {print $1}' /var/log/apache2/access.log | \
    sort | uniq -c | sort -rn | head -20
```

Once you know your typical peak rates, set thresholds 3 to 5 times above normal to catch attacks without catching legitimate bursts.

## Firewall Integration

mod_evasive's `DOSSystemCommand` lets you add blocked IPs directly to the firewall, making the block much harder to bypass (an HTTP 403 response is still a response; the firewall drops the connection entirely):

```bash
# Create a firewall blocking script
sudo nano /usr/local/bin/block-ip.sh
```

```bash
#!/bin/bash
# Block an IP using UFW and log the action

IP="$1"

# Validate the IP (basic check)
if [[ ! "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Invalid IP: $IP"
    exit 1
fi

# Add to UFW blocklist
ufw insert 1 deny from "$IP" to any > /dev/null 2>&1

# Log the block
echo "$(date '+%Y-%m-%d %H:%M:%S') Blocked: $IP" >> /var/log/mod_evasive/firewall-blocks.log

# Schedule automatic unblock after 1 hour
# at + 1 hour << EOF
# ufw delete deny from $IP to any
# EOF
```

```bash
sudo chmod 700 /usr/local/bin/block-ip.sh

# Grant www-data permission to run UFW via sudo (without full sudo)
sudo visudo -f /etc/sudoers.d/mod-evasive
```

```
www-data ALL=(ALL) NOPASSWD: /usr/sbin/ufw
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/block-ip.sh
```

Update the mod_evasive configuration to use this script:

```apache
DOSSystemCommand "sudo /usr/local/bin/block-ip.sh %s"
```

## Test mod_evasive

Use the included Perl test script or a simple bash loop:

```bash
# Test from localhost (which you whitelisted, so expect no block)
# Use the test from a different machine to actually trigger blocking

# Perl test script (included with the package)
# Creates multiple rapid connections to localhost
perl /usr/share/doc/libapache2-mod-evasive/examples/test.pl

# Or test manually from another host (replaces YOUR_SERVER_IP):
# for i in {1..100}; do curl -s http://YOUR_SERVER_IP/ > /dev/null; done
```

Watch the mod_evasive log for blocked entries:

```bash
# Watch for new blocked IPs
sudo ls -la /var/log/mod_evasive/
# Files appear with the IP address as the filename

# See which IPs are currently blocked
sudo ls /var/log/mod_evasive/ | head -20

# Watch Apache error log for mod_evasive entries
sudo tail -f /var/log/apache2/error.log | grep -i evasive
```

## Configure Email Alerts

```bash
# Install a mail transfer agent for sending alerts
sudo apt-get install -y mailutils

# Test the mail command
echo "Test" | mail -s "Test from $(hostname)" admin@example.com

# Enable email alerts in mod_evasive
sudo nano /etc/apache2/mods-enabled/evasive.conf
```

```apache
# Uncomment and set your email address
DOSEmailNotify admin@example.com
```

Email alerts fire once per blocked IP per blocking period, not for every request. This prevents flooding your inbox during an active attack.

## Monitor mod_evasive Activity

Set up a script to aggregate mod_evasive block statistics:

```bash
sudo nano /usr/local/bin/evasive-stats.sh
```

```bash
#!/bin/bash
# Report mod_evasive statistics

LOG_DIR="/var/log/mod_evasive"
BLOCKED=$(ls "$LOG_DIR" | grep -v "firewall" | wc -l)
TOP_BLOCKED=$(ls -t "$LOG_DIR" | grep -v "firewall" | head -5)

echo "=== mod_evasive Stats: $(date) ==="
echo "Currently tracking $BLOCKED blocked IPs"
echo "Recent blocks:"
echo "$TOP_BLOCKED"

# Clean up old log files (mod_evasive creates one file per blocked IP)
find "$LOG_DIR" -name "dos-*" -mmin +60 -delete
echo "Cleaned up blocks older than 60 minutes"
```

```bash
sudo chmod +x /usr/local/bin/evasive-stats.sh

# Run every 15 minutes
echo "*/15 * * * * root /usr/local/bin/evasive-stats.sh >> /var/log/evasive-stats.log 2>&1" | \
    sudo tee /etc/cron.d/evasive-stats
```

## Limitations and Complements

mod_evasive operates at the Apache process level, meaning attack traffic still reaches the server before being blocked. For high-volume attacks:

- Use fail2ban to read mod_evasive logs and apply firewall rules at the OS level
- Consider Cloudflare or another CDN for volumetric protection
- Use network-level rate limiting on your cloud provider's load balancer

mod_evasive handles HTTP-layer floods efficiently and stops many automated scanners and brute-force tools that lack sophisticated retry logic. Paired with UFW and fail2ban, it forms a solid layer in your Apache security stack.
