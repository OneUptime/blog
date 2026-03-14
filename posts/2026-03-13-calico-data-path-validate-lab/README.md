# How to Validate the Calico Data Path in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Data Path, CNI, Lab, Testing, iptables, eBPF, Validation

Description: Step-by-step instructions for validating Calico's data path in a lab cluster, including iptables chain inspection, eBPF program verification, and packet tracing.

---

## Introduction

Data path validation confirms that Calico's packet processing pipeline is functioning correctly - that policies are being enforced at the right hook points, that encapsulation is working as expected, and that the path from pod to pod traverses the expected stages. This validation is more granular than connectivity testing - you are verifying the mechanism, not just the result.

This guide provides data path validation procedures for both iptables and eBPF modes.

## Prerequisites

- A Calico lab cluster with at least two worker nodes
- Node-level SSH access for iptables/bpftool inspection
- `tcpdump` available on nodes
- A test pod running `nicolaka/netshoot` for packet generation

## Preparation: Identify Pod Interfaces

Before validating the data path, identify the host-side veth interface for your test pod:

```bash
# Get test pod's node
kubectl get pod test-pod -o jsonpath='{.spec.nodeName}'

# On that node, identify the veth pair
POD_IP=$(kubectl get pod test-pod -o jsonpath='{.status.podIP}')
IFACE=$(ip route show $POD_IP | awk '{print $3}')
echo "Host-side veth: $IFACE"
```

## Validation 1: iptables Mode - Chain Existence

Verify Calico has created the expected policy chains for the pod:

```bash
# Verify Calico's main dispatch chains exist
sudo iptables -L cali-FORWARD -n --line-numbers
# Expected: jump rules to cali-from-wl-dispatch and cali-to-wl-dispatch

# Verify per-pod chains exist
sudo iptables -L cali-tw-$IFACE -n --line-numbers
# Expected: policy rules for ingress to this pod (cali-tw = traffic-to-workload)

sudo iptables -L cali-fw-$IFACE -n --line-numbers
# Expected: policy rules for egress from this pod (cali-fw = from-workload)
```

## Validation 2: iptables Mode - Rule Counter Verification

Traffic through a pod's policy chains increments iptables counters. Use this to confirm traffic is traversing the expected path:

```bash
# Reset counters
sudo iptables -Z cali-tw-$IFACE

# Generate traffic to the test pod
kubectl exec test-client -- wget -qO- http://$POD_IP

# Check if the counter incremented on the allow rule
sudo iptables -L cali-tw-$IFACE -n -v
# Expected: The allow rule shows packet count > 0
```

If counters don't increment, the packet is not reaching the expected chain - indicating a routing or encapsulation issue.

## Validation 3: eBPF Mode - Program Verification

In eBPF mode, verify that Calico's programs are attached to the pod's veth interface:

```bash
# List TC programs on the pod's veth interface
sudo tc filter show dev $IFACE ingress
# Expected: bpf filter using Calico's program

sudo tc filter show dev $IFACE egress
# Expected: bpf filter using Calico's program

# List all Calico eBPF programs
sudo bpftool prog list | grep calico
# Expected: Multiple entries for ingress/egress on each veth
```

## Validation 4: VXLAN Encapsulation Verification

For clusters using VXLAN encapsulation, verify the encapsulation is working correctly:

```bash
# Capture traffic on the VXLAN interface
sudo tcpdump -i vxlan.calico -n -c 10 &

# Generate cross-node traffic
kubectl exec test-client -- wget -qO- http://<pod-on-different-node>

# Verify captured packets show VXLAN headers (UDP port 4789)
```

Expected: Packets captured on `vxlan.calico` show outer IP headers (node IPs) and inner IP headers (pod IPs).

## Validation 5: Packet Trace (iptables mode)

Use iptables logging to trace a specific packet through the chain:

```bash
# Add temporary logging rule at the beginning of the ingress chain
sudo iptables -I cali-tw-$IFACE 1 -j LOG --log-prefix "PKT-TRACE: " --log-level 4

# Generate a packet
kubectl exec test-client -- wget --timeout=5 -qO- http://$POD_IP

# Check kernel log for the trace
sudo journalctl -k | grep "PKT-TRACE"
# Expected: Log entry showing the packet was seen at this chain

# Clean up
sudo iptables -D cali-tw-$IFACE 1
```

## Validation 6: End-to-End Latency Baseline

Measure the data path latency to establish a baseline:

```bash
# Measure round-trip time through the full Calico data path
kubectl exec test-client -- ping -c 20 $POD_IP | tail -5
# Record the avg latency as your baseline

# Compare same-node vs cross-node latency
kubectl exec same-node-client -- ping -c 20 $POD_IP | tail -5
kubectl exec cross-node-client -- ping -c 20 $POD_IP | tail -5
```

Cross-node latency should be higher by the encapsulation overhead (small for VXLAN, near zero for BGP native routing).

## Best Practices

- Run validation 1 and 2 (iptables chain checks) after every policy change to confirm the data path updated
- Save the baseline latency measurements and compare after every Calico upgrade
- Keep temporary logging rules for no more than 5 minutes in production - they generate significant log volume

## Conclusion

Data path validation goes beyond connectivity testing to verify the mechanism itself - that the right iptables chains or eBPF programs are in place, that packets traverse them, and that encapsulation works correctly. These checks catch data path problems that connectivity tests miss, such as stale rules, missing eBPF programs, or encapsulation mismatches.
