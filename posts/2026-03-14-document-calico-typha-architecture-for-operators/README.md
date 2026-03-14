# Understanding Calico Typha Architecture for Kubernetes Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha

Description: An operator-focused guide to Calico Typha's role in the architecture, how it scales datastore access, and when to deploy it.

---

## Introduction

Typha is a Calico component that sits between the datastore (Kubernetes API server or etcd) and the Felix agents running on each node. Its primary purpose is to reduce the load on the datastore by fanning out updates to multiple Felix instances through a single connection.

For operators managing clusters with more than 50 nodes, Typha is not optional -- it is essential for stable operation. Without Typha, every calico-node pod opens its own watch connection to the Kubernetes API server, which can overwhelm the API server at scale.

This guide explains Typha's architecture, when you need it, how to size it, and how to monitor it in production.

## Prerequisites

- A Kubernetes cluster running Calico (v3.26+)
- `kubectl` with cluster-admin access
- Understanding of Kubernetes API server watch mechanics

## How Typha Works

Typha acts as a caching proxy for the Calico datastore:

1. Typha opens a small number of watch connections to the Kubernetes API server.
2. It caches the current state of all Calico resources.
3. Felix instances connect to Typha instead of directly to the API server.
4. When a resource changes, Typha fans out the update to all connected Felix instances.

This architecture reduces API server connections from N (one per node) to a small fixed number (one per Typha replica).

```bash
# Check if Typha is deployed
kubectl get deployment -n calico-system calico-typha

# View Typha pods
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide
```

## When to Deploy Typha

| Cluster Size | Typha Needed | Recommended Replicas |
|---|---|---|
| Under 50 nodes | Optional | 1 (if deployed) |
| 50-200 nodes | Recommended | 2-3 |
| 200-500 nodes | Required | 3-5 |
| 500+ nodes | Required | 5+ |

Calico's operator-based installation automatically deploys Typha and scales its replica count based on the number of nodes.

## Typha Deployment Architecture

Typha runs as a Kubernetes Deployment with anti-affinity rules to spread replicas across nodes:

```bash
# View Typha deployment details
kubectl describe deployment -n calico-system calico-typha

# Check anti-affinity configuration
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A20 "affinity"
```

Each Typha replica can handle approximately 100-200 Felix connections. The connection is persistent and uses a custom protocol optimized for Calico's update patterns.

## Verifying Typha Health

```bash
# Check Typha pod status
kubectl get pods -n calico-system -l k8s-app=calico-typha

# View Typha logs for connection counts
kubectl logs -n calico-system -l k8s-app=calico-typha --tail=30

# Verify Felix is connected to Typha (check Felix logs)
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=20 | grep -i typha
```

## Monitoring Typha in Production

Typha exposes Prometheus metrics on port 9093 by default:

```bash
# Check Typha metrics directly
kubectl exec -n calico-system <typha-pod> -- wget -qO- http://localhost:9093/metrics | head -30
```

Key metrics to monitor:
- `typha_connections_accepted`: Total connections from Felix instances
- `typha_connections_dropped`: Connections that were dropped (indicates scaling issues)
- `typha_cache_size`: Number of cached resources
- `typha_updates_skipped`: Updates that were deduplicated

## Scaling Typha

If you see connection drops or high latency in Felix syncing, scale Typha:

```bash
# Scale Typha replicas
kubectl scale deployment -n calico-system calico-typha --replicas=5

# Verify new replicas are ready
kubectl get pods -n calico-system -l k8s-app=calico-typha -w
```

## Troubleshooting

**Felix cannot connect to Typha:**
- Verify Typha pods are running: `kubectl get pods -n calico-system -l k8s-app=calico-typha`.
- Check the Typha service: `kubectl get svc -n calico-system calico-typha`.
- Verify network policies are not blocking calico-node to Typha communication.

**API server load still high with Typha:**
- Ensure Felix is actually connecting through Typha (check Felix logs).
- Verify the `FELIX_TYPHADDR` environment variable is set in calico-node pods.

**Typha pods OOMKilled:**
- Increase memory limits for Typha if managing very large numbers of Calico resources.
- Check `typha_cache_size` metric to understand memory usage.


## Additional Considerations

### Multi-Cluster Environments

If you operate multiple Kubernetes clusters with Calico, standardize your configurations across clusters. Use a central repository for Calico resource manifests and deploy them consistently using your CI/CD pipeline. This prevents configuration drift and makes it easier to troubleshoot issues that may be cluster-specific.

```bash
# Compare Calico configurations across clusters
# Export from each cluster and diff
KUBECONFIG=cluster-1.kubeconfig calicoctl get felixconfiguration -o yaml > cluster1-felix.yaml
KUBECONFIG=cluster-2.kubeconfig calicoctl get felixconfiguration -o yaml > cluster2-felix.yaml
diff cluster1-felix.yaml cluster2-felix.yaml
```

### Upgrade Compatibility

Before upgrading Calico, always check the release notes for breaking changes to resource specifications. Some fields may be deprecated, renamed, or have changed semantics between versions. Test upgrades in a staging environment that mirrors your production Calico configuration.

```bash
# Check current Calico version
calicoctl version

# Review installed CRD versions
kubectl get crds | grep projectcalico | awk '{print $1, $2}'
```

### Security Hardening

Apply the principle of least privilege to Calico configurations. Limit who can modify Calico resources using Kubernetes RBAC, and audit changes using the Kubernetes audit log. Consider using admission webhooks to validate Calico resource changes before they are applied.

```bash
# Check who has permissions to modify Calico resources
kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org --all-namespaces --list

# Review recent changes to Calico resources (if audit logging is enabled)
kubectl get events -n calico-system --sort-by='.lastTimestamp' | tail -20
```

### Capacity Planning for Large Deployments

For clusters with hundreds of nodes or thousands of pods, plan your Calico resource configurations carefully. Monitor resource consumption of calico-node and calico-typha pods, and scale Typha replicas based on the number of Felix instances. Use the Calico metrics endpoint to track IPAM utilization and plan IP pool expansions before reaching capacity limits.

```bash
# Monitor IPAM utilization
calicoctl ipam show

# Check calico-node resource consumption
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=memory
```

## Conclusion

Typha is a critical scaling component in Calico's architecture. For any cluster beyond a handful of nodes, it reduces API server load and improves the reliability of policy updates. Monitor its connection counts and resource usage as part of your standard cluster health checks.
