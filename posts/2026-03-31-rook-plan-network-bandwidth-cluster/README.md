# How to Plan Network Bandwidth for Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, Capacity, Planning, Performance

Description: Calculate required network bandwidth for Ceph clusters by modeling client throughput, replication overhead, and recovery traffic to correctly size public and cluster network links.

---

## Network Traffic Components in Ceph

Ceph generates four types of network traffic:

1. **Client I/O (public network)**: Application read/write requests
2. **Replication (cluster network)**: Copies of client writes to secondary OSDs
3. **Recovery (cluster network)**: Rebuilding data after OSD failures
4. **Heartbeats/metadata (cluster network)**: MON, OSD gossip, PG updates

Each must be sized independently, since peaks rarely coincide.

## Calculating Client Traffic

Estimate public network bandwidth requirements:

```bash
# Formula:
# Peak client bandwidth = (concurrent clients) x (per-client throughput)
# Add 20% overhead for protocol headers, retransmission, and metadata

python3 << 'EOF'
# Example: 50 VMs each doing 200 MB/s peak
concurrent_clients = 50
per_client_mb = 200
overhead_factor = 1.2

peak_gb = (concurrent_clients * per_client_mb * overhead_factor) / 1024
print(f"Required public network: {peak_gb:.1f} GB/s")
print(f"NIC requirement: {peak_gb * 8:.0f} Gbps")
EOF
```

Measure actual current client throughput:

```bash
# Ceph client throughput from cluster stats
ceph -s | grep -E "rd|wr" | tail -2

# Detailed per-pool traffic
ceph osd pool stats | grep -E "read|write"

# Real-time monitoring
watch -n 2 'ceph -s | grep -E "rd|wr|MiB/s"'
```

## Calculating Replication Traffic

For a 3x replica pool, every client write generates 2 additional OSD-to-OSD copies:

```bash
python3 << 'EOF'
replica_factor = 3
client_write_mb = 1000  # MB/s of client writes

# Primary OSD receives client write and sends to 2 replicas
replica_traffic_mb = client_write_mb * (replica_factor - 1)

print(f"Client writes: {client_write_mb} MB/s")
print(f"Cluster replication traffic: {replica_traffic_mb} MB/s")
print(f"Cluster NIC minimum: {(replica_traffic_mb / 1024) * 8:.1f} Gbps")
EOF
```

## Calculating Recovery Traffic

Recovery generates maximum cluster network traffic. Size for worst-case OSD failure:

```bash
python3 << 'EOF'
osd_capacity_tb = 16      # Largest OSD in cluster
recovery_time_hours = 4   # Target recovery time
num_surviving_osds = 11   # OSDs involved in recovery

# Data per surviving OSD to receive
data_per_osd_gb = (osd_capacity_tb * 1024) / num_surviving_osds

# Required sustained recovery throughput
recovery_mb_per_osd = (data_per_osd_gb * 1024) / (recovery_time_hours * 3600)
total_recovery_traffic_gb = (recovery_mb_per_osd * num_surviving_osds) / 1024

print(f"OSD capacity: {osd_capacity_tb} TB")
print(f"Recovery time target: {recovery_time_hours}h")
print(f"Required recovery bandwidth: {total_recovery_traffic_gb:.1f} GB/s")
print(f"Cluster network per node: {(recovery_mb_per_osd / 1024) * 8:.1f} Gbps minimum")
EOF
```

## Network Sizing Recommendations

| Cluster Size | Public Network | Cluster Network |
|-------------|---------------|----------------|
| Small (<10 OSDs) | 10 GbE | 10 GbE |
| Medium (10-50 OSDs) | 25 GbE | 25 GbE |
| Large (50-200 OSDs) | 25 GbE | 100 GbE |
| Enterprise (200+ OSDs) | 100 GbE | 100 GbE (multiple) |

## Monitoring Actual Bandwidth

Track bandwidth utilization on Ceph nodes:

```bash
# Real-time per-interface bandwidth
sar -n DEV 1 60 | grep -E "eth0|eth1|IFACE"

# Check for interface saturation (util% > 80%)
sar -n DEV 5 5 | awk '/eth1/ {if ($NF > 80) print "SATURATED: eth1 at", $NF"%"}'

# OSD network stats
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "msgr_send_bytes|msgr_recv_bytes"
```

## Prometheus Alerting for Network Saturation

```yaml
groups:
- name: ceph-network
  rules:
  - alert: CephNetworkInterfaceHigh
    expr: |
      rate(node_network_transmit_bytes_total{device="eth1",job="ceph-osd"}[5m]) /
      node_network_speed_bytes{device="eth1"} > 0.80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster network interface at {{ $value | humanizePercentage }} utilization"
```

## Summary

Ceph network bandwidth planning requires sizing three separate traffic types: client I/O on the public network (size for peak concurrent client load), replication on the cluster network (2x client writes for 3x replicas), and recovery on the cluster network (sized to recover the largest OSD within your RTO). For medium and large clusters, separate 25 GbE public and cluster interfaces is the minimum recommended configuration, with 100 GbE for high-performance or large clusters.
