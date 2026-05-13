# How to Configure Calico on Windows Nodes with the Operator for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Operator, Networking, CNI, Configuration

Description: A guide to configuring Calico on Windows nodes via the Tigera Operator, including IP pools, network settings, and Windows-specific operator configuration.

---

## Introduction

When using the Tigera Operator to manage Calico on Windows nodes, most installation configuration flows through the operator's CRDs - primarily the `Installation` resource. The operator translates the Installation spec into the appropriate Windows DaemonSet configuration, CNI config files, and network settings. This unified configuration model is the main advantage of the operator approach over manual Windows Calico installation.

The key configuration decisions for Windows nodes are the networking mode (VXLAN overlay or BGP without encapsulation), Windows dataplane selection (HNS), the Kubernetes service CIDR, and IP pool CIDR alignment with the rest of the cluster. For VXLAN clusters, use `VXLAN` and not `VXLANCrossSubnet`, and disable BGP.

This guide covers the operator-based configuration workflow for Windows nodes.

## Prerequisites

- Calico installed on Linux nodes via the Tigera Operator
- Windows nodes joined to the cluster
- `kubectl` with cluster admin access
- Kubernetes v1.22 or later, HostProcess container support, and containerd v1.6 or later on Windows nodes

## Step 1: Review the Current Installation CR

```bash
kubectl get installation default -o yaml
```

Identify the current IP pool configuration and verify it is compatible with Windows (VXLAN encapsulation).

For clusters using Calico networking, also enable strict affinity so Linux nodes do not borrow IP addresses from Windows nodes:

```bash
kubectl patch ipamconfigurations default --type merge --patch='{"spec": {"strictAffinity": true}}'
```

## Step 2: Configure the Installation CR for Windows

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  serviceCIDRs:
  - 10.96.0.0/12
  calicoNetwork:
    bgp: Disabled
    windowsDataplane: HNS
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
kubectl apply -f calico-windows-installation.yaml
```

## Step 3: Configure Node Selectors for Windows-Specific Pools

For dedicated Windows IP pools:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  serviceCIDRs:
  - 10.96.0.0/12
  calicoNetwork:
    bgp: Disabled
    windowsDataplane: HNS
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/17
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: "kubernetes.io/os == 'linux'"
    - blockSize: 26
      cidr: 192.168.128.0/17
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: "kubernetes.io/os == 'windows'"
```

## Step 4: Verify Windows DaemonSet Configuration

```bash
kubectl get daemonset calico-node-windows -n calico-system -o yaml | grep -A5 "env:"
```

## Step 5: Configure Felix Logging and Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true
  }}'
```

## Step 6: Verify Configuration on Windows Nodes

```powershell
# On a Windows node

Get-HnsNetwork | Select-Object Name, Type, AddressPrefix
Get-ChildItem C:\etc\cni\net.d
Get-Content C:\etc\cni\net.d\*.conf* | ConvertFrom-Json
```

## Conclusion

Operator-managed Calico configuration for Windows nodes centralizes most settings in the Installation CR. The key settings - `windowsDataplane: HNS`, `serviceCIDRs`, VXLAN encapsulation, and disabled BGP for VXLAN clusters - ensure the operator deploys the correct Windows DaemonSet configuration. Separate IP pools for Windows and Linux nodes provide clean address space separation in mixed-OS clusters.
