# Monitor Kube-Proxy Replacement with Calico eBPF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, eBPF, Kube-proxy, Kubernetes, Networking, Monitoring, Performance

Description: Learn how to enable and monitor Calico's eBPF-based kube-proxy replacement, which provides improved performance, lower latency, and better observability compared to iptables-based kube-proxy.

---

## Introduction

Calico's eBPF data plane can replace kube-proxy entirely, handling service routing directly through eBPF programs in the kernel. This eliminates the iptables rule chains that kube-proxy creates, resulting in lower latency for service calls, reduced CPU overhead on nodes with many services, and improved observability through eBPF map inspection.

When kube-proxy replacement is enabled, Calico's eBPF programs handle service load balancing, NodePort traffic, and service IP translation, replacing all functions that kube-proxy would otherwise perform. This is a significant architecture change that requires careful monitoring during and after the transition.

This guide covers enabling Calico's eBPF kube-proxy replacement, validating its functionality, and setting up monitoring to ensure service routing operates correctly without kube-proxy.

## Prerequisites

- Kubernetes cluster with Calico v3.23+ in eBPF mode
- Linux kernel 5.3+ on all nodes (required for kube-proxy replacement)
- `kubectl` with admin access
- `calicoctl` v3.27+ installed
- kube-proxy either disabled or in standby mode

## Step 1: Verify eBPF Mode Prerequisites

Check that all nodes meet the kernel version requirement for kube-proxy replacement.

Inspect kernel versions across all nodes:

```bash
# Check kernel versions on all nodes (need 5.3+ for kube-proxy replacement)
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
KERNEL:.status.nodeInfo.kernelVersion

# Verify eBPF filesystem is mounted on nodes
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  mount | grep bpf

# Check that required eBPF features are available
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ls /sys/fs/bpf/
```

## Step 2: Enable Calico eBPF and Disable kube-proxy

Configure Calico for eBPF mode and remove kube-proxy from the cluster.

Enable eBPF mode in the Calico FelixConfiguration:

```yaml
# calico-ebpf-config.yaml - enable Calico eBPF kube-proxy replacement
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    linuxDataplane: BPF           # Enable eBPF data plane
    # kube-proxy replacement is included when eBPF mode is enabled
```

Apply eBPF mode and annotate kube-proxy to disable it:

```bash
# Apply eBPF configuration
kubectl apply -f calico-ebpf-config.yaml

# Disable kube-proxy by patching its DaemonSet to use node affinity
kubectl patch ds -n kube-system kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-calico": "true"}}}}}'

# Set the Kubernetes service host for Calico eBPF (critical for correct operation)
kubectl patch installation default --type=merge \
  -p '{"spec":{"calicoNetwork":{"kubeAPIServer":{"host":"<api-server-ip>","port":6443}}}}'
```

## Step 3: Verify eBPF kube-proxy Replacement

Confirm that Calico eBPF is handling service routing instead of kube-proxy.

Validate that eBPF programs are loaded and service routing works:

```bash
# Verify Calico is operating in eBPF mode
calicoctl get felixconfiguration default -o yaml | grep -i ebpf

# Check that eBPF programs are loaded on nodes
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  bpftool prog list | grep calico

# Verify service routing works without kube-proxy
kubectl run test --image=curlimages/curl --rm -it -- \
  curl http://kubernetes.default.svc.cluster.local

# Check eBPF map statistics for service load balancing
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- calico-node -felix-live
```

## Step 4: Compare Performance Metrics

Measure the performance improvement from eBPF kube-proxy replacement.

Benchmark service routing latency with and without kube-proxy replacement:

```bash
# Test service routing latency in eBPF mode
kubectl run latency-test --image=nicolaka/netshoot --rm -it -- \
  hping3 -c 100 -S -p 443 kubernetes.default.svc.cluster.local \
  | grep "round-trip"

# Monitor Felix eBPF program compilation time (startup performance)
kubectl logs -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  | grep -i "ebpf\|bpf\|compile"

# Check iptables rule count (should be much lower with eBPF replacement)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  iptables-save | wc -l
```

## Step 5: Create eBPF Health Monitoring Alerts

Set up monitoring for eBPF-specific health indicators.

Configure Prometheus alerts for eBPF data plane health:

```yaml
# ebpf-health-alerts.yaml - alerts for Calico eBPF kube-proxy replacement
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ebpf-health
  namespace: monitoring
spec:
  groups:
  - name: calico-ebpf
    rules:
    - alert: CalicoEBPFDataplaneFailed
      expr: |
        rate(felix_int_dataplane_failures_total[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Calico eBPF dataplane failures - kube-proxy replacement may be broken"
    - alert: CalicoNodeNotEBPFReady
      expr: |
        felix_bpf_enabled != 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Calico node {{ $labels.node }} is not running in eBPF mode"
```

Apply the alert rules:

```bash
kubectl apply -f ebpf-health-alerts.yaml
```

## Best Practices

- Test eBPF kube-proxy replacement in a non-production cluster before enabling in production
- Keep kube-proxy available in standby (node selector to non-existent node) for quick rollback
- Monitor eBPF map utilization - eBPF maps have fixed sizes that can fill up in large clusters
- Verify that all Kubernetes features (NodePort, ExternalIP, LoadBalancer) work correctly after enabling eBPF mode
- Use OneUptime to validate service endpoint availability after the eBPF mode transition

## Conclusion

Calico's eBPF kube-proxy replacement provides significant performance improvements for high-scale clusters by replacing iptables chains with efficient eBPF programs. The transition requires careful preparation and validation but results in a faster, more observable network data plane. Monitor eBPF program health, service routing correctness, and dataplane failures to ensure the kube-proxy replacement operates reliably. Use OneUptime to maintain external validation of service availability throughout the transition and in steady-state operation.
