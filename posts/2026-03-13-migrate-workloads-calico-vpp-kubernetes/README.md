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
- Nodes meeting Calico VPP requirements. Hugepages are optional, but required for some higher-performance drivers such as `virtio` and `dpdk`.
- `kubectl` with cluster admin access

## Step 1: Verify Calico Control Plane Health

```bash
kubectl get tigerastatus
kubectl get pods -n calico-system
calicoctl version
```

Calico must be fully healthy before adding VPP.

## Step 2: Prepare Nodes for VPP

On each node that will use a hugepage-backed VPP driver, configure hugepages before installing VPP.

```bash
echo 512 > /proc/sys/vm/nr_hugepages
echo 'vm.nr_hugepages = 512' >> /etc/sysctl.conf
sysctl -p

# Restart kubelet so the hugepage capacity is visible to Kubernetes.
systemctl restart kubelet
```

If you plan to use a VPP native driver that requires `vfio-pci`, load it on the node:

```bash
echo "vfio-pci" > /etc/modules-load.d/95-vpp.conf
modprobe vfio-pci
```

## Step 3: Deploy VPP Components Alongside Calico

For operator-based Calico installations, switch the Installation resource to the VPP data plane, then download and deploy the Calico VPP manifest that matches the Calico VPP release you are installing.

```bash
kubectl patch installation.operator.tigera.io default --type merge -p '{"spec":{"calicoNetwork":{"linuxDataplane":"VPP"}}}'

curl -o calico-vpp.yaml https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml

# Update CALICOVPP_INTERFACES with your node's primary uplink interface.
# The interface must be a valid Linux interface with the node address.
sed -i 's/"interfaceName": "eth1"/"interfaceName": "<uplink-interface>"/' calico-vpp.yaml

kubectl create -f calico-vpp.yaml
```

For DPDK, set `uplinkInterfaces[0].vppDriver` to `"dpdk"` in the `CALICOVPP_INTERFACES` ConfigMap. For a simpler rollout that keeps the interface in Linux, set it to `"af_packet"`.

## Step 4: Roll Out VPP Node by Node

```bash
kubectl get pods -n calico-vpp-dataplane -o wide
```

The `calico-vpp-node` pods will roll out to each node. Monitor for pods entering Running state.

```bash
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
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

Migrating to Calico VPP from standard Calico is a data plane migration that preserves all existing control plane configuration including IP pools, BGP settings, and network policies. The migration requires node-level preparation for the selected VPP uplink driver followed by deploying the VPP components alongside the existing Calico installation. VPP then takes over packet processing on each node as it initializes, with only brief connectivity interruption during the handoff.
