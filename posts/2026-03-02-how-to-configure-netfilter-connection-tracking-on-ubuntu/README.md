# How to Configure Netfilter Connection Tracking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Netfilter, Connection Tracking, Firewall, Iptables

Description: Understand and configure Netfilter's connection tracking subsystem on Ubuntu, including conntrack table tuning, helper modules, and troubleshooting dropped connections.

---

Netfilter's connection tracking (conntrack) is the engine behind stateful firewalling on Linux. Every time a packet passes through the kernel's networking stack, conntrack records or looks up the connection state so that iptables ESTABLISHED and RELATED rules can work. Without conntrack, you would need explicit rules for both directions of every connection.

Understanding conntrack internals helps you solve a class of networking problems that appear as mysterious dropped connections, especially under high load or with unusual protocols.

## How Connection Tracking Works

When a new connection arrives (the SYN packet of a TCP handshake, or the first UDP datagram), conntrack creates an entry in the conntrack table. The entry records:

- Source and destination IP addresses
- Source and destination ports
- Protocol
- Connection state (NEW, ESTABLISHED, RELATED, INVALID)
- A timeout value

Subsequent packets matching this entry are classified as ESTABLISHED and (depending on your iptables rules) pass through without additional processing overhead.

## Basic conntrack Commands

```bash
# Install conntrack tools
sudo apt install -y conntrack

# View all current connections
sudo conntrack -L

# Count current connections
sudo conntrack -C

# Show only TCP connections
sudo conntrack -L -p tcp

# Show connections to a specific host
sudo conntrack -L --dst-nat 192.168.1.100

# Watch new connections in real time
sudo conntrack -E
```

## Conntrack Table Size and Limits

Under high load, the conntrack table can fill up. When it does, new connections are dropped. This is a common cause of intermittent connectivity issues on busy servers or firewalls.

```bash
# Check the current conntrack table size limit
sysctl net.netfilter.nf_conntrack_max

# Check how full the table currently is
cat /proc/sys/net/netfilter/nf_conntrack_count

# Check what percentage it is full
echo "Used: $(cat /proc/sys/net/netfilter/nf_conntrack_count) / Max: $(sysctl -n net.netfilter.nf_conntrack_max)"

# If count is approaching max, increase the limit
sudo sysctl -w net.netfilter.nf_conntrack_max=524288

# Increase the hash table size to match (should be about 1/4 of max)
sudo sysctl -w net.netfilter.nf_conntrack_buckets=131072
```

```bash
# Make these changes persistent
sudo tee /etc/sysctl.d/99-conntrack.conf > /dev/null <<'EOF'
# Maximum number of connection tracking entries
net.netfilter.nf_conntrack_max = 524288

# Conntrack hash table size (should be ~1/4 of max for efficiency)
# Note: nf_conntrack_buckets may need to be set via module parameter on some kernels
net.netfilter.nf_conntrack_buckets = 131072
EOF

sudo sysctl -p /etc/sysctl.d/99-conntrack.conf
```

## Conntrack Timeouts

Each protocol has its own timeout values. Connections that are inactive for longer than their timeout are removed from the table. For environments with many long-lived connections or many short-lived connections, tuning these matters.

```bash
# View all timeout settings
sysctl -a | grep nf_conntrack | grep timeout

# Common timeouts to tune:

# TCP established connections (default: 432000 seconds = 5 days)
# For web servers with many keep-alive connections, this can be reduced
sudo sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=3600

# TCP connections in TIME_WAIT state (default: 120 seconds)
sudo sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30

# UDP connections (default: 30 seconds for new, 180 for replied)
sudo sysctl -w net.netfilter.nf_conntrack_udp_timeout=10
sudo sysctl -w net.netfilter.nf_conntrack_udp_timeout_stream=30

# ICMP (default: 30 seconds)
sudo sysctl -w net.netfilter.nf_conntrack_icmp_timeout=5

# Persist timeout changes
sudo tee -a /etc/sysctl.d/99-conntrack.conf > /dev/null <<'EOF'

# Reduced TCP established timeout for busy web servers
net.netfilter.nf_conntrack_tcp_timeout_established = 3600

# Aggressive TIME_WAIT cleanup
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30

# Short UDP timeouts for DNS-heavy environments
net.netfilter.nf_conntrack_udp_timeout = 10
net.netfilter.nf_conntrack_udp_timeout_stream = 30
EOF
```

## Protocol Helpers

Some protocols embed IP addresses and ports in the application layer (FTP, SIP, H.323). Conntrack helpers parse these protocols and create RELATED entries for the secondary connections.

