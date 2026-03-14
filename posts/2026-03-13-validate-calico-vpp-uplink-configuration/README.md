# Validate Calico VPP Uplink Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, VPP, DPDK, Uplink, Validation

Description: How to validate the Calico VPP uplink interface configuration to confirm correct DPDK driver binding, interface initialization, and traffic flow through the VPP uplink.

---

## Introduction

Validating the Calico VPP uplink configuration is critical because an incorrectly configured uplink either fails entirely (losing node connectivity) or silently operates at reduced performance. Validation confirms that the correct NIC is bound to VPP, traffic is flowing through the VPP uplink rather than the Linux kernel, and performance metrics match expectations for the configured driver and queue count.

## Prerequisites

- Calico VPP deployed with uplink configured
- Out-of-band node access available
- `vppctl` accessible via `kubectl exec`

## Step 1: Verify DPDK Binding

```bash
# On the node, verify the NIC is bound to vfio-pci (not Linux driver)
dpdk-devbind.py --status-dev net

# Expected output for DPDK mode:
# Network devices using DPDK-compatible driver
# ============================================
# 0000:00:0a.0 '82599ES 10G' drv=vfio-pci unused=ixgbe

# If still bound to Linux driver, VPP is using af_packet mode
```

## Step 2: Verify VPP Interface State

```bash
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show hardware-interfaces

# For DPDK uplink, expect:
# GigabitEthernet0/0/0       1  up         10000/10000/10000/10000
# Name, Instance, Admin, Speed

kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show interface GigabitEthernet0/0/0
# Should show: rx bytes, tx bytes incrementing
```

## Step 3: Validate Traffic Is Flowing Through VPP

```mermaid
graph LR
    A[Send traffic to node] --> B{Monitor VPP counters}
    B -->|Counters increment| C[Traffic going through VPP]
    B -->|No increment| D[Traffic going through Linux - check binding]
```

```bash
# Clear counters
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl clear interfaces

# Generate some traffic (ping from another node)
# Then check counters
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show interface GigabitEthernet0/0/0

# If rx/tx counters are incrementing, traffic flows through VPP
```

## Step 4: Verify Queue Configuration

```bash
# Check number of RX queues
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show dpdk version

# Check queue-to-worker thread mapping
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show dpdk statistics | grep -E "queue|worker"
```

## Step 5: Test Bandwidth

```bash
# Measure actual throughput through VPP uplink
kubectl run iperf-server --image=networkstatic/iperf3 -- -s

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')

# From a pod on a different node
kubectl run iperf-client --image=networkstatic/iperf3 -- \
  -c $SERVER_IP -t 15 -P 4

# Compare to NIC's rated capacity (e.g., 10 Gbps NIC should achieve ~9.5+ Gbps)
```

## Step 6: Check uplink statistics for errors

```bash
kubectl exec -n calico-vpp-dataplane ds/calico-vpp-node -c vpp -- \
  vppctl show dpdk statistics

# Check for:
# rx_errors: 0 (non-zero = hardware NIC errors)
# rx_missed_errors: 0 (non-zero = rx ring overflow, need larger queues)
# rx_no_bufs: 0 (non-zero = VPP buffer exhaustion, need more hugepages)
```

## Conclusion

Validating Calico VPP uplink configuration verifies DPDK binding at the OS level, VPP interface state at the VPP level, traffic flow through VPP's counters, and throughput performance against the NIC's rated capacity. A fully validated uplink shows the NIC bound to vfio-pci, VPP interface in state "up" with incrementing counters, and throughput approaching line rate with zero error counters.
