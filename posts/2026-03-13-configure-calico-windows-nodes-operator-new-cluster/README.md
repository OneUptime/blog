# How to Configure Calico on Windows Nodes with the Operator for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Configuration

Description: A guide to configuring Calico on Windows nodes via the Tigera Operator, including IP pools, network settings, and Windows-specific operator configuration.

---

## Introduction

When using the Tigera Operator to manage Calico on Windows nodes, all configuration flows through the operator's CRDs - primarily the `Installation` resource. The operator translates the Installation spec into the appropriate Windows DaemonSet configuration, CNI config files, and network settings. This unified configuration model is the main advantage of the operator approach over manual Windows Calico installation.

The key configuration decisions for Windows nodes are encapsulation mode (VXLAN is required), Windows dataplane selection (HNS), and IP pool CIDR alignment with the rest of the cluster. The operator enforces that Windows-incompatible settings are not applied to Windows nodes.

This guide covers the operator-based configuration workflow for Windows nodes.

## Prerequisites

- Calico installed on Linux nodes via the Tigera Operator
- Windows nodes joined to the cluster
- `kubectl` with cluster admin access

## Step 1: Review the Current Installation CR

```bash
kubectl get installation default -o yaml
```

Identify the current IP pool configuration and verify it is compatible with Windows (VXLAN encapsulation).

## Step 2: Configure the Installation CR for Windows

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    windowsDataplane: HNS
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
    mtu: 1450
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
  calicoNetwork:
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

## Step 5: Configure Felix for Windows Compatibility

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
cat C:\CalicoWindows\config\cni\calico.conf | ConvertFrom-Json
```

## Conclusion

Operator-managed Calico configuration for Windows nodes centralizes all settings in the Installation CR. The key settings - `windowsDataplane: HNS`, VXLAN encapsulation, and appropriate MTU - ensure the operator deploys the correct Windows DaemonSet configuration. Separate IP pools for Windows and Linux nodes provide clean address space separation in mixed-OS clusters.
