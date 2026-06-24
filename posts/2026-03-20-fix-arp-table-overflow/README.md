# How to Fix ARP Table Overflow on Switches and Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ARP, ARP Table, Overflow, Switch, Router, Network

Description: Learn how to detect and fix ARP table overflow on switches and routers, where the hardware ARP table becomes full and new address resolutions fail, causing intermittent connectivity.

## What Is ARP Table Overflow?

Network switches and routers have finite ARP or neighbor-table resources. When the table is full:
- New ARP entries cannot be added
- New destinations may fail address resolution, so traffic to new or refreshed peers starts failing
- Existing entries may continue to work until they age out or are garbage-collected
- Logs may show ARP or neighbor-table exhaustion messages

## Step 1: Check ARP Table Usage

```bash
# Linux router/host - check ARP table

ip neigh show
ip neigh show nud all | awk '$NF != "PERMANENT" {count++} END {print count+0}'    # Count non-permanent entries

# Check ARP table limits
sysctl net.ipv4.neigh.default.gc_thresh1    # Minimum entries kept before GC purges
sysctl net.ipv4.neigh.default.gc_thresh2    # GC becomes more aggressive above this threshold
sysctl net.ipv4.neigh.default.gc_thresh3    # Hard maximum for non-permanent entries

# Example values:
# net.ipv4.neigh.default.gc_thresh1 = 128
# net.ipv4.neigh.default.gc_thresh2 = 512
# net.ipv4.neigh.default.gc_thresh3 = 1024  <- Hard maximum for non-permanent entries
```

```text
! Cisco IOS / IOS XE
Router# show arp
Router# show arp summary
Router# show ip arp
```

## Step 2: Detect Overflow in Logs

```bash
# Linux kernel logs
dmesg | grep -Ei "neighbou?r table overflow"
# Look for: neighbour table overflow!

# systemd journal
journalctl -k -g "neighbou?r table overflow"

# Syslog (if your distro writes kernel logs there)
grep -Ei "neighbou?r table overflow|arp.*(overflow|full)" /var/log/syslog

# Watch neighbor-table failures in real-time
dmesg -w | grep -Ei "neighbou?r|arp"
```

```text
! Cisco IOS / IOS XE - inspect the log buffer for ARP-related errors
Router# show logging | include ARP
Router# show logging | include adjacency
! Exact messages are platform-specific; look for ARP or adjacency resource exhaustion
```

## Step 3: Increase ARP Table Limits

```bash
# Linux - increase ARP table size for large networks
sudo tee -a /etc/sysctl.conf << 'EOF'

# ARP table limits
net.ipv4.neigh.default.gc_thresh1 = 1024   # Minimum entries kept before GC purges
net.ipv4.neigh.default.gc_thresh2 = 4096   # GC becomes more aggressive above this threshold
net.ipv4.neigh.default.gc_thresh3 = 8192   # Hard maximum for non-permanent entries

# Neighbor cache timing
net.ipv4.neigh.default.gc_stale_time = 60  # How often to check for stale neighbor entries
net.ipv4.neigh.default.base_reachable_time_ms = 30000  # Base reachable time (30s)
EOF

sudo sysctl -p
```

```text
! Cisco IOS / IOS XE - there is no generic ARP table size setting
! If supported, you can only tune ARP aging on the affected Layer 3 interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# arp timeout 7200    ! 2 hours (default is 4 hours)
```

## Step 4: Reduce ARP Table Entries

```bash
# Count entries by neighbor state
ip neigh show nud all | awk '{print $NF}' | sort | uniq -c | sort -rn
# Common states: REACHABLE, STALE, FAILED, INCOMPLETE, DELAY, PROBE, NOARP, PERMANENT

# Remove failed entries
sudo ip neigh flush nud failed

# Remove stale entries
sudo ip neigh flush nud stale

# Remove all entries (CAUTION: brief connectivity disruption)
sudo ip neigh flush nud all
```

## Step 5: Address Root Cause - Oversized Subnets

```bash
# The most common cause: a /16 subnet with thousands of devices
# creates an ARP table with potentially 65534 entries

# Solution: segment large subnets into smaller /24s
# Before: 10.0.0.0/16 - one broadcast domain, up to 65534 hosts
# After: 10.0.1.0/24, 10.0.2.0/24, ... - max 254 hosts per ARP table

# Calculate how many subnets you need
python3 -c "
total_hosts = 5000
hosts_per_subnet = 254  # /24
subnets_needed = -(-total_hosts // hosts_per_subnet)  # ceiling division
print(f'Need {subnets_needed} x /24 subnets for {total_hosts} hosts')
"
```

## Step 6: Disable Proxy ARP Where Unnecessary

```bash
# Linux - disable proxy ARP (can cause extra entries)
sudo sysctl -w net.ipv4.conf.eth0.proxy_arp=0
sudo sysctl -w net.ipv4.conf.all.proxy_arp=0
```

```text
! Cisco IOS - disable proxy ARP per interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# no ip proxy-arp

! Verify
Router# show ip interface GigabitEthernet0/0
! Look for: Proxy ARP is disabled
```

## Step 7: Monitor ARP Table Health

```bash
#!/bin/bash
# /usr/local/bin/arp-table-monitor.sh

MAX=$(sysctl -n net.ipv4.neigh.default.gc_thresh3)
CURRENT=$(ip neigh show nud all | awk '$NF != "PERMANENT" {count++} END {print count+0}')
PCT=$(( CURRENT * 100 / MAX ))

echo "ARP table: $CURRENT/$MAX non-permanent entries ($PCT% full)"

if [ $PCT -ge 80 ]; then
    logger -p daemon.warning "ARP table at $PCT% ($CURRENT/$MAX non-permanent entries)"
fi
```

## Conclusion

ARP table overflow on Linux is detected via `dmesg | grep -Ei "neighbou?r table overflow"` and confirmed by comparing the non-permanent neighbor count against `gc_thresh3`. Fix immediate pressure by flushing stale or failed entries with `sudo ip neigh flush nud stale` or `sudo ip neigh flush nud failed`, and raise `gc_thresh3` on Linux when the default is too low for the network size. The root cause is usually oversized subnets - segment large /16 networks into smaller subnets to keep individual ARP tables manageable. Disable proxy ARP where not needed to reduce unnecessary entries.
