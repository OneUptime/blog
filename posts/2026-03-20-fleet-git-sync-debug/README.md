# How to Debug Fleet Git Repository Sync Issues - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Kubernetes, Debugging, Git Sync, SUSE Rancher, Troubleshooting

Description: Learn how to diagnose and fix Fleet GitRepo sync failures including authentication errors, bundle rendering failures, and cluster targeting issues.

---

Fleet GitRepo sync failures prevent your desired state from being applied to clusters. This guide covers the most common sync issues and how to resolve them.

---

## Step 1: Check GitRepo Status

```bash
# Check the GitRepo sync status

kubectl get gitrepo -n fleet-default

# Get detailed status
kubectl describe gitrepo my-app -n fleet-default

# Common status fields to look for:
# - .status.commit - last synced commit
# - .status.readyClusters - number of ready clusters
# - .status.conditions - detailed condition messages
```

---

## Issue 1: Authentication Failure (Private Repos)

**Symptom**: GitRepo shows `Error: authentication required`

```bash
# Check that the credential secret exists
kubectl get secret <secret-name> -n fleet-default

# Verify secret type and keys
kubectl describe secret github-creds -n fleet-default

# Re-create the secret if expired
kubectl create secret generic github-creds \
  -n fleet-default \
  --type=kubernetes.io/basic-auth \
  --from-literal=username=<github-username> \
  --from-literal=password=<new-github-pat> \
  --dry-run=client -o yaml | kubectl apply -f -
```

For SSH-based repos:

```bash
kubectl create secret generic ssh-key \
  -n fleet-default \
  --type=kubernetes.io/ssh-auth \
  --from-file=ssh-privatekey=~/.ssh/id_ed25519 \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## Issue 2: Bundle Rendering Failure (Helm/Kustomize Errors)

**Symptom**: GitRepo shows `Error rendering bundle`

```bash
# Check controller logs for rendering errors
kubectl logs -n cattle-fleet-system \
  -l app=fleet-controller \
  --tail=200 | grep -i "error\|fail"

# Try rendering the bundle locally to identify issues
cd your-repo
helm template my-app ./chart -f values.yaml

# For Kustomize
kustomize build ./overlays/production
```

---

## Issue 3: Cluster Targeting Not Working

**Symptom**: Bundles are created but not deployed to any clusters

```bash
# List all cluster labels
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.metadata.labels}{"\n"}{end}'

# Verify the GitRepo selector matches cluster labels
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.spec.targets}'

# Check bundle deployments (one per target cluster)
kubectl get bundledeployments.fleet.cattle.io -A | grep my-app
```

---

## Issue 4: Bundle Stuck in Modified State

**Symptom**: Bundle shows `Modified` - cluster state differs from Git

```bash
# Check what is different (BundleDeployments live in per-cluster namespaces)
kubectl describe bundledeployment <name> -n <cluster-namespace> | grep -A 20 "Modified"

# Re-scan the repo after fixing manifests, or after enabling correctDrift
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p "{\"spec\":{\"forceSyncGeneration\":$(date +%s)}}"
```

---

## Issue 5: Git Branch or Tag Not Found

```bash
# Verify the branch exists in the remote
git ls-remote https://github.com/my-org/my-repo.git refs/heads/main

# For a tag, check refs/tags/<tag>
git ls-remote https://github.com/my-org/my-repo.git refs/tags/v1.2.3

# Update the GitRepo branch reference
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p '{"spec":{"branch":"main"}}'

# For a tag or pinned commit, use spec.revision instead
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p '{"spec":{"revision":"v1.2.3"}}'
```

---

## Step 6: Force a Manual Sync

```bash
# Increment forceSyncGeneration to force an immediate re-sync
kubectl patch gitrepo my-app -n fleet-default \
  --type merge \
  -p "{\"spec\":{\"forceSyncGeneration\":$(date +%s)}}"
```

---

## Fleet Controller Logs

```bash
# Watch fleet controller logs in real time during troubleshooting
kubectl logs -n cattle-fleet-system \
  -l app=fleet-controller \
  -f --tail=50
```

---

## Best Practices

- Use PATs (Personal Access Tokens) with minimum required permissions for Fleet credentials.
- Set `clientSecretName` in the GitRepo spec to a proper credential secret - do not rely on public repos in production.
- Test your Helm chart or Kustomize overlay locally before pushing to the Fleet-watched branch.
