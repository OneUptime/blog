# Configuring Calico Typha for Kubernetes Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha

Description: A practical guide to configuring Calico Typha deployment settings, resource limits, and performance tuning for production clusters.

---

## Introduction

Typha sits between the Kubernetes API server and Calico's Felix agents, caching and distributing datastore updates efficiently. While Typha works well with its defaults, operators running large or latency-sensitive clusters often need to tune its configuration.

This guide covers Typha's configurable parameters, how to adjust them for different cluster sizes, and how to validate that your configuration is performing well.

Getting Typha configuration right prevents datastore overload, reduces Felix sync latency, and ensures that network policy updates propagate quickly across all nodes.

## Prerequisites

- Kubernetes cluster with Calico (v3.26+) using the Tigera operator
- `kubectl` with cluster-admin access
- Typha deployed (automatic with operator-based installs for 50+ nodes)

## Typha Configuration via Environment Variables

Typha is configured through environment variables on the Typha deployment. The Tigera operator manages these, but you can inspect them:

```bash
# View current Typha environment variables
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A2 "name: TYPHA_"
```

Key configuration variables:

```yaml
# Core settings
- name: TYPHA_LOGSEVERITYSCREEN
  value: "Info"
- name: TYPHA_CONNECTIONREBALANCINGENABLED
  value: "true"
- name: TYPHA_MAXCONNECTIONSLOWERLIMIT
  value: "300"
- name: TYPHA_HEALTHENABLED
  value: "true"
- name: TYPHA_HEALTHPORT
  value: "9098"
- name: TYPHA_PROMETHEUSMETRICSENABLED
  value: "true"
- name: TYPHA_PROMETHEUSMETRICSPORT
  value: "9093"
```

## Tuning Connection Limits

Typha's connection settings control how many Felix instances each replica serves. If any single Typha pod is serving more than 150 connections, consider adding replicas. Connection rebalancing (enabled by default) helps distribute Felix connections evenly across Typha replicas when new replicas are added.

## Resource Limits

Set appropriate resource requests and limits for Typha pods:

```bash
# View current resource configuration
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A10 "resources"
```

Recommended resource settings by cluster size:

| Cluster Size | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| 50-100 nodes | 100m | 500m | 128Mi | 256Mi |
| 100-500 nodes | 200m | 1000m | 256Mi | 512Mi |
| 500+ nodes | 500m | 2000m | 512Mi | 1Gi |

## Configuring via the Tigera Operator

If using the Tigera operator, configure Typha through the Installation resource:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  typhaDeployment:
    spec:
      template:
        spec:
          containers:
            - name: calico-typha
              resources:
                requests:
                  cpu: 200m
                  memory: 256Mi
                limits:
                  cpu: 1000m
                  memory: 512Mi
```

Apply with:

```bash
kubectl apply -f installation.yaml
```

## Verification

After modifying Typha configuration, verify the changes took effect:

```bash
# Confirm pods restarted with new config
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide

# Verify Typha is healthy
kubectl exec -n calico-system <typha-pod> -- wget -qO- http://localhost:9098/liveness

# Check Felix is connected and syncing
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=10 | grep -i "in-sync"
```

## Troubleshooting

**Typha pods not starting after configuration change:**
- Check for invalid environment variable values: `kubectl describe pod -n calico-system <typha-pod>`.
- Look for operator reconciliation errors: `kubectl logs -n tigera-operator -l k8s-app=tigera-operator --tail=20`.

**Felix reporting sync delays:**
- Check Typha connection counts -- pods may be overloaded.
- Verify Typha has enough CPU and memory.
- Check network latency between calico-node and Typha pods.

**Prometheus metrics not available:**
- Verify `TYPHA_PROMETHEUSMETRICSENABLED` is `true`.
- Check that port 9093 is not blocked by network policies.


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

Typha configuration tuning is mainly about scaling connections and resource limits to match your cluster size. Start with the defaults, monitor connection counts and resource usage, and scale as needed. Use the Tigera operator's Installation resource for configuration changes to ensure they persist across upgrades.
