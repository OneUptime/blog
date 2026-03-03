# How to Configure Dynamic DNS (DDNS) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, Dynamic DNS, Networking, Self-Hosted

Description: Learn how to configure Dynamic DNS on Ubuntu to keep your domain pointing to a changing IP address, using both client tools and self-hosted solutions.

---

Dynamic DNS (DDNS) solves a specific problem: most residential and many business internet connections get a new IP address periodically from the ISP. If you're hosting services at home or on a server with a dynamic IP, your domain name stops working whenever that IP changes. DDNS services automatically update your DNS records when your IP changes, keeping your domain accessible.

This guide covers multiple approaches: using ddclient with commercial DDNS providers, using Cloudflare as a free DDNS provider, and self-hosting a DDNS solution.

## Understanding How DDNS Works

The basic flow is:
1. Your server detects its current public IP address
2. It compares the IP with what's currently in DNS
3. If they differ, it calls the DNS provider's API to update the A record
4. This check runs on a schedule (typically every 5 minutes)

## Method 1: Using ddclient

`ddclient` is the most widely-used DDNS client on Linux. It supports dozens of providers including Namecheap, No-IP, DuckDNS, Cloudflare, and many others.

### Installing ddclient

```bash
sudo apt update
sudo apt install -y ddclient
```

During installation, Ubuntu may show a configuration wizard. You can skip through it - we'll configure the file manually.

### Configuring ddclient for Cloudflare

Cloudflare is an excellent choice since it's free for basic DNS and has a well-documented API:

```bash
sudo nano /etc/ddclient.conf
```

```ini
# /etc/ddclient.conf

# Global settings
daemon=300                # Check every 300 seconds (5 minutes)
syslog=yes               # Log to syslog
pid=/var/run/ddclient.pid

# How to detect the public IP
use=web
web=https://ipv4.icanhazip.com   # Use this URL to get your public IP

# Cloudflare configuration
protocol=cloudflare
zone=example.com                  # Your Cloudflare zone (root domain)
ttl=1                             # 1 = automatic TTL in Cloudflare
login=your-email@example.com     # Your Cloudflare account email
password=your-cloudflare-api-token  # Cloudflare API token (not global key)

# Records to update (can list multiple)
home.example.com
vpn.example.com
```

To create a Cloudflare API token with the right permissions:
1. Log into Cloudflare Dashboard
2. Go to My Profile > API Tokens
3. Click "Create Token"
4. Use the "Edit zone DNS" template
5. Restrict it to the specific zone you're updating

### Configuring ddclient for DuckDNS

DuckDNS is a free DDNS provider that gives you subdomains like `yourname.duckdns.org`:

```ini
# /etc/ddclient.conf for DuckDNS

daemon=300
syslog=yes
pid=/var/run/ddclient.pid

use=web
web=https://ipv4.icanhazip.com

protocol=duckdns
server=www.duckdns.org
login=your-duckdns-token
password=your-duckdns-token

yoursubdomain.duckdns.org
```

### Starting and Testing ddclient

```bash
# Enable and start the service
sudo systemctl enable ddclient
sudo systemctl start ddclient

# Check status
sudo systemctl status ddclient

# Test the configuration manually (run in verbose/debug mode)
sudo ddclient -verbose -noquiet -debug

# Force an update regardless of whether IP changed
sudo ddclient -force
```

Check the logs:

```bash
# View ddclient logs
sudo journalctl -u ddclient -f

# Or in syslog
sudo tail -f /var/log/syslog | grep ddclient
```

## Method 2: Custom Cloudflare DDNS Script

For more control, a small script that calls the Cloudflare API directly is often more reliable than ddclient:

```bash
# Create the script
sudo nano /usr/local/bin/cloudflare-ddns.sh
```

```bash
#!/bin/bash
# Cloudflare Dynamic DNS Update Script
# Updates A records for your domain via Cloudflare API

# Configuration
CF_API_TOKEN="your-cloudflare-api-token"
CF_ZONE_ID="your-zone-id"         # Found in Cloudflare dashboard -> Overview -> Zone ID
RECORD_NAME="home.example.com"    # The DNS record to update

# Get current public IP
CURRENT_IP=$(curl -s https://ipv4.icanhazip.com)

if [ -z "$CURRENT_IP" ]; then
    echo "$(date): ERROR - Could not determine public IP" >&2
    exit 1
fi

# Get the current IP in Cloudflare for this record
CF_RESPONSE=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

CF_RECORD_IP=$(echo "$CF_RESPONSE" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['result'][0]['content'])" 2>/dev/null)
CF_RECORD_ID=$(echo "$CF_RESPONSE" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['result'][0]['id'])" 2>/dev/null)

if [ "$CURRENT_IP" = "$CF_RECORD_IP" ]; then
    # IPs match, nothing to do
    exit 0
fi

echo "$(date): IP changed from ${CF_RECORD_IP} to ${CURRENT_IP}. Updating Cloudflare..."

# Update the DNS record
UPDATE_RESPONSE=$(curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${CF_RECORD_ID}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"${RECORD_NAME}\",\"content\":\"${CURRENT_IP}\",\"ttl\":120,\"proxied\":false}")

SUCCESS=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])")

if [ "$SUCCESS" = "True" ]; then
    echo "$(date): DNS record updated successfully to ${CURRENT_IP}"
else
    echo "$(date): ERROR - Failed to update DNS record: ${UPDATE_RESPONSE}" >&2
    exit 1
fi
```

```bash
# Make it executable
sudo chmod +x /usr/local/bin/cloudflare-ddns.sh

# Test it manually
sudo /usr/local/bin/cloudflare-ddns.sh
```

Set up a cron job to run it every 5 minutes:

```bash
# Edit the root crontab
sudo crontab -e

# Add this line
*/5 * * * * /usr/local/bin/cloudflare-ddns.sh >> /var/log/cloudflare-ddns.log 2>&1
```

## Method 3: Using inadyn

`inadyn` is a lighter-weight alternative to ddclient with good provider support:

```bash
sudo apt install -y inadyn
```

Configure it:

```bash
sudo nano /etc/inadyn.conf
```

```ini
# /etc/inadyn.conf

# Check interval (300 seconds = 5 minutes)
period = 300

# Log to syslog
syslog = true

# Cloudflare provider
provider cloudflare.com {
    username   = your-email@example.com
    password   = your-api-token
    hostname   = home.example.com
    ttl        = 1
    proxied    = false
}
```

```bash
# Enable and start
sudo systemctl enable inadyn
sudo systemctl start inadyn
sudo systemctl status inadyn
```

## Handling IPv6 (AAAA Records)

If your ISP provides IPv6, you may want to update AAAA records as well:

```bash
# Get your public IPv6 address
curl -s https://ipv6.icanhazip.com

# In ddclient.conf, add an IPv6 section:
# use=web, web=https://ipv6.icanhazip.com, protocol=cloudflare, ...
```

## Testing DNS Propagation

After an IP change and update, verify the record updated correctly:

```bash
# Check what your domain currently resolves to
dig home.example.com A +short

# Check against Cloudflare's nameservers directly
dig @1.1.1.1 home.example.com A +short

# Compare with your current public IP
curl -s https://ipv4.icanhazip.com
```

## Logging and Alerting

Add monitoring so you know when DDNS updates happen or fail:

```bash
# Set up logrotate for the DDNS log
sudo nano /etc/logrotate.d/cloudflare-ddns
```

```text
/var/log/cloudflare-ddns.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

For comprehensive monitoring of your services that depend on DDNS staying current, [OneUptime](https://oneuptime.com) can alert you when your domain stops resolving correctly or when connected services become unreachable.
