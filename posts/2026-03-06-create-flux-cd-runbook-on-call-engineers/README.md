# How to Create a Flux CD Runbook for On-Call Engineers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Runbook, On-Call, Incident Response, Kubernetes, GitOps, Operations, SRE

Description: A complete runbook template for on-call engineers managing Flux CD deployments, covering common incidents, troubleshooting procedures, escalation paths, and emergency procedures.

---

## Introduction

When an on-call engineer gets paged at 3 AM, they need clear, actionable procedures -- not theory. This guide provides a complete runbook for operating Flux CD in production. It covers the most common incidents, step-by-step troubleshooting procedures, emergency actions, and escalation paths. Use this as a template and customize it for your organization.

## Prerequisites

- flux CLI installed and configured
- kubectl access to production clusters
- Access to the Git repository (fleet-infra)
- Access to monitoring dashboards (Grafana)
- PagerDuty/Opsgenie access for escalation

## Quick Health Check

Run this first when responding to any Flux-related alert:

```bash
# Quick health check script
# Run all checks in sequence

# 1. Check Flux system components
echo "=== Flux System Health ==="
flux check

# 2. Check all sources
echo "=== Source Status ==="
flux get sources all -A

# 3. Check all Kustomizations
echo "=== Kustomization Status ==="
flux get kustomizations -A

# 4. Check all Helm releases
echo "=== Helm Release Status ==="
flux get helmreleases -A

# 5. Check for suspended resources
echo "=== Suspended Resources ==="
flux get all -A --status-selector ready=false

# 6. Check Flux controller pods
echo "=== Controller Pods ==="
kubectl get pods -n flux-system
```

## Incident Response Procedures

### Incident 1: Kustomization Reconciliation Failed

**Alert**: `FluxKustomizationReconciliationFailed`

**Severity**: High

**Impact**: Application changes are not being deployed.

```bash
# Step 1: Identify the failing Kustomization
flux get kustomizations -A --status-selector ready=false

# Step 2: Get detailed error message
kubectl describe kustomization <name> -n flux-system | grep -A 5 "Message"

# Step 3: Check controller logs for details
kubectl logs -n flux-system deploy/kustomize-controller \
  --since=15m | grep -i error

# Step 4: Common causes and fixes

# Cause A: Invalid YAML in the Git repository
# Fix: Check recent commits for syntax errors
# Look at the error message - it usually points to the file
flux logs --kind=Kustomization --name=<name> --level=error

# Cause B: Missing dependency
# Fix: Check if dependent Kustomizations are healthy
flux get kustomizations -A

# Cause C: Resource conflict (another controller owns the resource)
# Fix: Check for ownership conflicts
kubectl get <resource> -n <namespace> -o yaml | grep -A 5 "ownerReferences"

# Step 5: Force reconciliation after fixing
flux reconcile kustomization <name> --with-source

# Step 6: Verify it recovers
flux get kustomization <name> --watch
```

### Incident 2: Helm Release Stuck

**Alert**: `FluxHelmReleaseNotReady`

**Severity**: High

**Impact**: Helm-managed application is not being updated.

```bash
# Step 1: Check Helm release status
flux get helmrelease <name> -n <namespace>

# Step 2: Get detailed status
kubectl describe helmrelease <name> -n <namespace>

# Step 3: Check Helm history
helm history <name> -n <namespace>

# Step 4: Common stuck states

# State A: pending-install or pending-upgrade
# This usually means a previous Helm operation was interrupted
# Fix: Reset the Helm release
flux suspend helmrelease <name> -n <namespace>
# Remove the pending Helm secret
helm rollback <name> <previous-revision> -n <namespace>
flux resume helmrelease <name> -n <namespace>

# State B: failed
# Check what went wrong in the last release
helm get notes <name> -n <namespace>
helm get values <name> -n <namespace>

# State C: Chart not found
# Check if the HelmRepository is accessible
flux get sources helm -A
flux reconcile source helm <repo-name>

# Step 5: Force reconciliation
flux reconcile helmrelease <name> -n <namespace>
```

### Incident 3: Git Source Not Syncing

**Alert**: `FluxSourceNotReady`

**Severity**: Critical

**Impact**: No changes from Git are being applied to the cluster.

