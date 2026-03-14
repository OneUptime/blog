# How to Verify Pod Networking with Calico VPP on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Verification

Description: A guide to verifying that Calico VPP pod networking is correctly configured and delivering expected performance on a Kubernetes cluster.

---

## Introduction

Verifying Calico VPP pod networking goes beyond standard connectivity checks. Because VPP is a high-performance data plane, you should verify not just that packets flow correctly, but that they are flowing through VPP rather than falling back to the Linux kernel's slower processing path. A VPP installation that is not actually processing packets through the VPP pipeline will appear to work for connectivity tests but will not deliver the expected performance.

VPP provides its own CLI with detailed interface statistics, session tables, and routing table views. Learning to use the VPP CLI is the key skill for Calico VPP verification.

## Prerequisites

- Calico VPP installed and running on a Kubernetes cluster
- `kubectl` with cluster admin access
- VPP manager pods running in the `calico-vpp-dataplane` namespace

## Step 1: Verify VPP Manager Pods Are Running

```bash
kubectl get pods -n calico-vpp-dataplane
kubectl get pods -n kube-system -l k8s-app=calico-node
```

## Step 2: Check VPP Interface State

```bash
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
```

The primary data interface (e.g., `GigabitEthernetb/0/0` or `host-eth1`) should show `up` state.

## Step 3: Verify VPP Is Processing Pod Traffic

Deploy a test pod and check VPP's session table for traffic.

```bash
kubectl run test-vpp --image=busybox -- sleep 300
kubectl get pod test-vpp -o wide
```

From the test pod, generate traffic:

```bash
kubectl exec test-vpp -- wget -qO- http://google.com
```

Check VPP sessions:

```bash
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show session
```

Traffic sessions from the pod should appear in VPP's session table.

## Step 4: Check VPP Interface Statistics

```bash
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface statistics
```

Look for increasing packet counts on the data interface, confirming VPP is processing traffic.

## Step 5: Test Cross-Node Pod Connectivity

```bash
kubectl run pod-a --image=nicolaka/netshoot --overrides='{"spec":{"nodeName":"<node1>"}}' -- sleep 300
kubectl run pod-b --image=nicolaka/netshoot --overrides='{"spec":{"nodeName":"<node2>"}}' -- sleep 300

POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c5 $POD_B_IP
```

## Step 6: Measure Throughput Through VPP

```bash
kubectl exec pod-b -- iperf3 -s &
kubectl exec pod-a -- iperf3 -c $POD_B_IP -t 10 -P 4
```

With VPP and DPDK, you should see throughput significantly above what standard kernel networking provides.

## Conclusion

Verifying Calico VPP requires confirming that VPP interfaces are up and processing packets (via `vppctl show interface statistics`), that pod traffic flows through VPP's session table, and that cross-node throughput meets the performance expectations that motivated the VPP installation. The VPP CLI is the primary tool for this deeper verification beyond standard connectivity checks.
