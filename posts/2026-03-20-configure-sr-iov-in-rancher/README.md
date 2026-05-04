# How to Configure SR-IOV in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SR-IOV, Network Performance, Kubernetes, Telco, DPDK

Description: Configure SR-IOV (Single Root I/O Virtualization) in Rancher for hardware-accelerated network access, enabling pods to directly use physical NIC virtual functions.

## Introduction

SR-IOV allows a single physical NIC to present multiple virtual functions (VFs) to the OS, each behaving like an independent NIC. Pods attached to SR-IOV VFs bypass the host's CNI overlay and software switching, achieving near bare-metal network performance-critical for telco, financial trading, and HPC workloads. (Pairing VFs with a userspace driver such as DPDK/vfio-pci can additionally bypass the kernel networking stack entirely.)

## Prerequisites

- Server hardware with SR-IOV-capable NICs (Intel X710, Mellanox ConnectX series)
- SR-IOV enabled in BIOS
- IOMMU enabled in kernel (`intel_iommu=on` in kernel parameters)

## Step 1: Enable SR-IOV on the Host

```bash
# Check if SR-IOV is supported

lspci | grep -i ethernet
cat /sys/bus/pci/devices/0000:03:00.0/sriov_totalvfs

# Enable 16 virtual functions on the physical function
echo 16 > /sys/bus/pci/devices/0000:03:00.0/sriov_numvfs

# Make persistent
cat > /etc/systemd/system/sriov.service << 'EOF'
[Unit]
Description=SR-IOV VF Setup
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c "echo 16 > /sys/bus/pci/devices/0000:03:00.0/sriov_numvfs"
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
systemctl enable sriov.service
```

## Step 2: Install SR-IOV Network Device Plugin

```bash
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/sriov-network-device-plugin/master/deployments/sriovdp-daemonset.yaml
```

Configure the device plugin:

```yaml
# sriov-config.yaml
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
          "resourcePrefix": "intel.com",
          "selectors": {
            "vendors": ["8086"],
            "devices": ["154c", "10ed"],
            "drivers": ["i40evf", "iavf", "ixgbevf"]
          }
        }
      ]
    }
```

## Step 3: Install SR-IOV CNI Plugin

```bash
# Install SR-IOV CNI
git clone https://github.com/k8snetworkplumbingwg/sriov-cni.git
cd sriov-cni && make build

# Deploy as DaemonSet to install CNI binary on all nodes
kubectl apply -f images/sriov-cni-daemonset.yaml
```

## Step 4: Create NetworkAttachmentDefinition for SR-IOV

```yaml
# sriov-net.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: sriov-net
  namespace: telco
  annotations:
    k8s.v1.cni.cncf.io/resourceName: intel.com/intel_sriov_netdevice
spec:
  config: '{
    "cniVersion": "0.3.1",
    "name": "sriov-net",
    "type": "sriov",
    "ipam": {
      "type": "host-local",
      "subnet": "10.56.217.0/24"
    }
  }'
```

## Step 5: Deploy a Pod with SR-IOV

```yaml
# sriov-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: sriov-app
  namespace: telco
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-net
spec:
  containers:
    - name: app
      image: myregistry/telco-app:latest
      resources:
        requests:
          intel.com/intel_sriov_netdevice: "1"    # Request one VF
        limits:
          intel.com/intel_sriov_netdevice: "1"
```

## Conclusion

SR-IOV on Rancher enables kernel-bypass networking for performance-critical workloads. The combination of Multus (multi-network), SR-IOV device plugin (VF resource management), and SR-IOV CNI provides the complete stack needed for telco and HPC Kubernetes deployments. Expect 10-40% better network performance compared to standard CNI plugins.
