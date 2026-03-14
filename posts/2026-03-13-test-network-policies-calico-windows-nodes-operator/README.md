# How to Test Network Policies with Calico on Windows Nodes with the Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, Network Policies

Description: A guide to testing network policy enforcement on Windows nodes managed by the Tigera Operator in a mixed Linux/Windows Kubernetes cluster.

---

## Introduction

Network policy testing on operator-managed Windows nodes benefits from the operator's consistent configuration management — policies applied through the standard Kubernetes NetworkPolicy API or Calico CRDs are translated to HNS ACL rules on Windows nodes automatically. The operator ensures that policy configuration is consistent between Linux and Windows nodes, eliminating a class of failures that can occur with manual Windows Calico installation.

Testing still requires explicit connectivity checks because the translation from Kubernetes policy to HNS ACL can have edge cases, particularly with more complex selector-based policies. This guide covers the testing workflow for operator-managed Windows nodes.

## Prerequisites

- Calico running on Windows and Linux nodes via the Tigera Operator
- `kubectl` with cluster admin access
- Both Windows and Linux pods deployable in the cluster

## Step 1: Create Test Namespaces and Workloads

```bash
kubectl create namespace win-policy-test
```

Deploy a Windows server pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: win-server
  namespace: win-policy-test
  labels:
    app: win-server
    os: windows
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: iis
    image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2019
    ports:
    - containerPort: 80
```

```bash
kubectl apply -f win-server.yaml
kubectl run linux-client --image=busybox --labels="app=linux-client" -n win-policy-test -- sleep 3600
kubectl expose pod win-server --port=80 -n win-policy-test
```

## Step 2: Baseline Connectivity Test

```bash
WIN_IP=$(kubectl get pod win-server -n win-policy-test -o jsonpath='{.status.podIP}')
kubectl exec -n win-policy-test linux-client -- wget -qO- --timeout=10 http://$WIN_IP
```

## Step 3: Apply Default Deny and Selective Allow

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: win-policy-test
spec:
  podSelector:
    matchLabels:
      os: windows
  policyTypes:
    - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-linux-to-win
  namespace: win-policy-test
spec:
  podSelector:
    matchLabels:
      os: windows
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: linux-client
```

```bash
kubectl apply -f policies.yaml
```

## Step 4: Test Policy Enforcement

```bash
# Should succeed
kubectl exec -n win-policy-test linux-client -- wget -qO- --timeout=10 http://$WIN_IP

# Deploy a denied client and test
kubectl run denied-client --image=busybox --labels="app=denied" -n win-policy-test -- sleep 3600
kubectl exec -n win-policy-test denied-client -- wget -qO- --timeout=5 http://$WIN_IP || echo "Blocked"
```

## Step 5: Verify HNS ACLs on Windows Node

```powershell
# On the Windows node hosting win-server
Get-HnsPolicyList | ConvertTo-Json | Select-String "ACL"
```

## Step 6: Clean Up

```bash
kubectl delete namespace win-policy-test
```

## Conclusion

Testing network policies on operator-managed Windows nodes verifies that the operator correctly translates Kubernetes NetworkPolicy resources to HNS ACL rules on Windows. The testing workflow — baseline connectivity, apply policies, verify enforcement, confirm HNS rules — provides comprehensive coverage of the policy enforcement pipeline for Windows workloads in mixed-OS clusters.
