# How to Configure SR-IOV CNI for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SR-IOV, CNI, IPv6, Kubernetes, DPDK, High Performance, VFS

Description: Configure SR-IOV (Single Root I/O Virtualization) CNI for high-performance IPv6 networking in Kubernetes, enabling virtual functions (VFs) with IPv6 addresses for latency-sensitive workloads.

## Introduction

SR-IOV allows a single physical NIC to appear as multiple virtual functions (VFs), each assignable to a pod. This provides near bare-metal networking performance for IPv6 workloads. SR-IOV CNI combined with the SR-IOV Device Plugin enables VF assignment with IPv6 addressing.

## Prerequisites

```bash
# Check SR-IOV support on the NIC

lspci | grep -i ethernet
ethtool -i ens4f0 | grep driver

# Check VF support
cat /sys/bus/pci/devices/<pci-id>/sriov_totalvfs
```

## Step 1: Configure VFs on the Host

```bash
# Enable SR-IOV VFs (e.g., 4 VFs on ens4f0)
echo 4 > /sys/bus/pci/devices/0000:18:00.0/sriov_numvfs

# Verify VFs created
ip link show ens4f0
# ens4f0: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     vf 0: MAC 00:00:00:00:00:00, vlan <none>, spoof checking on, link-state auto
#     vf 1: MAC 00:00:00:00:00:00, vlan <none>, spoof checking on, link-state auto

# Persist across reboots
cat > /etc/udev/rules.d/99-sriov.rules << 'EOF'
ACTION=="add", SUBSYSTEM=="net", ENV{ID_NET_DRIVER}=="i40e", \
    ATTR{device/sriov_numvfs}="4"
EOF
```

## Step 2: Install SR-IOV CNI, Whereabouts, and Device Plugin

```bash
# Install SR-IOV CNI
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/sriov-cni/master/images/sriov-cni-daemonset.yaml

# Install Whereabouts IPAM and CRDs
kubectl apply \
  -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/daemonset-install.yaml \
  -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/whereabouts.cni.cncf.io_ippools.yaml \
  -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/whereabouts.cni.cncf.io_overlappingrangeipreservations.yaml

# Install SR-IOV Device Plugin
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/sriov-network-device-plugin/master/deployments/sriovdp-daemonset.yaml
```

## Step 3: SR-IOV Device Plugin Configuration

```yaml
# sriov-dp-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sriovdp-config
  namespace: kube-system
data:
  config.json: |
    {
      "resourceList": [
        {
          "resourceName": "intel_sriov_netdevice",
          "selectors": [{
            "vendors": ["8086"],
            "devices": ["154c", "10ed"],
            "drivers": ["iavf", "i40evf"],
            "pciAddresses": ["0000:18:02.0", "0000:18:02.1",
                            "0000:18:02.2", "0000:18:02.3"]
          }]
        }
      ]
    }
```

```bash
kubectl apply -f sriov-dp-config.yaml

# Verify VFs are discovered as resources
kubectl get node <node-name> -o jsonpath='{.status.allocatable}' | python3 -m json.tool | grep sriov
# "intel.com/intel_sriov_netdevice": "4"
```

## Step 4: NetworkAttachmentDefinition with IPv6

```yaml
# sriov-ipv6-nad.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: sriov-ipv6
  namespace: default
  annotations:
    k8s.v1.cni.cncf.io/resourceName: intel.com/intel_sriov_netdevice
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "sriov-ipv6",
      "type": "sriov",
      "ipam": {
        "type": "whereabouts",
        "datastore": "kubernetes",
        "kubernetes": {
          "kubeconfig": "/etc/cni/net.d/whereabouts.d/whereabouts.kubeconfig"
        },
        "range": "2001:db8:100::/64",
        "gateway": "2001:db8:100::1",
        "routes": [
          { "dst": "::/0" }
        ]
      }
    }
```

## Step 5: Deploy Pod with SR-IOV IPv6

```yaml
# sriov-ipv6-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: sriov-ipv6-workload
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-ipv6
spec:
  containers:
    - name: app
      image: nicolaka/netshoot
      command: ["/bin/bash", "-c", "sleep infinity"]
      resources:
        requests:
          intel.com/intel_sriov_netdevice: "1"
        limits:
          intel.com/intel_sriov_netdevice: "1"
```

```bash
kubectl apply -f sriov-ipv6-pod.yaml

# Check IPv6 address on VF interface
kubectl exec sriov-ipv6-workload -- ip -6 addr show net1
# inet6 2001:db8:100::5/64 scope global
```

## Step 6: Performance Validation

```bash
# Test throughput with iperf3 over IPv6 SR-IOV
# Server pod
kubectl exec sriov-server -- iperf3 -s -6

# Client pod
kubectl exec sriov-client -- iperf3 -c 2001:db8:100::10 -6 -t 30

# Expected: near line-rate throughput when NIC, NUMA, MTU, and CPU tuning are aligned
```

## Conclusion

SR-IOV CNI provides high-throughput, low-overhead networking for IPv6 workloads by assigning VFs directly to pods; DPDK-bound VFs require a separate userspace-driver configuration. Use Whereabouts IPAM for dynamic IPv6 address allocation from a dedicated SR-IOV IPv6 pool. Resource requests ensure VFs are exclusively allocated. This setup is ideal for telco, HPC, and low-latency financial services workloads. Monitor SR-IOV pod network performance with OneUptime's synthetic checks.
