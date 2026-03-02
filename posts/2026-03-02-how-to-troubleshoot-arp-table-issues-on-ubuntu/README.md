# How to Troubleshoot ARP Table Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, ARP, Troubleshooting, Network Diagnostics

Description: Guide to diagnosing and resolving ARP table problems on Ubuntu, including stale entries, ARP cache overflow, ARP spoofing detection, and Gratuitous ARP issues.

---

ARP (Address Resolution Protocol) is the mechanism by which Linux maps IP addresses to MAC addresses on a local network. Without a correct ARP entry, a system cannot send packets to a local host even if the IP is correct. ARP problems are uncommon but particularly confusing when they occur, because higher-level tools like ping and traceroute may show the route as correct while connectivity still fails.

## How ARP Works on Ubuntu

When a Linux system needs to send a packet to a host on the same subnet, it checks its ARP cache. If no entry exists, it broadcasts an ARP request asking "who has IP x.x.x.x?" The host with that IP responds with its MAC address, and the entry is cached for future use.

Each ARP entry has a state:
- **reachable**: Entry is valid, recently confirmed
- **stale**: Entry is old but not yet purged - next packet will trigger confirmation
- **delay**: Waiting to probe the neighbor
- **probe**: Actively probing to confirm the entry is still valid
- **failed**: Probe failed, host is unreachable

## Viewing the ARP Cache

```bash
# Modern method: ip neighbor (ARP table uses neighbor discovery in Linux)
ip neighbor show

# Or shorter
ip neigh show

# Example output:
# 192.168.1.1 dev eth0 lladdr 52:54:00:12:34:56 REACHABLE
# 192.168.1.50 dev eth0 lladdr 52:54:00:ab:cd:ef STALE
# 192.168.1.100 dev eth0  FAILED

# Legacy method (still works)
arp -n

# View ARP entries for a specific interface
ip neigh show dev eth0

# Filter by state
ip neigh show nud reachable
ip neigh show nud failed
ip neigh show nud stale
```

## Common ARP Problems

### Stale or Missing Entries

Stale entries cause brief connection interruptions when the system tries to confirm the old entry. If confirmation fails (host moved to a different MAC), the entry moves to FAILED state.

```bash
# Flush the ARP cache and let it repopulate
sudo ip neigh flush dev eth0

# Or flush all entries
sudo ip neigh flush all

# Delete a specific stale entry
sudo ip neigh del 192.168.1.50 dev eth0

# After flushing, trigger ARP resolution by pinging the host
ping -c 1 192.168.1.50

# Verify a new entry was created
ip neigh show 192.168.1.50
```

### FAILED ARP Entries

An entry in FAILED state means ARP probes went unanswered. This could indicate:
- The host is down
- The host's IP changed
- A firewall is blocking ARP
- The host moved to a different subnet

```bash
# Show all failed entries
ip neigh show nud failed

# Check if the host is reachable at all
ping -c 3 192.168.1.50
arping -I eth0 -c 3 192.168.1.50

# arping sends direct ARP requests and shows MAC responses
# If arping works but ping fails, there is an upper-layer issue
# If arping also fails, the host is genuinely unreachable
```

### Incomplete ARP Entries

INCOMPLETE entries appear when an ARP request was sent but no reply was received yet. If a host shows INCOMPLETE persistently, it likely does not exist on the subnet.

```bash
# Check for incomplete entries
ip neigh show | grep INCOMPLETE

# If you see INCOMPLETE entries that should exist
# Check if the target host is on the correct subnet
# Verify the default gateway is correct
ip route show
```

## ARP Cache Size and Overflow

On busy routers or servers with many local connections, the ARP cache can fill up:

```bash
# View current ARP cache size limits
cat /proc/sys/net/ipv4/neigh/default/gc_thresh1
# 128 - minimum entries, garbage collection not triggered below this

cat /proc/sys/net/ipv4/neigh/default/gc_thresh2
# 512 - soft limit, garbage collection starts here

cat /proc/sys/net/ipv4/neigh/default/gc_thresh3
# 1024 - hard limit, new entries start dropping

# View the current number of ARP entries
ip neigh show | wc -l

# If approaching the hard limit, increase it
sudo sysctl -w net.ipv4.neigh.default.gc_thresh1=1024
sudo sysctl -w net.ipv4.neigh.default.gc_thresh2=2048
sudo sysctl -w net.ipv4.neigh.default.gc_thresh3=4096

# Make persistent
sudo tee /etc/sysctl.d/99-arp-cache.conf <<EOF
net.ipv4.neigh.default.gc_thresh1 = 1024
net.ipv4.neigh.default.gc_thresh2 = 2048
net.ipv4.neigh.default.gc_thresh3 = 4096
EOF

sudo sysctl --system
```

When the ARP table is full, the kernel logs a warning:

```bash
# Check for ARP table overflow warnings
sudo dmesg | grep -i 'neighbor\|arp\|neigh' | head -20
# Look for: "neighbour: arp_cache: neighbor table overflow!"
```

## ARP Timeout Configuration

Adjust how long entries remain in the cache:

