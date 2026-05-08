# Using the Calico StagedKubernetesNetworkPolicy Resource in Production Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policy

Description: Practical patterns and real-world examples for using Calico StagedKubernetesNetworkPolicy resources effectively in production Kubernetes environments.

---

## Introduction

Knowing how to create a Calico StagedKubernetesNetworkPolicy resource is only the first step. Using it effectively in production requires understanding common patterns, combining it with other Calico resources, and adapting it to real-world scenarios.

This guide presents practical use cases for the StagedKubernetesNetworkPolicy resource, drawn from common production Kubernetes deployments. Each example includes guidance and an explanation of why the configuration is structured that way.

Whether you are running a small cluster or a large multi-tenant environment, these patterns will help you get the most out of the StagedKubernetesNetworkPolicy resource.

## Prerequisites

- A running Kubernetes cluster with Calico (v3.26+)
- `kubectl` and `calicoctl` installed
- Basic understanding of the StagedKubernetesNetworkPolicy resource fields (see our creation guide)

## Pattern 1: Default Configuration for Small Clusters

For clusters with fewer than 50 nodes, a straightforward StagedKubernetesNetworkPolicy configuration works well:

```bash
# Verify current StagedKubernetesNetworkPolicy resources
kubectl get stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces -o yaml

# Inspect a specific staged policy before creating the enforced NetworkPolicy
kubectl describe stagedkubernetesnetworkpolicy.projectcalico.org <policy-name> -n <namespace>
```

Start with the defaults and only customize fields when you have a measured reason to change them. Premature optimization of Calico resources often introduces complexity without benefit.

## Pattern 2: Multi-Environment Configuration

In clusters that run workloads across multiple environments (dev, staging, production), you can use namespace labels and Kubernetes NetworkPolicy selectors to scope staged policies:

```bash
# Label namespaces by environment
kubectl label namespace production environment=production
kubectl label namespace staging environment=staging

# Verify labels
kubectl get namespaces --show-labels | grep environment
```

Then reference these labels in your StagedKubernetesNetworkPolicy manifest's `namespaceSelector` peers, and use `podSelector` to select the workloads in the policy's namespace.

## Pattern 3: High-Availability and Scale

For large clusters (100+ nodes), consider these adjustments:

```bash
# Monitor Calico component health across all nodes
kubectl get pods -n calico-system -o wide | grep -v Running

# Check resource utilization of calico-node
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=cpu
```

Key considerations at scale:
- Keep staged policies targeted with `podSelector` and `namespaceSelector` so Felix evaluates only the intended workloads
- Use Typha to reduce the number of direct datastore connections
- Monitor memory usage of calico-node pods when managing many StagedKubernetesNetworkPolicy resources

## Pattern 4: Combining with Other Calico Resources

The StagedKubernetesNetworkPolicy resource works together with other Calico resources. Here is how to verify the combined effect:

```bash
# List all Calico resources in the cluster
kubectl get crds | grep projectcalico

# View all Calico configuration resources
kubectl get stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces -o yaml
calicoctl get felixconfiguration -o yaml
calicoctl get ippools -o yaml
```

Always consider the interaction between resources. For example, changes to BGP resources affect how IPPool routes are advertised, and FelixConfiguration changes affect how policies are enforced.

## Monitoring the Resource in Production

Set up ongoing monitoring for your StagedKubernetesNetworkPolicy resources:

```bash
# Watch for changes to StagedKubernetesNetworkPolicy resources
kubectl get stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces -w

# Set up alerts on calico-node restarts
kubectl get events -n calico-system --field-selector reason=BackOff --watch
```

Consider checking Felix health endpoints if Felix health checks are enabled and the health server is reachable from where you run the command:

```bash
# Check if Felix is reporting healthy
curl -s http://localhost:9099/liveness
curl -s http://localhost:9099/readiness
```

## Verification

After configuring the StagedKubernetesNetworkPolicy resource for your production use case, run a comprehensive check:

```bash
# Verify the local Calico node process and BGP peering status
calicoctl node status

# Ensure all calico-node pods are healthy
kubectl get pods -n calico-system -l k8s-app=calico-node

# Run a connectivity test across nodes
kubectl run test-ping --image=busybox --rm -it --restart=Never -- ping -c 3 <pod-ip-on-different-node>
```

## Troubleshooting

**Resource configuration not taking effect:**
- Verify the resource is correctly applied: `kubectl get stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces -o yaml`.
- Check Felix logs for policy update messages.
- Ensure Typha is relaying updates: `kubectl logs -n calico-system -l k8s-app=calico-typha --tail=20`.

**Performance degradation after configuration change:**
- Check calico-node CPU and memory: `kubectl top pods -n calico-system`.
- Review whether staged policy count or selector complexity increased unexpectedly.
- Consider enabling Typha if not already in use.

**Inconsistent behavior across nodes:**
- Verify `podSelector` and `namespaceSelector` values are matching the intended workloads.
- Check for node-specific FelixConfiguration overrides.


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
kubectl auth can-i create stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces
kubectl auth can-i --list --all-namespaces | grep projectcalico.org

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

Effective use of the Calico StagedKubernetesNetworkPolicy resource in production comes down to starting simple, monitoring the impact of changes, and combining it thoughtfully with other Calico resources. Keep your configurations in version control, document the reasoning behind non-default settings, and always validate changes in a staging environment first.
