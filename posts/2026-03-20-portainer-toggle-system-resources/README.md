# How to Toggle System Resource Visibility in Portainer for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, System Resources, Namespace, DevOps

Description: Learn how to show or hide Kubernetes system resources in Portainer to keep your view clean while still being able to access system-level workloads when needed.

## Introduction

Kubernetes often runs system or infrastructure workloads in namespaces like `kube-system`, `kube-public`, and `portainer`. These system resources are hidden by default in Portainer to keep the interface clean and prevent accidental modification. However, administrators sometimes need to inspect or troubleshoot system components. This guide explains how to toggle system resource visibility in Portainer.

## Prerequisites

- Portainer with Kubernetes environment connected
- Admin access to Portainer

## Understanding System Namespaces

Kubernetes starts with several system namespaces, and Portainer can also treat additional infrastructure namespaces as system namespaces:

```text
kube-system       - Core Kubernetes components (coredns, kube-proxy, metrics-server)
kube-public       - Publicly readable cluster information
kube-node-lease   - Node heartbeat lease objects
portainer         - Portainer's own components, if Portainer is deployed in Kubernetes
ingress-nginx     - Nginx Ingress Controller (if installed)
cert-manager      - Certificate manager (if installed)
monitoring        - Prometheus/Grafana stack (if installed)
```

## Step 1: Show System Resources in Portainer

On Kubernetes resource views that support it, Portainer hides system resources by default. To show them:

1. Select your Kubernetes environment
2. Open the three-dot menu in the top-right of the resource table
3. Enable **Show system resources**
4. Use the page's **Filter** or **Namespace** control to inspect `kube-system`, `kube-public`, or another namespace marked as system

## Step 2: Access System Resources via kubectl

When troubleshooting, access system namespaces directly via kubectl:

```bash
# View all system pods

kubectl get pods -n kube-system

# Common system components:
# NAME                                    READY   STATUS    RESTARTS
# coredns-xxx                             1/1     Running   0
# etcd-<control-plane-node>               1/1     Running   0
# kube-apiserver-<control-plane-node>     1/1     Running   0
# kube-controller-manager-<control-plane-node> 1/1 Running 0
# kube-proxy-xxx                          1/1     Running   0
# kube-scheduler-<control-plane-node>     1/1     Running   0
# metrics-server-xxx                      1/1     Running   0

# View deployments in kube-system
kubectl get deployments -n kube-system

# Check CoreDNS configuration
kubectl describe configmap coredns -n kube-system

# View system events
kubectl get events -n kube-system --sort-by='.metadata.creationTimestamp'
```

## Step 3: Mark Additional Namespaces as System in Portainer

For infrastructure namespaces that should be treated as system resources in Portainer:

1. Go to **Namespaces**
2. Select the namespace you want to manage
3. Click **Mark as system**, then **Update namespace**

This flags the namespace as a system namespace in Portainer.

## Step 4: View kube-system Workloads in Portainer

On pages where `kube-system` is available in the namespace selector:

1. Navigate to **Applications**
2. Select `kube-system` from the namespace dropdown to see system workloads:

```text
coredns                  - Cluster DNS resolution
kube-proxy               - Network rules on each node
metrics-server           - Resource metrics for HPA
calico / flannel / cilium - CNI network plugin
```

3. You can view logs and resource usage, but exercise caution when modifying system resources

## Step 5: Inspect System Component Logs

System component logs are critical for cluster troubleshooting:

```bash
# CoreDNS logs (DNS resolution issues)
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# kube-proxy logs (network issues)
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50

# metrics-server logs (HPA issues)
kubectl logs -n kube-system -l k8s-app=metrics-server --tail=50

# API server logs (on self-managed control plane nodes)
kubectl logs -n kube-system kube-apiserver-<node-name> --tail=100

# View events across all namespaces including system
kubectl get events -A --sort-by='.metadata.creationTimestamp' | tail -20
```

## Step 6: Hide System Resources for Non-Admin Users

In Portainer BE, use RBAC and namespace access to limit who can work with system namespaces:

1. From **Namespaces**, select **Manage access** on the namespace you want to control
2. Grant access only to the users or teams that need that namespace
3. Remember that cluster-wide roles such as **Operator** and **Helpdesk** apply to all non-system namespaces, while admins retain full visibility

Showing system resources in the UI does not replace RBAC; users still need permission to access the namespace.

## Step 7: Portainer's Own Namespace

The `portainer` namespace contains Portainer components:

```bash
# View Portainer's resources
kubectl get all -n portainer

# Check component status
kubectl get pods -n portainer

# View agent logs
kubectl logs -n portainer deployment/portainer-agent --tail=100

# View Portainer server (if deployed in Kubernetes)
kubectl logs -n portainer deployment/portainer --tail=100
```

Be careful not to delete resources in the `portainer` namespace as it will disconnect your Portainer instance from the cluster.

## Step 8: Checking System Namespace Health

Monitor system namespaces to detect cluster health issues:

```bash
# Review system pod status
kubectl get pods -n kube-system --no-headers
# In a healthy cluster, system pods are typically Running; completed Job pods may show Completed

# Check for any pending or failed system pods
kubectl get pods -A | grep -E "Pending|Failed|Error|CrashLoopBackOff"

# Check node conditions
kubectl describe nodes | grep -A 5 "Conditions:"

# View recent system events with warnings
kubectl events -n kube-system --types=Warning
```

## Conclusion

System resource visibility in Portainer is hidden by default to protect critical cluster components and keep the interface clean for application developers. Administrators can toggle visibility when troubleshooting cluster-level issues. Use this feature judiciously - inspect system resources when needed, but avoid making changes to system namespaces unless you understand the full impact. For Portainer BE deployments, RBAC and namespace access can limit which non-admin users can access infrastructure namespaces.
