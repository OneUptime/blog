# How to Configure UFW to Allow Specific IP Addresses on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, Networking

Description: Configure UFW on Ubuntu to allow traffic from specific IP addresses and CIDR ranges, restrict services to trusted sources, and set up whitelist-based access control.

---

Allowing traffic from specific IP addresses is one of the most effective firewall strategies. Rather than allowing any IP to reach a sensitive port, you restrict access to known, trusted sources. This applies particularly to administrative interfaces, databases, monitoring systems, and any service that shouldn't be public-facing.

## Basic IP-Based Allow Rules

The syntax for allowing a specific IP follows this pattern:

```bash
# Allow all traffic from a specific IP
sudo ufw allow from 192.168.1.50

# Allow traffic from an IP to a specific port
sudo ufw allow from 192.168.1.50 to any port 22

# Allow traffic from an IP to a specific port and protocol
sudo ufw allow from 192.168.1.50 to any port 22 proto tcp
```

The `to any` portion means "to this server on any destination IP" - it's required syntax even though it seems redundant.

## Allowing IP Ranges with CIDR Notation

CIDR notation allows you to specify ranges of addresses:

```bash
# Allow an entire subnet
sudo ufw allow from 192.168.1.0/24

# Allow from a specific CIDR range to a port
sudo ufw allow from 10.0.0.0/8 to any port 5432 proto tcp

# Allow from a /16 range
sudo ufw allow from 172.16.0.0/16 to any port 22 proto tcp

# Allow from multiple specific subnets (add separately)
sudo ufw allow from 192.168.1.0/24 to any port 443 proto tcp
sudo ufw allow from 10.10.0.0/24 to any port 443 proto tcp
```

## Denying Specific IP Addresses

To block traffic from a specific source:

```bash
# Deny all traffic from a specific IP
sudo ufw deny from 203.0.113.100

# Deny a specific IP from reaching a port
sudo ufw deny from 203.0.113.100 to any port 80 proto tcp

# Deny a subnet
sudo ufw deny from 198.51.100.0/24
```

When using deny alongside allow rules for the same port, the order matters. UFW evaluates rules top to bottom, and the first matching rule wins.

## Rule Order with Deny and Allow

Consider this scenario: you want to allow SSH from your company network but deny it from everywhere else, while still allowing port 80 from everyone.

The correct approach is to set the default deny for incoming, then add specific allows:

```bash
# Default deny is already set
sudo ufw default deny incoming

# Allow SSH from company network
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp

# Allow HTTP from everywhere
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# No explicit deny for SSH from other sources is needed
# The default deny handles it
```

But if you need to deny a specific IP while allowing others:

```bash
# This only works correctly if the deny is BEFORE the allow
sudo ufw insert 1 deny from 203.0.113.50 to any port 22

# The allow from your network (added later, has higher number)
sudo ufw allow from 192.168.1.0/24 to any port 22
```

Check the rule order:

```bash
sudo ufw status numbered
```

```text
     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     DENY IN     203.0.113.50
[ 2] 22/tcp                     ALLOW IN    192.168.1.0/24
[ 3] 80/tcp                     ALLOW IN    Anywhere
```

## Restricting Sensitive Services to Specific IPs

A practical configuration for a server with multiple services:

```bash
# SSH - admin workstation and management network only
sudo ufw allow from 192.168.1.10 to any port 22 proto tcp
sudo ufw allow from 10.100.0.0/24 to any port 22 proto tcp

# Database - application servers only
sudo ufw allow from 10.0.1.50 to any port 5432 proto tcp  # App server 1
sudo ufw allow from 10.0.1.51 to any port 5432 proto tcp  # App server 2

# Redis - application servers only
sudo ufw allow from 10.0.1.50 to any port 6379 proto tcp
sudo ufw allow from 10.0.1.51 to any port 6379 proto tcp

# Monitoring - allow Prometheus to scrape metrics
sudo ufw allow from 10.100.0.20 to any port 9090 proto tcp  # Prometheus server
sudo ufw allow from 10.100.0.20 to any port 9100 proto tcp  # node_exporter

# Web traffic - open to everyone
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Allowing Traffic to a Specific Server IP

If your server has multiple IP addresses (multiple NICs or virtual IPs), you can specify which destination IP the rule applies to:

```bash
# Allow SSH to a specific server IP (instead of 'any')
sudo ufw allow from 192.168.1.50 to 10.0.0.1 port 22 proto tcp

# Allow database access to the private IP only
sudo ufw allow from 10.0.1.0/24 to 10.0.0.1 port 5432 proto tcp
```

This is useful when you want a rule to only apply to traffic coming in on a specific interface.

## Managing IP Allowlists at Scale

For managing a larger list of allowed IPs, a script approach is cleaner than running individual commands:

```bash
#!/bin/bash
# Configure SSH access for a list of admin IPs
# Save as /usr/local/bin/setup-ssh-allowlist.sh

