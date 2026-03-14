# Validate Cilium Fragment Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Fragmentation, EBPF

Description: A guide to validating how Cilium handles IP packet fragmentation, including testing fragment tracking, diagnosing MTU-related fragmentation issues, and confirming correct fragment reassembly behavior.

---

## Introduction

IP packet fragmentation occurs when packets exceed the MTU (Maximum Transmission Unit) of the network path and must be split into smaller fragments. In Kubernetes environments with overlay networking, fragmentation is a common source of subtle connectivity issues because overlays add header overhead that reduces the effective MTU for pod traffic.

Cilium handles IP fragments using eBPF-based fragment tracking, which is necessary for correct connection tracking and policy enforcement when packets are split across multiple fragments. If fragment handling is not working correctly, you may see intermittent connection failures, especially for protocols that use large packets like NFS, iSCSI, or applications that transmit large data payloads.

This guide covers how to validate Cilium's fragment handling configuration, test fragmentation behavior, and diagnose MTU-related issues.

## Prerequisites

- Kubernetes cluster with Cilium CNI
- `kubectl` cluster-admin access
- `cilium` CLI installed
- Basic networking tools available in test pods (ping, iperf3)

## Step 1: Check Fragment Tracking Configuration

Verify that Cilium has fragment tracking enabled.

```bash
# Check if fragment tracking is enabled in the ConfigMap
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.enable-ipv4-fragment-tracking}'

# Check the eBPF fragment map
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium bpf maps list | grep fragment
```

## Step 2: Verify MTU Configuration

Incorrect MTU settings are the most common cause of fragmentation problems.

```bash
# Check Cilium's configured MTU
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.mtu}'

# Check actual interface MTU on nodes
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  ip link show | grep -E "eth0|cilium|mtu"

# Verify pod interface MTU matches Cilium's configuration
kubectl exec -it <test-pod> -- ip link show eth0
```

## Step 3: Test Fragmentation with Large Ping

Send oversized ICMP packets to force fragmentation and test handling.

```bash
# Deploy a test pod
kubectl run frag-test --image=nicolaka/netshoot -- sleep 3600

# Send a large ping that requires fragmentation (size > MTU - headers)
# For a 1450 MTU, use ping size of 1500 to force fragmentation
kubectl exec frag-test -- ping -c 5 -s 1500 -M dont <destination-pod-ip>

# If the above fails with "Message too long", fragmentation is required
# Send without DF bit to allow fragmentation
kubectl exec frag-test -- ping -c 5 -s 1500 <destination-pod-ip>
```

## Step 4: Monitor Fragment Drops in eBPF

Check Cilium's eBPF counters for fragment-related drops.

```bash
# Check Cilium drop statistics - look for fragment-related drop reasons
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium monitor --type drop 2>&1 | head -50

# Check Prometheus metrics for drop counts
# cilium_drop_count_total{reason="Fragmented packet"} indicates fragment issues
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium metrics list | grep frag
```

## Step 5: Test Large Payload Application Connectivity

Validate that applications sending large payloads work correctly.

```bash
# Install iperf3 test
kubectl run iperf-server --image=networkstatic/iperf3 -- -s
kubectl run iperf-client --image=networkstatic/iperf3 -- sleep 3600

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

# Run iperf3 test with large buffer sizes to exercise fragmentation handling
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -n 100M -l 65507
```

## Best Practices

- Set Cilium MTU to at least 50 bytes below the physical network MTU when using VXLAN/Geneve
- Enable fragment tracking (`enable-ipv4-fragment-tracking: "true"`) when using overlays
- Monitor `cilium_drop_count_total` Prometheus metrics for fragment-related drops
- Test large payload connectivity after MTU changes
- Prefer path MTU discovery (PMTUD) over fixed fragmentation when possible

## Conclusion

Validating Cilium's fragment handling ensures that applications sending large payloads work correctly across your Kubernetes network. By confirming that fragment tracking is enabled, MTU settings are correct, and large packet connectivity tests pass, you prevent the intermittent connection failures that fragmentation mishandling can cause in production environments.
