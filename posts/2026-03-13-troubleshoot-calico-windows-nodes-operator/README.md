# How to Troubleshoot Installation Issues with Calico on Windows Nodes with the Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Troubleshooting

Description: A diagnostic guide for resolving Calico installation failures on Windows nodes when using the Tigera Operator.

---

## Introduction

Troubleshooting operator-managed Calico on Windows nodes benefits from the operator's status reporting — TigeraStatus provides structured error messages that identify the failing component. However, the root causes often still require Windows-specific investigation: HNS state, Windows service logs, Windows Firewall configuration, and containerd configuration.

The operator adds its own layer of potential failures: incorrect Installation CR configuration for Windows, operator RBAC issues preventing Windows DaemonSet deployment, and operator version mismatches with Windows-specific DaemonSet images. This guide covers both operator-level and Windows-level diagnostic steps.

## Prerequisites

- Calico installation attempted on Windows nodes via the Tigera Operator
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes

## Step 1: Check TigeraStatus for Error Messages

```bash
kubectl get tigerastatus
kubectl describe tigerastatus calico
```

Look for specific error messages in the status conditions.

## Step 2: Check Operator Logs

```bash
kubectl logs -n tigera-operator deploy/tigera-operator --tail=50 | grep -i "windows\|error"
```

Common operator errors for Windows:
- `failed to reconcile Windows DaemonSet` — Installation CR misconfiguration
- `unsupported windows dataplane` — Invalid `windowsDataplane` value

## Step 3: Check Windows DaemonSet Pod Status

```bash
kubectl get pods -n calico-system -l k8s-app=calico-node-windows
kubectl describe pod -n calico-system <calico-node-windows-pod>
```

## Step 4: Read Windows Pod Logs

```bash
kubectl logs -n calico-system <calico-node-windows-pod> --tail=50
```

## Step 5: Diagnose HNS Issues on Windows

If the pod logs indicate HNS errors:

```powershell
# Check HNS service status
Get-Service HNS
Restart-Service HNS -Force

# Check for conflicting HNS networks
Get-HnsNetwork
# Remove any networks with conflicting CIDRs
Get-HnsNetwork | Where-Object { $_.Name -like "*flannel*" } | Remove-HnsNetwork
```

## Step 6: Verify Windows Node Annotations

The operator annotates Windows nodes with their Calico configuration. Check for missing annotations.

```bash
kubectl get node <windows-node> -o yaml | grep -A10 "annotations"
```

If operator annotations are missing, the operator may not have successfully reconciled the Windows node.

## Step 7: Check Windows Firewall

```powershell
# Verify VXLAN port is allowed
Get-NetFirewallRule -DisplayName "*vxlan*" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Calico VXLAN" -Direction Inbound -Protocol UDP -LocalPort 4789 -Action Allow
```

## Conclusion

Troubleshooting operator-managed Calico on Windows uses TigeraStatus for structured error reporting, operator logs for reconciliation errors, Windows DaemonSet pod logs for node-level errors, and Windows-native HNS and Firewall diagnostics for dataplane issues. The operator's structured status reporting reduces the initial diagnostic surface compared to manual Windows installation, but HNS-level issues still require Windows-specific investigation.
