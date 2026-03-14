# How to Migrate Existing Workloads to Calico VPP on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Migration

Description: A guide to migrating workloads from standard Calico to Calico VPP data plane for higher networking performance.

---

## Introduction

Migrating from standard Calico (with iptables or eBPF data plane) to Calico VPP is a data plane migration, not a full CNI replacement. The Calico control plane, IP pools, and network policies remain the same - only the packet processing path changes. This makes VPP migration less disruptive than a full CNI migration, but it still requires node-by-node rollout of the VPP components and a brief connectivity interruption on each node as VPP takes over from the previous data plane.

The migration is most commonly done to increase throughput for performance-sensitive workloads without changing the existing network policy model. All existing Kubernetes NetworkPolicy and Calico NetworkPolicy resources continue to apply.

## Prerequisites

- A Kubernetes cluster with standard Calico installed (iptables or eBPF data plane)
- Nodes meeting VPP hardware requirements (hugepages configured, DPDK-compatible NICs)
- `kubectl` with cluster admin access

## Step 1: Verify Calico Control Plane Health

```bash
kubectl get tigerastatus
kubectl get pods -n calico-system
calicoctl version
```

Calico must be fully healthy before adding VPP.

## Step 2: Prepare Nodes for VPP

On each node, configure hugepages before installing VPP.

```bash
echo 512 > /proc/sys/vm/nr_hugepages
# Add to sysctl for persistence
echo 'vm.nr_hugepages = 512' >> /etc/sysctl.d/99-hugepages.conf
```

Bind the data interface to the DPDK driver:

```bash
# Identify NIC PCI address
lspci | grep Ethernet

modprobe vfio-pci
dpdk-devbind.py --bind=vfio-pci <pci-address>
```

## Step 3: Deploy VPP Components Alongside Calico

Clone and deploy the Calico VPP manifests.

```bash
git clone https://github.com/projectcalico/vpp-dataplane.git
cd vpp-dataplane

# Update config with your interface
sed -i 's/CALICOVPP_INTERFACE.*/CALICOVPP_INTERFACE: eth1/' yaml/calico-vpp.yaml

kubectl apply -f yaml/calico-vpp.yaml
```

## Step 4: Roll Out VPP Node by Node

```bash
kubectl get pods -n calico-vpp-dataplane -o wide
```

VPP manager pods will roll out to each node. Monitor for pods entering Running state.

```bash
kubectl exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
```

## Step 5: Verify Workloads Are Unaffected

After VPP initializes on each node, verify existing workloads are still communicating.

```bash
kubectl get pods -A | grep -v Running | grep -v Completed
kubectl exec <existing-pod> -- ping -c3 <remote-pod-ip>
```

## Step 6: Measure Performance Improvement

```bash
kubectl exec pod-a -- iperf3 -c <pod-b-ip> -t 30
```

Compare against pre-migration throughput to verify the VPP migration delivered the expected improvement.

## Conclusion

Migrating to Calico VPP from standard Calico is a data plane migration that preserves all existing control plane configuration including IP pools, BGP settings, and network policies. The migration requires node-level preparation (hugepages, DPDK driver binding) followed by deploying the VPP components alongside the existing Calico installation. VPP then takes over packet processing on each node as it initializes, with only brief connectivity interruption during the handoff.
