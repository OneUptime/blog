# How to Configure Calico on Windows Nodes for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Networking, CNI, Configuration

Description: A guide to configuring Calico networking settings for Windows nodes in a new mixed Linux/Windows Kubernetes cluster.

---

## Introduction

Configuring Calico for Windows nodes involves choices that affect both Windows-specific behavior and the cluster-wide networking model. Windows nodes require VXLAN encapsulation (not IPIP or BGP-native routing), must use specific IP pool configurations, and have different CNI plugin behavior than Linux nodes. The cluster's IP pool must be configured to work for both Linux and Windows nodes simultaneously.

Windows nodes also have limitations compared to Linux: they do not support host endpoints, some Calico GlobalNetworkPolicy features are not available, and the networking stack uses Windows HNS (Host Network Service) under the hood. Understanding these differences allows you to configure Calico correctly for mixed clusters from the start.

## Prerequisites

- A Kubernetes cluster with Calico running on Linux nodes
- Windows nodes with Calico installed via the Windows installation script
- `kubectl` and `calicoctl` available from a Linux node

## Step 1: Configure a VXLAN IP Pool

Windows nodes require VXLAN encapsulation. Configure the IP pool accordingly.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 2: Label Windows Nodes

Label Windows nodes for identification and selective policy application.

```bash
kubectl label node <windows-node-name> kubernetes.io/os=windows
kubectl get nodes --show-labels | grep windows
```

## Step 3: Configure a Windows-Specific IP Pool (Optional)

For finer control, create separate IP pools for Linux and Windows nodes.

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: windows-ippool
spec:
  cidr: 192.168.128.0/17
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: kubernetes.io/os == 'windows'
EOF

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: linux-ippool
spec:
  cidr: 192.168.0.0/17
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: kubernetes.io/os == 'linux'
EOF
```

## Step 4: Configure Felix for Windows Compatibility

Windows does not support all Felix features. Disable Linux-only features.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true
  }}'
```

## Step 5: Verify Windows Node Configuration

```powershell
# On the Windows node
Get-Service CalicoNode, CalicoFelix | Select-Object Name, Status
```

```bash
# From Linux
calicoctl get node <windows-node> -o yaml
calicoctl ipam show --show-blocks
```

## Step 6: Test Cross-OS Pod Communication

```bash
kubectl run linux-pod --image=busybox -- sleep 300
```

```powershell
# Schedule a Windows pod
kubectl run win-pod --image=mcr.microsoft.com/windows/nanoserver:1809 `
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/os":"windows"}}}' -- cmd /c "ping -t 127.0.0.1"
```

```bash
WIN_POD_IP=$(kubectl get pod win-pod -o jsonpath='{.status.podIP}')
kubectl exec linux-pod -- ping -c3 $WIN_POD_IP
```

## Conclusion

Configuring Calico for Windows nodes requires VXLAN encapsulation in the IP pool, node labeling for OS identification, optionally separate IP pools for Linux and Windows, and Felix configuration that avoids Linux-only features. Cross-OS pod communication testing confirms that the mixed Linux/Windows networking model is functioning correctly.
