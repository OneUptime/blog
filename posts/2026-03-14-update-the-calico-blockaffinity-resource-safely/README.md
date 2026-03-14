# Safely Updating the Calico BlockAffinity Resource in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes

Description: A step-by-step guide to modifying Calico BlockAffinity resources in production without causing downtime or connectivity issues.

---

## Introduction

Updating Calico resources in a running cluster requires care. A misconfigured BlockAffinity can disrupt networking, drop traffic, or break BGP peerings. This guide covers a safe workflow for modifying BlockAffinity resources in production.

The key principle is to treat Calico resource changes like any infrastructure change: review the diff, understand the impact, test in staging, and have a rollback plan ready. Calico resources are declarative, so the same discipline you apply to Kubernetes manifests applies here.

This post provides a repeatable process you can follow every time you need to update a BlockAffinity resource, whether it is a minor tuning change or a significant configuration shift.

## Prerequisites

- A running Kubernetes cluster with Calico installed (v3.26+)
- `kubectl` and `calicoctl` installed
- Cluster-admin privileges
- The current BlockAffinity manifest stored in version control

## Step 1: Export the Current Resource

Before making any changes, export the current state as your baseline:

```bash
# Export current resource to YAML
calicoctl get blockaffinity -o yaml > blockaffinity-backup.yaml

# Store the backup safely
cp blockaffinity-backup.yaml blockaffinity-backup-$(date +%Y%m%d%H%M%S).yaml
```

This backup is your rollback point. If the update causes issues, you can immediately reapply this file.

## Step 2: Review and Modify the Manifest

Open your BlockAffinity manifest and make the desired changes. Use `diff` to verify exactly what will change:

```bash
# Compare current live state with your updated manifest
diff <(calicoctl get blockaffinity -o yaml) blockaffinity.yaml
```

Review each changed field and consider its impact:

- Will this change affect active connections?
- Does this change require a Felix or BGP restart?
- Could this change lock you out of nodes?

## Step 3: Apply the Update

Apply the updated manifest:

```bash
# Apply with calicoctl for validation
calicoctl apply -f blockaffinity.yaml
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

Run connectivity tests to verify that pods can still communicate:

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
calicoctl get blockaffinity -o yaml

# Check that calico-node pods are healthy
kubectl get pods -n calico-system -l k8s-app=calico-node
```

Ensure all calico-node pods show `Running` status and have not restarted unexpectedly.

## Rolling Back

If the update causes problems, immediately revert to your backup:

```bash
# Rollback to the previous configuration
calicoctl apply -f blockaffinity-backup.yaml

# Verify rollback was successful
calicoctl get blockaffinity -o yaml
```

## Troubleshooting

**Pods losing connectivity after update:**
- Immediately apply the backup manifest.
- Check if Felix is crashlooping: `kubectl get pods -n calico-system`.
- Review Felix logs for configuration errors.

**BGP sessions dropping (for BGP-related resources):**
- Check BGP peering status: `calicoctl node status`.
- Verify ASN numbers and peer IPs are correct.

**Update appears to have no effect:**
- Ensure the resource name matches the existing resource (updates require the same metadata.name).
- Check for typos in field names; unknown fields are silently ignored by kubectl.


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

Updating Calico BlockAffinity resources safely requires a disciplined approach: backup first, review the diff, apply with validation, and monitor immediately. Always keep your rollback manifest accessible and test changes in a non-production environment before applying them to production clusters.
