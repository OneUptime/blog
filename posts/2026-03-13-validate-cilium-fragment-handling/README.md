# Validate Cilium Fragment Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Fragmentation, eBPF

Description: A guide to validating how Cilium handles IP packet fragmentation, including testing fragment tracking, diagnosing MTU-related fragmentation issues, and confirming correct fragment reassembly behavior.

---

## Introduction

IP packet fragmentation occurs when packets exceed the MTU (Maximum Transmission Unit) of the network path and must be split into smaller fragments. In Kubernetes environments with overlay networking, fragmentation is a common source of subtle connectivity issues because overlays add header overhead that reduces the effective MTU for pod traffic.

Cilium handles IP fragments using eBPF-based fragment tracking, which is necessary for correct Layer 4 lookups, connection tracking, and policy enforcement when packets are split across multiple fragments. If fragment handling is not working correctly, you may see intermittent connection failures, especially for protocols that use large packets like NFS, iSCSI, or applications that transmit large data payloads.

This guide covers how to validate Cilium's fragment handling configuration, test fragmentation behavior, and diagnose MTU-related issues.

## Prerequisites

- Kubernetes cluster with Cilium CNI
- `kubectl` cluster-admin access
- `cilium-dbg` available in the Cilium agent pods
- Basic networking tools available in test pods (ping, iperf3)

## Step 1: Check Fragment Tracking Configuration

Verify that Cilium has fragment tracking enabled. IPv4 and IPv6 fragment tracking are enabled by default in current Cilium releases, so the ConfigMap key may be absent if you are using the default.

```bash
# Check if fragment tracking is enabled in the ConfigMap

kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.enable-ipv4-fragment-tracking}'

# Check the eBPF fragment map
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium-dbg bpf frag list
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

# Send a large ping with DF set to confirm the packet exceeds the path MTU
# For a 1450 MTU, a ping payload of 1500 should fail with "Message too long"
kubectl exec frag-test -- ping -c 5 -s 1500 -M do <destination-pod-ip>

# Send without DF set to allow fragmentation
kubectl exec frag-test -- ping -c 5 -s 1500 <destination-pod-ip>
```

## Step 4: Monitor Fragment Metrics and Drops

Check Cilium's monitor output and metrics for fragment-related or MTU-related signals.

```bash
# Check Cilium drop statistics - look for fragment-related or MTU-related drop reasons
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium-dbg monitor --type drop 2>&1 | head -50

# Check Prometheus metrics for fragment map pressure and MTU error messages
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cilium-dbg metrics list -p 'cilium_bpf_map_pressure|cilium_mtu_error_message_total'
```

## Step 5: Test Large Payload Application Connectivity

Validate that applications sending large payloads work correctly.

```bash
# Install iperf3 test
kubectl run iperf-server --image=networkstatic/iperf3 -- -s
kubectl run iperf-client --image=networkstatic/iperf3 --command -- sleep 3600

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

# Run a UDP iperf3 test with datagrams larger than the pod MTU to exercise fragmentation handling
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -u -b 10M -t 30 -l 2000
```

## Best Practices

- Set Cilium MTU to at least 50 bytes below the physical network MTU when using VXLAN/Geneve
- Enable fragment tracking (`enable-ipv4-fragment-tracking: "true"`) when using overlays
- Monitor `cilium_bpf_map_pressure` for the fragment maps and `cilium_mtu_error_message_total` for path MTU discovery signals
- Test large payload connectivity after MTU changes
- Prefer path MTU discovery (PMTUD) over fixed fragmentation when possible

## Conclusion

Validating Cilium's fragment handling ensures that applications sending large payloads work correctly across your Kubernetes network. By confirming that fragment tracking is enabled, MTU settings are correct, and large packet connectivity tests pass, you prevent the intermittent connection failures that fragmentation mishandling can cause in production environments.
