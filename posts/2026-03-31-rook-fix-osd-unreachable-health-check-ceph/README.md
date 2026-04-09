# How to Fix OSD_UNREACHABLE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Network, Connectivity

Description: Learn how to diagnose and resolve the OSD_UNREACHABLE health warning in Ceph when OSDs are running but cannot be contacted by the monitors due to network issues.

---

## Understanding OSD_UNREACHABLE

`OSD_UNREACHABLE` differs from `OSD_DOWN` in that the OSD process may be running but monitors or other OSDs cannot communicate with it. This typically indicates a network issue - the OSD is alive but isolated from the rest of the cluster. The OSD will eventually be marked down if connectivity is not restored.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 1 osd(s) are unreachable
[WRN] OSD_UNREACHABLE: osd.5 is unreachable
    osd.5 is running but not reachable from monitors
```

## Verifying OSD Process Status

On the OSD host, check if the process is running:

```bash
# Bare metal
systemctl status ceph-osd@5
ps aux | grep ceph-osd

# Rook - check pod status
kubectl -n rook-ceph get pod -l ceph-osd-id=5
kubectl -n rook-ceph exec -it <osd-5-pod> -- /bin/bash -c "ps aux | grep ceph-osd"
```

If the process is running but unreachable, the issue is network-related.

## Diagnosing Network Isolation

Test connectivity from a monitor to the OSD's public network address:

```bash
# Find OSD address
ceph osd find 5

# Test TCP connectivity to OSD port (default range 6800-7568)
nc -zv <osd-ip> 6800
nc -zv <osd-ip> 6801

# Test ICMP
ping -c 5 <osd-ip>

# Trace route
traceroute <osd-ip>
```

## Common Causes

### MTU Mismatch

A common cause of OSD unreachability is MTU mismatch between nodes:

```bash
# Check MTU on the OSD host
ip link show | grep -E "mtu|eth|bond"

# Check MTU on monitor hosts
ip link show | grep mtu

# Test with jumbo frames
ping -M do -s 8972 <osd-ip>  # Tests MTU of 9000
```

If ping fails with the large packet size, there is an MTU mismatch:

```bash
# Set consistent MTU on all nodes
ip link set dev eth0 mtu 9000

# Or lower MTU to match the minimum in the path
ip link set dev eth0 mtu 1500
```

### Firewall Rules

```bash
# Check iptables on OSD host
iptables -L INPUT -n | grep -E "6800|REJECT|DROP"

# Allow OSD ports (default range 6800-7568)
iptables -A INPUT -p tcp --dport 6800:7568 -j ACCEPT

# For the cluster network
iptables -A INPUT -s <cluster-subnet> -j ACCEPT
```

### Kubernetes CNI Issues

In Rook deployments, CNI misconfiguration can isolate OSD pods:

```bash
# Check CNI on the OSD node
kubectl get pods -n kube-system | grep -E "calico|flannel|weave|cilium"

# Test pod-to-pod connectivity
kubectl -n rook-ceph exec -it <mon-pod> -- ping <osd-pod-ip>

# Check for NetworkPolicy issues
kubectl -n rook-ceph get networkpolicies
```

## Forcing OSD Reconnection

If the network issue is resolved, the OSD should reconnect automatically. Force it by restarting the OSD daemon:

```bash
# Bare metal
systemctl restart ceph-osd@5

# Rook
kubectl -n rook-ceph delete pod <osd-5-pod>
```

## Verifying Recovery

After restoring connectivity:

```bash
ceph health detail
ceph osd stat
```

The OSD should transition from unreachable to `up+in`.

## Summary

`OSD_UNREACHABLE` means an OSD process is alive but the cluster cannot communicate with it. Diagnose by testing network connectivity from monitors to the OSD on ports 6800-7568. Common fixes include correcting MTU mismatches, adjusting firewall rules, or resolving Kubernetes CNI issues. After fixing the network, restart the OSD daemon to force reconnection and verify with `ceph health detail`.
