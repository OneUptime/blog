# How to Fix 'the server could not find the requested resource' in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting

Description: Diagnose and fix the common ArgoCD error where the server cannot find a requested resource, caused by missing CRDs, API version changes, or cluster issues.

---

The error "the server could not find the requested resource" in ArgoCD is one of those messages that tells you something is wrong but gives you almost no clue about what. It means ArgoCD is trying to interact with a Kubernetes resource type that the cluster does not recognize. The underlying cause varies, but it always comes down to the cluster not having the API resource registered.

Let me walk through the common causes and fixes.

## Understanding the Error

This error comes from the Kubernetes API server, not from ArgoCD itself. When ArgoCD tries to create, read, or update a resource, it sends a request to the API server. If the API server does not know about the resource kind, it returns this error.

```
ComparisonError: the server could not find the requested resource (get monitoring.coreos.com/v1 ServiceMonitor)
```

The key information is in the parentheses: the API group, version, and kind of the resource that was not found.

## Cause 1: Missing Custom Resource Definitions

The most common cause is that a Custom Resource Definition (CRD) has not been installed on the target cluster. Your manifests reference a resource type (like `ServiceMonitor`, `Certificate`, or `VirtualService`) but the CRD that defines it is not present.

```bash
# Check if the CRD exists on the target cluster
kubectl get crd servicemonitors.monitoring.coreos.com

# List all CRDs to search
kubectl get crds | grep monitoring
```

The fix is to install the CRD before deploying resources that depend on it. If you are using ArgoCD to deploy both the CRD and the resources, use sync waves to ensure proper ordering.

```yaml
# Deploy the CRD first (sync wave -1)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-crds
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  source:
    repoURL: https://github.com/prometheus-operator/prometheus-operator
    path: example/prometheus-operator-crd
    targetRevision: main
---
# Deploy resources that use the CRD (sync wave 0)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  source:
    repoURL: https://github.com/my-org/monitoring-config
    path: manifests/
    targetRevision: main
```

For more details on managing CRD ordering, see our guide on [handling CRDs that must be installed before operators](https://oneuptime.com/blog/post/2026-02-26-argocd-crds-before-operators/view).

## Cause 2: Deprecated or Removed API Versions

Kubernetes regularly deprecates and removes API versions. If your manifests use an old API version that has been removed from your cluster, you get this error.

Common examples include:

- `extensions/v1beta1` Ingress (removed in Kubernetes 1.22, use `networking.k8s.io/v1`)
- `rbac.authorization.k8s.io/v1beta1` (removed in Kubernetes 1.22, use `v1`)
- `batch/v1beta1` CronJob (removed in Kubernetes 1.25, use `batch/v1`)
- `policy/v1beta1` PodDisruptionBudget (removed in Kubernetes 1.25, use `policy/v1`)
- `autoscaling/v2beta1` HorizontalPodAutoscaler (removed in Kubernetes 1.26, use `autoscaling/v2`)

```bash
# Check which API versions your cluster supports
kubectl api-versions | grep batch

# Check the specific resource
kubectl api-resources | grep cronjob
```

The fix is to update your manifests to use the current API version.

```yaml
# Old (removed in k8s 1.25)
apiVersion: batch/v1beta1
kind: CronJob

# New
apiVersion: batch/v1
kind: CronJob
```

## Cause 3: Cluster Upgrade Removed APIs

If you recently upgraded your Kubernetes cluster, APIs that were deprecated in the previous version may have been removed. ArgoCD applications that worked before the upgrade suddenly fail.

```bash
# Check your cluster version
kubectl version --short

# Check if a specific API is available
kubectl get --raw /apis/extensions/v1beta1 2>/dev/null || echo "API not available"
```

To find all resources in your Git repo using deprecated APIs, you can use tools like `kubent` (kube-no-trouble) or `pluto`.

```bash
# Install and run pluto to find deprecated APIs
pluto detect-files -d manifests/

# Or check against the cluster
pluto detect-api-resources
```

## Cause 4: ArgoCD Cache Is Stale

ArgoCD caches the API resources available on each cluster. If you recently installed a CRD or upgraded the cluster, ArgoCD may still be using cached API information that does not include the new resources.

```bash
# Force ArgoCD to refresh its cluster API cache
argocd app get my-app --hard-refresh

# Or restart the application controller to refresh all caches
kubectl -n argocd rollout restart deployment argocd-application-controller
```

You can also invalidate the cache for a specific cluster.

```bash
# List clusters
argocd cluster list

# Remove and re-add the cluster to refresh API cache
argocd cluster rm https://my-cluster:6443
argocd cluster add my-cluster-context
```

## Cause 5: Multi-Cluster API Differences

If ArgoCD manages multiple clusters, each cluster might have different CRDs installed or different Kubernetes versions. A manifest that works on one cluster fails on another because the target cluster does not have the required CRDs.

```bash
# Check APIs on a specific cluster context
kubectl --context=staging-cluster api-resources | grep servicemonitor
kubectl --context=production-cluster api-resources | grep servicemonitor
```

The fix is either to install the missing CRDs on the target cluster or to use separate Application specs for clusters with different capabilities.

## Cause 6: RBAC Restrictions

In some cases, the error is not about the resource being missing but about ArgoCD not having permission to access it. This can look similar to a missing resource error.

```bash
# Check what ArgoCD's service account can access
kubectl auth can-i get servicemonitors.monitoring.coreos.com \
  --as=system:serviceaccount:argocd:argocd-application-controller \
  -n my-namespace
```

If the result is "no", you need to update the RBAC rules for the ArgoCD service account.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-application-controller-custom
rules:
  - apiGroups:
      - monitoring.coreos.com
    resources:
      - servicemonitors
      - prometheusrules
    verbs:
      - '*'
```

## Cause 7: Aggregated API Server Issues

If you are using aggregated API servers (like the metrics-server or custom API extensions), the error might mean the aggregated API server is not responding.

```bash
# Check API service health
kubectl get apiservices | grep -v "True"

# Look for unhealthy API services
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml
```

Fix the underlying API service issue (usually a pod or service problem) and ArgoCD will start working again.

## Systematic Debugging Approach

When you see this error, follow this checklist:

1. **Identify the resource**: Read the error message to find the API group, version, and kind
2. **Check if the CRD exists**: `kubectl get crd <resource-name>.<api-group>`
3. **Check the API version**: `kubectl api-versions | grep <api-group>`
4. **Check RBAC**: `kubectl auth can-i get <resource> --as=system:serviceaccount:argocd:argocd-application-controller`
5. **Check API service health**: `kubectl get apiservices`
6. **Clear ArgoCD cache**: Hard refresh or restart the controller

```bash
# One-liner diagnostic script
RESOURCE="servicemonitors.monitoring.coreos.com"
echo "Checking CRD..." && kubectl get crd $RESOURCE 2>&1
echo "Checking API versions..." && kubectl api-versions | grep $(echo $RESOURCE | cut -d. -f2-)
echo "Checking RBAC..." && kubectl auth can-i get $RESOURCE --as=system:serviceaccount:argocd:argocd-application-controller -A
```

This error is always resolvable once you identify which of the above causes applies. Start by reading the full error message carefully - the resource type and API version tell you exactly where to look.
