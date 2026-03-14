# How to Create a Disaster Recovery Runbook for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Runbook, Operations, Incident Response

Description: Write a comprehensive disaster recovery runbook for Flux CD deployments, covering all major failure scenarios with step-by-step recovery procedures.

---

## Introduction

A disaster recovery runbook is a living document that tells an operator exactly what to do when things go wrong. Without a runbook, recovery depends on tribal knowledge - and tribal knowledge is unavailable at 3 AM when the primary operator is asleep and the junior engineer is holding the pager. A good runbook is opinionated, specific, and regularly tested.

For Flux CD environments, a runbook must cover failures at multiple layers: the Flux controllers themselves, the Git source, the container registry, the Kubernetes control plane, and the application workloads. Each failure mode has a distinct recovery path, and the runbook should make those paths explicit.

This guide provides a structured template for a Flux CD disaster recovery runbook, with concrete commands for each scenario.

## Prerequisites

- Flux CD managing a production cluster
- This runbook stored in an accessible location outside the cluster (not as a ConfigMap)
- All required credentials documented and stored in a secure vault
- The runbook tested quarterly against a non-production environment

## Step 1: Runbook Header and Contact Information

Every runbook starts with meta-information so responders know who to call and what access they need.

```markdown
# Flux CD Disaster Recovery Runbook

**Last Tested:** 2026-03-13
**Owner:** Platform Engineering Team
**Slack:** #platform-incidents
**On-Call Rotation:** PagerDuty - Platform Engineering

## Required Access
- kubectl context: production-us-east-1
- flux CLI: >= 2.3.0
- GitHub token: stored in 1Password under "flux-github-token"
- AWS credentials: via aws-vault profile "production"
- Sealed Secrets master key: stored in 1Password under "sealed-secrets-master-key"

## Severity Levels
- P0: Cluster completely unavailable, all traffic down
- P1: Flux stopped reconciling, no new deployments possible
- P2: Single namespace or application affected
- P3: Image automation paused or degraded
```

## Step 2: Scenario 1 - Flux Controllers Not Running (P1)

```markdown
### Scenario: Flux Controllers Down

**Symptoms:**
- `kubectl get pods -n flux-system` shows pods not running
- `flux get all -A` returns connection refused or empty
- New deployments are not rolling out

**Diagnosis:**
```bash
kubectl get pods -n flux-system
kubectl describe pod -n flux-system -l app=source-controller
kubectl logs -n flux-system deployment/source-controller --tail=50
```plaintext

**Recovery:**
```bash
# Step 1: Check if the namespace exists
kubectl get namespace flux-system

# Step 2: If namespace is present, restart controllers
kubectl rollout restart deployment -n flux-system
kubectl rollout status deployment/source-controller -n flux-system --timeout=120s

# Step 3: If namespace is missing, re-bootstrap
export GITHUB_TOKEN="$(op read 'op://Production/flux-github-token/password')"
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/production \
  --token-env=GITHUB_TOKEN

# Step 4: Verify recovery
flux get all -A
```plaintext

**Expected RTO:** 5-10 minutes
```

## Step 3: Scenario 2 - Git Repository Unreachable (P1)

```markdown
### Scenario: Git Repository Unreachable

**Symptoms:**
- `flux get sources git -A` shows Source with False ready status
- Error message references network timeout or authentication failure

**Diagnosis:**
```bash
flux get sources git -A
flux describe source git flux-system
kubectl logs -n flux-system deployment/source-controller | grep -i error
```plaintext

**Recovery - Authentication Issue:**
```bash
# Refresh the GitHub token
export NEW_TOKEN="$(op read 'op://Production/flux-github-token/password')"
kubectl create secret generic flux-system \
  -n flux-system \
  --from-literal=username=git \
  --from-literal=password="$NEW_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -
flux reconcile source git flux-system
```plaintext

**Recovery - Repository Unreachable (failover to mirror):**
```bash
kubectl patch gitrepository flux-system -n flux-system \
  --type=merge \
  -p '{"spec":{"url":"https://gitea.internal.example.com/my-org/my-fleet"}}'
flux reconcile source git flux-system
```plaintext

**Expected RTO:** 3-5 minutes
```

## Step 4: Scenario 3 - Full Cluster Rebuild (P0)

```markdown
### Scenario: Full Cluster Rebuild

**Symptoms:**
- Kubernetes API server unreachable
- All nodes lost
- etcd data corrupted or lost

**Prerequisites before starting:**
- New cluster created with kubectl access
- Sealed Secrets master key available
- GitHub token available

**Recovery:**
```bash
# Step 1: Verify new cluster access
kubectl cluster-info

# Step 2: Bootstrap Flux
export GITHUB_TOKEN="$(op read 'op://Production/flux-github-token/password')"
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/production \
  --token-env=GITHUB_TOKEN

# Step 3: Restore Sealed Secrets master key
op read 'op://Production/sealed-secrets-master-key/notesPlain' \
  > /tmp/sealed-secrets-key.yaml
kubectl apply -f /tmp/sealed-secrets-key.yaml -n kube-system
rm /tmp/sealed-secrets-key.yaml
kubectl rollout restart deployment sealed-secrets -n kube-system

# Step 4: Wait for reconciliation
flux reconcile kustomization flux-system --with-source
kubectl wait kustomization/apps -n flux-system \
  --for=condition=ready --timeout=600s

# Step 5: Validate
kubectl get pods -A | grep -v Running | grep -v Completed
flux get all -A | grep -v True
```plaintext

**Expected RTO:** 20-45 minutes
```

## Step 5: Scenario 4 - HelmRelease Failing (P2)

```markdown
### Scenario: HelmRelease Stuck or Failing

**Diagnosis:**
```bash
flux get helmreleases -A
flux describe helmrelease my-app -n production
helm history my-app -n production
```plaintext

**Recovery - Rollback to last good release:**
```bash
flux suspend helmrelease my-app -n production
helm rollback my-app -n production
flux resume helmrelease my-app -n production
```plaintext

**Recovery - Force re-install:**
```bash
flux suspend helmrelease my-app -n production
helm uninstall my-app -n production
flux resume helmrelease my-app -n production
```plaintext

**Expected RTO:** 5-15 minutes
```

## Step 6: Runbook Maintenance and Testing

Store the runbook in a location accessible even when the cluster is down.

```bash
# Store runbook in multiple locations
# 1. Git repository (primary)
# 2. Confluence/Notion (secondary, human-readable)
# 3. PagerDuty runbook attachment (accessible during incidents)

# Quarterly test schedule
# January: Full cluster rebuild test
# April: Flux controller failure test
# July: Git repository failover test
# October: etcd restore test

# After each test, update:
# - Last tested date in runbook header
# - RTO measurements
# - Any steps that needed correction
```

## Best Practices

- Store the runbook outside the cluster - a ConfigMap is not accessible when the cluster is down.
- Include exact commands, not descriptions of commands - under pressure, people make mistakes.
- List all credentials needed and exactly where to find them before listing recovery steps.
- Keep the runbook in sync with infrastructure changes - outdated runbooks are dangerous.
- Require that runbook changes go through peer review in Git, just like code changes.
- Post-incident, always update the runbook with what actually worked.

## Conclusion

A well-written DR runbook is one of the most valuable investments a platform team can make. For Flux CD environments, the runbook should cover controller failures, source failures, and full cluster rebuilds, with Flux's Git-based model providing a consistent recovery path across all scenarios. The runbook is only as good as its last test - schedule drills and treat the runbook as living documentation.
