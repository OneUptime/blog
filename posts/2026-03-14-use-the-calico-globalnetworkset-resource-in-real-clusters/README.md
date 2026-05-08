# Using the Calico GlobalNetworkSet Resource in Production Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes

Description: Practical patterns and real-world examples for using Calico GlobalNetworkSet resources effectively in production Kubernetes environments.

---

## Introduction

Knowing how to create a Calico GlobalNetworkSet resource is only the first step. Using it effectively in production requires understanding common patterns, combining it with other Calico resources, and adapting it to real-world scenarios.

This guide presents practical use cases for the GlobalNetworkSet resource, drawn from common production Kubernetes deployments. Each example includes guidance and an explanation of why the configuration is structured that way.

Whether you are running a small cluster or a large multi-tenant environment, these patterns will help you get the most out of the GlobalNetworkSet resource.

## Prerequisites

- A running Kubernetes cluster with Calico (v3.26+)
- `kubectl` and `calicoctl` installed
- Basic understanding of the GlobalNetworkSet resource fields (see our creation guide)

## Pattern 1: Default Configuration for Small Clusters

For clusters with fewer than 50 nodes, a straightforward GlobalNetworkSet layout works well:

```bash
# Verify current GlobalNetworkSet resources

calicoctl get globalnetworkset -o yaml

# Confirm the Calico CRD is installed
kubectl get crd globalnetworksets.crd.projectcalico.org
```

Start with clearly named sets that contain only the required CIDRs, and add labels that your policies can select. Premature splitting of GlobalNetworkSet resources often introduces complexity without benefit.

## Pattern 2: Multi-Environment Configuration

In clusters that run workloads across multiple environments (dev, staging, production), you can use GlobalNetworkSet labels and policy selectors to group external CIDRs by environment:

```bash
# Verify GlobalNetworkSet labels by environment
calicoctl get globalnetworkset -o wide

# Inspect the policies that select those labels
calicoctl get globalnetworkpolicy -o yaml | grep -A5 "selector"
```

Then reference these labels from Calico policy rule selectors to apply environment-specific allow or deny rules for those external networks.

## Pattern 3: High-Availability and Scale

For large clusters (100+ nodes), consider these adjustments:

```bash
# Monitor Calico component health across all nodes
kubectl get pods -n calico-system -o wide | grep -v Running

# Check resource utilization of calico-node
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=cpu
```

Key considerations at scale:
- Use simple, optimized selectors in policies that match GlobalNetworkSet labels
- Use Typha to reduce the number of direct datastore connections
- Monitor Felix metrics such as active selectors and label index metrics when managing many GlobalNetworkSet resources

## Pattern 4: Combining with Other Calico Resources

The GlobalNetworkSet resource works together with other Calico resources. Here is how to verify the combined effect:

```bash
# List all Calico resources in the cluster
kubectl get crds | grep projectcalico

# View all Calico configuration resources
calicoctl get globalnetworkset -o yaml
calicoctl get felixconfiguration -o yaml
calicoctl get ippools -o yaml
```

Always consider the interaction between resources. For example, changes to BGP resources affect how IPPool routes are advertised, and FelixConfiguration changes affect how policies are enforced.

## Monitoring the Resource in Production

Set up ongoing monitoring for your GlobalNetworkSet resources:

```bash
# Watch for changes to GlobalNetworkSet resources
kubectl get globalnetworksets.crd.projectcalico.org -w

# Set up alerts on calico-node restarts
kubectl get events -n calico-system --field-selector reason=BackOff --watch
```

Consider checking Felix metrics if you have Prometheus metrics enabled:

```bash
# Check whether Felix is exporting metrics
curl -s http://<node-ip>:9091/metrics | head
```

## Verification

After configuring the GlobalNetworkSet resource for your production use case, run a comprehensive check:

```bash
# Verify Calico system health
calicoctl node status

# Ensure all calico-node pods are healthy
kubectl get pods -n calico-system -l k8s-app=calico-node

# Run a connectivity test across nodes
kubectl run test-ping --image=busybox --rm -it --restart=Never -- ping -c 3 <pod-ip-on-different-node>
```

## Troubleshooting

**Resource configuration not taking effect:**
- Verify the resource is correctly applied: `calicoctl get globalnetworkset -o yaml`.
- Check Felix logs for policy or selector update messages.
- Ensure Typha is relaying updates: `kubectl logs -n calico-system -l k8s-app=calico-typha --tail=20`.

**Performance degradation after configuration change:**
- Check calico-node CPU and memory: `kubectl top pods -n calico-system`.
- Review whether policy selectors that reference GlobalNetworkSet labels are broader or more complex than needed.
- Consider enabling Typha if not already in use.

**Inconsistent behavior across nodes:**
- Verify policy selectors are matching the intended GlobalNetworkSet labels.
- Check whether policies are active on the endpoints where you expect them to apply.


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
kubectl auth can-i create globalnetworksets.crd.projectcalico.org
kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org

# Review recent Calico-related events
kubectl get events -n calico-system --sort-by='.lastTimestamp' | tail -20
```

### Capacity Planning for Large Deployments

For clusters with hundreds of nodes or thousands of pods, plan your Calico resource configurations carefully. Monitor resource consumption of calico-node and calico-typha pods, and scale Typha replicas based on the number of Felix instances. Use `calicoctl ipam show` and kube-controllers IPAM metrics to track IPAM utilization and plan IP pool expansions before reaching capacity limits.

```bash
# Monitor IPAM utilization
calicoctl ipam show

# Check calico-node resource consumption
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=memory
```

## Conclusion

Effective use of the Calico GlobalNetworkSet resource in production comes down to starting simple, monitoring the impact of changes, and combining it thoughtfully with other Calico resources. Keep your configurations in version control, document the reasoning behind non-default settings, and always validate changes in a staging environment first.
