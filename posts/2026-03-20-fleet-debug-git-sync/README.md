# How to Debug Fleet Git Repository Sync Issues - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Debugging, Rancher, Kubernetes, Git Sync, SUSE Rancher

Description: Learn how to diagnose and fix Fleet Git repository sync failures including authentication errors, network issues, manifest parsing failures, and bundle deployment failures.

---

Fleet sync failures prevent GitOps updates from reaching your clusters. Issues range from Git authentication errors to Helm chart rendering failures. This guide walks through systematic diagnosis for each failure type.

---

## Fleet Sync Flow

```text
GitRepo (spec.repo)
    │
    ▼
gitjob-controller creates a Job
    │
    ▼
GitJob clones the Git repo and creates Bundle
    │
    ▼
fleet-controller creates BundleDeployment for target clusters
    │
    ▼
fleet-agent deploys BundleDeployment to target clusters
    │
    ▼
BundleDeployment status updated
```

---

## Step 1: Check GitRepo Status

```bash
# List all GitRepos and their sync status

kubectl get gitrepo -n fleet-default

# Describe a specific GitRepo for error details
kubectl describe gitrepo my-app -n fleet-default

# Look for conditions:
# Ready: True/False
# Message: error details if sync failed
```

Common status conditions:
- `Ready` - Desired and current states match; if `False`, the message includes GitJob, Bundle, or BundleDeployment errors
- `GitPolling` - Polling or initial clone is in progress; `True` when polling succeeds or is disabled
- `Reconciling` - Fleet is reconciling the latest change
- `Stalled` - The controller hit an error or timed out
- `Accepted` - GitRepo restrictions and external Helm secrets were accepted

---

## Step 2: Check Fleet Controller and GitJob Logs

```bash
# View fleet-controller logs for bundle and deployment errors
kubectl logs -n cattle-fleet-system \
  -l app=fleet-controller \
  | grep -i "error\|failed\|sync" | tail -50

# Follow fleet-controller logs in real-time
kubectl logs -n cattle-fleet-system \
  -l app=fleet-controller -f

# For clone/auth/polling failures, inspect the GitJob pod created for this GitRepo
# GitJob pods run in the same namespace as the GitRepo
kubectl logs -f <gitjob-pod-name> -n fleet-default
```

---

## Common Issue 1: Git Authentication Failure

```bash
# Check if the GitRepo references a secret for auth
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.spec.clientSecretName}'

# Verify the secret exists and has the correct keys
kubectl get secret my-git-auth -n fleet-default -o yaml

# Secrets referenced by clientSecretName should be type:
# - kubernetes.io/ssh-auth
# - kubernetes.io/basic-auth

# For SSH authentication, the secret should include:
# - ssh-privatekey
# Optionally add known_hosts if you need to provide host keys explicitly

# For HTTP/HTTPS, the secret should include:
# - username
# - password

# Create the secret if missing
kubectl create secret generic my-git-auth \
  -n fleet-default \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=git \
  --from-literal=password=my-token

# Update the GitRepo to use the secret
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p '{"spec":{"clientSecretName":"my-git-auth"}}'
```

---

## Common Issue 2: Network Connectivity to Git Repository

```bash
# Test connectivity from the GitJob pod created for this GitRepo
# (if the container image includes curl)
kubectl exec -n fleet-default \
  <gitjob-pod-name> \
  -- curl -v https://github.com

# For private Git servers, test the specific URL
kubectl exec -n fleet-default \
  <gitjob-pod-name> \
  -- curl -v https://git.example.com
```

---

## Common Issue 3: Helm Chart Rendering Failures

```bash
# If the Bundle was created, inspect it for rendering errors
kubectl get bundle -n fleet-default | grep -v "1/1"

# Describe the failing bundle
kubectl describe bundle my-app -n fleet-default

# Look for the status message - it shows the Helm template error
# Example: "Error: template: my-chart/templates/deployment.yaml:15:5: executing ..."
```

---

## Common Issue 4: Target Cluster Not Matching

```bash
# Check if any clusters match the GitRepo's target selector
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.spec.targets}'

# List available clusters and their labels
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -o custom-columns='NAME:.metadata.name,LABELS:.metadata.labels'

# If no clusters match the selector, the GitRepo shows 0/0 in cluster counts
# Fix: add the required label to the target cluster
kubectl label clusters.fleet.cattle.io my-cluster -n fleet-default env=production
```

---

## Common Issue 5: BundleDeployment Failures

```bash
# Check BundleDeployments for failure reasons
kubectl get bundledeployments.fleet.cattle.io -A

# BundleDeployments live in per-cluster namespaces such as
# cluster-fleet-default-<cluster>-<suffix>
# Describe a failing deployment in its cluster namespace
kubectl describe bundledeployments.fleet.cattle.io my-app-abc123 \
  -n <cluster-namespace>

# Check Fleet agent logs on the target cluster
# (Run this on the downstream cluster, not the management cluster)
kubectl logs -n cattle-fleet-system \
  -l app=fleet-agent -f \
  | grep -i "error\|failed"
```

---

## Step 3: Force a Resync

```bash
# Increment the forceSyncGeneration to force a re-pull from Git
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p '{"spec":{"forceSyncGeneration":1}}'

# Or increment again if already set
CURRENT=$(kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.spec.forceSyncGeneration}')
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p "{\"spec\":{\"forceSyncGeneration\":$((CURRENT+1))}}"
```

---

## Step 4: Check the Fleet Agent on Downstream Clusters

```bash
# Verify Fleet agent is running on the downstream cluster
kubectl get pods -n cattle-fleet-system -l app=fleet-agent

# Check for connection errors
kubectl logs -n cattle-fleet-system -l app=fleet-agent \
  | grep -i "error\|connect\|refused"

# Restart the Fleet agent if it's stuck
kubectl rollout restart deployment/fleet-agent -n cattle-fleet-system
```

---

## Debugging Checklist

```bash
# 1. Is the GitRepo able to clone the repository?
kubectl describe gitrepo <name> -n fleet-default | grep -A 5 Conditions

# 2. Are Bundles being created?
kubectl get bundle -n fleet-default | grep <gitrepo-name>

# 3. Are BundleDeployments being applied?
kubectl get bundledeployments.fleet.cattle.io -A

# 4. Is the Fleet agent running on downstream clusters?
# (on each downstream cluster)
kubectl get pods -n cattle-fleet-system -l app=fleet-agent

# 5. Are there RBAC issues on downstream clusters?
kubectl get clusterrolebinding | grep fleet
```

---

## Best Practices

- Use HTTPS with token authentication for Git repos rather than SSH - it's easier to debug and doesn't require managing SSH keys.
- Enable Fleet webhook integration with your Git provider to trigger immediate syncs on push rather than waiting for the polling interval.
- Test `fleet.yaml` and Helm templates locally using `fleet apply -o - my-bundle ./path` before pushing to Git - this lets you inspect the rendered Bundle without requiring a cluster sync.
