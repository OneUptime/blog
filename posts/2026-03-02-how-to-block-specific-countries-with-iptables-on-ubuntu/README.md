# How to Block Specific Countries with iptables on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iptables, Firewall, GeoIP, Security

Description: Block incoming traffic from specific countries on Ubuntu using iptables with GeoIP databases from MaxMind or IP sets, including automated update scripts and performance considerations.

---

Geographic IP blocking is a rough but sometimes useful security tool. If your service is only intended for users in specific countries, or if you're seeing sustained attacks originating from particular regions, blocking at the IP level can reduce attack surface and log noise.

This approach has limits: determined attackers use VPNs and proxies, GeoIP databases aren't perfectly accurate, and it can block legitimate users. It's a supplementary measure, not a primary security control.

## Approach 1: Using ipset with IP Block Lists

`ipset` is a kernel extension that allows creating sets of IP addresses that iptables can match against efficiently. Instead of adding thousands of individual iptables rules (one per IP block), ipset handles them in a hash table that can be searched in O(1) time.

### Installing Required Tools

```bash
sudo apt update
sudo apt install -y ipset iptables curl
```

### Obtaining Country IP Ranges

Several sources provide country IP allocations:

1. **ipdeny.com** - Free, maintained per-country zone files
2. **MaxMind GeoLite2** - More accurate but requires free registration
3. **RIPE, ARIN, APNIC** - Regional Internet Registries (authoritative but complex to use)

For this tutorial, we'll use ipdeny.com which provides simple per-country text files:

```bash
# Create a directory for IP block lists
sudo mkdir -p /etc/iptables/geoip

# Download the aggregated zone for a specific country (CN = China)
sudo curl -o /etc/iptables/geoip/cn.zone \
    http://www.ipdeny.com/ipblocks/data/aggregated/cn-aggregated.zone

# Download another country (RU = Russia)
sudo curl -o /etc/iptables/geoip/ru.zone \
    http://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone

# Check how many IP ranges are in a zone
wc -l /etc/iptables/geoip/cn.zone
```

### Creating ipset Sets

```bash
# Create an ipset for Chinese IP ranges
sudo ipset create geoip-cn hash:net maxelem 65536

# Load the IP ranges into the set
while IFS= read -r cidr; do
    sudo ipset add geoip-cn "$cidr"
done < /etc/iptables/geoip/cn.zone

# Verify the set was created
sudo ipset list geoip-cn | head -20
sudo ipset list geoip-cn | grep "Number of entries"
```

### Adding iptables Rules

```bash
# Block all input from the set
sudo iptables -I INPUT -m set --match-set geoip-cn src -j DROP

# Block but log first (for auditing how much traffic you're blocking)
sudo iptables -I INPUT -m set --match-set geoip-cn src \
    -m limit --limit 5/min \
    -j LOG --log-prefix "GeoIP BLOCK: "

sudo iptables -I INPUT -m set --match-set geoip-cn src -j DROP

# Verify the rule was added
sudo iptables -L INPUT -n | grep geoip-cn
```

### Complete Setup Script

A script to set up multiple country blocks:

```bash
sudo nano /usr/local/bin/setup-geoip-blocks.sh
```

```bash
#!/bin/bash
# Set up GeoIP blocking with ipset and iptables
# Customize BLOCKED_COUNTRIES for your needs

GEOIP_DIR="/etc/iptables/geoip"
IPDENY_URL="http://www.ipdeny.com/ipblocks/data/aggregated"

# Countries to block (ISO 3166-1 alpha-2 codes, lowercase)
BLOCKED_COUNTRIES=("cn" "ru" "kp" "ir")

mkdir -p "$GEOIP_DIR"

for country in "${BLOCKED_COUNTRIES[@]}"; do
    SET_NAME="geoip-${country}"
    ZONE_FILE="$GEOIP_DIR/${country}.zone"

    echo "Processing $country..."

    # Download zone file
    curl -s -o "$ZONE_FILE" "${IPDENY_URL}/${country}-aggregated.zone"

    if [ ! -s "$ZONE_FILE" ]; then
        echo "Warning: Failed to download zone for $country"
        continue
    fi

    echo "  Downloaded $(wc -l < "$ZONE_FILE") IP ranges"

    # Destroy existing set if it exists (for updates)
    ipset destroy "$SET_NAME" 2>/dev/null || true

    # Create the set
    ipset create "$SET_NAME" hash:net maxelem 65536

    # Load IP ranges
    while IFS= read -r cidr; do
        ipset add "$SET_NAME" "$cidr" 2>/dev/null || true
    done < "$ZONE_FILE"

    echo "  Loaded $(ipset list "$SET_NAME" | grep 'Number of entries' | awk '{print $NF}') entries"

    # Remove existing rule if it exists (for updates)
    iptables -D INPUT -m set --match-set "$SET_NAME" src -j DROP 2>/dev/null || true

    # Add iptables rule
    iptables -I INPUT -m set --match-set "$SET_NAME" src -j DROP

    echo "  Rule added for $country"
done

echo ""
echo "GeoIP blocking configured for: ${BLOCKED_COUNTRIES[*]}"
echo "Active rules:"
iptables -L INPUT -n | grep geoip
```