SSH_ALLOWED_IPS=(
    "192.168.1.10"       # Admin workstation 1
    "192.168.1.15"       # Admin workstation 2
    "10.100.0.5"         # Jump server
    "10.100.0.6"         # Secondary jump server
)

# Remove existing SSH-specific rules first
# (Be careful - this approach requires adapting to your existing rules)

echo "Adding SSH allow rules..."
for ip in "${SSH_ALLOWED_IPS[@]}"; do
    echo "Allowing SSH from $ip"
    sudo ufw allow from "$ip" to any port 22 proto tcp
done

echo "Done. Current rules:"
sudo ufw status numbered | grep "22/tcp"
```

## Viewing IP-Specific Rules

Filter the rule list to see rules for a specific IP:

```bash
# View all rules
sudo ufw status verbose

# Filter for a specific IP
sudo ufw status | grep "192.168.1.50"

# Numbered view for management
sudo ufw status numbered
```

## Temporary IP Blocks and Timed Rules

UFW itself doesn't support time-limited rules natively, but you can script temporary blocks:

```bash
#!/bin/bash
# Temporarily block an IP for a set duration
# Usage: ./temp-block.sh 203.0.113.100 3600 (block for 1 hour)

IP="$1"
DURATION="$2"

echo "Blocking $IP for $DURATION seconds"
sudo ufw insert 1 deny from "$IP"

(
    sleep "$DURATION"
    echo "Removing block for $IP"
    sudo ufw delete deny from "$IP"
) &

echo "Block added. Will be removed in $DURATION seconds (PID: $!)"
```

## Handling Dynamic IPs

If you need to allow access from IPs that change (like a home connection without a static IP), consider:

1. Setting up a VPN and allowing the VPN server's static IP
2. Using fail2ban with a whitelist for known sources
3. Using a DDNS hostname and a script that updates UFW rules when the IP changes:

```bash
#!/bin/bash
# Update UFW rule for a dynamic IP from DDNS
# Save as /usr/local/bin/update-dynamic-ip-rule.sh

HOSTNAME="myhome.example.dyndns.org"
PORT="22"
CURRENT_IP=$(dig +short "$HOSTNAME" | head -1)

# Read the previously stored IP
STORED_IP_FILE="/var/run/dynamic-fw-ip"
PREVIOUS_IP=$(cat "$STORED_IP_FILE" 2>/dev/null)

if [ "$CURRENT_IP" != "$PREVIOUS_IP" ]; then
    echo "IP changed from $PREVIOUS_IP to $CURRENT_IP"

    # Remove old rule if it existed
    if [ -n "$PREVIOUS_IP" ]; then
        sudo ufw delete allow from "$PREVIOUS_IP" to any port "$PORT" proto tcp
    fi

    # Add new rule
    sudo ufw allow from "$CURRENT_IP" to any port "$PORT" proto tcp

    # Save new IP
    echo "$CURRENT_IP" > "$STORED_IP_FILE"
    echo "Updated firewall rule for $CURRENT_IP"
else
    echo "IP unchanged: $CURRENT_IP"
fi
```

```bash
chmod +x /usr/local/bin/update-dynamic-ip-rule.sh

# Run every 15 minutes
echo "*/15 * * * * root /usr/local/bin/update-dynamic-ip-rule.sh" | sudo tee /etc/cron.d/dynamic-fw
```

## Blocking Known Malicious Ranges

If you're seeing repeated attacks from a specific network:

```bash
# Block a known malicious ASN's ranges
sudo ufw deny from 198.51.100.0/24
sudo ufw deny from 203.0.113.0/24

# Block traffic from entire country (Needs IP range list - see iptables guide for GeoIP blocking)
# UFW handles CIDR blocks, so you'd add each CIDR range separately
```

## Troubleshooting IP-Based Rules

When a rule doesn't seem to be working:

```bash
# Verify the rule exists
sudo ufw status numbered | grep "192.168.1.50"

# Check that the IP you're connecting from is what you think it is
# Test from the client machine
curl ifconfig.me
curl api.ipify.org

# Watch UFW logs to see what's being blocked
sudo tail -f /var/log/ufw.log | grep "192.168.1.50"

# Test connectivity from the allowed IP
nc -zv server-ip 22     # Should succeed
ssh user@server-ip       # Should work

# Test from a non-allowed IP
nc -zv server-ip 22     # Should fail (connection timeout or refused)
```

IP-based firewall rules are the most reliable access control mechanism for services that should only be reachable from known locations. Combined with strong authentication on the services themselves, IP allowlisting provides layered defense that's straightforward to audit and maintain.
