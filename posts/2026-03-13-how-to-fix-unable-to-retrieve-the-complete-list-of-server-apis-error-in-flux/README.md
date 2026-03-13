# How to Fix unable to retrieve the complete list of server APIs Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, API Server, CRD, API Discovery

Description: Learn how to diagnose and fix the 'unable to retrieve the complete list of server APIs' error in Flux caused by broken API service registrations or missing CRDs.

---

When Flux attempts to reconcile resources, you may encounter:

```text
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': unable to retrieve the complete list of server APIs: metrics.k8s.io/v1beta1: the server is currently unable to handle the request
```

or:

```text
unable to retrieve the complete list of server APIs: custom.metrics.k8s.io/v1beta1: an error on the server ("") has prevented the request from succeeding
```

This error occurs when the Kubernetes API server cannot complete API discovery because one or more registered API services are unavailable. It prevents Flux from discovering which resource types are available in the cluster.

## Root Causes

### 1. Unavailable APIService Backends

An APIService resource is registered in the cluster (such as `metrics.k8s.io/v1beta1` from metrics-server), but the backend service or pod is not running or not healthy.

### 2. Deleted CRDs with Stale APIService Registrations

A Custom Resource Definition or its associated API service was partially removed, leaving behind a broken registration.

### 3. Failing Aggregated API Servers

Aggregated API servers (like metrics-server, custom-metrics-adapter, or API extensions) that are unhealthy will cause API discovery to fail.

### 4. Webhook Conversion Failures

CRDs with conversion webhooks that are unavailable will cause API discovery for those groups to fail.

## Diagnostic Steps

### Step 1: List All APIServices and Their Status

```bash
kubectl get apiservices | grep -v Available
```

This shows only APIServices that are not in the `Available` state.

### Step 2: Describe Failing APIServices

```bash
kubectl get apiservices | grep False
```

For each failing APIService:

```bash
kubectl describe apiservice v1beta1.metrics.k8s.io
```

### Step 3: Check the Backend Service

```bash
kubectl get endpoints metrics-server -n kube-system
kubectl get pods -n kube-system -l k8s-app=metrics-server
```

### Step 4: Check Flux Controller Logs

```bash
kubectl logs -n flux-system deploy/kustomize-controller --since=5m | grep "unable to retrieve"
```

### Step 5: List All Registered API Groups

```bash
kubectl api-resources 2>&1 | grep -i error
```

## How to Fix

### Fix 1: Fix the Failing Backend Service

If metrics-server is the issue, check its deployment:

```bash
kubectl get deployment metrics-server -n kube-system
kubectl describe deployment metrics-server -n kube-system
kubectl logs -n kube-system deploy/metrics-server --tail=50
```

Common fixes include ensuring the metrics-server has the correct TLS configuration:

```bash
kubectl patch deployment metrics-server -n kube-system --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

### Fix 2: Remove Stale APIService Registrations

If the backend for an APIService no longer exists and is not needed, remove the APIService:

```bash
kubectl delete apiservice v1beta1.custom.metrics.k8s.io
```

Only do this if you are certain the API service is no longer needed.

### Fix 3: Reinstall the Failing Component

If metrics-server was partially uninstalled, reinstall it:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Fix 4: Set APIService Availability Condition

For APIServices that are not critical, you can mark them as not available so they do not block discovery:

```bash
kubectl get apiservices -o name | while read api; do
  available=$(kubectl get $api -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
  if [ "$available" = "False" ]; then
    echo "$api is not available"
  fi
done
```

### Fix 5: Force Flux Reconciliation

Once the API services are fixed:

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

Include health checks for all aggregated API services in your cluster monitoring. Ensure that metrics-server and any custom API services are deployed with high availability. When uninstalling components that register APIServices, always clean up the APIService resources as part of the removal process.
