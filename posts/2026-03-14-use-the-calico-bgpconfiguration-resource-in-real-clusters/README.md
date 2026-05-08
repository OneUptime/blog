# Using the Calico BGPConfiguration Resource in Production Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP

Description: Practical patterns and real-world examples for using Calico BGPConfiguration resources effectively in production Kubernetes environments.

---

## Introduction

Knowing how to create a Calico BGPConfiguration resource is only the first step. Using it effectively in production requires understanding common patterns, combining it with other Calico resources, and adapting it to real-world scenarios.

This guide presents practical use cases for the BGPConfiguration resource, drawn from common production Kubernetes deployments. Each example includes guidance and an explanation of why the configuration is structured that way.

Whether you are running a small cluster or a large multi-tenant environment, these patterns will help you get the most out of the BGPConfiguration resource.

## Prerequisites

- A running Kubernetes cluster with Calico (v3.26+)
- `kubectl` and `calicoctl` installed
- Basic understanding of the BGPConfiguration resource fields (see our creation guide)

## Pattern 1: Default Configuration for Small Clusters

For clusters with fewer than 50 nodes, a straightforward BGPConfiguration configuration works well:

```bash
# Verify current BGPConfiguration resources

calicoctl get bgpconfiguration -o yaml

# Check Calico's BGP configuration for a specific node
calicoctl get node <node-name> -o yaml
```

Start with the defaults and only customize fields when you have a measured reason to change them. Premature optimization of Calico resources often introduces complexity without benefit.

## Pattern 2: Multi-Environment Configuration

In clusters that run workloads across multiple environments (dev, staging, production), you can use node selectors and labels to apply different configurations:

```bash
# Label nodes by environment
kubectl label node worker-1 environment=production
kubectl label node worker-2 environment=staging

# Verify labels
kubectl get nodes --show-labels | grep environment
```

Then reference these labels in related Calico resources that support selectors, such as `BGPPeer` or `IPPool`, to apply environment-specific peering or address-pool behavior. For BGPConfiguration itself, use the global `default` resource or `node.<nodename>` resources for the node-specific fields that BGPConfiguration supports.

## Pattern 3: High-Availability and Scale

For large clusters (100+ nodes), consider these adjustments:

```bash
# Monitor Calico component health across all nodes
kubectl get pods -n calico-system -o wide | grep -v Running

# Check resource utilization of calico-node
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=cpu
```

Key considerations at scale:
- Avoid frequent churn in BGP resources unless you have measured a need for it
- Use Typha to reduce the number of direct datastore connections
- Monitor memory usage of calico-node pods when managing large routing tables or many BGP peers

## Pattern 4: Combining with Other Calico Resources

The BGPConfiguration resource works together with other Calico resources. Here is how to verify the combined effect:

```bash
# List all Calico resources in the cluster
kubectl get crds | grep projectcalico

# View all Calico configuration resources
calicoctl get bgpconfiguration -o yaml
calicoctl get felixconfiguration -o yaml
calicoctl get ippools -o yaml
```

Always consider the interaction between resources. For example, BGP resources affect how workload and service routes are advertised, IPPool settings such as `disableBGPExport` affect pod CIDR advertisement, and FelixConfiguration changes affect how policies are enforced.

## Monitoring the Resource in Production

Set up ongoing monitoring for your BGPConfiguration resources:

```bash
# Watch for changes to BGPConfiguration resources
kubectl get bgpconfiguration.projectcalico.org -w

# Set up alerts on calico-node restarts
kubectl get events -n calico-system --field-selector reason=BackOff --watch
```

Consider checking Felix health endpoints if Felix health checks are enabled:

```bash
# Check if Felix is reporting healthy
curl -s http://<node-ip>:9099/liveness
curl -s http://<node-ip>:9099/readiness
```

## Verification

After configuring the BGPConfiguration resource for your production use case, run a comprehensive check:

```bash
# Verify Calico BGP status from a Calico node
calicoctl node status

# Ensure all calico-node pods are healthy
kubectl get pods -n calico-system -l k8s-app=calico-node

# Run a connectivity test across nodes
kubectl run test-ping --image=busybox --rm -it --restart=Never -- ping -c 3 <pod-ip-on-different-node>
```

## Troubleshooting

**Resource configuration not taking effect:**
- Verify the resource is correctly applied: `calicoctl get bgpconfiguration -o yaml`.
- Check calico-node logs for BGP configuration or BIRD/confd messages.
- If Typha is enabled, ensure Typha is relaying updates: `kubectl logs -n calico-system -l k8s-app=calico-typha --tail=20`.

**Performance degradation after configuration change:**
- Check calico-node CPU and memory: `kubectl top pods -n calico-system`.
- Review whether BGP resource changes are happening too frequently.
- Consider enabling Typha if not already in use.

**Inconsistent behavior across nodes:**
- Verify selectors on related resources, such as BGPPeer and IPPool, are matching the intended nodes.
- Check for node-specific BGPConfiguration resources and Calico Node `spec.bgp` overrides.


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
kubectl auth can-i update bgpconfigurations.projectcalico.org
kubectl auth can-i update bgppeers.projectcalico.org

# Review recent Calico namespace events; use Kubernetes audit logs for resource-change auditing
kubectl get events -n calico-system --sort-by='.lastTimestamp' | tail -20
```

### Capacity Planning for Large Deployments

For clusters with hundreds of nodes or thousands of pods, plan your Calico resource configurations carefully. Monitor resource consumption of calico-node and calico-typha pods, and scale Typha replicas based on the number of Felix instances. Use Calico IPAM reporting to track IP address utilization and plan IP pool expansions before reaching capacity limits.

```bash
# Monitor IPAM utilization
calicoctl ipam show

# Check calico-node resource consumption
kubectl top pods -n calico-system -l k8s-app=calico-node --sort-by=memory
```

## Conclusion

Effective use of the Calico BGPConfiguration resource in production comes down to starting simple, monitoring the impact of changes, and combining it thoughtfully with other Calico resources. Keep your configurations in version control, document the reasoning behind non-default settings, and always validate changes in a staging environment first.
