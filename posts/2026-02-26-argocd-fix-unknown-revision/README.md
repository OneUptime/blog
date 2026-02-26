# How to Fix 'unknown revision' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Git

Description: Fix the ArgoCD unknown revision error caused by deleted branches, force-pushed commits, incorrect Git references, and shallow clone limitations.

---

The "unknown revision" error in ArgoCD means the Git revision (branch, tag, or commit SHA) specified in your application does not exist in the remote repository. ArgoCD's repo server tried to check out that specific revision and Git reported it as unknown.

The error typically looks like:

```
rpc error: code = Unknown desc = failed to checkout revision abc123def:
unknown revision or path not in the working tree
```

Or:

```
ComparisonError: unknown revision 'feature/my-branch'
```

This guide covers all the scenarios that lead to this error and how to resolve each one.

## Common Causes

### 1. Branch Was Deleted

The most common cause. Your application is tracking a branch that no longer exists in the remote repository.

**Verify the branch exists:**

```bash
# List remote branches
git ls-remote --heads https://github.com/org/repo

# Check for a specific branch
git ls-remote --heads https://github.com/org/repo | grep feature/my-branch
```

**Fix by updating the target revision:**

```bash
# Update the application to track a different branch
argocd app set my-app --revision main
```

Or edit the application spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/org/repo
    targetRevision: main  # Change to an existing branch
    path: deploy/
```

### 2. Tag Was Deleted or Never Created

If your application tracks a Git tag:

```bash
# List remote tags
git ls-remote --tags https://github.com/org/repo

# Check for a specific tag
git ls-remote --tags https://github.com/org/repo | grep v1.2.3
```

**Fix by using an existing tag:**

```bash
argocd app set my-app --revision v1.2.4
```

### 3. Commit SHA No Longer Exists

After a force push or rebase, the original commit SHA might not exist anymore:

```bash
# Try to find the commit
git log --all --oneline | grep abc123d
```

**Fix by updating to a valid commit or switching to branch tracking:**

```bash
# Use the latest branch HEAD instead of a specific commit
argocd app set my-app --revision main

# Or find the new commit SHA after the rebase
argocd app set my-app --revision new-commit-sha
```

### 4. Typo in the Revision Name

A simple typo in the branch name, tag, or commit SHA:

```bash
# Check the current application revision
argocd app get my-app | grep "Target Revision"
```

**Common typos:**
- `main` vs `master` (repository was migrated)
- `release/v1.0` vs `releases/v1.0`
- Case sensitivity: `Feature/my-branch` vs `feature/my-branch`

**Fix:**

```bash
argocd app set my-app --revision correct-branch-name
```

### 5. Force Push Invalidated the Cache

ArgoCD caches Git data. After a force push, the cached revision might not match what is in the remote:

```bash
# Force refresh the application to clear the cache
argocd app get my-app --hard-refresh
```

If the hard refresh does not help, restart the repo server to clear its cache:

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

### 6. HEAD Reference on Empty Repository

If the repository exists but has no commits yet:

```bash
# Check if the repo has any commits
git ls-remote https://github.com/org/new-repo
```

**Fix:** Push at least one commit to the repository:

```bash
git init
git commit --allow-empty -m "Initial commit"
git remote add origin https://github.com/org/new-repo
git push -u origin main
```

### 7. Shallow Clone Limitations

ArgoCD uses shallow clones by default for performance. Some revisions might not be available in a shallow clone:

**Increase the fetch depth or disable shallow cloning:**

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase Git fetch depth (0 = full clone)
  reposerver.git.fetch.depth: "0"
```

Restart the repo server:

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

### 8. Repository URL Changed

The repository might have been moved or renamed, and the revision exists in the new URL but not the old one:

```bash
# Check the current repo URL in the app
argocd app get my-app | grep "Repo"

# Update to the new URL
argocd app set my-app --repo https://github.com/org/new-repo-name
```

## Dealing with Helm Chart Revisions

For Helm chart sources, the revision refers to the chart version, not a Git revision:

```yaml
spec:
  source:
    repoURL: https://charts.example.com
    chart: my-chart
    targetRevision: 1.2.3  # This is a Helm chart version, not a Git ref
```

**Check available chart versions:**

```bash
# For Helm repositories
helm repo add example https://charts.example.com
helm search repo example/my-chart --versions
```

**Fix by using an existing chart version:**

```bash
argocd app set my-app --revision 1.2.4
```

## Using Wildcards and Semver for Resilience

To avoid unknown revision errors from deleted tags, use semver ranges:

```yaml
spec:
  source:
    repoURL: https://charts.example.com
    chart: my-chart
    targetRevision: ">=1.2.0 <2.0.0"  # Matches any compatible version
```

For Git tags with semver:

```yaml
spec:
  source:
    repoURL: https://github.com/org/repo
    targetRevision: "v1.*"  # Matches any v1.x tag
```

## Investigating the Error in Logs

Check the repo server logs for detailed error information:

```bash
# Get detailed Git error from repo server
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | \
  grep -A3 "unknown revision"
```

The logs will show the exact Git command that failed and the repository it was targeting.

## Prevention Strategies

1. **Track branches instead of commits** for environments that need the latest code:

```yaml
targetRevision: main       # For dev
targetRevision: release-1  # For staging
```

2. **Track tags for production** to ensure stability:

```yaml
targetRevision: v1.2.3    # Immutable reference
```

3. **Use branch protection rules** in your Git provider to prevent branch deletion

4. **Set up webhooks** to refresh ArgoCD when branches are deleted, so the error surfaces quickly

5. **Use ApplicationSets with Git generators** to automatically clean up applications when branches are deleted:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: feature-apps
spec:
  generators:
    - pullRequest:
        github:
          owner: org
          repo: repo
  template:
    spec:
      source:
        targetRevision: '{{branch}}'
```

## Summary

The "unknown revision" error means the Git reference in your application spec does not exist in the remote repository. Check if the branch, tag, or commit was deleted, renamed, or force-pushed. Update the `targetRevision` to a valid reference, use `--hard-refresh` to clear cached state, and consider using branch tracking or semver ranges instead of pinned commit SHAs to reduce the frequency of this error.
