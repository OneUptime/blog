# Monitor IP-in-IP Encapsulation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IP-in-IP, Encapsulation, Kubernetes, Networking, Monitoring, Overlay

Description: Learn how to configure, monitor, and troubleshoot IP-in-IP encapsulation in Calico, understanding when to use it versus VXLAN or native routing, and how to detect performance issues caused by encapsulation overhead.

---

## Introduction

IP-in-IP (IPIP) is a network encapsulation protocol where an IP packet is wrapped inside another IP packet. Calico uses IPIP encapsulation to route pod traffic across nodes when direct routing is not possible — for example, when nodes are in different subnets and the underlying network does not support BGP route injection.

Calico supports two IPIP modes: `Always` (all pod traffic is encapsulated) and `CrossSubnet` (only traffic crossing subnet boundaries is encapsulated, with direct routing for same-subnet traffic). `CrossSubnet` mode provides better performance by avoiding encapsulation overhead for traffic between nodes in the same subnet.

This guide covers configuring IPIP encapsulation, monitoring IPIP tunnel health, diagnosing encapsulation-related performance issues, and deciding when to switch to VXLAN or native routing.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ installed
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- Access to node interfaces for tunnel inspection
- Network support for IP protocol 4 (IPIP) — some cloud providers block it

## Step 1: Check Current IPIP Configuration

Review the IP-in-IP settings on your Calico IP pools.

Inspect IPIP mode configuration on all IP pools:

```bash
# Show IPIP configuration for all IP pools
calicoctl get ippools -o yaml | grep -E "name:|ipipMode:|vxlanMode:|cidr:"

# Check IPIP mode on the default pool
calicoctl get ippool default-ipv4-ippool -o yaml | grep -E "ipipMode|vxlanMode"

# Verify IPIP tunnels are up on nodes
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip link show tunl0

# Check IPIP tunnel interface statistics
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip -s link show tunl0
```

## Step 2: Monitor IPIP Tunnel Health

Verify that IPIP tunnels are established and carrying traffic correctly.

Check IPIP tunnel state and traffic counters on each node:

```bash
# List all calico-node pods to check per-node IPIP status
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide

# Check Felix status which includes IPIP tunnel information
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName=<node-name> -o name) \
  -- calico-node -bird-ready

# Monitor IPIP packet counters (increase indicates active encapsulation)
# Collected from /proc/net/dev or ip -s link show tunl0
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- bash -c "cat /proc/net/dev | grep tunl0"
```

## Step 3: Diagnose IPIP Performance Issues

Measure the overhead of IPIP encapsulation on network throughput.

Compare throughput with and without IPIP encapsulation:

```bash
# Deploy iperf3 server on one node
kubectl run iperf-server --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeName":"<node-1>"}}' \
  -- -s

# Get iperf server IP
IPERF_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

# Run iperf3 client on a DIFFERENT node (cross-node = IPIP path)
kubectl run iperf-client --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeName":"<node-2>"}}' \
  --rm -it \
  -- -c $IPERF_IP -t 10 -p 5201

# Compare results with expected throughput for your instance type
# IPIP overhead is typically 20-50 bytes per packet, ~2-5% throughput reduction
```

## Step 4: Configure CrossSubnet Mode for Hybrid Performance

Enable CrossSubnet mode to use native routing within subnets and IPIP only across subnets.

Update the IP pool to use CrossSubnet mode:

```yaml
# update-ipip-crosssubnet.yaml - switch IPIP to CrossSubnet mode
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  ipipMode: CrossSubnet    # IPIP only when crossing subnet boundaries
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
```

Apply the CrossSubnet configuration:

```bash
calicoctl apply -f update-ipip-crosssubnet.yaml

# Verify the change is applied
calicoctl get ippool default-ipv4-ippool -o yaml | grep ipipMode

# Verify that same-subnet nodes now use direct routing (no tunl0)
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- ip route show | grep -v tunl0 | head -10
```

## Step 5: Alert on IPIP Tunnel Failures

Create alerts for IPIP tunnel health degradation.

Configure a Prometheus alert for IPIP packet drops:

```yaml
# ipip-health-alert.yaml - alert on IPIP tunnel issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ipip-health
  namespace: monitoring
spec:
  groups:
  - name: calico-ipip
    rules:
    - alert: CalicoIPIPTunnelDown
      # Felix will emit errors when IPIP tunnel configuration fails
      expr: |
        rate(felix_int_dataplane_failures_total[5m]) > 0
      for: 3m
      labels:
        severity: critical
      annotations:
        summary: "Calico Felix dataplane failures detected - IPIP tunnel may be down"
```

Apply the alert:

```bash
kubectl apply -f ipip-health-alert.yaml
```

## Best Practices

- Use `CrossSubnet` IPIP mode rather than `Always` when nodes are in mixed subnets to minimize encapsulation overhead
- Consider switching from IPIP to VXLAN if your cloud provider or firewall blocks IP protocol 4 (IPIP)
- Monitor the `tunl0` interface error counters on each node to detect IPIP tunnel degradation
- Use native routing mode (no encapsulation) when all nodes are on the same L2 network for best performance
- Configure OneUptime TCP port checks against pod IPs to detect IPIP-related connectivity failures indirectly

## Conclusion

IPIP encapsulation in Calico enables pod connectivity across subnets without requiring BGP route injection into the underlying network. By monitoring IPIP tunnel health, using CrossSubnet mode for mixed-subnet environments, and alerting on dataplane failures, you can ensure reliable pod connectivity while minimizing the performance impact of encapsulation. Combine with OneUptime for application-level connectivity monitoring that complements Calico's internal IPIP health metrics.
