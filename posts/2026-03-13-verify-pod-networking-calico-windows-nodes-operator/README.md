# How to Verify Pod Networking with Calico on Windows Nodes with the Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Verification

Description: A guide to verifying Calico pod networking on operator-managed Windows nodes, using both operator status checks and Windows-native verification.

---

## Introduction

Verifying operator-managed Calico on Windows nodes combines the operator's TigeraStatus checks with Windows-native HNS verification and cross-OS pod connectivity testing. The operator provides a unified view of both Linux and Windows Calico component health through the TigeraStatus CRD, which simplifies the initial health check compared to manual Windows installation.

However, HNS-level verification and Windows pod connectivity tests require Windows-specific tools and must be run on the Windows nodes or through kubectl exec into Windows pods. This guide covers both layers of verification.

## Prerequisites

- Calico installed on Windows and Linux nodes via the Tigera Operator
- `kubectl` with cluster admin access
- PowerShell access to at least one Windows node

## Step 1: Check TigeraStatus

```bash
kubectl get tigerastatus
kubectl describe tigerastatus calico
```

The TigeraStatus for Calico should show `Available: True` for all conditions, including Windows-specific ones.

## Step 2: Check Windows DaemonSet Pods

```bash
kubectl get pods -n calico-system -o wide | grep windows
kubectl logs -n calico-system <calico-node-windows-pod> --tail=30
```

## Step 3: Check Windows Node Readiness

```bash
kubectl get nodes -l kubernetes.io/os=windows
kubectl describe node <windows-node> | grep -A5 "Conditions:"
```

## Step 4: Verify HNS Network on Windows

```powershell
# On the Windows node
Get-HnsNetwork | Where-Object { $_.Type -eq "Overlay" } | Select-Object Name, Type, AddressPrefix
Get-HnsEndpoint | Measure-Object | Select-Object Count
```

## Step 5: Deploy and Test a Windows Pod

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: win-verify
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: win
    image: mcr.microsoft.com/windows/servercore:ltsc2019
    command: ["powershell", "-Command", "while(\$true) { Start-Sleep 10 }"]
EOF

kubectl get pod win-verify -o wide
```

## Step 6: Test Cross-OS Connectivity

```bash
kubectl run linux-verify --image=busybox -- sleep 300
WIN_IP=$(kubectl get pod win-verify -o jsonpath='{.status.podIP}')
LINUX_IP=$(kubectl get pod linux-verify -o jsonpath='{.status.podIP}')

# Linux to Windows
kubectl exec linux-verify -- ping -c3 $WIN_IP

# Windows to Linux
kubectl exec win-verify -- powershell -Command "Test-NetConnection -ComputerName $LINUX_IP -InformationLevel Quiet"
```

## Step 7: Verify IPAM

```bash
calicoctl ipam show --show-blocks
```

Windows nodes should show IPAM blocks from the Windows IP pool (if separate pools are configured) or the shared pool.

## Conclusion

Verifying operator-managed Calico on Windows nodes uses TigeraStatus for a unified health overview, kubectl to check the Windows DaemonSet pod logs, HNS inspection on Windows nodes for dataplane verification, and cross-OS connectivity tests to confirm end-to-end networking. The operator's TigeraStatus provides a single pane of glass for Windows and Linux component health that is not available with manual Windows installation.
