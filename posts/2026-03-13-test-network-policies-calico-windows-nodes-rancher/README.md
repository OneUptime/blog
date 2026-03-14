# How to Test Network Policies with Calico on Windows Nodes with Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, Network Policies

Description: A guide to testing Calico network policy enforcement on Windows nodes in a Rancher-managed mixed Linux/Windows Kubernetes cluster.

---

## Introduction

Testing network policies in a Rancher-managed cluster with Windows nodes can be initiated from the Rancher UI (for deploying test workloads) or from the kubectl CLI. Policy testing itself is identical to non-Rancher deployments — the Calico policy model and HNS enforcement mechanism do not change based on the cluster management layer. However, Rancher's project and namespace model can affect how policies apply.

Rancher organizes namespaces into Projects, and it creates its own system network policies in some configurations. Before adding Calico policies, check whether Rancher has pre-created any NetworkPolicy resources in your namespaces, as these may affect baseline connectivity.

## Prerequisites

- Rancher-managed cluster with Windows and Linux nodes running Calico
- Access to Rancher UI and kubectl
- Windows pods deployable in the cluster

## Step 1: Check Rancher-Created Default Policies

```bash
kubectl get networkpolicies -A | grep -v "<none>"
```

Rancher may have created default deny-all or allow-same-namespace policies in your project namespaces.

## Step 2: Create a Test Project and Namespace

In Rancher UI:
- Create a new Project called `policy-testing`
- Create a namespace `win-policy-ns` within it

Or via kubectl:

```bash
kubectl create namespace win-policy-ns
```

## Step 3: Deploy Test Workloads

```yaml
# windows-server.yaml
apiVersion: v1
kind: Pod
metadata:
  name: win-server
  namespace: win-policy-ns
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
kubectl apply -f windows-server.yaml
kubectl expose pod win-server --port=80 -n win-policy-ns
kubectl run allowed-client --image=busybox --labels="app=allowed,os=linux" -n win-policy-ns -- sleep 3600
kubectl run blocked-client --image=busybox --labels="app=blocked,os=linux" -n win-policy-ns -- sleep 3600
```

## Step 4: Apply and Test Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-linux
  namespace: win-policy-ns
spec:
  podSelector:
    matchLabels:
      os: windows
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: allowed
```

```bash
kubectl apply -f allow-specific.yaml

WIN_IP=$(kubectl get pod win-server -n win-policy-ns -o jsonpath='{.status.podIP}')
kubectl exec -n win-policy-ns allowed-client -- wget -qO- --timeout=10 http://$WIN_IP
kubectl exec -n win-policy-ns blocked-client -- wget -qO- --timeout=5 http://$WIN_IP || echo "Blocked"
```

## Step 5: View Policy Status in Rancher UI

In Rancher UI:
- Navigate to **Cluster** > **Resources** > **Network Policies**
- Verify your policy is listed in the `win-policy-ns` namespace

## Step 6: Clean Up

```bash
kubectl delete namespace win-policy-ns
```

## Conclusion

Testing network policies on Windows nodes in Rancher-managed clusters follows the standard Calico testing workflow, with the added step of checking for Rancher-created default network policies that may affect baseline behavior. The Rancher UI provides convenient visibility into deployed network policies alongside its standard workload management features.
