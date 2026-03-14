# Troubleshoot Cilium Fragment Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Fragmentation, eBPF

Description: A guide to diagnosing and resolving IP packet fragmentation issues in Cilium, including MTU mismatches and fragment reassembly problems affecting pod connectivity.

---

## Introduction

IP packet fragmentation occurs when packets are larger than the Maximum Transmission Unit (MTU) of a network path. In Kubernetes with Cilium, fragmentation can cause subtle connectivity issues-connections that work for small payloads but fail or perform poorly for larger ones, or applications that hang when transferring large files.

Cilium's eBPF dataplane has specific handling for IP fragments that differs from traditional iptables-based implementations. Understanding how Cilium processes fragments is essential for diagnosing issues that involve large packets, especially in overlay networks where encapsulation adds overhead.

This guide covers identifying fragmentation issues in Cilium environments and resolving them.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` and `cilium` CLI access
- Node-level access for packet capture and MTU inspection
- Basic understanding of IP fragmentation and MTU

## Step 1: Identify Fragmentation-Related Issues

Detect if fragmentation is causing connectivity problems.

```bash
# Test connectivity with different payload sizes to identify MTU threshold
kubectl exec <test-pod> -- ping -s 1400 -M dont <destination-ip>
kubectl exec <test-pod> -- ping -s 1450 -M dont <destination-ip>
kubectl exec <test-pod> -- ping -s 1480 -M dont <destination-ip>

# If larger payloads fail, fragmentation or MTU issues are likely

# Check if ICMP "needs fragmentation" messages are being dropped
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n kube-system ${CILIUM_POD} -- cilium monitor --type drop | grep -i fragment
```

## Step 2: Check MTU Configuration in Cilium

Verify Cilium's MTU settings are correct for your network environment.

```bash
# Check Cilium's configured MTU
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "mtu|tunnel"

# Check the actual MTU on the node's primary interface
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show eth0

# Check the MTU on Cilium's tunnel interface (if using overlay)
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show cilium_vxlan

# Recommended MTU values:
# Direct routing: match the host MTU (e.g., 1500)
# VXLAN overlay: host MTU - 50 bytes (e.g., 1450 for 1500 MTU host)
# IPIP overlay: host MTU - 20 bytes (e.g., 1480 for 1500 MTU host)
```

## Step 3: Check Cilium Fragment Tracking

Inspect Cilium's fragment tracking state to identify reassembly issues.

```bash
# Check if Cilium has fragment tracking enabled
kubectl get configmap cilium-config -n kube-system -o yaml | grep fragment

# View fragment tracking statistics
kubectl exec -n kube-system ${CILIUM_POD} -- cilium bpf metrics list | grep fragment

# Check for fragment tracking table exhaustion
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium bpf ct list global | grep -i frag

# Monitor fragment-related drops
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium monitor --type drop 2>&1 | grep -i frag
```

## Step 4: Capture and Analyze Fragmented Traffic

Use packet capture to identify fragmentation on the network.

```bash
# Capture fragmented packets on the node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  tcpdump -i eth0 'ip[6:2] & 0x1fff != 0' -c 20

# The filter 'ip[6:2] & 0x1fff != 0' matches fragmented IP packets

# Check if fragments are being reassembled
kubectl debug node/<node-name> -it --image=ubuntu -- \
  netstat -s | grep -i fragment

# View IP fragment assembly statistics
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /proc/net/snmp | grep -A1 Ip: | grep -v Ip:
```

## Step 5: Resolve MTU Issues to Prevent Fragmentation

Fix MTU configuration to eliminate fragmentation.

```bash
# Set the correct MTU in Cilium configuration
# For VXLAN overlay on 1500 MTU network:
kubectl patch configmap cilium-config -n kube-system --type merge \
  --patch '{"data":{"mtu":"1450"}}'

# Restart Cilium to apply the new MTU
kubectl rollout restart daemonset -n kube-system cilium

# Verify the MTU change
kubectl get configmap cilium-config -n kube-system -o yaml | grep mtu

# Test with previously failing payload size
kubectl exec <test-pod> -- ping -s 1400 -M dont <destination-ip>
```

## Best Practices

- Set the correct MTU at Cilium install time rather than changing it later
- Use `path MTU discovery` (PMTUD) to automatically detect MTU limits
- Monitor for ICMP "needs fragmentation" (type 3, code 4) messages being dropped
- In overlay networks, always reduce Cilium's MTU to account for encapsulation headers
- Test large payload connectivity as part of your cluster deployment validation

## Conclusion

Fragment handling issues in Cilium typically stem from MTU misconfigurations. By identifying the correct MTU for your network environment, configuring Cilium accordingly, and testing with various payload sizes, you can eliminate fragmentation-related connectivity issues. When fragmentation cannot be avoided, ensure Cilium's fragment tracking is enabled and the tracking table is sized appropriately for your traffic volume.
