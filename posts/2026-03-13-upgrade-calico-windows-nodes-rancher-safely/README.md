# How to Upgrade Calico on Windows Nodes with Rancher Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, CNI, Upgrade

Description: A guide to safely upgrading Calico on Windows nodes in a Rancher-managed Kubernetes cluster.

---

## Introduction

Upgrading Calico on Windows nodes in a Rancher-managed cluster involves coordinating between Rancher's cluster upgrade mechanism and the Windows-specific Calico upgrade steps. Rancher can trigger operator and Linux Calico component upgrades through its UI or kubectl, but Windows Calico components still require the same manual steps as non-Rancher deployments.

Rancher may have opinions about Calico version - it pins the Calico version that was used during cluster creation in its cluster configuration. When upgrading Calico independently of the Rancher cluster upgrade, be aware that Rancher may try to revert the Calico version if you perform a cluster-level upgrade without explicitly specifying the new Calico version.

## Prerequisites

- Rancher-managed cluster with Windows and Linux nodes running Calico
- Access to Rancher UI and kubectl
- A scheduled maintenance window

## Step 1: Check Rancher's Pinned Calico Version

```bash
# Check the Calico version Rancher expects
kubectl get configmap -n kube-system rke2-chart-values -o yaml | grep calico
```

If Rancher has pinned Calico to a specific version, coordinate the upgrade with Rancher's cluster edit UI.

## Step 2: Pre-Upgrade Health Check

```bash
kubectl get tigerastatus
kubectl get nodes
kubectl get pods -n calico-system
```

## Step 3: Upgrade via Rancher (Recommended Path)

If Rancher supports the new Calico version:

1. In Rancher UI, go to **Cluster** > **Edit Config**
2. Update the Kubernetes version (which includes Calico version)
3. Save and monitor the cluster upgrade

This path handles Linux nodes automatically.

## Step 4: Upgrade Windows Nodes Manually

After Linux nodes are upgraded, upgrade Windows nodes manually.

```bash
kubectl cordon <windows-node>
```

```powershell
# On the Windows node
$CALICO_VERSION = "v3.27.0"
Invoke-WebRequest -Uri "https://github.com/projectcalico/calico/releases/download/$CALICO_VERSION/calico-windows-$CALICO_VERSION.zip" `
  -OutFile C:\calico-windows-new.zip

Stop-Service CalicoFelix, CalicoNode -Force

Rename-Item C:\CalicoWindows C:\CalicoWindows.bak
Expand-Archive C:\calico-windows-new.zip -DestinationPath C:\CalicoWindows
Copy-Item C:\CalicoWindows.bak\config.ps1 C:\CalicoWindows\config.ps1

C:\CalicoWindows\install-calico.ps1
Get-Service CalicoNode, CalicoFelix
```

```bash
kubectl uncordon <windows-node>
```

## Step 5: Verify Post-Upgrade in Rancher

In Rancher UI, verify the Windows node returns to **Active** status.

```bash
kubectl get nodes
kubectl get tigerastatus
```

## Step 6: Test Connectivity

```bash
kubectl run test --image=busybox -- sleep 60
WIN_IP=$(kubectl get pod <windows-pod> -o jsonpath='{.status.podIP}')
kubectl exec test -- ping -c3 $WIN_IP
kubectl delete pod test
```

## Conclusion

Upgrading Calico on Windows nodes in Rancher requires coordinating with Rancher's cluster version management for Linux nodes while performing manual Windows binary upgrades for the Windows nodes. Checking Rancher's pinned Calico version before the upgrade prevents version drift that could cause Rancher to revert the upgrade during a subsequent cluster-level operation.