```bash
# List currently loaded conntrack helper modules
lsmod | grep nf_conntrack

# Load the FTP helper (allows passive/active FTP through NAT)
sudo modprobe nf_conntrack_ftp

# Load the SIP helper (allows SIP through NAT)
sudo modprobe nf_conntrack_sip

# Make module loading persistent
sudo tee /etc/modules-load.d/conntrack-helpers.conf > /dev/null <<'EOF'
nf_conntrack_ftp
nf_conntrack_sip
EOF
```

### Configuring Helpers with iptables

In newer kernels, you must explicitly configure which connections use which helper (rather than auto-detection):

```bash
# Assign the FTP helper to traffic on port 21
sudo iptables -A PREROUTING -t raw -p tcp --dport 21 -j CT --helper ftp

# Assign the SIP helper to traffic on port 5060
sudo iptables -A PREROUTING -t raw -p udp --dport 5060 -j CT --helper sip

# Verify helpers are assigned
sudo conntrack -L -p tcp --dport 21
```

## Conntrack Zones

Conntrack zones allow the same 5-tuple (src IP, dst IP, src port, dst port, proto) to have multiple conntrack entries - one per zone. This is needed when traffic with identical source and destination addresses flows through the same device multiple times (hairpin NAT, DNAT scenarios).

```bash
# Assign incoming traffic on eth0 to zone 1
sudo iptables -A PREROUTING -t raw -i eth0 -j CT --zone 1

# Assign traffic from the VPN interface to zone 2
sudo iptables -A PREROUTING -t raw -i tun0 -j CT --zone 2
```

## Bypassing Connection Tracking

For high-performance scenarios where you don't need stateful inspection (e.g., a DDoS scrubbing appliance, or raw packet forwarding), bypassing conntrack reduces latency and CPU load:

```bash
# Use the NOTRACK target (in raw table, before conntrack)
# Bypass conntrack for all traffic on a specific interface
sudo iptables -A PREROUTING -t raw -i eth0 -j NOTRACK
sudo iptables -A OUTPUT -t raw -o eth0 -j NOTRACK

# Or bypass for a specific service
sudo iptables -A PREROUTING -t raw -p udp --dport 53 -j NOTRACK
sudo iptables -A OUTPUT -t raw -p udp --sport 53 -j NOTRACK

# With nftables, use the equivalent:
# nft add rule ip raw prerouting iif eth0 notrack
```

## Deleting Conntrack Entries

Sometimes you need to flush specific entries to force connections to be re-evaluated (after changing NAT rules, for example):

```bash
# Delete a specific entry by destination
sudo conntrack -D --dst 192.168.1.100

# Delete by protocol and port
sudo conntrack -D -p tcp --dport 80

# Delete all entries (flush the entire table)
# WARNING: this drops all established connections
sudo conntrack -F

# Delete entries in a specific state
sudo conntrack -D -s INVALID
```

## Monitoring and Statistics

```bash
# Show conntrack module statistics (per-CPU counters)
sudo conntrack -S

# The output shows:
# found=     entries found in the table
# invalid=   invalid packets (often attack traffic)
# insert=    new entries created
# insert_failed= hash collisions or table full events
# drop=      packets dropped because table was full
# early_drop= entries dropped to make room for new ones

# Watch conntrack events in real time (new/destroy/update)
sudo conntrack -E

# Filter events for a specific IP
sudo conntrack -E --src 192.168.1.50

# Count connections per remote IP (useful for detecting connection flooding)
sudo conntrack -L -o extended | \
    awk '/^tcp/{print $7}' | \
    sort | uniq -c | sort -rn | head -20
```

## Troubleshooting Dropped Connections

When connections are mysteriously dropping:

```bash
# Check for conntrack table overflow
watch -n 1 'echo "Used: $(cat /proc/sys/net/netfilter/nf_conntrack_count) / Max: $(cat /proc/sys/net/netfilter/nf_conntrack_max)"'

# Check iptables rules for DROP on INVALID state
sudo iptables -L -n -v | grep INVALID

# Check for INVALID packets being received
sudo conntrack -L -s INVALID | wc -l

# Enable conntrack logging for dropped connections
# (Use with care - extremely verbose on busy systems)
sudo iptables -A INPUT -m state --state INVALID -j LOG --log-prefix "INVALID: "

# Check dmesg for conntrack-related messages
sudo dmesg | grep conntrack
sudo dmesg | grep "nf_conntrack: table full"

# If you see "table full" messages, increase nf_conntrack_max immediately
sudo sysctl -w net.netfilter.nf_conntrack_max=1048576
```

The conntrack table full condition is one of the more insidious Linux networking problems because it causes new connections to fail while existing connections continue working perfectly. Monitoring `nf_conntrack_count` against `nf_conntrack_max` should be part of any firewall or NAT gateway's standard monitoring setup.
