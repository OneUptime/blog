# How to Troubleshoot NAT Translation Table Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAT, Conntrack, Exhaustion, Linux, Firewall

Description: Learn how to diagnose and fix NAT translation table exhaustion where the conntrack table fills up, causing new connections to be dropped while the router appears healthy.

## What Is NAT Table Exhaustion?

NAT devices maintain a connection tracking (conntrack) table mapping internal IP:port pairs to external IP:port pairs. When this table fills up:
- New connections are silently dropped
- Error: `nf_conntrack: table full, dropping packet`
- Existing connections may continue working
- New web requests, API calls, and DNS queries fail randomly

## Step 1: Detect Conntrack Table Exhaustion

```bash
# Check current conntrack table usage

cat /proc/sys/net/netfilter/nf_conntrack_count   # Current entries
cat /proc/sys/net/netfilter/nf_conntrack_max     # Maximum entries

# If count is close to max, you have exhaustion
echo "$(cat /proc/sys/net/netfilter/nf_conntrack_count) / $(cat /proc/sys/net/netfilter/nf_conntrack_max) entries used"

# Check kernel logs for exhaustion messages
dmesg | grep -i "nf_conntrack"
# Look for: nf_conntrack: table full, dropping packet

# Monitor in real-time
watch -n1 'cat /proc/sys/net/netfilter/nf_conntrack_count'
```

## Step 2: Analyze the Conntrack Table

```bash
# View current NAT connections
conntrack -L

# Count connections by state
conntrack -L | awk '{print $4}' | sort | uniq -c | sort -rn

# Count by destination IP (find top talkers)
conntrack -L | grep ESTABLISHED | awk '{print $6}' | \
    sort | uniq -c | sort -rn | head -20

# Count by source IP (find devices using most connections)
conntrack -L | awk '{print $5}' | grep -o 'src=[0-9.]*' | \
    sort | uniq -c | sort -rn | head -20

# Show connections for specific IP
conntrack -L --orig-src 192.168.1.100
```

## Step 3: Immediate Fix - Increase Table Size

```bash
# Temporarily increase conntrack table size
sudo sysctl -w net.netfilter.nf_conntrack_max=262144

# Make permanent
sudo tee -a /etc/sysctl.conf << 'EOF'

# NAT conntrack table size
net.netfilter.nf_conntrack_max = 262144

# Hash table size (should be nf_conntrack_max / 4)
net.netfilter.nf_conntrack_buckets = 65536
EOF

sudo sysctl -p

# Verify
cat /proc/sys/net/netfilter/nf_conntrack_max
```

## Step 4: Reduce Conntrack Timeouts

```bash
# Default timeouts keep connections in table for too long
# View current timeouts
sysctl -a | grep conntrack_tcp_timeout

# Key timeouts to reduce:
# tcp_timeout_established: default 432000s (5 days!) - reduce to 86400 (1 day)
# tcp_timeout_time_wait: default 120s - reduce to 60s
# tcp_timeout_close_wait: default 60s - keep

sudo tee -a /etc/sysctl.conf << 'EOF'

# Reduce conntrack timeouts to free table entries faster
net.netfilter.nf_conntrack_tcp_timeout_established = 86400
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 60
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 30
net.netfilter.nf_conntrack_tcp_timeout_fin_wait = 30
net.netfilter.nf_conntrack_udp_timeout = 30
net.netfilter.nf_conntrack_udp_timeout_stream = 60
EOF

sudo sysctl -p
```

## Step 5: Manually Flush Stale Connections

```bash
# Flush all conntrack entries (CAUTION: drops all existing NAT sessions)
# Use only in emergencies
sudo conntrack -F

# More targeted: flush only TCP TIME_WAIT entries
sudo conntrack -D -p tcp --state TIME_WAIT 2>/dev/null

# Flush connections to specific destination
conntrack -D -d 1.2.3.4
```

## Step 6: Monitor and Alert

```bash
#!/bin/bash
# /usr/local/bin/conntrack-monitor.sh

MAX=$(cat /proc/sys/net/netfilter/nf_conntrack_max)
CURRENT=$(cat /proc/sys/net/netfilter/nf_conntrack_count)
PCT=$(( CURRENT * 100 / MAX ))

echo "Conntrack: $CURRENT/$MAX ($PCT% full)"

if [ $PCT -ge 80 ]; then
    echo "WARNING: conntrack table at $PCT% capacity" >&2
    logger -p daemon.warning "conntrack table at $PCT% ($CURRENT/$MAX)"
fi

if [ $PCT -ge 95 ]; then
    echo "CRITICAL: conntrack table nearly full!" >&2
    # Optional: flush TIME_WAIT entries
    conntrack -L | grep TIME_WAIT | wc -l | \
        xargs -I{} echo "TIME_WAIT entries: {}"
fi
```

```bash
# Run every minute
echo "* * * * * /usr/local/bin/conntrack-monitor.sh" | sudo crontab -
```

## Conclusion

NAT table exhaustion appears as random new connection failures while existing sessions work. Detect with `cat /proc/sys/net/netfilter/nf_conntrack_count` vs `nf_conntrack_max`, and confirm via `dmesg | grep nf_conntrack`. Fix immediately by increasing `nf_conntrack_max` to 262144+ and reducing `tcp_timeout_established` from 5 days to 1 day. Deploy conntrack utilization monitoring to catch exhaustion before it causes outages, and investigate top-talker IPs causing connection leaks.
