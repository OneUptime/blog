# How to Test Network Policies with Calico on Windows Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Networking, Network Policies

Description: A guide to testing Calico network policies on Windows nodes, including cross-OS policy enforcement between Windows and Linux pods.

---

## Introduction

Network policy enforcement on Windows nodes works through Windows HNS ACLs rather than Linux iptables. The policy semantics are the same - Calico translates Kubernetes NetworkPolicy resources into the appropriate dataplane rules - but the underlying mechanism differs. Testing policies on Windows nodes requires verifying that HNS ACL rules are correctly programmed, not just that connectivity behaves as expected.

Calico's support for Windows network policies covers standard Kubernetes NetworkPolicy resources. Some Calico-specific policy features, such as host endpoint policies, are not supported on Windows; Calico also recommends avoiding policies that combine source and destination selectors because they can require significant Windows dataplane resources. Testing should focus on the supported policy types and verify cross-OS policy enforcement.

## Prerequisites

- Calico running on Linux and Windows nodes
- `kubectl` access from a Linux node
- PowerShell access to a Windows node

## Step 1: Deploy Test Workloads

Deploy a server on Windows and clients on both Windows and Linux.

```yaml
# windows-server.yaml

apiVersion: v1
kind: Pod
metadata:
  name: win-server
  namespace: policy-test
  labels:
    app: win-server
    os: windows
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: server
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
```

```bash
kubectl create namespace policy-test
kubectl apply -f windows-server.yaml
kubectl run linux-client --image=busybox --labels="app=linux-client,os=linux" -n policy-test -- sleep 3600
```

## Step 2: Baseline Test (No Policy)

```bash
WIN_SERVER_IP=$(kubectl get pod win-server -n policy-test -o jsonpath='{.status.podIP}')
kubectl exec -n policy-test linux-client -- wget -qO- -T 5 http://$WIN_SERVER_IP
```

## Step 3: Apply Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-linux-to-windows
  namespace: policy-test
spec:
  podSelector:
    matchLabels:
      os: windows
  ingress:
    - from:
        - podSelector:
            matchLabels:
              os: linux
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f allow-linux-to-windows.yaml
```

## Step 4: Test Policy Enforcement

Linux client should succeed:

```bash
kubectl exec -n policy-test linux-client -- wget -qO- -T 5 http://$WIN_SERVER_IP
```

## Step 5: Verify HNS ACL Rules on the Windows Node

```powershell
# On the Windows node where win-server is running
Get-HnsPolicyList | Where-Object { $_.Policies -like "*ACL*" } | ConvertTo-Json
```

You should see ACL rules corresponding to your NetworkPolicy.

## Step 6: Deploy a Windows Client to Test Windows-to-Windows Policy

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: win-client
  namespace: policy-test
  labels:
    app: win-client
    os: windows
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: client
    image: mcr.microsoft.com/windows/servercore:ltsc2022
    command: ["powershell", "-Command", "while($true) { Start-Sleep 10 }"]
```

```bash
kubectl apply -f win-client.yaml
kubectl exec win-client -n policy-test -- powershell -Command "Invoke-WebRequest -Uri http://$WIN_SERVER_IP"
```

This request should fail because the ingress policy only allows pods labeled `os: linux` to connect to Windows pods.

## Conclusion

Testing Calico network policies on Windows nodes requires deploying Windows container workloads, applying standard Kubernetes NetworkPolicy resources, and verifying both connectivity behavior and HNS ACL rule programming. Cross-OS policy testing between Linux clients and Windows servers, along with same-OS Windows testing, helps ensure that Calico's unified policy model correctly enforces access controls across your mixed-OS cluster.
