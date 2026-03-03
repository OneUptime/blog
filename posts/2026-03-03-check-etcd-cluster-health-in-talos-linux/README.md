# How to Check etcd Cluster Health in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, etcd, Cluster Health, Distributed Systems

Description: A thorough guide to checking and maintaining etcd cluster health in Talos Linux, including common issues and recovery steps.

---

etcd is the backbone of every Kubernetes cluster. It stores all cluster state, including pod definitions, service configurations, secrets, and more. In a Talos Linux cluster, etcd runs on control plane nodes and is managed by the Talos OS. If etcd becomes unhealthy, your entire cluster is at risk. This guide covers how to check etcd health, understand what the health indicators mean, and respond to common problems.

## Why etcd Health Matters

Every time you run `kubectl get pods` or deploy a new application, that request goes through the Kubernetes API server, which reads from and writes to etcd. If etcd is slow, your API calls are slow. If etcd loses quorum, your cluster cannot process any write operations. No new pods can be scheduled, no services can be updated, no secrets can be created.

A three-node etcd cluster can tolerate one node failure. A five-node cluster can tolerate two. But if more nodes fail than the cluster can handle, you are in trouble. Regular health checks catch problems before they become catastrophic.

## Basic etcd Health Check

The quickest way to check etcd health in Talos Linux:

```bash
# Check etcd service status on a control plane node
talosctl services --nodes <cp-ip> | grep etcd
```

This tells you if etcd is running and its health indicator. For a deeper check:

```bash
# Check etcd health through the talosctl health command
talosctl health --nodes <cp-ip>
```

The health command includes etcd-specific checks as part of its comprehensive cluster health assessment.

## Checking etcd Members

List all etcd members to verify the cluster composition:

```bash
# List all etcd members
talosctl etcd members --nodes <cp-ip>
```

The output shows each member with:

- Member ID
- Hostname or IP
- Whether it is a learner
- Its peer URLs and client URLs

A healthy three-node cluster should show exactly three members, all with consistent state.

## Checking etcd from Multiple Nodes

A subtle but important check is verifying that all control plane nodes agree on the etcd membership:

```bash
# Check members from each control plane node
talosctl etcd members --nodes 10.0.0.1
talosctl etcd members --nodes 10.0.0.2
talosctl etcd members --nodes 10.0.0.3
```

All three commands should return the same member list. If they disagree, there may be a split-brain situation or a member that has not fully joined.

## Checking etcd Alarms

etcd sets alarms when certain thresholds are exceeded:

```bash
# Check for etcd alarms
talosctl etcd alarm list --nodes <cp-ip>
```

Common alarms include:

- **NOSPACE** - The etcd database has exceeded its storage quota
- **CORRUPT** - Data corruption has been detected

If you see alarms, they need to be addressed immediately.

### Resolving the NOSPACE Alarm

```bash
# First, compact the etcd database to reclaim space
talosctl etcd defrag --nodes <cp-ip>

# Then clear the alarm
talosctl etcd alarm disarm --nodes <cp-ip>
```

The NOSPACE alarm typically occurs when the etcd database grows beyond its default quota. You may need to increase the quota in your machine configuration or reduce the amount of data stored in etcd.

## Checking etcd Database Size

The etcd database has a default size limit. Monitor it to prevent NOSPACE alarms:

```bash
# Check etcd status which includes database size
talosctl etcd status --nodes <cp-ip>
```

This shows the database size, number of keys, and other statistics. A healthy etcd database for a typical Kubernetes cluster should be well under the default 2GB limit. If it is growing toward that limit, investigate what is consuming space.

## Checking etcd Performance

etcd performance directly impacts Kubernetes API server responsiveness. Slow etcd means slow cluster operations.

### Disk Latency

etcd is sensitive to disk latency. Check for slow disk operations:

```bash
# Check disk-related kernel messages
talosctl dmesg --nodes <cp-ip> | grep -i "disk\|io\|nvme\|ata"
```

