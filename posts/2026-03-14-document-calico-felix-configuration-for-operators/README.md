# Documenting Calico Felix Configuration for Kubernetes Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Felix

Description: A comprehensive operator reference for Calico Felix configuration parameters, their impact, and recommended production settings.

---

## Introduction

Felix is the primary dataplane agent in Calico. It runs on every node and is responsible for programming routes, ACLs, and network policy rules into the Linux kernel. For operators, understanding Felix configuration is essential because it directly controls how traffic flows through your cluster.

This guide serves as an operator reference for Felix configuration. It covers the most important parameters, explains their impact on cluster behavior, and provides recommended settings for production deployments.

Misconfiguring Felix can cause pod connectivity failures, performance degradation, or security gaps. This document helps you avoid those pitfalls by explaining each parameter in context.

## Prerequisites

- Calico installed on a Kubernetes cluster (v3.26+)
- `kubectl` and `calicoctl` available
- Familiarity with Linux networking concepts (iptables, routing, eBPF)

## Felix Configuration Resource Overview

Felix is configured through the FelixConfiguration custom resource:

```bash
# View the current Felix configuration
calicoctl get felixconfiguration default -o yaml
```

The default resource applies to all nodes. You can create node-specific overrides by creating FelixConfiguration resources with names matching node hostnames.

## Key Configuration Parameters

### Dataplane Mode

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: false
```

- `bpfEnabled: false` uses the standard iptables dataplane (default and most battle-tested).
- `bpfEnabled: true` switches to the eBPF dataplane, which provides better performance and avoids kube-proxy, but requires Linux kernel 5.3+ (5.8+ strongly recommended for CO-RE support).

### Encapsulation Settings

```yaml
spec:
  ipipEnabled: true
  vxlanEnabled: false
```

- Enable only one encapsulation mode at a time.
- IPIP has lower overhead but requires protocol 4 to be allowed by your network.
- VXLAN works on any network that allows UDP but has slightly higher overhead.

### Logging and Diagnostics

```yaml
spec:
  logSeverityScreen: Info
  reportingInterval: 30s
  healthEnabled: true
  healthPort: 9099
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
```

Production recommendation: Set `logSeverityScreen` to `Warning` to reduce log volume. Enable Prometheus metrics for monitoring.

### Security Settings

```yaml
spec:
  defaultEndpointToHostAction: Drop
  failsafeInboundHostPorts:
    - protocol: tcp
      port: 22
    - protocol: tcp
      port: 10250
  failsafeOutboundHostPorts:
    - protocol: udp
      port: 53
    - protocol: tcp
      port: 443
```

- `defaultEndpointToHostAction: Drop` prevents pods from accessing host services unless explicitly allowed.
- Failsafe ports are always allowed even when host endpoint policies are applied. Always include SSH (22) and kubelet (10250).

## Node-Specific Overrides

Create a FelixConfiguration named after a specific node to override settings for that node only:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: worker-node-1
spec:
  logSeverityScreen: Debug
```

This is useful for debugging issues on a specific node without increasing log volume cluster-wide.

## Verification

```bash
# Verify Felix is running and healthy on all nodes
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide

# Check Felix health endpoint
kubectl exec -n calico-system <calico-node-pod> -c calico-node -- calico-node -felix-live

# Verify Prometheus metrics are exposed
kubectl exec -n calico-system <calico-node-pod> -c calico-node -- wget -qO- http://localhost:9091/metrics | head -20
```

## Troubleshooting

**Felix crashlooping after configuration change:**
- Check the Felix container logs: `kubectl logs -n calico-system <pod> -c calico-node`.
- Revert to backup configuration immediately.
- Common cause: invalid field values or incompatible combinations (e.g., IPIP + VXLAN both enabled).

**High CPU usage on calico-node:**
- Check if `reportingInterval` is too low.
- Verify `logSeverityScreen` is not set to Debug in production.
- Consider enabling eBPF mode for better performance at scale.

**Pods cannot reach host services:**
- Check `defaultEndpointToHostAction` setting.
- Verify failsafe ports include necessary services.


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

Felix configuration directly controls your cluster's data plane behavior. Document your configuration choices, especially non-default values, and review them during cluster upgrades. Use node-specific overrides sparingly and always test configuration changes in staging before applying to production.
