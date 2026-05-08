# How to Upgrade Calico on Windows Nodes with Rancher Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Rancher, Networking, CNI, Upgrade

Description: A guide to safely upgrading Calico on Windows nodes in a Rancher-managed Kubernetes cluster.

---

## Introduction

Upgrading Calico on Windows nodes in a Rancher-managed cluster involves coordinating between Rancher's cluster upgrade mechanism and the Windows-specific Calico upgrade steps. Rancher can trigger RKE2 and Linux Calico component upgrades through its UI or kubectl, but Windows nodes that use a manual Calico for Windows installation still require the same manual steps as non-Rancher deployments. For newer Calico installations, the operator-based Windows HostProcess container method is preferred over the deprecated manual method.

Rancher may have opinions about Calico version because RKE2 bundles CNI charts with each RKE2 release and Rancher stores RKE2 cluster configuration, including chart values, in the cluster configuration. When upgrading Calico independently of the Rancher cluster upgrade, be aware that a later cluster-level upgrade may reconcile the bundled RKE2 Calico chart unless you coordinate the change with the Rancher-managed RKE2 version and chart configuration.

## Prerequisites

- Rancher-managed cluster with Windows and Linux nodes running Calico
- Access to Rancher UI and kubectl
- A scheduled maintenance window

## Step 1: Check Rancher's Calico Chart Configuration

```bash
# Check the installed RKE2 Calico chart in the downstream cluster
kubectl get helmchart -n kube-system rke2-calico -o yaml

# From the Rancher management cluster, check any Rancher-managed Calico chart values
kubectl get clusters.provisioning.cattle.io -A -o yaml | grep -A20 -B5 rke2-calico
```

If Rancher has Calico chart values in the cluster configuration, coordinate the upgrade with Rancher's cluster edit UI.

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

After Linux nodes are upgraded, upgrade Windows nodes that use a manual Calico for Windows installation manually.

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

cd C:\CalicoWindows
.\install-calico.ps1
Get-Service CalicoNode, CalicoFelix
```

The installer can briefly disrupt Windows node networking while it initializes the vSwitch. If kubelet or kube-proxy were already running as Windows services, restart them after the Calico install completes.

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

Upgrading Calico on Windows nodes in Rancher requires coordinating with Rancher's cluster version management for Linux nodes while performing manual Windows binary upgrades for Windows nodes that use the manual Calico for Windows installation. Checking Rancher's RKE2 Calico chart state before the upgrade prevents version drift that could cause a later cluster-level operation to reconcile Calico back to the bundled chart version.