```bash
# Step 1: Check Git repository status
flux get sources git -A

# Step 2: Get the error details
kubectl describe gitrepository flux-system -n flux-system

# Step 3: Common causes

# Cause A: Git authentication failure
# Check if the deploy key or token has expired
kubectl get secret flux-system -n flux-system
# Verify the secret contains valid credentials
kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity}' | base64 -d | head -1

# Cause B: Git host unreachable
# Test connectivity from within the cluster
kubectl run -it --rm debug --image=curlimages/curl -n flux-system -- \
  curl -sI https://github.com 2>&1 | head -5

# Cause C: Branch deleted or force-pushed
# Check if the configured branch exists
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.spec.ref.branch}'

# Step 4: If credentials expired, rotate them
flux create secret git flux-system \
  --url=https://github.com/your-org/fleet-infra \
  --username=git \
  --password=$NEW_GITHUB_TOKEN

# Step 5: Force source reconciliation
flux reconcile source git flux-system
```

### Incident 4: Image Update Automation Stopped

**Alert**: `FluxImageUpdateNotWorking`

**Severity**: Medium

**Impact**: New container images are not being automatically deployed.

```bash
# Step 1: Check image automation status
flux get image update -A
flux get image repository -A
flux get image policy -A

# Step 2: Check for errors
kubectl describe imageupdateautomation fleet-infra -n flux-system

# Step 3: Common causes

# Cause A: Registry authentication failure
# Check registry credentials
kubectl get secret regcred -n flux-system
# Test registry access
flux reconcile image repository <name>

# Cause B: No new images matching the policy
# Check what images are available
kubectl describe imagerepository <name> -n flux-system

# Cause C: Git push failure (automation cannot commit)
# Check if the bot has write access to the repository
kubectl logs -n flux-system deploy/image-automation-controller \
  --since=30m | grep -i "push\|auth\|permission"

# Step 4: Force scan and update
flux reconcile image repository <name>
flux reconcile image update fleet-infra
```

### Incident 5: Resource Drift Detected

**Alert**: `FluxResourceDriftDetected`

**Severity**: Medium

**Impact**: Cluster state differs from Git-defined state.

```bash
# Step 1: Identify what drifted
kubectl events -n flux-system --for kustomization/<name> | grep -i drift

# Step 2: Check if someone made a manual change
# Look at the resource's last applied configuration
kubectl get <resource> -n <namespace> -o yaml | \
  grep -A 3 "last-applied-configuration"

# Step 3: Force reconciliation to restore desired state
flux reconcile kustomization <name> --with-source

# Step 4: Verify state matches Git
flux diff kustomization <name>

# Step 5: Investigate who made the manual change
# Check audit logs if available
kubectl logs -n kube-system deploy/kube-apiserver \
  --since=1h | grep "<resource-name>"
```

## Emergency Procedures

### Emergency: Suspend All Flux Reconciliation

Use this when Flux is causing cascading failures:

```bash
# EMERGENCY: Suspend all Flux reconciliation
# This stops Flux from making any changes to the cluster

# Suspend all Kustomizations
flux get kustomizations -A -o json | \
  jq -r '.[] | "\(.metadata.name) \(.metadata.namespace)"' | \
  while read name ns; do
    flux suspend kustomization "$name" -n "$ns"
  done

# Suspend all HelmReleases
flux get helmreleases -A -o json | \
  jq -r '.[] | "\(.metadata.name) \(.metadata.namespace)"' | \
  while read name ns; do
    flux suspend helmrelease "$name" -n "$ns"
  done

echo "All Flux reconciliation suspended."
echo "IMPORTANT: Create an incident ticket to track resumption."
```

### Emergency: Rollback a Bad Deployment

```bash
# EMERGENCY: Rollback via Git

# Step 1: Identify the bad commit
git log --oneline -10

# Step 2: Revert the commit
git revert <bad-commit-hash> --no-edit

# Step 3: Push immediately
git push

# Step 4: Force reconciliation
flux reconcile kustomization <name> --with-source

# Step 5: Monitor the rollback
kubectl rollout status deployment/<name> -n <namespace> --timeout=300s
```

### Emergency: Scale Down a Problematic Controller

```bash
# If a Flux controller is misbehaving and causing issues

# Scale down the specific controller
kubectl scale deployment/<controller-name> \
  -n flux-system --replicas=0

# Controllers:
# - source-controller
# - kustomize-controller
# - helm-controller
# - notification-controller
# - image-reflector-controller
# - image-automation-controller

# IMPORTANT: This stops ALL reconciliation for that controller type
# Create an incident ticket immediately

# To restore:
kubectl scale deployment/<controller-name> \
  -n flux-system --replicas=1
```

