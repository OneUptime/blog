# How to Block an IP Address with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Security, Blocking, IPv4

Description: Block specific IP addresses or subnets with nftables using simple rules, sets for multiple IPs, and dynamic sets for real-time blocking and unblocking.

Blocking IP addresses with nftables is cleaner and more efficient than iptables, especially when blocking multiple IPs using nftables' built-in set feature.

These examples assume you already have an `inet filter` table with `input` and `output` base chains. If you do not, use the complete config example later in this post first.

## Block a Single IP Address

```bash
# Block all traffic from IP 1.2.3.4

sudo nft add rule inet filter input ip saddr 1.2.3.4 drop

# Block a specific IP on a specific port
sudo nft add rule inet filter input ip saddr 1.2.3.4 tcp dport 22 drop

# Block outbound traffic to an IP
sudo nft add rule inet filter output ip daddr 1.2.3.4 drop
```

## Block a Subnet

```bash
# Block an entire /24 subnet
sudo nft add rule inet filter input ip saddr 192.0.2.0/24 drop

# Block a /16 range
sudo nft add rule inet filter input ip saddr 198.51.0.0/16 drop
```

## Block Multiple IPs Efficiently with Sets

nftables sets are far more efficient than multiple individual rules:

```bash
# Create an nftables set for blocked IPs
sudo nft add set inet filter blocklist '{ type ipv4_addr; flags interval; }'

# Add IPs to the set
sudo nft add element inet filter blocklist '{ 1.2.3.4, 5.6.7.8, 9.10.11.0/24 }'

# Create a rule that drops traffic from any IP in the set
sudo nft add rule inet filter input ip saddr @blocklist drop

# Verify
sudo nft list set inet filter blocklist
```

## Sets with Timeouts

Add IPs that auto-expire after a time period:

```bash
# Create a set with automatic expiry
sudo nft add set inet filter temp-blocklist \
  '{ type ipv4_addr; flags timeout; timeout 1h; }'

# Add an IP - auto-removes after 1 hour
sudo nft add element inet filter temp-blocklist '{ 1.2.3.4 timeout 3600s }'

# Rule to drop traffic from the timeout-based set
sudo nft add rule inet filter input ip saddr @temp-blocklist drop
```

## Manage the Blocklist

```bash
# List all blocked IPs
sudo nft list set inet filter blocklist

# Add a new IP to the blocklist
sudo nft add element inet filter blocklist '{ 100.200.0.0/24 }'

# Remove an IP from the blocklist (unblock)
sudo nft delete element inet filter blocklist '{ 1.2.3.4 }'

# Flush the entire blocklist
sudo nft flush set inet filter blocklist
```

## Log Before Blocking

```bash
# Log and then drop for visibility
sudo nft add rule inet filter input ip saddr 1.2.3.4 \
  log prefix "BLOCKED: " drop

# Log blocked traffic with count
sudo nft add rule inet filter input ip saddr @blocklist \
  counter log prefix "BLOCKLIST-HIT: " drop
```

## Block with a Complete Config File

```bash
sudo tee /etc/nftables.conf << 'EOF'
flush ruleset

table inet filter {
    # IP blocklist set
    set blocklist {
        type ipv4_addr
        flags interval
        elements = {
            1.2.3.4,
            5.6.7.8,
            192.0.2.0/24
        }
    }

    chain input {
        type filter hook input priority 0; policy drop;

        # Block IPs in the blocklist first
        ip saddr @blocklist counter drop

        # Allow loopback
        iif lo accept

        # Allow established connections
        ct state established,related accept

        # Allow SSH
        tcp dport 22 accept
    }
}
EOF

sudo nft -f /etc/nftables.conf
sudo nft list ruleset
```

## View Block Statistics

```bash
# Show how many packets have hit the block rule
sudo nft list chain inet filter input | grep "blocklist"

# Adding 'counter' to the rule tracks matches:
# ip saddr @blocklist counter drop
# Output: ip saddr @blocklist counter packets 234 bytes 12340 drop
```

nftables' built-in sets make IP blocking dramatically more efficient than maintaining one rule per IP - you can block thousands of IPs with a single rule and a set while keeping the ruleset compact.
