# How to Configure iptables for Connection Tracking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iptables, Networking, Firewall, Security

Description: A practical guide to configuring iptables connection tracking on Ubuntu, covering stateful firewall rules, conntrack states, and performance tuning for production systems.

---

Connection tracking (conntrack) is the feature that transforms iptables from a simple packet filter into a stateful firewall. Without it, you would need separate rules for both directions of every connection - one to allow outgoing requests and another to allow the corresponding incoming responses. With conntrack, you can write rules that understand the context of a packet within an ongoing connection. This guide covers how to configure and tune connection tracking on Ubuntu.

## How Connection Tracking Works

The Linux kernel's netfilter subsystem maintains a table of connections, called the conntrack table. Every packet passing through the system is matched against this table. Based on the match (or lack thereof), the packet is assigned one of four states:

- **NEW** - The packet is starting a new connection not yet in the table
- **ESTABLISHED** - The packet belongs to a known connection with traffic in both directions
- **RELATED** - The packet is starting a new connection related to an existing one (like FTP data channels)
- **INVALID** - The packet does not match any known connection and does not make sense

The conntrack module must be loaded for stateful filtering to work:

```bash
# Check if conntrack modules are loaded
lsmod | grep conntrack

# Load the module if needed
sudo modprobe nf_conntrack

# Make it persist across reboots
echo "nf_conntrack" | sudo tee -a /etc/modules
```

## Writing Stateful Firewall Rules

The most common use of connection tracking is a stateful firewall that allows established connections while controlling new ones:

```bash
# Allow loopback interface (always needed)
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow all established and related connections - this is the key rule
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow new connections to specific services
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -m state --state NEW -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -m state --state NEW -j ACCEPT

# Drop invalid packets explicitly
sudo iptables -A INPUT -m state --state INVALID -j DROP

# Default policy: drop everything else
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
# Output is usually unrestricted
sudo iptables -P OUTPUT ACCEPT
```

You can also use the newer `conntrack` match instead of `state`:

```bash
# The conntrack module is more feature-rich than the older state module
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate INVALID -j DROP
```

## Viewing the Conntrack Table

The `conntrack` command-line tool lets you inspect and manipulate the connection tracking table:

```bash
# Install conntrack tools
sudo apt install conntrack

# List all tracked connections
sudo conntrack -L

# List connections in a more readable format
sudo conntrack -L -o extended

# Filter by protocol
sudo conntrack -L -p tcp
sudo conntrack -L -p udp

# Filter by state
sudo conntrack -L | grep ESTABLISHED
sudo conntrack -L | grep TIME_WAIT

# Count total tracked connections
sudo conntrack -L | wc -l

# Watch connections in real time
sudo conntrack -E
```

Example output from `conntrack -L`:

```text
tcp      6 431999 ESTABLISHED src=192.168.1.50 dst=10.0.0.1 sport=54321 dport=443
         src=10.0.0.1 dst=192.168.1.50 sport=443 dport=54321 [ASSURED] mark=0 use=1
```

The output shows source/destination in both directions, which is how conntrack tracks the full flow.

## Handling FTP and Other RELATED Connections

Protocols like FTP open secondary connections (data channels) that are RELATED to the original control connection. The kernel has helper modules for these:

```bash
# Load FTP connection tracking helper
sudo modprobe nf_conntrack_ftp

# Make it persistent
echo "nf_conntrack_ftp" | sudo tee -a /etc/modules

# The RELATED state rule already handles this
# but you can be explicit about the helper
sudo iptables -A INPUT -m conntrack --ctstate RELATED \
  -m helper --helper ftp -j ACCEPT
```

Other helper modules for common protocols:

```bash
# For H.323 (VoIP)
sudo modprobe nf_conntrack_h323

# For SIP (VoIP)
sudo modprobe nf_conntrack_sip

# For IRC (DCC transfers)
sudo modprobe nf_conntrack_irc

# List all available helpers
ls /lib/modules/$(uname -r)/kernel/net/netfilter/
```

