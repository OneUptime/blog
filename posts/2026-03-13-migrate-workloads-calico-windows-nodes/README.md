# How to Migrate Existing Workloads to Calico on Windows Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Networking, CNI, Migration

Description: A guide to migrating Windows container workloads to use Calico networking on Windows Server nodes.

---

## Introduction

Migrating Windows workloads to Calico networking typically means transitioning from the default Windows CNI (often flannel for Windows or another CNI that uses HNS in bridge mode) to Calico's HNS-based networking. The migration requires updating the Windows CNI configuration, restarting the Calico services with the new configuration, and then restarting all Windows pods to pick up new IPs.

Because Windows containers do not support all the same CNI switching mechanisms as Linux containers, the migration is inherently more disruptive on Windows nodes. Planning for a maintenance window where Windows pods are restarted is necessary.

## Prerequisites

- Windows nodes joined to a Kubernetes cluster with a non-Calico CNI
- Linux nodes already running Calico
- PowerShell access to all Windows nodes
- `kubectl` access from a Linux node

## Step 1: Document Windows Workloads

```bash
kubectl get pods -A -o wide | grep <windows-node>
kubectl get deployments -A -o yaml | grep -A5 "nodeSelector.*windows" > windows-workloads-backup.yaml
```

## Step 2: Scale Down Windows Workloads

```bash
# Scale down Windows-scheduled deployments
kubectl scale deployment <windows-deployment> --replicas=0 -n <namespace>
```

## Step 3: Remove Old CNI from Windows Nodes

```powershell
# Stop old CNI services (example for flannel)
Stop-Service flanneld -Force
Remove-Service flanneld

# Remove old CNI config
Remove-Item "C:\etc\cni\net.d\10-flannel.conf" -ErrorAction SilentlyContinue

# Remove old HNS networks
Get-HnsNetwork | Where-Object { $_.Name -like "*flannel*" } | Remove-HnsNetwork
```

## Step 4: Install Calico on Windows Nodes

```powershell
$CALICO_VERSION = "v3.27.0"
Invoke-WebRequest -Uri "https://github.com/projectcalico/calico/releases/download/$CALICO_VERSION/calico-windows-$CALICO_VERSION.zip" `
  -OutFile C:\calico-windows.zip
Expand-Archive -Path C:\calico-windows.zip -DestinationPath C:\CalicoWindows

# Configure
C:\CalicoWindows\config.ps1
# Edit: CALICO_NETWORKING_BACKEND = "vxlan", set kubeconfig path

# Install
C:\CalicoWindows\install-calico.ps1
Get-Service CalicoNode, CalicoFelix
```

## Step 5: Verify Windows Node Readiness

```bash
kubectl get node <windows-node>
```

Wait for the node to show `Ready` status with the Calico CNI.

## Step 6: Scale Windows Workloads Back Up

```bash
kubectl scale deployment <windows-deployment> --replicas=<desired> -n <namespace>
kubectl get pods -A -o wide | grep <windows-node>
```

Verify Windows pods have new Calico-assigned IPs.

```powershell
Get-HnsEndpoint | Select-Object IPAddress, MacAddress
```

## Conclusion

Migrating Windows workloads to Calico requires scaling down Windows-scheduled pods, removing the existing CNI, installing and configuring Calico's Windows package, and scaling workloads back up to receive new Calico-assigned IPs. The Windows-specific steps — HNS network removal, Windows service management — differ from Linux CNI migration but follow the same logical sequence.
