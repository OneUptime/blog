# How to Troubleshoot Windows Container Issues in Rancher - Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Troubleshooting, Debugging, Container, Kubernetes

Description: Diagnose and resolve common Windows container issues in Rancher including image version mismatches, networking failures, and container startup errors.

## Introduction

Windows container troubleshooting requires Windows-specific diagnostic tools and an understanding of Windows container isolation modes. Many issues stem from Windows version compatibility, networking configuration, or Windows-specific limitations not present in Linux containers.

## Common Error: Image Version Mismatch

A common Windows container error from hcsshim:

```text
hcsshim::CreateComputeSystem ... The container operating system does not match the host operating system.
```

This means the container image's Windows version doesn't match the node's OS version.

```powershell
# Check the Windows node OS version

kubectl get node win-worker-1 -o jsonpath='{.status.nodeInfo.osImage}'

# Check the image's required OS version
docker manifest inspect mcr.microsoft.com/windows/servercore:ltsc2022

# Image and node must match (ltsc2019 ≠ ltsc2022)
```

## Step 1: Basic Pod Diagnostics

```bash
# Check pod status
kubectl get pods -n production -o wide

# Describe the failing pod
kubectl describe pod windows-pod-abc123 -n production

# Common events to look for:
# "container failed to start"      → Image/OS version mismatch
# "timeout waiting for pod ready"  → Container startup taking too long
# "no nodes available"             → Node selector mismatch
```

## Step 2: Inspect Container Logs

```bash
# View container logs
kubectl logs -n production windows-pod-abc123

# View previous container logs (after restart)
kubectl logs -n production windows-pod-abc123 --previous
```

## Step 3: Debug Inside the Container

```bash
# Open a shell inside a running Windows container
kubectl exec -it windows-pod-abc123 -n production -- cmd.exe
# Or PowerShell
kubectl exec -it windows-pod-abc123 -n production -- powershell.exe
```

```powershell
# Inside the container - check network connectivity
Test-NetConnection kubernetes.default.svc.cluster.local -Port 443

# Check DNS resolution
Resolve-DnsName myservice.production.svc.cluster.local

# Check environment variables
Get-ChildItem Env:

# Check if files are accessible
Test-Path C:\app\config.json
```

## Step 4: Network Debugging

```powershell
# On the Windows node - check container networking
# Import the HNS module (ships with the Kubernetes Windows node setup)
Import-Module C:\k\hns.psm1

# List HNS (Host Network Service) networks
Get-HnsNetwork

# Check HNS endpoints
Get-HnsEndpoint | Where-Object {$_.State -ne "Attached"}

# Restart HNS to fix network issues (destructive - causes pod restarts)
Restart-Service hns
```

## Step 5: Check Windows Events

```powershell
# On the Windows node
# Check for container-related events
Get-EventLog -LogName Application -Source "*docker*" -Newest 20
Get-EventLog -LogName System -Source "*Hyper-V*" -Newest 20

# Check containerd service status and logs (containerd runs as a
# Windows service on the node, not as a pod)
Get-Service containerd
Get-Content "C:\var\lib\rancher\rke2\agent\logs\containerd.log" -Tail 50 |
  Select-String "error"
```

## Step 6: Common Issues and Fixes

| Issue | Cause | Fix |
|---|---|---|
| Container won't start | OS version mismatch | Match image to node OS |
| DNS not resolving | kubelet DNS config | Restart kubelet |
| Cannot access cluster services | Windows Firewall | Add Windows Firewall rules |
| Container exits immediately | Missing entrypoint | Check CMD/ENTRYPOINT |
| Slow container start | Image not cached | Pre-pull image |

## Conclusion

Windows container troubleshooting in Rancher centers on OS version compatibility, Windows networking services (HNS), and Windows-specific limitations. Always match container base images to the exact Windows version on your worker nodes, and use PowerShell inside containers for detailed network diagnostics.
