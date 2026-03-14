# Monitor Native Routing with Calico eBPF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, EBPF, Native Routing, Kubernetes, Networking, Monitoring, Performance

Description: Learn how to monitor Calico in native routing mode with the eBPF data plane, including route health verification, eBPF program monitoring, and performance metrics for overlay-free pod networking.

---

## Introduction

Calico's native routing mode combined with the eBPF data plane provides the highest performance pod networking configuration: no overlay encapsulation overhead, minimal iptables rules, and eBPF-powered policy enforcement and service routing. This configuration is ideal for environments where all Kubernetes nodes share a common L2/L3 network fabric that can carry pod routes directly.

In native routing mode, pod-to-pod traffic is routed directly through the underlying network without VXLAN or IPIP encapsulation. Combined with eBPF, this eliminates both the encapsulation overhead and the iptables rule evaluation overhead, resulting in near-bare-metal network performance.

Monitoring this configuration requires verifying that native routes are correctly installed in the kernel routing table, that eBPF programs are loaded and functioning, and that network policy is being enforced through eBPF rather than iptables.

## Prerequisites

- Kubernetes cluster with Calico v3.23+ in eBPF mode with native routing
- Linux kernel 5.3+ on all nodes
- All nodes on the same L3 network (no overlay required)
- `kubectl` with admin access
- `calicoctl` v3.27+ installed
- `bpftool` available on nodes for eBPF inspection

## Step 1: Verify Native Routing Configuration

Confirm that Calico is configured for native routing (no encapsulation).

Check IP pool encapsulation settings and eBPF mode:

```bash
# Verify IP pools have encapsulation disabled
calicoctl get ippools -o yaml | grep -E "encapsulation:|ipipMode:|vxlanMode:"

# Confirm eBPF mode is enabled
calicoctl get felixconfiguration default -o yaml | grep -i "bpf\|ebpf"

# Check that tunnel interfaces are NOT present (no VXLAN/IPIP)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip link show | grep -E "vxlan|tunl|ipip" || echo "No tunnel interfaces - native routing confirmed"

# Verify eBPF filesystem is mounted
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ls /sys/fs/bpf/tc/
```

## Step 2: Monitor Native Route Installation

Verify that pod CIDRs are correctly installed as native routes in the kernel.

Check the kernel routing table for Calico pod routes:

```bash
# List pod CIDR routes on a node (native routes should point to other nodes directly)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip route show | grep "via" | grep -v "default"

# Verify each node's pod CIDR appears as a route on other nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Check route counts (should increase with cluster size)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip route show | wc -l

# Check Felix route table statistics
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName=<node-name> -o name) \
  -- calico-node -felix-live
```

## Step 3: Monitor eBPF Program Health

Verify that Calico eBPF programs are loaded and executing correctly.

Inspect eBPF programs loaded by Calico:

```bash
# List all eBPF programs loaded by Calico on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  bpftool prog list | grep -i calico

# Check eBPF map statistics for policy enforcement
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  bpftool map list | grep calico

# Verify Calico eBPF programs are attached to interfaces
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  tc filter show dev eth0 | grep bpf

# Check eBPF program load errors in calico-node logs
kubectl logs -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  | grep -i "bpf.*error\|ebpf.*fail" | tail -10
```

## Step 4: Measure Performance of Native Routing + eBPF

Benchmark throughput and latency to validate the performance benefits.

Run network performance tests to quantify native routing + eBPF improvements:

```bash
# Deploy iperf3 for throughput testing
kubectl run iperf-server --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeName":"<node-1>"}}' -- -s

kubectl run iperf-client --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeName":"<node-2>"}}' \
  --rm -it \
  -- -c $(kubectl get pod iperf-server -o jsonpath='{.status.podIP}') \
     -t 30 -P 4   # 4 parallel streams for 30 seconds

# Measure latency with hping3
kubectl run latency-test --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<node-2>"}}' \
  --rm -it \
  -- hping3 -c 1000 -S \
     $(kubectl get pod iperf-server -o jsonpath='{.status.podIP}') \
     -p 5201 | tail -3
```

## Step 5: Create eBPF Native Routing Health Alerts

Set up monitoring alerts for native routing and eBPF health.

Configure Prometheus alerts for the native routing + eBPF configuration:

```yaml
# native-routing-ebpf-alerts.yaml - alerts for native routing with eBPF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-native-ebpf-health
  namespace: monitoring
spec:
  groups:
  - name: calico-native-routing
    rules:
    - alert: CalicoRouteLost
      # Alert if route count drops below expected minimum
      expr: |
        felix_route_table_list_failures_total > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Calico route table failures - native routing may be broken"
    - alert: CalicoEBPFProgramUnloaded
      expr: |
        felix_bpf_enabled != 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Calico eBPF mode disabled - native routing without eBPF policy enforcement"
```

Apply the alert rules:

```bash
kubectl apply -f native-routing-ebpf-alerts.yaml
```

## Best Practices

- Use native routing mode only when all nodes are on the same L3 network - it will not work across NAT boundaries without BGP
- Monitor the kernel routing table size on large clusters as native routing adds one route per node
- Enable Calico's auto-routing mode which automatically selects native routing where possible and falls back to VXLAN
- Test failover scenarios where a node goes down and verify that routes are withdrawn from other nodes promptly
- Configure OneUptime latency monitors between pods on different nodes to detect native routing performance regressions

## Conclusion

Native routing with Calico eBPF provides the best network performance possible in Kubernetes, combining no encapsulation overhead with eBPF's efficient policy enforcement. By monitoring native route installation, eBPF program health, and network throughput, you can ensure your high-performance networking configuration remains operational. Use OneUptime to benchmark and monitor application-level network performance, validating that native routing + eBPF is delivering its promised performance advantages.
