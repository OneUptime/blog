# Building a Runbook for CIDRNotAvailable Errors in Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Troubleshooting, Runbook

Description: A structured operational runbook for on-call engineers to follow when CIDRNotAvailable errors occur in Kubernetes clusters running Calico and kubeadm.

---

## Introduction

CIDRNotAvailable errors occur when Calico cannot find a suitable CIDR block to allocate IPs from. This typically happens when the pod CIDR configured in kubeadm does not match the Calico IPPool configuration, or when the IP address space is exhausted.

A runbook transforms tribal knowledge into a repeatable procedure that any on-call engineer can follow. This guide provides a structured runbook for handling CIDRNotAvailable errors, designed to minimize mean time to resolution (MTTR).

This runbook follows a standard incident response workflow: detect, assess, diagnose, fix, verify, and document.

## Prerequisites

- On-call engineer with `kubectl` and `calicoctl` access
- Cluster-admin privileges (or documented escalation path)
- Access to monitoring dashboards and alerting system

## Runbook: CIDRNotAvailable Error Response

### Phase 1: Detection and Assessment (0-5 minutes)

```bash
# Check scope of impact
kubectl get pods -A --field-selector status.phase!=Running | grep -v Completed | wc -l

# Check how many nodes are affected
kubectl get pods -n calico-system -l k8s-app=calico-node | grep -v Running

# Check if production workloads are impacted
kubectl get pods -n production --field-selector status.phase!=Running 2>/dev/null
```

**Decision Point:**
- If more than 50% of pods affected: **P1 - Major Incident**
- If less than 50% but production impacted: **P2 - High Priority**
- If only non-production affected: **P3 - Standard Priority**

### Phase 2: Initial Diagnosis (5-15 minutes)

```bash
echo "=== Calico System Pods ==="
kubectl get pods -n calico-system -o wide

echo "=== Recent Events ==="
kubectl get events -n calico-system --sort-by='.lastTimestamp' | tail -20

echo "=== Calico Node Status ==="
calicoctl node status

echo "=== IPAM Status ==="
calicoctl ipam show
```

Record findings in the incident channel.

### Phase 3: Apply Fix (15-30 minutes)

Based on the diagnosis, apply the appropriate fix:

**If IPAM/IP allocation issue:**
```bash
calicoctl ipam show --show-blocks
```

**If connectivity issue:**
```bash
kubectl delete pod -n calico-system <affected-pod>
```

**If configuration issue:**
```bash
calicoctl apply -f /path/to/backup/calico-config.yaml
```

### Phase 4: Verification (30-45 minutes)

```bash
# Verify all calico-node pods are running
kubectl get pods -n calico-system -l k8s-app=calico-node

# Test connectivity
kubectl run runbook-test --image=busybox --rm -it --restart=Never -- ping -c 5 <known-pod-ip>

# Check all previously failing pods are recovering
kubectl get pods -A --field-selector status.phase!=Running | grep -v Completed
```

### Phase 5: Post-Incident Documentation

Record the following in your incident management system:

1. **Timeline:** When detected, when diagnosed, when fixed, when verified
2. **Root cause:** The specific misconfiguration or failure
3. **Fix applied:** Exact commands and configuration changes
4. **Impact:** Number of pods/services affected and duration
5. **Prevention:** Action items to prevent recurrence

## Verification

Test the runbook by running through it in a staging environment:

```bash
# Run through each phase and time each one
# Establish baseline MTTR expectations
```

## Troubleshooting

**Runbook steps not matching the actual error:**
- The error may have a different root cause. Escalate to the Calico expert.
- Check if Calico was recently upgraded.

**Cannot restore from backup:**
- Export the current state and fix individual resources.
- Contact Tigera support for complex datastore recovery.


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

A well-practiced runbook reduces incident MTTR from hours to minutes. Review and update this runbook quarterly, after every incident, and after Calico upgrades. Run tabletop exercises with on-call engineers to ensure familiarity with the procedures.