```bash
# Time before an unused entry becomes stale (default: 30 seconds)
cat /proc/sys/net/ipv4/neigh/default/base_reachable_time_ms

# Maximum time to wait for ARP response (default: 500ms)
cat /proc/sys/net/ipv4/neigh/default/ucast_solicit
cat /proc/sys/net/ipv4/neigh/default/mcast_solicit

# For environments with many transient hosts (like Kubernetes nodes)
# increase the reachable time to reduce ARP chatter
sudo sysctl -w net.ipv4.neigh.default.base_reachable_time_ms=300000  # 5 minutes
sudo sysctl -w net.ipv4.neigh.default.gc_stale_time=300  # 5 minutes
```

## Adding Static ARP Entries

For critical servers whose MAC address should never change, static ARP entries prevent ARP spoofing and ensure connectivity even if ARP is disrupted:

```bash
# Add a permanent static ARP entry
sudo ip neigh add 192.168.1.1 lladdr 52:54:00:12:34:56 dev eth0 nud permanent

# Verify
ip neigh show 192.168.1.1
# 192.168.1.1 dev eth0 lladdr 52:54:00:12:34:56 PERMANENT

# Remove a static entry
sudo ip neigh del 192.168.1.1 dev eth0
```

To persist static entries across reboots, add them to a systemd service or Netplan:

```yaml
# /etc/netplan/00-static-arp.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      # Netplan 0.105+ supports static ARP (neighbors)
      # neighbors:
      #   - to: 192.168.1.1
      #     mac: 52:54:00:12:34:56
```

## Detecting ARP Spoofing

ARP spoofing (gratuitous ARP) allows attackers to redirect traffic by claiming a different MAC for an existing IP:

```bash
# Monitor for ARP changes that indicate spoofing
sudo arp-scan --localnet --interface=eth0

# Install arpwatch for continuous monitoring
sudo apt-get install -y arpwatch

sudo systemctl enable --now arpwatch

# arpwatch logs to syslog when it detects:
# - new station (new host appearing)
# - changed ethernet address (ARP spoofing indicator)
# - flip flop (MAC changing back and forth)

sudo tail -f /var/log/syslog | grep arpwatch
```

### Gratuitous ARP for IP Failover

Gratuitous ARP is also used legitimately for high-availability failover (Keepalived/VRRP):

```bash
# Send a gratuitous ARP announcement (used after failover)
sudo arping -U -I eth0 -c 3 192.168.1.100

# This tells all hosts on the subnet that 192.168.1.100 is now at this machine's MAC
# Useful after:
# - Virtual IP failover
# - NIC replacement
# - VM migration
```

## Proxy ARP

Proxy ARP allows a router to respond to ARP requests on behalf of hosts on other subnets:

```bash
# Check if proxy ARP is enabled
cat /proc/sys/net/ipv4/conf/eth0/proxy_arp

# Enable proxy ARP on an interface (useful for routing scenarios)
sudo sysctl -w net.ipv4.conf.eth0.proxy_arp=1

# More common use: enable on all interfaces
sudo sysctl -w net.ipv4.conf.all.proxy_arp=1
```

## Capturing ARP Traffic

When debugging an ARP problem live:

```bash
# Capture all ARP traffic on an interface
sudo tcpdump -i eth0 arp

# Output shows:
# ARP request: "who-has 192.168.1.1 tell 192.168.1.50"
# ARP reply:   "192.168.1.1 is-at 52:54:00:12:34:56"

# Filter for ARP replies only (to see who is responding)
sudo tcpdump -i eth0 arp and arp[6:2] = 2

# Look for unexpected ARP replies for a specific IP (potential spoofing)
sudo tcpdump -i eth0 'arp[6:2]=2 and arp[24:4]=0xC0A80101'
# Replace 0xC0A80101 with hex of your gateway IP (192.168.1.1)
```

## Kubernetes and Calico ARP Issues

In Kubernetes environments with Calico or Flannel, ARP issues can prevent pod-to-pod communication:

```bash
# On a Kubernetes node, check for ARP entries related to pod IPs
ip neigh show | grep '10.244\|10.0\.' | head -20

# Flush ARP cache on a node when pods cannot communicate
sudo ip neigh flush all

# Check if proxy ARP is configured for the pod network interface
cat /proc/sys/net/ipv4/conf/cali*/proxy_arp

# Calico usually requires proxy_arp=1 on its interfaces
```

## ARP Diagnostic Summary

When ARP is suspected as a problem:

```bash
# Quick diagnostic
{
  echo "=== ARP cache ==="
  ip neigh show

  echo "=== Failed/incomplete entries ==="
  ip neigh show | grep -E 'FAIL|INCOMPLETE'

  echo "=== ARP cache size limits ==="
  sysctl net.ipv4.neigh.default.gc_thresh{1,2,3}

  echo "=== Current count ==="
  echo "ARP entries: $(ip neigh show | wc -l)"

  echo "=== Kernel messages ==="
  dmesg | grep -i 'neigh\|arp' | tail -5

  echo "=== arping test to gateway ==="
  GW=$(ip route | grep default | awk '{print $3}')
  arping -I eth0 -c 3 "$GW" 2>/dev/null || echo "arping to $GW failed"
} 2>&1
```

ARP issues are typically transient and self-resolve when entries expire and are re-learned. When they are persistent - especially FAILED entries for hosts that definitely exist - the cause is almost always a misconfigured subnet mask, a host that moved subnets, or firewall rules blocking ICMP/ARP on a switch port.
