# How to Verify Pod Networking with Calico on Windows Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Networking, CNI, Verification

Description: A guide to verifying Calico pod networking on Windows nodes, including cross-OS connectivity between Windows and Linux pods.

---

## Introduction

Verifying pod networking on Windows nodes requires both Windows-side and Linux-side verification steps. The Windows HNS (Host Network Service) underpins Calico's networking on Windows, so HNS endpoint inspection is an additional verification layer that does not exist on Linux. Cross-OS connectivity between Windows and Linux pods is the most important functional test for a mixed-OS cluster.

Windows containers use a different network namespace model than Linux containers, and some standard network testing tools (like `ping` in its Linux form) behave differently on Windows. This guide provides Windows-appropriate commands for each verification step.

## Prerequisites

- Calico running on both Linux and Windows nodes in a Kubernetes cluster
- `kubectl` access from a Linux node
- PowerShell access to at least one Windows node

## Step 1: Verify Windows Calico Services

```powershell
Get-Service CalicoNode, CalicoFelix | Select-Object Name, Status, StartType
```

Both should show `Running` status.

## Step 2: Check HNS Endpoints

```powershell
# List all HNS endpoints (one per running pod on the Windows node)
Get-HnsEndpoint | Select-Object Id, IPAddress, MacAddress
```

Each running Windows pod should have a corresponding HNS endpoint.

## Step 3: Deploy a Windows Test Pod

```bash
# Apply a Windows pod manifest
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
    command: ["powershell", "-Command", "while($true) { Start-Sleep 10 }"]
EOF
kubectl get pod win-verify -o wide
```

## Step 4: Test Windows Pod Egress

```powershell
# Exec into the Windows pod
kubectl exec win-verify -- powershell -Command "Invoke-WebRequest -Uri http://example.com -UseBasicParsing"
```

## Step 5: Test Cross-OS Communication

```bash
# Deploy a Linux pod
kubectl run linux-verify --image=busybox -- sleep 300
LINUX_IP=$(kubectl get pod linux-verify -o jsonpath='{.status.podIP}')
WIN_IP=$(kubectl get pod win-verify -o jsonpath='{.status.podIP}')

# Windows pod pings Linux pod
kubectl exec win-verify -- powershell -Command "Test-NetConnection -ComputerName $LINUX_IP -Port 80"

# Linux pod pings Windows pod
kubectl exec linux-verify -- ping -c3 $WIN_IP
```

## Step 6: Verify IPAM for Windows Nodes

```bash
calicoctl ipam show --show-blocks
kubectl get node <windows-node> -o yaml | grep podCIDR
```

## Step 7: Check calico-node Logs on Windows

```powershell
Get-EventLog -LogName Application -Source CalicoNode -Newest 20
# Or check the log file
Get-Content C:\CalicoWindows\logs\calico-node.log -Tail 30
```

## Conclusion

Verifying Calico on Windows nodes combines Windows-specific checks - HNS endpoint inspection, Windows service status, PowerShell-based connectivity tests - with standard Kubernetes pod IP and IPAM checks. Cross-OS connectivity testing between Linux and Windows pods is the definitive test that the mixed-OS networking model is working correctly end-to-end.
