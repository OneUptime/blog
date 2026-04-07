# How to Troubleshoot Network Packet Loss in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Network, Packet Loss, Troubleshooting

Description: Learn how to diagnose and resolve network packet loss in Ceph clusters that causes slow requests, OSD flapping, and degraded cluster performance.

---

Network packet loss is one of the most damaging issues a Ceph cluster can experience. Even 0.1% packet loss can cause OSD heartbeat failures, slow requests, and repeated recovery cycles. This guide covers detection methods and resolution strategies.

## Symptoms of Packet Loss

Packet loss in a Ceph cluster typically manifests as:

- Repeated OSD `down/up` flapping in `ceph osd tree`
- `HEALTH_WARN` messages about slow ops
- High latency despite healthy OSD disks
- OSD peer timeouts in the logs
- `ceph osd dump` showing frequently changing OSD states

## Detecting Packet Loss Between OSD Nodes

Use `ping` and `mtr` to measure packet loss between OSD hosts:

```bash
# Basic packet loss test (1000 packets)
ping -c 1000 <osd_peer_host> | tail -3

# Continuous route analysis with loss stats
mtr --report --report-cycles=100 <osd_peer_host>
```

Example `mtr` output showing packet loss at a switch hop:

```yaml
HOST: node-1            Loss%   Snt   Last   Avg  Best  Wrst StDev
  1. 192.168.1.1        0.0%   100    0.3   0.3   0.2   0.4   0.0
  2. 10.0.0.1           2.1%   100    0.8   1.2   0.7  15.3   1.8
  3. 192.168.2.5        2.1%   100   35.2  38.1  32.1  91.4   8.2
```

Loss at hop 2 (switch) indicates a network infrastructure issue.

## Checking OSD Heartbeat Failures

OSD heartbeat timeouts triggered by packet loss appear in logs:

```bash
grep "heartbeat" /var/log/ceph/ceph-osd.*.log | grep "failure\|timeout\|no reply"
```

Adjust heartbeat thresholds to tolerate brief loss without flapping:

```bash
# Require more missed heartbeats before marking OSD down
ceph config set osd osd_heartbeat_grace 40
ceph config set osd osd_heartbeat_min_peers 3
```

## Checking NIC Statistics

Examine network interface error counters on OSD nodes:

```bash
# Show RX/TX errors and drops
ip -s link show eth0

# Or more detail with ethtool
ethtool -S eth0 | grep -E "drop|error|miss|overrun"
```

High `rx_missed_errors` or `tx_carrier_errors` indicate hardware or driver issues.

## Testing with iperf3

Measure actual network throughput and packet loss between OSD nodes:

```bash
# On the receiving node (OSD peer)
iperf3 -s

# On the sending node
iperf3 -c <osd_peer_host> -u -b 1G -t 30
```

UDP test output shows packet loss percentage directly.

## Checking for MTU Mismatches

MTU mismatches cause fragmentation and effective packet loss:

```bash
# Test path MTU
ping -M do -s 8972 <osd_peer_host>
# If ICMP fragmentation needed errors appear, MTU is too large

# Check interface MTU
ip link show | grep mtu

# Set jumbo frames if switch supports it
sudo ip link set eth0 mtu 9000
```

Configure Ceph to use the public and cluster network correctly:

```bash
ceph config set global cluster_network 10.0.0.0/24
ceph config set global public_network 192.168.1.0/24
```

## Isolating the Failing Component

Systematically check each layer:

```bash
# Layer 1/2: Check for NIC errors
ethtool eth0

# Layer 3: Check for routing issues
traceroute <osd_peer_host>

# Layer 4: Check TCP socket errors
ss -s
netstat -s | grep "retransmit\|failed"
```

## Summary

Ceph network packet loss diagnosis starts with `mtr` and `ping` flood tests between OSD nodes to measure loss percentage, followed by NIC error counter inspection with `ethtool`. Heartbeat timeout adjustments reduce OSD flapping while the root cause (switch, NIC, or MTU mismatch) is resolved. Separating public and cluster networks with dedicated NICs is the best long-term preventive measure.
