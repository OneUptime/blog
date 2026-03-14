# Monitor Cilium Fragment Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Fragmentation, eBPF

Description: Learn how to monitor and troubleshoot IP packet fragmentation in Cilium-managed Kubernetes clusters, including fragment tracking, MTU optimization, and detection of fragmentation-related...

---

## Introduction

IP packet fragmentation occurs when a packet exceeds the Maximum Transmission Unit (MTU) of a network path and must be split into smaller fragments. In Kubernetes clusters, fragmentation can occur when overlay encapsulation (VXLAN, Geneve) adds headers that push packets beyond the physical network's MTU limit. Cilium must correctly handle fragmented packets to ensure reliable pod-to-pod and pod-to-external communication.

Cilium includes eBPF-based fragment tracking for UDP and other protocols that do not perform path MTU discovery (PMTUD). When fragment tracking fails or is misconfigured, workloads may experience silent packet drops, TCP retransmissions, or application-level timeouts that are difficult to attribute to fragmentation without proper monitoring.

This guide covers monitoring Cilium's fragment handling, identifying fragmentation-related issues, and tuning MTU settings to minimize unnecessary fragmentation.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ installed
- `kubectl` with cluster-admin access
- `cilium` CLI v0.15+ installed
- Hubble for flow observation
- Understanding of MTU and overlay networking concepts

## Step 1: Check Cilium MTU Configuration

Verify the MTU settings configured in Cilium to understand the fragmentation boundary.

Inspect the current MTU configuration in Cilium:

```bash
# Check Cilium's configured MTU
cilium config view | grep -i mtu

# View the MTU reported by Cilium on each node
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium status | grep -i mtu

# Check node interface MTUs for comparison
kubectl get nodes -o wide
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip link show | grep -E "mtu|eth|ens"
```

## Step 2: Monitor Fragment Tracking Statistics

Check Cilium's eBPF fragment tracking counters to detect fragmentation activity.

Query fragment tracking metrics from Cilium agents:

```bash
# Check fragment-related eBPF map statistics
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium metrics list | grep -i frag

# View Cilium drop reasons to identify fragment-related drops
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium monitor --type drop 2>/dev/null | head -20

# Check Prometheus metrics for fragment drops
# cilium_drop_count_total{reason="Fragmented packet"} - fragment drop count
```

## Step 3: Observe Fragmented Flows with Hubble

Use Hubble to identify workloads experiencing fragmentation issues.

Monitor flows with Hubble to detect fragment-related drops:

```bash
# Port-forward Hubble relay
cilium hubble port-forward &

# Observe dropped flows that may be fragmentation-related
hubble observe --verdict DROPPED --follow --output json | \
  jq 'select(.flow.drop_reason != null) | 
      {src: .flow.ip.source, dst: .flow.ip.destination, reason: .flow.drop_reason}'

# Monitor UDP flows which are more susceptible to fragmentation
hubble observe --protocol udp --follow

# Look for flows with large payload sizes approaching MTU limits
hubble observe --last 1000 --output json | \
  jq 'select(.flow.l4.UDP != null) | .flow' | head -20
```

## Step 4: Identify Fragmentation Hotspots

Find workloads and node pairs that are generating the most fragmentation.

Correlate fragmentation metrics with specific workloads:

```bash
# Create a test to deliberately trigger fragmentation for diagnosis
# Send a large UDP packet that exceeds overlay MTU
kubectl run frag-test --image=nicolaka/netshoot --rm -it -- \
  python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# Send a 1500-byte UDP payload which will exceed VXLAN-encapsulated MTU
s.sendto(b'x' * 1500, ('<target-pod-ip>', 9999))
"

# Check if the large packet was dropped or fragmented
hubble observe --verdict DROPPED --last 10 --output json
```

## Step 5: Tune MTU to Reduce Fragmentation

Configure the correct MTU for your overlay type to eliminate unnecessary fragmentation.

Set an appropriate MTU value in Cilium ConfigMap based on your encapsulation:

```yaml
# cilium-mtu-config.yaml - configure Cilium MTU for VXLAN overlay
# Physical MTU is typically 1500 bytes
# VXLAN overhead: 50 bytes (8 VXLAN + 8 UDP + 20 IP + 14 Ethernet)
# Optimal pod MTU for VXLAN: 1450 bytes
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Set MTU to account for VXLAN encapsulation overhead
  mtu: "1450"
  # Enable automatic MTU detection (alternative approach)
  # auto-direct-node-routes: "false"
```

Apply the MTU configuration:

```bash
kubectl apply -f cilium-mtu-config.yaml

# Restart Cilium DaemonSet to apply new MTU
kubectl rollout restart daemonset cilium -n kube-system

# Verify the new MTU is in effect
cilium config view | grep mtu
```

## Best Practices

- Set pod interface MTU to physical MTU minus overlay header size to eliminate fragmentation entirely
- Enable Cilium's auto MTU detection for clusters where interface MTU may vary across nodes
- Monitor the `cilium_drop_count_total{reason="Fragmented packet"}` Prometheus counter and alert on increases
- Use Jumbo Frames (9000 byte MTU) on the physical network to reduce fragmentation in overlay networks
- Test large payload applications (file transfers, streaming) after MTU changes to validate no silent drops

## Conclusion

Packet fragmentation in Cilium-managed clusters is often a silent performance killer that manifests as unexplained latency spikes or TCP retransmissions. By monitoring Cilium's fragment tracking counters, using Hubble to observe dropped fragmented flows, and correctly configuring MTU values, you can eliminate fragmentation overhead and improve cluster network performance. Use OneUptime to track application-level latency metrics that can reveal the impact of fragmentation on end-user experience.
