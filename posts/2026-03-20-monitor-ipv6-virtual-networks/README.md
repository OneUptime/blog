# How to Monitor IPv6 Traffic in Virtual Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Monitoring, Virtual Network, Prometheus, NetFlow, Wireshark

Description: Monitor IPv6 traffic in virtual machine networks using Prometheus, NetFlow/IPFIX, tcpdump, and hypervisor-specific tools to gain visibility into virtual network IPv6 flows.

## Introduction

Monitoring IPv6 traffic in virtual networks requires tools that understand both virtualization layers and IPv6 protocols. Unlike physical networks, virtual switches expose traffic via mirrored ports, NetFlow/IPFIX export, or direct interface capture on the hypervisor. Key metrics include IPv6 throughput per VM, NDP neighbor table size, DHCPv6 lease counts, and inter-VLAN IPv6 routing statistics.

## Prometheus Metrics for Virtual Network IPv6

```python
#!/usr/bin/env python3
# vnet_ipv6_metrics.py

from prometheus_client import start_http_server, Gauge, Counter
import subprocess
import re
import time

# Metrics

ipv6_rx_bytes = Gauge('vnet_ipv6_rx_bytes', 'IPv6 bytes received', ['interface', 'vm'])
ipv6_tx_bytes = Gauge('vnet_ipv6_tx_bytes', 'IPv6 bytes sent', ['interface', 'vm'])
ndp_neighbors = Gauge('ipv6_ndp_neighbors', 'NDP neighbor table entries', ['state'])
dhcpv6_leases = Gauge('dhcpv6_active_leases', 'Active DHCPv6 leases')

def collect_interface_stats():
    """Collect IPv6 stats from virtual TAP/bridge interfaces."""
    result = subprocess.run(['ip', '-s', 'link', 'show'], capture_output=True, text=True)
    # Parse interface statistics
    current_iface = None
    for line in result.stdout.splitlines():
        iface_match = re.match(r'\d+: (\S+):', line)
        if iface_match:
            current_iface = iface_match.group(1)
        if current_iface and current_iface.startswith('vnet'):
            # vnet interfaces are KVM VM network interfaces
            rx_match = re.search(r'RX:.*?(\d+)', line)
            if rx_match:
                ipv6_rx_bytes.labels(interface=current_iface, vm=current_iface).set(int(rx_match.group(1)))

def collect_ndp_stats():
    """Collect NDP neighbor table statistics."""
    result = subprocess.run(['ip', '-6', 'neigh', 'show'], capture_output=True, text=True)
    states = {'REACHABLE': 0, 'STALE': 0, 'DELAY': 0, 'FAILED': 0}
    for line in result.stdout.splitlines():
        for state in states:
            if state in line:
                states[state] += 1
    for state, count in states.items():
        ndp_neighbors.labels(state=state.lower()).set(count)

def collect_dhcpv6_leases():
    """Count active DHCPv6 leases from Kea."""
    try:
        import requests
        r = requests.post("http://localhost:8000/",
            json={"command": "lease6-get-all", "service": ["dhcp6"]})
        data = r.json()
        leases = data[0].get("arguments", {}).get("leases", [])
        dhcpv6_leases.set(len(leases))
    except Exception:
        pass

if __name__ == "__main__":
    start_http_server(9200)
    while True:
        collect_interface_stats()
        collect_ndp_stats()
        collect_dhcpv6_leases()
        time.sleep(30)
```

## tcpdump IPv6 Traffic Capture on VM Interfaces

```bash
# Capture IPv6 traffic on a specific VM's tap interface
# KVM: VM network interfaces appear as vnet0, vnet1, etc.
virsh domiflist myvm
# Output: vnet0  network  default  virtio  52:54:00:ab:cd:01

# Capture IPv6 traffic for a specific VM
tcpdump -i vnet0 -n ip6

# Capture NDP traffic only
tcpdump -i br0 -n "icmp6 and (icmp6[0] >= 133 and icmp6[0] <= 136)"

# Capture DHCPv6 traffic
tcpdump -i br0 -n "udp and (port 546 or port 547)"

# Write to pcap for Wireshark analysis
tcpdump -i br0 -n ip6 -w /tmp/vnet-ipv6-$(date +%Y%m%d).pcap
```

## OVS: Monitor IPv6 Traffic Statistics