```bash
sudo chmod +x /usr/local/bin/setup-geoip-blocks.sh
sudo /usr/local/bin/setup-geoip-blocks.sh
```

## Approach 2: Using MaxMind GeoLite2 with geoipupdate

MaxMind's GeoLite2 database is more accurate but requires registration:

```bash
# Install geoipupdate
sudo add-apt-repository ppa:maxmind/ppa
sudo apt install -y geoipupdate

# Configure with your MaxMind license key
sudo nano /etc/GeoIP.conf
```

```text
AccountID YOUR_ACCOUNT_ID
LicenseKey YOUR_LICENSE_KEY
EditionIDs GeoLite2-Country GeoLite2-ASN
```

```bash
# Download the databases
sudo geoipupdate

# The databases are stored in /var/lib/GeoIP/
ls /var/lib/GeoIP/
```

For iptables integration with MaxMind, you'd use `xt_geoip` kernel module or parse the databases to extract IP ranges.

## Persisting ipset Rules

ipset rules are also lost on reboot. Save them alongside iptables rules:

```bash
# Save ipset configuration
sudo ipset save > /etc/iptables/ipsets.conf

# Restore ipset configuration
sudo ipset restore < /etc/iptables/ipsets.conf
```

Create a restore service:

```bash
sudo nano /etc/systemd/system/ipset-restore.service
```

```ini
[Unit]
Description=Restore ipset configuration
Before=iptables-restore.service netfilter-persistent.service
DefaultDependencies=no

[Service]
Type=oneshot
ExecStart=/sbin/ipset restore -file /etc/iptables/ipsets.conf
ExecStart=/sbin/iptables-restore /etc/iptables/rules.v4
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ipset-restore
```

Or add ipset restore to the netfilter-persistent hooks:

```bash
sudo nano /usr/share/netfilter-persistent/plugins.d/15-ip-sets
```

```bash
#!/bin/sh
# Restore ipset rules as part of netfilter-persistent

case "$1" in
    start)
        if [ -f /etc/iptables/ipsets.conf ]; then
            ipset restore < /etc/iptables/ipsets.conf
        fi
        ;;
    save)
        ipset save > /etc/iptables/ipsets.conf
        ;;
esac
```

## Automated Weekly Updates

IP address allocations change over time. Automate the zone file updates:

```bash
sudo nano /etc/cron.weekly/update-geoip-blocks
```

```bash
#!/bin/bash
# Weekly update of GeoIP block lists

LOG="/var/log/geoip-update.log"
SETUP_SCRIPT="/usr/local/bin/setup-geoip-blocks.sh"

echo "$(date): Starting GeoIP update" >> "$LOG"

"$SETUP_SCRIPT" >> "$LOG" 2>&1

# Save updated ipset and iptables rules
ipset save > /etc/iptables/ipsets.conf
iptables-save > /etc/iptables/rules.v4

echo "$(date): GeoIP update complete" >> "$LOG"
```

```bash
sudo chmod +x /etc/cron.weekly/update-geoip-blocks
```

## Checking What's Being Blocked

Monitor the geographic blocking to understand its impact:

```bash
# View blocked packet counts per set
sudo iptables -L INPUT -n -v | grep geoip

# Count total blocked packets
sudo iptables -L INPUT -n -v | grep geoip | awk '{print $1, $2, $3}'

# List all entries in a set
sudo ipset list geoip-cn | tail -20

# Test if a specific IP is in a set
sudo ipset test geoip-cn 1.2.3.4 && echo "IP is in the China block list"
```

## Whitelisting Before Blocking

If you need to allow specific IPs from blocked countries:

```bash
# Create a whitelist set
sudo ipset create geoip-whitelist hash:ip

# Add IPs to whitelist
sudo ipset add geoip-whitelist 1.2.3.4
sudo ipset add geoip-whitelist 5.6.7.8

# Insert whitelist rule BEFORE the block rules (lower rule number)
sudo iptables -I INPUT -m set --match-set geoip-whitelist src -j ACCEPT

# Check the order (whitelist rule should have a lower number than block rules)
sudo iptables -L INPUT --line-numbers -n | grep -E "geoip|ACCEPT"
```

## Performance Considerations

ipset is efficient, but a few things affect performance:

- Large hash sets (100k+ entries) have minimal CPU impact due to hash lookup being O(1)
- Logging every blocked packet has a higher CPU cost than just dropping
- If logging, always use `--limit` to cap the log rate
- Consider using `nflog` instead of LOG for high-traffic environments

For a quick check of rule hit counts:

```bash
# Check if the GeoIP rules are matching traffic
sudo iptables -L INPUT -n -v | grep geoip-cn
```

The packet and byte counters show how much traffic is hitting each rule.

Geographic IP blocking occupies a specific niche in defense-in-depth. It's most valuable when you know your user base is geographically concentrated and you're seeing automated attacks from specific regions. For general-purpose servers, the maintenance overhead may outweigh the benefit - tools like fail2ban that block based on behavior tend to be more precise.
