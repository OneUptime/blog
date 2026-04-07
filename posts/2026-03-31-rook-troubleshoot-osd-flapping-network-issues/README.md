# How to Troubleshoot Ceph OSD Flapping Due to Network Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Networking, Troubleshooting, Kubernetes

Description: Learn how to diagnose and fix Ceph OSD flapping caused by network problems, including packet loss, MTU mismatches, and network interface instability.

---

OSD flapping - where OSDs repeatedly go up and down - is one of the most disruptive issues in a Ceph cluster. Network problems are a leading cause of this behavior. Understanding how to identify and resolve these issues quickly is critical for maintaining cluster health.

## Identifying OSD Flapping

Start by checking the Ceph cluster health status and recent events:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

Look for repeated `osd.X out` and `osd.X in` messages. You can also check OSD state changes over time:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep -i "up\|down"
```

## Diagnosing Network Problems

Check for network errors on the relevant nodes:

```bash
# On the node hosting the flapping OSD
ip -s link show eth0
netstat -s | grep -i error
```

Test connectivity between OSD nodes using the Ceph cluster network:

```bash
# Ping test between OSD nodes
ping -c 100 -i 0.1 <osd-node-ip> | tail -2

# Check for packet loss with larger packets (test MTU)
ping -c 10 -s 8972 -M do <osd-node-ip>
```

## Checking MTU Configuration

MTU mismatches are a common cause of OSD flapping. Jumbo frames (9000 MTU) are often used for Ceph, and inconsistencies cause issues:

```bash
# Check current MTU on all nodes
kubectl get nodes -o custom-columns='NAME:.metadata.name' | xargs -I{} kubectl debug node/{} -it --image=busybox -- ip link show

# Verify Ceph network interface MTU
kubectl -n rook-ceph exec -it <osd-pod-name> -- ip link show
```

Ensure all nodes in the cluster network have matching MTU settings. Update the Rook CephCluster configuration to specify network settings:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
    connections:
      encryption:
        enabled: false
```

If you need separate public and cluster networks, configure them via the Rook ConfigMap override:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    public_network = 10.0.0.0/24
    cluster_network = 192.168.1.0/24
```

## Adjusting OSD Heartbeat Settings

If your network has inherent latency, tuning OSD heartbeat thresholds can reduce false positives:

```bash
# Increase heartbeat grace period (default is 20 seconds)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_grace 30

# Increase heartbeat interval (default is 6 seconds)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_heartbeat_interval 10
```

These can also be set in a ConfigMap for persistence:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_heartbeat_grace = 30
    osd_heartbeat_interval = 10
```

## Reviewing OSD Logs

Inspect OSD pod logs directly for network-related errors:

```bash
# Find the pod for a specific OSD
kubectl -n rook-ceph get pods -l app=rook-ceph-osd | grep osd-<id>

# Tail logs for network errors
kubectl -n rook-ceph logs rook-ceph-osd-<id>-<hash> | grep -i "network\|timeout\|heartbeat\|refused"
```

## Summary

Ceph OSD flapping due to network issues is diagnosed by reviewing cluster events, testing node-to-node connectivity, verifying MTU consistency, and inspecting OSD logs. Tuning heartbeat grace periods can reduce false flapping in high-latency environments. Persistent configuration changes should be applied via the Rook ConfigMap override to survive pod restarts.
