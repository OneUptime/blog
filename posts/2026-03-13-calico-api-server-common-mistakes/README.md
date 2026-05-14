# Common Mistakes with the Calico API Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, API Server, CNI, Troubleshooting

Description: Learn the most common mistakes teams make when deploying and managing the Calico API server, and how to avoid or fix each one.

---

## Introduction

The Calico API server extends the Kubernetes API with Calico-specific resources, but it is often misconfigured or misunderstood. Teams frequently encounter issues ranging from 503 errors when querying Calico resources to RBAC misconfigurations that deny legitimate requests.

In current Calico releases, the aggregated API server is deprecated and planned for removal in a future release. New installations should use native v3 CRDs instead, but existing clusters that still run the Calico API server need to operate it carefully.

Understanding common failure modes helps you build a more robust Calico deployment and resolve issues faster when they do occur. This post covers the mistakes that appear most frequently in production environments and in support escalations.

Most of these mistakes stem from not treating the Calico API server with the same operational rigor as other critical Kubernetes components. Applying the same availability, RBAC, and monitoring standards you use for other API services will prevent most of these issues.

## Prerequisites

- Kubernetes cluster with Calico and the Calico API server deployed
- `kubectl` with cluster-admin access
- `calicoctl` CLI configured
- Basic understanding of Kubernetes aggregated API servers
- Commands below use the `calico-apiserver` namespace used by the manifest install; operator-managed clusters commonly run the deployment in `calico-system`

## Step 1: Mistake - Running a Single Replica in Production

A single API server replica means that any node failure or pod eviction takes down all Calico API access, blocking network policy management.

```bash
# Check if you are running only one replica (common mistake)
kubectl get deployment -A -l k8s-app=calico-apiserver \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,REPLICAS:.spec.replicas

# For operator-managed installs, set the HA replica count
kubectl patch installation default \
  --type='merge' \
  -p '{"spec":{"controlPlaneReplicas":2}}'

# For manifest-based installs, scale the Deployment directly
kubectl scale deployment/calico-apiserver -n calico-apiserver --replicas=2

# Verify both replicas come up healthy
kubectl get pods -A -l k8s-app=calico-apiserver
```

## Step 2: Mistake - Forgetting to Check TigeraStatus

On operator-managed installations, teams often debug raw pod logs without first checking TigeraStatus, which provides a structured summary of Calico component health.

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

## Step 3: Mistake - Incorrect Kubernetes API Access or Datastore Configuration

The Calico API server needs to reach the Kubernetes API, and the manifest-based API server is intended for clusters using the Kubernetes API datastore. A missing service account token, certificate secret, or incorrect datastore configuration causes authentication and startup failures.

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

## Step 4: Mistake - Not Validating API Extension Registration

After installing the Calico API server, teams sometimes proceed without verifying that the API extension was properly registered, leading to confusing "resource not found" errors later.

```bash
# Verify the Calico API resources are registered
kubectl api-resources --api-group=projectcalico.org

# Test that you can list Calico resources through the aggregated API
kubectl get networkpolicies.projectcalico.org --all-namespaces

# Check the API service status - it should show Available=True
kubectl get apiservice v3.projectcalico.org \
  -o json | jq '.status.conditions[] | select(.type == "Available")'
```

## Step 5: Mistake - Expecting kubectl to Replace Every calicoctl Command

With the Calico API server or native v3 CRDs, `kubectl` can manage `projectcalico.org/v3` resources directly. However, `calicoctl` is still required for some Calico-specific operational commands, including `node`, `ipam`, `convert`, and `version`.

```bash
# MISTAKE: Assuming kubectl replaces every calicoctl workflow
# kubectl does not provide calicoctl ipam, node, convert, or version subcommands

# List all global network policies
calicoctl get globalnetworkpolicies -o wide

# Get detailed policy output with calicoctl
calicoctl get networkpolicy -n default my-policy -o yaml

# Inspect Felix configuration
calicoctl get felixconfiguration default -o yaml
```

## Best Practices

- Run at least two API server replicas with pod anti-affinity to different nodes
- On operator-managed clusters, check TigeraStatus before diving into raw pod logs
- Monitor the API service endpoint availability with regular synthetic checks
- Use `calicoctl` for operations that require Calico-specific subcommands
- Set resource requests and limits to prevent the API server from being OOM-killed

## Conclusion

The most impactful Calico API server mistakes are single-replica deployments, skipping TigeraStatus checks on operator-managed clusters during debugging, and not validating API extension registration after installation. By running multiple replicas, monitoring component health through TigeraStatus where available, and using the right CLI tool for each operation, you avoid the majority of API server incidents.