## Tuning Conntrack Table Size

The default conntrack table size is calculated based on available memory but may be too small for high-traffic servers:

```bash
# Check current table size limit
cat /proc/sys/net/netfilter/nf_conntrack_max

# Check current number of tracked connections
cat /proc/sys/net/netfilter/nf_conntrack_count

# Check the hash table size (affects performance)
cat /proc/sys/net/netfilter/nf_conntrack_buckets

# Increase the maximum if you are hitting limits
sudo sysctl -w net.netfilter.nf_conntrack_max=262144

# Also increase bucket count (should be max/4)
sudo sysctl -w net.netfilter.nf_conntrack_buckets=65536
```

Make these changes permanent in `/etc/sysctl.conf`:

```bash
sudo nano /etc/sysctl.conf
```

Add these lines:

```text
# Conntrack table sizing
net.netfilter.nf_conntrack_max = 262144
net.netfilter.nf_conntrack_buckets = 65536

# Timeout tuning (reduce for high-traffic servers)
net.netfilter.nf_conntrack_tcp_timeout_established = 1800
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 15
net.netfilter.nf_conntrack_udp_timeout = 30
net.netfilter.nf_conntrack_generic_timeout = 120
```

Apply the changes:

```bash
sudo sysctl -p
```

## Conntrack Timeout Tuning

Each protocol has its own timeout values. Tuning these is critical for servers with many short-lived connections:

```bash
# View all conntrack timeout settings
sudo sysctl -a | grep conntrack | grep timeout

# View current TCP state timeouts
cat /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_established
cat /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_time_wait
cat /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_syn_sent
cat /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_fin_wait
```

For web servers with many short-lived HTTP connections, reducing the established timeout from the default 5 days to 30 minutes is often appropriate:

```bash
# Reduce established TCP timeout to 30 minutes
sudo sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=1800
```

## Deleting Specific Connections

Sometimes you need to manually remove connections from the table, such as after changing firewall rules:

```bash
# Delete a specific connection
sudo conntrack -D -p tcp --src 192.168.1.100 --sport 54321

# Delete all connections from a specific IP
sudo conntrack -D -s 192.168.1.100

# Delete all connections in TIME_WAIT state
sudo conntrack -D --state TIME_WAIT

# Flush the entire conntrack table (use with caution)
sudo conntrack -F
```

## Monitoring Conntrack for Issues

Watch for the conntrack table filling up, which causes connection failures:

```bash
# Create a simple monitoring script
cat << 'EOF' > /usr/local/bin/check-conntrack.sh
#!/bin/bash
MAX=$(cat /proc/sys/net/netfilter/nf_conntrack_max)
COUNT=$(cat /proc/sys/net/netfilter/nf_conntrack_count)
PCT=$((COUNT * 100 / MAX))

echo "Conntrack: $COUNT / $MAX ($PCT%)"
if [ $PCT -gt 80 ]; then
    echo "WARNING: Conntrack table is over 80% full"
fi
EOF

chmod +x /usr/local/bin/check-conntrack.sh

# Run it
/usr/local/bin/check-conntrack.sh
```

When the table fills up, the kernel logs:

```text
nf_conntrack: table full, dropping packet
```

Check for this in the kernel log:

```bash
sudo dmesg | grep "table full"
sudo journalctl -k | grep "nf_conntrack"
```

## Saving and Restoring Rules

After testing your stateful rules, save them so they persist after reboot:

```bash
# Install iptables-persistent
sudo apt install iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Rules are saved to:
# /etc/iptables/rules.v4
# /etc/iptables/rules.v6

# Reload saved rules without rebooting
sudo netfilter-persistent reload
```

Connection tracking is fundamental to any production firewall configuration. Getting the table size and timeouts right for your traffic patterns will save you from intermittent connection failures that are otherwise very difficult to diagnose.