## Monitoring Dashboards

### Key Metrics to Watch

```yaml
# Grafana dashboard queries for on-call monitoring

panels:
  - title: "Reconciliation Success Rate"
    query: >
      sum(rate(gotk_reconcile_condition{
        status="True",type="Ready"
      }[5m])) /
      sum(rate(gotk_reconcile_condition{
        type="Ready"
      }[5m])) * 100
    alert_threshold: "< 95%"

  - title: "Reconciliation Duration (p99)"
    query: >
      histogram_quantile(0.99,
        sum(rate(gotk_reconcile_duration_seconds_bucket[5m]))
        by (le, kind)
      )
    alert_threshold: "> 300s"

  - title: "Source Sync Failures"
    query: >
      sum(gotk_reconcile_condition{
        status="False",type="Ready",kind="GitRepository"
      })
    alert_threshold: "> 0"

  - title: "Suspended Resources"
    query: >
      sum(gotk_suspend_status{suspended="true"})
    alert_threshold: "> 0 (unexpected)"
```

## Escalation Matrix

```yaml
# Escalation paths for Flux-related incidents

escalation:
  level_1:
    who: "On-call engineer"
    actions:
      - "Run health check"
      - "Follow runbook procedures"
      - "Force reconciliation"
    time_limit: "30 minutes"

  level_2:
    who: "Platform team lead"
    actions:
      - "Review controller logs"
      - "Suspend problematic resources"
      - "Coordinate with Git repository owners"
    time_limit: "1 hour"
    contact: "#platform-oncall Slack channel"

  level_3:
    who: "Infrastructure architect"
    actions:
      - "Scale down controllers if needed"
      - "Manual cluster intervention"
      - "Coordinate with Flux CD community if needed"
    time_limit: "2 hours"
    contact: "Page via PagerDuty"

  external:
    who: "Flux CD community / vendor support"
    when: "Bug in Flux CD itself"
    contact: "https://github.com/fluxcd/flux2/issues"
```

## Post-Incident Procedures

After resolving any incident:

```bash
# Post-incident checklist

# 1. Verify all resources are healthy
flux get all -A --status-selector ready=false
# Should return empty

# 2. Resume any suspended resources
flux get all -A --status-selector suspended=true
# Resume each one
flux resume kustomization <name> -n <namespace>

# 3. Verify no drift exists
flux get kustomizations -A

# 4. Check all sources are syncing
flux get sources all -A

# 5. Verify monitoring is working
# Check that alerts have cleared in PagerDuty/Grafana

# 6. Document the incident
# - What happened
# - Root cause
# - Steps taken to resolve
# - Action items to prevent recurrence
```

## Common Command Reference

```bash
# === ON-CALL QUICK REFERENCE ===

# Overall status
flux get all -A
flux check

# Sources
flux get sources all -A
flux reconcile source git <name>

# Kustomizations
flux get kustomizations -A
flux reconcile kustomization <name>
flux suspend kustomization <name>
flux resume kustomization <name>

# Helm releases
flux get helmreleases -A
flux reconcile helmrelease <name> -n <ns>

# Logs
flux logs --kind=Kustomization --name=<name>
flux logs --kind=HelmRelease --name=<name>
kubectl logs -n flux-system deploy/<controller> --since=30m

# Events
kubectl events -n flux-system --for kustomization/<name>
kubectl events -n flux-system --for helmrelease/<name>
```

## Best Practices

1. **Always check Git first**: Most Flux issues originate from changes in the Git repository. Check recent commits before diving into cluster debugging.

2. **Never edit resources directly**: Manual kubectl edits will be overwritten by Flux. Always fix issues in Git.

3. **Suspend before investigating**: If a resource is flapping, suspend it to stop the cycle while you investigate.

4. **Document every emergency action**: If you suspend a controller or resource, create a ticket to track its resumption.

5. **Test runbook procedures quarterly**: Run tabletop exercises to ensure the runbook is up to date.

6. **Keep the flux CLI version matched**: Ensure the on-call team's flux CLI version matches the cluster version.

## Conclusion

A well-maintained runbook is the on-call engineer's most valuable tool. This runbook covers the most common Flux CD incidents with step-by-step procedures, emergency actions, and escalation paths. Customize it for your organization's specific setup, keep it updated as your Flux configuration evolves, and test it regularly. The goal is that any on-call engineer, regardless of their Flux experience level, can resolve common incidents quickly and know when to escalate.
