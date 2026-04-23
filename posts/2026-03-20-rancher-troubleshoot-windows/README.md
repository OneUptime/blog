# How to Troubleshoot Windows Container Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Troubleshooting, Debugging, Container

Description: Diagnose and resolve common Windows container issues in Rancher including image pull failures, container startup problems, networking issues, and storage failures.

## Introduction

Windows containers in Kubernetes present unique troubleshooting challenges compared to Linux containers. Image compatibility issues, longer startup times, different logging mechanisms, and Windows-specific networking behavior are common sources of problems. This guide covers systematic troubleshooting of Windows container issues in Rancher.

## Prerequisites

- Rancher cluster with Windows worker nodes
- kubectl access
- Access to Windows node via RDP or SSH (OpenSSH)
- PowerShell knowledge

## Step 1: Diagnose Image Pull Failures

```bash
# Check pod events for image pull errors

kubectl describe pod win-pod-xyz -n production | tail -30

# Common error: image OS/arch mismatch
# Error: "container failed with error: image operating system \"linux\" cannot be used on this platform"
# Solution: Use Windows-compatible image tag

# Check available image tags (Windows vs Linux)
# Windows images: *-windowsservercore-ltsc2022, *-nanoserver-ltsc2022
# Linux images: *-alpine, *-bullseye, etc.

# Identify the Windows node to inspect directly
kubectl get pod win-pod-xyz -n production -o wide
```

```powershell
# On Windows node: manually pull image for testing
& "C:\var\lib\rancher\rke2\bin\crictl.exe" `
  --runtime-endpoint npipe:////./pipe/containerd-containerd `
  pull `
  registry.example.com/windows-app:v1.0

# Confirm the image is present on the node
& "C:\var\lib\rancher\rke2\bin\crictl.exe" `
  --runtime-endpoint npipe:////./pipe/containerd-containerd `
  images | Select-String "registry.example.com/windows-app"
```

## Step 2: Diagnose Container Startup Failures

```bash
# Check container logs
kubectl logs win-pod-xyz -n production

# Windows containers often have CrashLoopBackOff due to:
# 1. Wrong ENTRYPOINT syntax
# 2. DLL not found errors
# 3. Registry key missing
# 4. Permission issues

# Check previous container logs
kubectl logs win-pod-xyz -n production --previous

# Get detailed container status
kubectl get pod win-pod-xyz -n production -o json | \
  jq '.status.containerStatuses[0]'
```

```powershell
# On Windows node: check kubelet logs for startup/runtime errors
Get-Content -Tail 200 "C:\var\lib\rancher\rke2\agent\logs\kubelet.log"

# Check Windows Event Log for application errors
Get-EventLog -LogName Application -Newest 50 | `
  Where-Object {$_.EntryType -eq "Error"}

# Check container state
& "C:\var\lib\rancher\rke2\bin\crictl.exe" `
  --runtime-endpoint npipe:////./pipe/containerd-containerd `
  ps -a
```

## Step 3: Troubleshoot Pod Scheduling Issues

```bash
# Windows pods pending - check why they're not scheduling
kubectl describe pod win-pod-xyz -n production | grep -A 10 "Events"

# Common issues:
# 1. No Windows nodes available
# 2. NodeSelector missing or wrong
# 3. Windows node has insufficient resources

# Check Windows nodes
kubectl get nodes -l kubernetes.io/os=windows

# Check Windows node capacity
kubectl describe node win-node-01 | grep -A 10 "Capacity"

# Verify pod has correct nodeSelector
kubectl get pod win-pod-xyz -n production -o yaml | \
  grep -A 5 nodeSelector
```

## Step 4: Troubleshoot Networking Issues

```powershell
# On Windows node: diagnose network issues

# Check HNS networks
Get-HNSNetwork | Select-Object Name, Type, AddressPrefix

# Check HNS endpoints for containers
Get-HNSEndpoint

# Verify pod can communicate with cluster DNS
# Inside a Windows pod:
kubectl exec -it win-pod -n production -- powershell.exe

# Test DNS
Resolve-DnsName kubernetes.default.svc.cluster.local
Resolve-DnsName my-service.production.svc.cluster.local

# Test connectivity to services
Test-NetConnection -ComputerName my-service -Port 8080

# Check if Windows firewall is blocking traffic
Get-NetFirewallRule | Where-Object {$_.Enabled -eq "True" -and $_.Direction -eq "Inbound"} | `
  Where-Object {$_.Action -eq "Block"}
```

## Step 5: Investigate Resource Issues

```powershell
# Check Windows node resource usage
# From inside a pod or on the node via SSH

# CPU usage
Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 5

# Memory
Get-Counter "\Memory\Available MBytes"
[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB, 2)

# Disk I/O
Get-Counter "\PhysicalDisk(_Total)\Disk Bytes/sec"
```

```bash
# From Kubernetes, check resource usage
kubectl top node win-node-01
kubectl top pods -n production --sort-by=memory | grep win
```

## Step 6: Debug Container Exit Codes

```bash
# Get container exit code
kubectl get pod win-pod-xyz -n production -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'

# Windows exit codes:
# 0 - Success
# 1 - General error
# -1073741819 (0xC0000005) - Access violation (memory issue)
# -1073741515 (0xC0000135) - DLL not found
# -1073740791 (0xC0000409) - Stack buffer overflow

# Common solution for DLL not found:
# Ensure your image is built FROM a base with required runtimes
```

## Step 7: Windows Container Health Check Debugging

```yaml
# Increase probe timeouts for Windows containers
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 120  # Windows containers start slower
  periodSeconds: 15
  failureThreshold: 10
  timeoutSeconds: 10

livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 180
  periodSeconds: 30
  failureThreshold: 5
  timeoutSeconds: 10
```

## Step 8: Collect Diagnostic Information

```powershell
# Collect comprehensive diagnostics for Windows node issues
# Run on the Windows node

# System information
$report = @{
    'SystemInfo' = (Get-ComputerInfo)
    'Services' = (Get-Service | Where-Object {$_.Name -like "kube*" -or $_.Name -like "rke2*"})
    'Events' = (Get-EventLog -LogName System -Newest 20)
    'Network' = (Get-NetIPConfiguration)
    'HNS' = (Get-HNSNetwork)
}

$report | ConvertTo-Json -Depth 5 | Out-File C:\k8s-diag-$(Get-Date -Format 'yyyyMMdd-HHmmss').json

# Collect RKE2 service logs
Get-WinEvent -LogName Application -MaxEvents 200 | `
  Where-Object {$_.ProviderName -like "rke2*"} | `
  Select-Object TimeCreated, Id, LevelDisplayName, Message
```

## Conclusion

Troubleshooting Windows containers in Rancher requires combining Kubernetes debugging tools (kubectl describe, logs) with Windows-native diagnostics (Event Viewer, PowerShell, HNS commands). The most common issues are image OS/arch mismatches, insufficient startup time in health probes, DNS resolution, and HNS networking configuration. Building a checklist of common failure modes and their solutions accelerates incident resolution and helps prevent recurrence through improved pod specifications.