```bash
# Open vSwitch port statistics per VM
ovs-ofctl dump-ports ovs-br0

# Watch IPv6 flows in real time
watch -n2 "ovs-ofctl dump-flows ovs-br0 | grep ipv6 | head -20"

# OVS sFlow export (sampled IPv6 flows are included in the export)
ovs-vsctl -- --id=@sflow create sflow \
    agent=eth0 \
    target='"10.0.0.10:6343"' \
    sampling=64 \
    polling=10 \
    -- set bridge ovs-br0 sflow=@sflow

# OVS NetFlow export (IPv6 flows are included)
ovs-vsctl set Bridge ovs-br0 netflow=@nf -- \
    --id=@nf create NetFlow targets='"10.0.0.20:2055"' \
    active-timeout=60

# Check OVS sFlow configuration
ovs-vsctl list sFlow
```

## Wireshark Analysis for Virtual Network IPv6

```bash
# Remote capture from hypervisor host and pipe to Wireshark
ssh root@hypervisor "tcpdump -U -w - -i br0 ip6" | \
    wireshark -k -i -

# Or save and open locally
ssh root@hypervisor "tcpdump -i br0 -n ip6 -c 1000 -w /tmp/ipv6.pcap"
scp root@hypervisor:/tmp/ipv6.pcap ./
wireshark ipv6.pcap
```

## VMware vSphere: Port Mirroring for IPv6 Analysis

```text
# VMware: configure vSphere Distributed Switch port mirror
# for capturing IPv6 traffic from VMs

1. vSphere Client → Networking → vDS → Configure → Port Mirroring
2. Add Session:
   - Type: Distributed Port Mirroring
   - Direction: Ingress & Egress
   - Sources: VM port groups to monitor
   - Destination: Analysis VM port (running Wireshark)
3. Save

# On the analysis VM:
tcpdump -i eth0 -n ip6 -w /tmp/vsphere-ipv6.pcap
```

## Prometheus Alert Rules for IPv6 Virtual Networks

```yaml
# /etc/prometheus/rules/vnet-ipv6.yaml

groups:
  - name: vnet_ipv6
    rules:
      # Alert if NDP neighbor table is growing unusually large
      - alert: NDPNeighborTableLarge
        expr: sum(ipv6_ndp_neighbors) > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NDP neighbor table unusually large ({{ $value }} entries)"

      # Alert if DHCPv6 pool is exhausted
      - alert: DHCPv6PoolNearExhaustion
        expr: dhcpv6_active_leases / dhcpv6_pool_size > 0.90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "DHCPv6 pool {{ $value | humanizePercentage }} utilized"

      # Alert if IPv6 traffic drops significantly
      - alert: VMIPv6TrafficDrop
        expr: delta(vnet_ipv6_rx_bytes[5m]) == 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "VM {{ $labels.vm }} has no IPv6 receive traffic"
```

## Grafana Dashboard for Virtual Network IPv6

```bash
# Key panels for a virtual network IPv6 Grafana dashboard:

# 1. IPv6 throughput per VM (from vnet interface stats)
# Query: rate(vnet_ipv6_rx_bytes[5m]) * 8
# Visualization: Time series with VM labels

# 2. NDP neighbor table size by state
# Query: ipv6_ndp_neighbors
# Visualization: Stacked bar chart

# 3. Active DHCPv6 leases over time
# Query: dhcpv6_active_leases
# Visualization: Gauge with thresholds

# 4. IPv6 vs IPv4 traffic ratio
# Query: sum(rate(vnet_ipv6_rx_bytes[5m])) / sum(rate(vnet_rx_bytes[5m]))
# Visualization: Gauge (target: >50% IPv6)
```

## Conclusion

Monitoring IPv6 in virtual networks requires combining hypervisor-level tools (tcpdump on vnet/tap interfaces, OVS sFlow, VMware port mirroring) with Prometheus metrics collectors. KVM VM interfaces appear as `vnet0`, `vnet1`, etc. on the host - capturing on these interfaces shows all traffic for that VM. OVS provides per-port statistics and supports sFlow/NetFlow export for IPv6 traffic to external collectors. Key metrics to monitor are NDP neighbor table size (STALE entries indicate stale VMs), DHCPv6 lease pool utilization, and IPv6 throughput per VM to detect IPv6-only connectivity failures.
