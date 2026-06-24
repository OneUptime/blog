# How to Verify Pod Networking with Calico on Windows Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Networking, CNI, Verification

Description: A guide to verifying Calico pod networking on Windows nodes, including cross-OS connectivity between Windows and Linux pods.

---

## Introduction

Verifying pod networking on Windows nodes requires both Windows-side and Linux-side verification steps. The Windows HNS (Host Network Service) underpins Calico's networking on Windows, so HNS endpoint inspection is an additional verification layer that does not exist on Linux. Cross-OS connectivity between Windows and Linux pods is the most important functional test for a mixed-OS cluster.

Windows containers use a different network namespace model than Linux containers, and some standard network testing tools (like `ping` in its Linux form) behave differently on Windows. This guide provides Windows-appropriate commands for each verification step.

## Prerequisites

- Calico running on both Linux and Windows nodes in a Kubernetes cluster
- `kubectl` access from a Linux or other Unix-like shell
- PowerShell access to at least one Windows node

## Step 1: Verify Windows Calico Services

```powershell
Get-Service CalicoNode, CalicoFelix | Select-Object Name, Status, StartType
```

Both should show `Running` status for manually installed Calico for Windows. If Calico for Windows was installed by the Tigera Operator with HostProcess containers, check the `calico-node-windows` pods instead because the Calico services are not registered directly on the host.

## Step 2: Check HNS Endpoints

```powershell
# List all HNS endpoints (one per running pod on the Windows node)
ipmo -DisableNameChecking C:\CalicoWindows\libs\hns\hns.psm1
Get-HNSEndpoint | Select-Object Id, IPAddress, MacAddress
```

Each running Windows pod should have a corresponding HNS endpoint.

## Step 3: Deploy a Windows Test Pod

```bash
# Apply a Windows pod manifest
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: win-verify
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: win
    # Use a tag that matches the Windows node OS version, such as ltsc2022 for Windows Server 2022.
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command:
    - powershell.exe
    - -Command
    - |
      $listener = New-Object System.Net.HttpListener
      $listener.Prefixes.Add('http://*:8080/')
      $listener.Start()
      while ($listener.IsListening) {
        $context = $listener.GetContext()
        $bytes = [Text.Encoding]::UTF8.GetBytes('ok')
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.Close()
      }
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
kubectl run linux-verify --image=busybox:1.36 --restart=Never -- sh -c 'mkdir -p /www && echo ok > /www/index.html && httpd -f -p 8080 -h /www'
LINUX_IP=$(kubectl get pod linux-verify -o jsonpath='{.status.podIP}')
WIN_IP=$(kubectl get pod win-verify -o jsonpath='{.status.podIP}')

# Windows pod connects to the Linux pod's HTTP listener
kubectl exec win-verify -- powershell -Command "Test-NetConnection -ComputerName $LINUX_IP -Port 8080"

# Linux pod connects to the Windows pod's HTTP listener
kubectl exec linux-verify -- wget -qO- http://$WIN_IP:8080/
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
# For operator-managed HostProcess installs
kubectl logs -n calico-system -l k8s-app=calico-node-windows -c node --tail=30
kubectl logs -n calico-system -l k8s-app=calico-node-windows -c felix --tail=30
```

## Conclusion

Verifying Calico on Windows nodes combines Windows-specific checks - HNS endpoint inspection, Windows service status, PowerShell-based connectivity tests - with standard Kubernetes pod IP and IPAM checks. Cross-OS connectivity testing between Linux and Windows pods is the definitive test that the mixed-OS networking model is working correctly end-to-end.
