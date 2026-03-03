# How to Handle Merge Conflicts in ArgoCD Config Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Merge Conflicts, Git Workflows

Description: Learn practical strategies to prevent and resolve merge conflicts in ArgoCD configuration repositories without breaking your deployments.

---

Merge conflicts in ArgoCD config repos are more dangerous than in regular code repos. A bad conflict resolution in a deployment manifest can take down production. An accidental revert of an image tag can roll back a service without anyone noticing. This guide covers how to prevent conflicts in the first place and how to handle them safely when they do occur.

## Why Config Repos Get Conflicts

Config repo conflicts typically happen because of:

1. **Automated image updates** - CI pipelines from different services update image tags in the same file simultaneously
2. **Multi-team changes** - Multiple teams modify shared configuration at the same time
3. **Environment promotions** - Promotion scripts modify the same files that developers are editing
4. **Branch-per-environment merges** - Merging between dev, staging, and production branches

The most common conflict looks like this:

```text
<<<<<<< HEAD
    newTag: v2.3.5
=======
    newTag: v2.3.4
>>>>>>> feature/update-api
```

Resolving this wrong means deploying the wrong version.

## Prevention Strategy 1: One File Per Service

Instead of putting all image tags in a single kustomization.yaml, separate them:

```yaml
# Instead of one big kustomization.yaml with all images:
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Each service has its own image patch file
patches:
  - path: patches/frontend-image.yaml
  - path: patches/backend-api-image.yaml
  - path: patches/worker-image.yaml
```

```yaml
# overlays/production/patches/backend-api-image.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  template:
    spec:
      containers:
        - name: app
          image: myorg/backend-api:v2.3.5
```

Now, CI pipelines updating different services modify different files, eliminating most conflicts.

## Prevention Strategy 2: Dedicated Config Per Service

In a monorepo setup, give each service its own directory tree:

```text
config-repo/
├── services/
│   ├── frontend/
│   │   ├── base/
│   │   └── overlays/
│   │       ├── dev/
│   │       │   └── kustomization.yaml
│   │       └── production/
│   │           └── kustomization.yaml
│   ├── backend-api/
│   │   ├── base/
│   │   └── overlays/
│   └── worker/
│       ├── base/
│       └── overlays/
```

Each service's CI pipeline only touches its own directory. Conflicts between services become impossible.

## Prevention Strategy 3: Lock-Free Updates

Use Git's atomic operations to avoid conflicts from concurrent CI updates:

```bash
#!/bin/bash
# update-image-tag.sh - Conflict-free image update script
SERVICE=$1
TAG=$2
ENV=$3
MAX_RETRIES=5
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    # Pull latest
    git pull --rebase origin main

    # Make the change
    cd "services/${SERVICE}/overlays/${ENV}"
    kustomize edit set image "myorg/${SERVICE}:${TAG}"

    # Try to commit and push
    git add .
    git commit -m "deploy: ${SERVICE} ${TAG} to ${ENV}"

    if git push origin main; then
        echo "Successfully updated ${SERVICE} to ${TAG}"
        exit 0
    else
        echo "Push failed, retrying (${RETRY}/${MAX_RETRIES})..."
        git reset HEAD~1  # Undo the commit
        RETRY=$((RETRY + 1))
        sleep $((RANDOM % 5 + 1))  # Random backoff
    fi
done

echo "Failed to update after ${MAX_RETRIES} retries"
exit 1
```

This script uses a retry loop with rebase to handle concurrent pushes. If another CI job pushed first, it rebases and tries again.

## Prevention Strategy 4: Pull Request Queues

Use GitHub's merge queue or a similar tool to serialize PRs:

```yaml
# .github/branch-protection.yaml (conceptual)
branch: main
merge_queue:
  enabled: true
  merge_method: squash
  min_entries_to_merge: 1
  max_entries_to_merge: 5
  build_timeout_minutes: 10
```

With merge queues, PRs are tested in order. If PR #2 conflicts with PR #1, the queue rebases PR #2 automatically and re-runs checks before merging.

