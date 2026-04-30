# How to Troubleshoot Fleet Deployment Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Troubleshooting

Description: A comprehensive troubleshooting guide for diagnosing and resolving common Fleet deployment failures, including Git sync issues, agent problems, and resource application errors.

## Introduction

Fleet deployments can fail for many reasons: Git connectivity issues, invalid YAML, resource conflicts, RBAC problems, or agent communication failures. Quickly diagnosing and resolving these issues requires knowing where to look and what to check.

This guide provides a systematic approach to troubleshooting Fleet deployment failures, with specific commands for each failure category.

## Prerequisites

- `kubectl` access to both Fleet manager and downstream clusters
- Fleet installed and configured
- Basic Kubernetes troubleshooting knowledge

## Troubleshooting Framework

When a Fleet deployment fails, follow this systematic approach:

1. **Check GitRepo status** - Is the Git repository being synced?
2. **Check Bundle status** - Are bundles being created and updated?
3. **Check BundleDeployment status** - Are deployments reaching clusters?
4. **Check Fleet Agent logs** - Is the agent on the downstream cluster working?
5. **Check Kubernetes events** - Are there resource-level errors?

## Step 1: Check GitRepo Status

```bash
# Get the status of all GitRepos

kubectl get gitrepo -A

# Inspect the current state and message for each GitRepo
kubectl get gitrepo -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.status.display.state} {.status.display.message}{"\n"}{end}'

# Detailed description of a specific GitRepo
kubectl describe gitrepo my-app -n fleet-default
```

### Common GitRepo Error Messages

```bash
# Check for specific error types
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.status.conditions}' | python3 -m json.tool
```

| Error | Cause | Resolution |
|-------|-------|------------|
| `failed to clone` | Authentication or network issue | Check credentials secret, network policies |
| `branch not found` | Incorrect branch name | Verify branch exists in Git |
| `failed to parse` | Invalid YAML syntax | Validate YAML files with `kubectl apply --dry-run=server` |

## Step 2: Check Bundle Status

```bash
# List all bundles and their summary status
kubectl get bundles -A -o wide

# Find bundles with errors
kubectl get bundles -A \
  -o jsonpath='{range .items[?(@.status.summary.notReady>0)]}{.metadata.namespace}/{.metadata.name}: notReady={.status.summary.notReady}{"\n"}{end}'

# Get detailed bundle error information
kubectl describe bundle my-app -n fleet-default | grep -A 30 "Status:"
```

## Step 3: Check BundleDeployment Status

```bash
# List BundleDeployments and check their state
kubectl get bundledeployments -A

# Find failing bundle deployments
kubectl get bundledeployments -A \
  -o jsonpath='{range .items[?(@.status.ready==false)]}{.metadata.namespace}/{.metadata.name}: {.status.display.state}{"\n"}{end}'

# Get detailed error from a specific bundle deployment
kubectl get bundledeployment my-app -n fleet-clusters-ns \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}{"\n"}'

# Full details for a specific bundle deployment
kubectl describe bundledeployment my-app -n fleet-clusters-ns
```

## Step 4: Check Fleet Agent Logs

### On the Fleet Manager

```bash
# Check Fleet controller logs
kubectl logs -n cattle-fleet-system \
  -l app=fleet-controller \
  -c fleet-controller \
  --tail=100

# Check gitjob logs (handles Git operations)
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  --tail=100

# Filter for errors only
kubectl logs -n cattle-fleet-system \
  -l app=fleet-controller \
  -c fleet-controller \
  | grep -i "error\|failed\|warn"
```

### On Downstream Clusters

```bash
# Check the Fleet agent logs on downstream cluster
# (Switch kubectl context to the downstream cluster)
kubectl logs -n cattle-fleet-system \
  -l app=fleet-agent \
  --tail=100

# Filter for relevant errors
kubectl logs -n cattle-fleet-system \
  -l app=fleet-agent \
  | grep -i "error\|failed\|apply"
```

## Step 5: Diagnose Specific Error Types

### Git Authentication Failures

```bash
# Check the GitRepo Ready condition message
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}{"\n"}'

# Check gitjob controller logs on the management cluster
kubectl logs -n cattle-fleet-system \
  -l app=gitjob \
  --tail=100

# Check if secret exists and has correct keys
kubectl get secret my-git-auth -n fleet-default -o jsonpath='{.data}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys()))"

# Test credentials manually (for HTTPS)
curl --request GET \
  --url https://api.github.com/repos/my-org/my-repo \
  --header "Authorization: Bearer TOKEN"
```

### Invalid Kubernetes YAML

```bash
# Test your manifests before pushing to Git
kubectl apply --dry-run=server -f ./my-manifest.yaml

# Validate with kubeval (if installed)
kubeval --strict ./my-manifest.yaml

# Check what Fleet is actually applying
kubectl get bundle my-app -n fleet-default -o yaml
```

### RBAC Permission Issues

```bash
# On downstream cluster: check Fleet agent RBAC
kubectl auth can-i create deployments \
  --as=system:serviceaccount:cattle-fleet-system:fleet-agent \
  -n my-app

# Check for RBAC errors in agent logs
kubectl logs -n cattle-fleet-system \
  -l app=fleet-agent \
  | grep -i "forbidden\|rbac\|permission"
```

### Namespace Issues

```bash
# Check if target namespace exists on downstream cluster
kubectl get namespace my-app

# If missing, create it or add namespace creation to your manifests
kubectl create namespace my-app
```

Resource Conflicts

```bash
# Check for resource ownership conflicts
kubectl get events -n my-app \
  --sort-by='.lastTimestamp' \
  | tail -20

# Check if resources exist with wrong labels
kubectl get deployment my-app -n my-app \
  -o jsonpath='{.metadata.labels}'
```

## Forcing a Re-Sync After Fixing Issues

```bash
# After fixing the underlying issue, force Fleet to re-sync
kubectl patch gitrepo my-app \
  -n fleet-default \
  --type=merge \
  -p "{\"spec\":{\"forceSyncGeneration\":$(date +%s)}}"

# Or delete and recreate the bundle
kubectl delete bundle my-app -n fleet-default
# Fleet will recreate it from the GitRepo
```

## Common Issues and Solutions

### Issue: Bundle Stuck in "NotReady"

```bash
# Check the bundle deployment in the cluster namespace
kubectl get bundledeployments -A | grep my-app

# Check for git jobs in the GitRepo namespace
kubectl get jobs -n fleet-default

# Force Fleet to regenerate the Git job and bundle content
kubectl patch gitrepo my-app \
  -n fleet-default \
  --type=merge \
  -p "{\"spec\":{\"forceSyncGeneration\":$(date +%s)}}"
```

### Issue: Fleet Agent Not Connecting

```bash
# Check agent pod status on downstream cluster
kubectl get pods -n cattle-fleet-system

# Check agent connection to Fleet manager
kubectl logs -n cattle-fleet-system \
  -l app=fleet-agent \
  | grep -i "connect\|register\|heartbeat"
```

## Conclusion

Troubleshooting Fleet deployment failures requires a methodical approach - starting at the GitRepo level and working down through bundles, bundle deployments, and finally the agents and resources on downstream clusters. By using the commands in this guide, you can quickly identify whether a failure is due to Git connectivity, YAML syntax errors, RBAC issues, or resource conflicts, and take targeted corrective action. Maintaining good logging and monitoring practices makes ongoing incident response faster and more reliable.