etcd recommends disk latency under 10ms for optimal performance. SSDs or NVMe drives are strongly recommended for etcd workloads.

### Network Latency

etcd members communicate with each other over the network. High latency between members causes leader election instability:

```bash
# Check etcd logs for leader changes
talosctl logs etcd --nodes <cp-ip> | grep "leader\|election\|heartbeat"
```

Frequent leader elections indicate network instability between control plane nodes. Ideally, control plane nodes should be in the same data center or availability zone with less than 10ms latency between them.

## Checking etcd Logs

etcd logs provide detailed information about the cluster's internal state:

```bash
# View recent etcd logs
talosctl logs etcd --nodes <cp-ip>

# Follow etcd logs in real time
talosctl logs etcd --nodes <cp-ip> --follow

# Look for specific patterns
talosctl logs etcd --nodes <cp-ip> | grep "warning\|error\|slow"
```

Key things to look for in the logs:

- **"slow request"** warnings - Indicates etcd is taking too long to process requests
- **"leader changed"** messages - Too many of these suggest instability
- **"failed to send"** errors - Network issues between members
- **"database space exceeded"** - The database hit its size limit
- **"compacting"** messages - Normal maintenance activity

## Creating etcd Snapshots

Regular snapshots are your safety net. Take them before any major operation:

```bash
# Create an etcd snapshot
talosctl etcd snapshot /tmp/etcd-backup.snapshot --nodes <cp-ip>
```

Store snapshots in a secure, off-cluster location. A snapshot contains all cluster state and can be used to recover from a catastrophic failure.

## Automated Health Monitoring Script

Create a script that checks all aspects of etcd health:

```bash
#!/bin/bash
# etcd-health-check.sh
CP_NODES="10.0.0.1 10.0.0.2 10.0.0.3"

echo "=== etcd Member Check ==="
for node in $CP_NODES; do
    echo "--- Members from $node ---"
    talosctl etcd members --nodes $node 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "ERROR: Cannot reach etcd on $node"
    fi
done

echo ""
echo "=== etcd Service Status ==="
for node in $CP_NODES; do
    STATUS=$(talosctl services --nodes $node 2>/dev/null | grep etcd)
    echo "$node: $STATUS"
done

echo ""
echo "=== etcd Alarms ==="
talosctl etcd alarm list --nodes $(echo $CP_NODES | awk '{print $1}') 2>/dev/null
ALARM_RESULT=$?
if [ $ALARM_RESULT -eq 0 ]; then
    echo "No alarms (or check output above)"
fi

echo ""
echo "=== Overall Health ==="
talosctl health --nodes $(echo $CP_NODES | awk '{print $1}') --wait-timeout 2m 2>&1
```

## Understanding etcd Quorum

Quorum is the minimum number of members that must agree for etcd to process writes:

| Cluster Size | Quorum | Tolerated Failures |
|-------------|--------|-------------------|
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

In Talos Linux, three control plane nodes is the most common setup. This gives you tolerance for one failure. Five nodes gives tolerance for two failures but adds complexity and slightly more latency due to the extra replication.

## When to Be Concerned

Treat these as warnings that need investigation:

- etcd member count does not match expected control plane count
- Frequent leader elections (more than a few per hour)
- Database size growing rapidly
- Slow request warnings in logs
- Any etcd alarm being triggered
- Members disagreeing on the member list

Treat these as emergencies:

- Loss of quorum (majority of members down)
- CORRUPT alarm
- NOSPACE alarm with no ability to compact
- etcd service failing to start after a reboot

## Conclusion

Checking etcd health should be a regular part of operating a Talos Linux cluster. The combination of `talosctl services`, `talosctl etcd members`, `talosctl etcd alarm list`, and `talosctl logs etcd` gives you complete visibility into the etcd cluster's state. Regular snapshots protect you from the worst-case scenario, and automated health checks catch problems before they impact your workloads. Treat etcd with the respect it deserves - it is literally the brain of your Kubernetes cluster.
