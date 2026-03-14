# How to Verify Pod Networking with Calico on Windows Nodes with Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, CNI, Verification

Description: A guide to verifying Calico pod networking on Windows nodes in a Rancher-managed Kubernetes cluster.

---

## Introduction

Verifying Calico pod networking on Windows nodes in a Rancher-managed cluster combines standard Kubernetes checks available through the Rancher UI with CLI-based verification using kubectl and calicoctl. Rancher's UI provides a useful first overview of node and pod health, while kubectl and calicoctl provide the detail needed to confirm Calico-specific networking is working correctly.

The verification workflow is the same as for non-Rancher deployments, with the addition of Rancher-specific checks — verifying that Rancher has correctly registered the Windows node, that the node appears in Rancher's node management UI, and that any Rancher-deployed monitoring tools are collecting metrics from the Windows node.

## Prerequisites

- Rancher-managed cluster with Windows and Linux nodes
- Calico installed on all nodes
- Access to Rancher UI and kubectl

## Step 1: Check Node Status in Rancher UI

In Rancher UI:
- Navigate to your cluster
- Go to **Cluster** > **Nodes**
- Verify Windows nodes show **Active** status

## Step 2: Verify via kubectl

```bash
kubectl get nodes
kubectl get nodes -l kubernetes.io/os=windows -o wide
```

## Step 3: Check Calico Components

```bash
kubectl get tigerastatus
kubectl get pods -n calico-system -o wide
```

Calico pods should include entries on Windows nodes.

## Step 4: Test Windows Pod IP Assignment

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

The Windows pod should receive a Calico-assigned IP in your pod CIDR range.

## Step 5: Test Cross-OS Connectivity

```bash
kubectl run linux-verify --image=busybox -- sleep 300
WIN_IP=$(kubectl get pod win-verify -o jsonpath='{.status.podIP}')

# Linux to Windows
kubectl exec linux-verify -- ping -c3 $WIN_IP
```

```bash
# Windows to Linux
LINUX_IP=$(kubectl get pod linux-verify -o jsonpath='{.status.podIP}')
kubectl exec win-verify -- powershell -Command "Test-NetConnection -ComputerName $LINUX_IP -Port 80"
```

## Step 6: Verify Through Rancher Monitoring

If Rancher Monitoring is installed:

```bash
# Check if Calico metrics are being scraped
kubectl get servicemonitor -n cattle-monitoring-system | grep calico
```

## Step 7: Clean Up

```bash
kubectl delete pod win-verify linux-verify
```

## Conclusion

Verifying Calico on Windows nodes in a Rancher cluster uses a combination of Rancher UI node status checks and kubectl/calicoctl CLI verification. The cross-OS connectivity test — Linux pinging Windows pods and vice versa — is the key functional test that confirms Rancher's Windows node integration and Calico's mixed-OS networking are both working correctly.