## Handling Conflicts When They Occur

When you do get a conflict, follow these rules:

### Rule 1: Always Take the Newer Version

For image tag conflicts, the correct resolution is almost always the newer version:

```bash
# Check which version is actually running
kubectl get deployment backend-api -n production -o jsonpath='{.spec.template.spec.containers[0].image}'
# myorg/backend-api:v2.3.5

# The conflict shows v2.3.4 vs v2.3.5
# Take v2.3.5 (the newer one)
```

### Rule 2: Verify Against Live State

Before resolving a conflict, check what is actually deployed:

```bash
# Compare conflict resolution against live state
argocd app get backend-api-production --output json | \
  jq '.spec.source'

# Also check the deployment directly
kubectl get deployment backend-api -n production -o yaml | \
  grep "image:"
```

### Rule 3: Run Validation After Resolution

Always build and validate after resolving conflicts:

```bash
# After resolving conflicts
git add .

# Validate before committing
kustomize build overlays/production | kubeconform -strict

# If validation passes, commit
git commit -m "resolve: merge conflict in backend-api production config"
```

## Automated Conflict Detection

Set up CI to catch conflicts early:

```yaml
# .github/workflows/conflict-check.yaml
name: Check for Conflicts
on:
  pull_request:
    branches: [main]

jobs:
  conflict-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for merge conflicts
        run: |
          # Try to merge with main
          git merge origin/main --no-commit --no-ff || true

          # Check for conflict markers
          if grep -r "<<<<<<< " --include="*.yaml" --include="*.yml" .; then
            echo "CONFLICT: Merge conflicts detected in YAML files"
            echo "Please rebase your branch and resolve conflicts"
            exit 1
          fi

      - name: Validate kustomize builds
        run: |
          for env in dev staging production; do
            if [ -d "overlays/${env}" ]; then
              echo "Building ${env}..."
              kustomize build "overlays/${env}" > /dev/null 2>&1
              if [ $? -ne 0 ]; then
                echo "FAILED: kustomize build failed for ${env}"
                exit 1
              fi
            fi
          done
```

## Git Configuration for Config Repos

Configure Git to handle YAML files better:

```text
# .gitattributes
*.yaml merge=union
*.yml merge=union
```

The `merge=union` strategy automatically merges by keeping both sides of the conflict. This works well for additive changes (like adding new resources to a kustomization.yaml) but is dangerous for changes that modify the same line. Use with caution.

A safer approach is a custom merge driver:

```text
# .gitattributes
kustomization.yaml merge=kustomize-merge
```

```bash
# .git/config or global gitconfig
[merge "kustomize-merge"]
    name = Kustomize-aware merge
    driver = scripts/kustomize-merge-driver.sh %O %A %B
```

## Recovering from Bad Merges

If a bad merge gets into main and ArgoCD deploys it:

```bash
# Option 1: Revert the merge commit
git revert -m 1 <merge-commit-sha>
git push

# Option 2: Hard reset (dangerous - requires force push)
# Only do this if no other commits came after the bad merge
git reset --hard <last-good-commit>
git push --force-with-lease  # Safer than --force

# Option 3: Use ArgoCD to rollback while you fix Git
argocd app rollback backend-api-production
# Then fix Git at your own pace
```

For monitoring bad merges, set up alerts on ArgoCD sync failures:

```yaml
# ArgoCD notification for sync failures
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [slack-alert]
  template.slack-alert: |
    message: |
      Sync failed for {{.app.metadata.name}}.
      This may be caused by a bad merge. Check recent commits.
      Error: {{.app.status.operationState.message}}
```

## Summary

Merge conflicts in ArgoCD config repos are best prevented by structuring your repo so that different services and CI pipelines modify different files. Use one file per service for image tags, separate directory trees per service, and retry-based update scripts for concurrent CI jobs. When conflicts do occur, always verify against the live cluster state before resolving, validate with kustomize build after resolution, and have monitoring in place to catch bad merges that make it to production. The single-branch with directory-per-environment strategy minimizes conflicts compared to branch-per-environment approaches.
