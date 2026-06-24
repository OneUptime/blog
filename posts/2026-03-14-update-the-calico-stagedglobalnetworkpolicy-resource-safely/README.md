# Safely Updating the Calico StagedGlobalNetworkPolicy Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policy

Description: A step-by-step guide to modifying Calico StagedGlobalNetworkPolicy resources in production without causing downtime or connectivity issues.

---

## Introduction

Updating Calico resources in a running cluster requires care. A StagedGlobalNetworkPolicy is used to preview policy behavior and does not enforce traffic, but a misconfigured staged policy can still produce misleading previews and create risk if it is later promoted to an enforcing GlobalNetworkPolicy. This guide covers a safe workflow for modifying StagedGlobalNetworkPolicy resources in production.

The key principle is to treat Calico resource changes like any infrastructure change: review the diff, understand the impact, test in staging, and have a rollback plan ready. Calico resources are declarative, so the same discipline you apply to Kubernetes manifests applies here.

This post provides a repeatable process you can follow every time you need to update a StagedGlobalNetworkPolicy resource, whether it is a minor tuning change or a significant configuration shift.

## Prerequisites

- A running Kubernetes cluster with Calico installed (v3.26+)
- `kubectl` installed, with `calicoctl` available for the optional operational checks
- Cluster-admin privileges
- The current StagedGlobalNetworkPolicy manifest stored in version control

## Step 1: Export the Current Resource

Before making any changes, export the current state as your baseline:

```bash
# Export current resource to YAML

kubectl get stagedglobalnetworkpolicy.projectcalico.org -o yaml > stagedglobalnetworkpolicy-backup.yaml

# Store the backup safely
cp stagedglobalnetworkpolicy-backup.yaml stagedglobalnetworkpolicy-backup-$(date +%Y%m%d%H%M%S).yaml
```

This backup is your rollback point. If the update causes issues, you can immediately reapply this file.

## Step 2: Review and Modify the Manifest

Open your StagedGlobalNetworkPolicy manifest and make the desired changes. Use `diff` to verify exactly what will change:

```bash
# Compare current live state with your updated manifest
diff <(kubectl get stagedglobalnetworkpolicy.projectcalico.org -o yaml) stagedglobalnetworkpolicy.yaml
```

Review each changed field and consider its impact:

- Would enforcing this staged policy later affect active connections?
- Does the staged policy match the intended endpoints, namespaces, and tiers?
- Could the equivalent enforcing policy later lock you out of nodes?

## Step 3: Apply the Update

Apply the updated manifest:

```bash
# Apply with kubectl validation
kubectl apply -f stagedglobalnetworkpolicy.yaml
```

For critical changes, consider applying during a maintenance window and monitoring immediately after.

## Step 4: Monitor After the Update

Watch for issues in the Calico component logs:

```bash
# Watch calico-node logs for errors
kubectl logs -n calico-system -l k8s-app=calico-node -f --tail=100

# Check Felix for configuration reload
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=50 | grep -i "config"
```

Run connectivity tests to verify that pod connectivity remains unchanged while the policy is staged:

```bash
# Quick connectivity check between pods
kubectl exec -it test-pod-1 -- ping -c 3 <test-pod-2-ip>

# Verify DNS resolution still works
kubectl exec -it test-pod-1 -- nslookup kubernetes.default
```

## Verification

Confirm the resource reflects your changes:

```bash
# Verify the updated resource
kubectl get stagedglobalnetworkpolicy.projectcalico.org -o yaml

# Check that calico-node pods are healthy
kubectl get pods -n calico-system -l k8s-app=calico-node
```

Ensure all calico-node pods show `Running` status and have not restarted unexpectedly.

## Rolling Back

If the update causes problems, immediately revert to your backup:

```bash
# Rollback to the previous configuration
kubectl apply -f stagedglobalnetworkpolicy-backup.yaml

# Verify rollback was successful
kubectl get stagedglobalnetworkpolicy.projectcalico.org -o yaml
```

## Troubleshooting

**Staged preview shows unexpected blocked traffic:**
- Immediately apply the backup manifest.
- Check that the policy selector, namespace selector, tier, and order match the intended scope.
- Review Felix logs for staged policy processing errors.

**Unexpected live traffic impact:**
- Confirm that an enforcing GlobalNetworkPolicy was not changed at the same time.
- Check whether another network policy or host endpoint policy changed in the same deployment.
- Review Calico component logs for errors.

**Update appears to have no effect:**
- Ensure the resource name matches the existing resource (updates require the same metadata.name).
- Check for typos in field names; modern `kubectl apply` uses strict field validation by default, while older clusters or disabled validation can prune unknown CRD fields.


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
# Check current Calico version from the running node image
kubectl get daemonset calico-node -n calico-system -o jsonpath='{.spec.template.spec.containers[?(@.name=="calico-node")].image}{"\n"}'

# Review served versions for the staged global network policy CRD
kubectl get crd stagedglobalnetworkpolicies.crd.projectcalico.org -o jsonpath='{.spec.versions[*].name}{"\n"}'
```

### Security Hardening

Apply the principle of least privilege to Calico configurations. Limit who can modify Calico resources using Kubernetes RBAC, and audit changes using the Kubernetes audit log. Consider using admission webhooks to validate Calico resource changes before they are applied, and review Kubernetes events for component-level symptoms.

```bash
# Check whether your current identity can modify staged global network policies
kubectl auth can-i update stagedglobalnetworkpolicies.crd.projectcalico.org
kubectl auth can-i patch stagedglobalnetworkpolicies.crd.projectcalico.org

# Review recent Kubernetes events related to Calico components
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

Updating Calico StagedGlobalNetworkPolicy resources safely requires a disciplined approach: backup first, review the diff, apply with validation, and monitor immediately. Always keep your rollback manifest accessible and test changes in a non-production environment before applying them to production clusters.
