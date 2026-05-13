# How to Install Calico VPP on Kubernetes Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, CNI, Data Plane, Installation

Description: A step-by-step guide to installing Calico with the VPP (Vector Packet Processor) data plane on a Kubernetes cluster for ultra-high-performance pod networking.

---

## Introduction

Calico VPP is a high-performance data plane option that replaces Calico's default iptables or eBPF data plane with VPP - the Vector Packet Processor. VPP processes packets in user space using a vectorized approach that handles packets in batches, delivering multi-million packets-per-second throughput at low CPU cost. It is designed for workloads that push the limits of Linux kernel networking: telco NFV applications, high-frequency trading, and large-scale service meshes.

Calico VPP runs VPP and the Calico VPP agent in a `calico-vpp-node` pod on each VPP-enabled node. It drives the node uplink through VPP using drivers such as `af_packet`, `af_xdp`, native VPP drivers, or DPDK, processes traffic through VPP's pipeline, and forwards it to the appropriate destination. DPDK-compatible or native-driver-supported NICs are useful for best performance, but `af_packet` can be used on standard Linux interfaces.

## Prerequisites

- A blank Kubernetes cluster with no CNI previously installed, with nodes running Linux (Ubuntu 20.04+ or similar)
- Nodes with a valid Linux uplink interface that is up, has the Kubernetes node address, and can be passed to VPP
- Hugepages configured on each node if you want to use DPDK or native VPP interface drivers
- Access to the Calico and Calico VPP manifests and container images
- `kubectl` with cluster admin access

## Step 1: Configure Hugepages on Nodes

Hugepages are optional for the basic `af_packet` path, but they are required for DPDK and several native VPP interface drivers.

```bash
# On each node

echo 'vm.nr_hugepages = 512' >> /etc/sysctl.d/99-hugepages.conf
sysctl -p /etc/sysctl.d/99-hugepages.conf
modprobe vfio-pci

# Mount hugetlbfs
mkdir -p /dev/hugepages
mount -t hugetlbfs none /dev/hugepages

# Restart kubelet so it reports the hugepages resource
systemctl restart kubelet

# Verify
grep HugePages_Free /proc/meminfo
```

## Step 2: Configure Interface for VPP

Identify the interface VPP should take over.

```bash
ip link show
# Note the interface name, e.g., eth1 for the primary data interface
```

## Step 3: Install Calico with the Tigera Operator

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/calico/installation-default.yaml
```

## Step 4: Download and Configure the VPP Installation

Download the generated VPP data plane manifest. Use `calico-vpp.yaml` if you configured hugepages, or `calico-vpp-nohuge.yaml` if you did not.

```bash
curl -o calico-vpp.yaml https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
```

Edit the `calico-vpp-config` ConfigMap in `calico-vpp.yaml` to specify your Kubernetes service CIDR and uplink interface. The interface must be a valid Linux interface, it must be up and configured with an address, and that address must match the Kubernetes node address shown by `kubectl get nodes -o wide`.

```yaml
data:
  SERVICE_PREFIX: 10.96.0.0/12
  CALICOVPP_INTERFACES: |-
    {
      "uplinkInterfaces": [
        {
          "interfaceName": "eth1",
          "vppDriver": "af_packet"
        }
      ]
    }
```

## Step 5: Deploy Calico with VPP Data Plane

```bash
kubectl create -f calico-vpp.yaml
```

Monitor the rollout:

```bash
kubectl get pods -n calico-vpp-dataplane -w
kubectl get pods -n calico-system -w
```

## Step 6: Verify VPP Is Running

```bash
kubectl get pods -n calico-vpp-dataplane
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
```

## Conclusion

Installing Calico VPP requires configuring hugepages on nodes, selecting the data interface for VPP to manage, deploying the Calico VPP manifests, and verifying that VPP is processing packets. The installation is more involved than standard Calico, but the resulting throughput - millions of packets per second per core - makes it the right choice for performance-critical Kubernetes workloads.
