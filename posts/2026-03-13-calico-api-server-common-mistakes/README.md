# Common Mistakes with the Calico API Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, API Server, Troubleshooting, Kubernetes, Best Practices

Description: Learn the most common mistakes teams make when deploying and managing the Calico API server, and how to avoid or fix each one.

---

## Introduction

The Calico API server extends the Kubernetes API with Calico-specific resources, but it is often misconfigured or misunderstood. Teams frequently encounter issues ranging from 503 errors when querying Calico resources to RBAC misconfigurations that silently deny legitimate requests.

Understanding common failure modes helps you build a more robust Calico deployment and resolve issues faster when they do occur. This post covers the mistakes that appear most frequently in production environments and in support escalations.

Most of these mistakes stem from not treating the Calico API server with the same operational rigor as other critical Kubernetes components. Applying the same availability, RBAC, and monitoring standards you use for other API services will prevent most of these issues.

## Prerequisites

- Kubernetes cluster with Calico and the Calico API server deployed
- `kubectl` with cluster-admin access
- `calicoctl` CLI configured
- Basic understanding of Kubernetes aggregated API servers

## Step 1: Mistake — Running a Single Replica in Production

A single API server replica means that any node failure or pod eviction takes down all Calico API access, blocking network policy management.

```bash
# Check if you are running only one replica (common mistake)
kubectl get deployment calico-apiserver -n calico-apiserver \
  -o jsonpath='{.spec.replicas}'

# If the result is 1, patch to increase replicas
kubectl patch apiserver default \
  --type='merge' \
  -p '{"spec":{"apiServerDeployment":{"spec":{"replicas":2}}}}'

# Verify both replicas come up healthy
kubectl get pods -n calico-apiserver
```

## Step 2: Mistake — Forgetting to Check TigeraStatus

Teams often debug raw pod logs without first checking TigeraStatus, which provides a structured summary of all Calico component health.

```bash
# Always start debugging with TigeraStatus
kubectl get tigerastatus

# Get detailed conditions for the API server component
kubectl describe tigerastatus apiserver

# A degraded API server will show conditions like:
# Type: Degraded
# Status: True
# Reason: PodFailure
# Message: Pod calico-apiserver-xxx is not running
```

## Step 3: Mistake — Incorrect KUBECONFIG or Datastore Configuration

The Calico API server needs to reach the Kubernetes API. A misconfigured kubeconfig or missing service account token causes authentication failures.

```bash
# Check if the API server pod can reach the Kubernetes API
kubectl logs -n calico-apiserver \
  -l k8s-app=calico-apiserver --tail=50 | grep -i "error\|fail\|warn"

# Verify the service account token is mounted
kubectl exec -n calico-apiserver \
  "$(kubectl get pod -n calico-apiserver -l k8s-app=calico-apiserver -o name | head -1)" \
  -- ls /var/run/secrets/kubernetes.io/serviceaccount/

# Confirm the API service is registered and available
kubectl get apiservice v3.projectcalico.org
```

## Step 4: Mistake — Not Validating API Extension Registration

After installing the Calico API server, teams sometimes proceed without verifying that the API extension was properly registered, leading to confusing "resource not found" errors later.

```bash
# Verify the Calico API group is registered
kubectl api-versions | grep projectcalico

# Expected output: projectcalico.org/v3

# Test that you can list Calico resources through the aggregated API
kubectl get networkpolicies.projectcalico.org --all-namespaces

# Check the API service status - it should show Available=True
kubectl get apiservice v3.projectcalico.org \
  -o jsonpath='{.status.conditions}' | jq .
```

## Step 5: Mistake — Using kubectl Instead of calicoctl for Complex Queries

While kubectl works for simple Calico resource operations, complex queries involving Calico-specific fields and selectors require `calicoctl`.

```bash
# MISTAKE: Using kubectl with Calico label selectors (may not work as expected)
# kubectl get networkpolicies -l projectcalico.org/selector=...

# CORRECT: Use calicoctl for Calico-specific query patterns
# List all global network policies
calicoctl get globalnetworkpolicies -o wide

# Get detailed policy with Calico-specific fields rendered correctly
calicoctl get networkpolicy -n default my-policy -o yaml

# Verify Felix is applying the policies from the API server
calicoctl get felixconfiguration default -o yaml
```

## Best Practices

- Run at least two API server replicas with pod anti-affinity to different nodes
- Always check TigeraStatus before diving into raw pod logs
- Monitor the API service endpoint availability with regular synthetic checks
- Use `calicoctl` for operations that require Calico-specific field handling
- Set resource requests and limits to prevent the API server from being OOM-killed

## Conclusion

The most impactful Calico API server mistakes are single-replica deployments, skipping TigeraStatus checks during debugging, and not validating API extension registration after installation. By running multiple replicas, monitoring component health through TigeraStatus, and using the right CLI tool for each operation, you avoid the majority of API server incidents.
