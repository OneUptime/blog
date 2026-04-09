# How to Fix MON_NETSPLIT Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Network, Quorum

Description: Learn how to diagnose and resolve the MON_NETSPLIT health warning in Ceph when monitors lose connectivity due to network partitions or routing failures.

---

## Understanding MON_NETSPLIT

`MON_NETSPLIT` occurs when Ceph detects that monitors in different network segments cannot communicate with each other. This typically happens when monitors are spread across availability zones and the network between zones experiences a partition. The affected monitors cannot participate in Paxos consensus, potentially causing quorum loss.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN network partition detected between monitor groups
[WRN] MON_NETSPLIT: mon.a and mon.b may not be able to communicate
```

## Diagnosing Network Connectivity

From the monitor node, test connectivity to other monitor nodes:

```bash
# Test port 6789 (msgr1) and 3300 (msgr2)
nc -zv 10.0.2.10 6789
nc -zv 10.0.2.10 3300

# Trace route
traceroute 10.0.2.10

# Check if packets are dropped
ping -c 10 10.0.2.10
```

In Rook/Kubernetes, test connectivity from within a monitor pod:

```bash
MON_POD=$(kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o name | head -1)
kubectl -n rook-ceph exec $MON_POD -- nc -zv <other-mon-ip> 6789
```

## Common Causes and Fixes

### Firewall Rules Blocking Monitor Ports

Check if firewall rules are blocking monitor traffic:

```bash
iptables -L INPUT -n | grep 6789
iptables -L INPUT -n | grep 3300
```

Allow Ceph monitor ports:

```bash
iptables -A INPUT -p tcp --dport 6789 -j ACCEPT
iptables -A INPUT -p tcp --dport 3300 -j ACCEPT
```

On systems using firewalld:

```bash
firewall-cmd --permanent --add-port=6789/tcp
firewall-cmd --permanent --add-port=3300/tcp
firewall-cmd --reload
```

### Network Interface Configuration

Verify that monitors are binding to the correct interface:

```bash
ceph mon dump
ss -tlnp | grep ceph-mon
```

If monitors are bound to the wrong interface, update the monitor address:

```bash
ceph mon set-addrs a [v2:10.0.1.10:3300/0,v1:10.0.1.10:6789/0]
```

### Kubernetes Network Policy Restrictions

In Rook/Kubernetes, NetworkPolicies may block inter-namespace or inter-node traffic:

```bash
kubectl -n rook-ceph get networkpolicies
```

Check if a policy is blocking monitor-to-monitor communication and adjust:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ceph-mon
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  ingress:
  - ports:
    - port: 6789
    - port: 3300
```

## Verifying Monitor Connectivity

After applying network fixes, check quorum status:

```bash
ceph quorum_status -f json-pretty
```

All monitors should appear in the `quorum_names` list.

## Setting Up Network Monitoring

Proactively monitor inter-node connectivity with blackbox exporter:

```yaml
- alert: CephMonNetworkUnreachable
  expr: probe_success{job="ceph-mon-probe"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Cannot reach Ceph monitor at {{ $labels.instance }}"
```

## Summary

`MON_NETSPLIT` indicates monitors cannot communicate across a network partition. Diagnose by testing TCP connectivity on ports 6789 and 3300 between monitor hosts. Fix by adjusting firewall rules, correcting monitor bind addresses, or reviewing Kubernetes NetworkPolicies. After restoring connectivity, verify quorum with `ceph quorum_status` and set up proactive network reachability monitoring.
