# How to Preview Application Changes Before Syncing in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Preview, Deployment Safety

Description: Learn how to preview ArgoCD application changes before syncing using the UI diff view, CLI commands, preview environments, and pull request generators.

---

One of the biggest advantages ArgoCD has over traditional deployment tools is the ability to see exactly what will change before anything is applied. But many teams underuse this capability, either auto-syncing everything without review or manually inspecting manifests in Git without seeing the cluster-level impact.

This guide covers every method ArgoCD provides for previewing changes, from simple UI diffs to full preview environments created automatically for pull requests.

## Method 1: ArgoCD UI Diff View

The ArgoCD web UI provides the most visual way to preview changes. When an application is OutOfSync, the UI shows a diff view:

1. Navigate to the application in the ArgoCD UI
2. Click on any resource marked as "OutOfSync"
3. Click the "Diff" tab to see the detailed comparison

The diff view shows:
- **Desired state**: What the manifests in Git define
- **Live state**: What is currently in the cluster
- **Highlighted differences**: Changed fields are color-coded

For applications with manual sync policy, this is the standard review workflow:

```yaml
# Application with manual sync - changes accumulate for review
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
spec:
  source:
    repoURL: https://github.com/org/gitops-repo
    path: apps/production-app
  syncPolicy:
    # No 'automated' section means manual sync required
    syncOptions:
    - Validate=true
```

## Method 2: CLI Diff Command

The `argocd app diff` command shows the same information as the UI but in your terminal:

```bash
# Show diff for all resources in an application
argocd app diff production-app

# Show diff with exit code (useful for scripting)
# Exit code 0 = synced, exit code 1 = changes pending
argocd app diff production-app; echo "Exit code: $?"

# Show diff for a specific revision
argocd app diff production-app --revision abc123def
```

The output format is standard unified diff:

```diff
===== apps/Deployment production/my-api ======
--- live
+++ desired
@@ -22,7 +22,7 @@
       containers:
       - name: my-api
-        image: my-api:v1.2.0
+        image: my-api:v1.3.0
         env:
-        - name: LOG_LEVEL
-          value: "info"
+        - name: LOG_LEVEL
+          value: "debug"
         resources:
           limits:
-            memory: "256Mi"
+            memory: "512Mi"
```

## Method 3: Local Manifest Preview

Preview what ArgoCD would render from a local directory without pushing to Git:

```bash
# Compare local manifests against what is in the cluster
argocd app diff production-app --local ./apps/production-app/

# This is useful for:
# - Testing changes before committing
# - Debugging manifest rendering issues
# - Verifying that local changes produce the expected diff
```

The `--local` flag tells ArgoCD to render manifests from your local filesystem instead of the Git repository, then compare against the live state. This gives you a preview before even creating a commit.

## Method 4: Preview Environments with ApplicationSet

For a more comprehensive preview, create temporary environments for every pull request using ArgoCD ApplicationSet with the pull request generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: pr-preview
  namespace: argocd
spec:
  generators:
  - pullRequest:
      github:
        owner: org
        repo: gitops-repo
        tokenRef:
          secretName: github-token
          key: token
        labels:
        - preview
      requeueAfterSeconds: 60
  template:
    metadata:
      name: 'preview-{{branch}}-{{number}}'
      labels:
        preview: "true"
    spec:
      project: previews
      source:
        repoURL: 'https://github.com/org/gitops-repo'
        targetRevision: '{{head_sha}}'
        path: apps/my-app/overlays/preview
      destination:
        server: https://kubernetes.default.svc
        namespace: 'preview-{{number}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

When a PR with the "preview" label is created, ArgoCD automatically:
1. Creates a new namespace for the preview
2. Deploys the application from the PR branch
3. Keeps it synced with the latest PR commits
4. Deletes the preview when the PR is closed

### Setting Up the Preview Overlay

Create a Kustomize overlay specifically for preview environments:

```yaml
# apps/my-app/overlays/preview/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

patches:
- target:
    kind: Deployment
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 1

- target:
    kind: Ingress
  patch: |-
    - op: replace
      path: /spec/rules/0/host
      value: preview-PLACEHOLDER.dev.example.com

# Reduce resources for preview
- target:
    kind: Deployment
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
```

### Commenting Preview URLs on PRs

Automate posting the preview URL to the pull request:

```yaml
# GitHub Actions workflow
name: Preview URL
on:
  pull_request:
    types: [labeled]

jobs:
  post-url:
    if: github.event.label.name == 'preview'
    runs-on: ubuntu-latest
    steps:
    - name: Post preview URL
      uses: actions/github-script@v7
      with:
        script: |
          const prNumber = context.issue.number;
          const previewUrl = `https://preview-${prNumber}.dev.example.com`;
          github.rest.issues.createComment({
            issue_number: prNumber,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `## Preview Environment\n\nYour preview is deploying at: ${previewUrl}\n\nArgoCD: https://argocd.example.com/applications/preview-${prNumber}`
          });
```

## Method 5: Manifest Diff in CI

Generate a diff report as part of CI and include it in the PR:

```yaml
# GitHub Actions
name: Manifest Diff
on:
  pull_request:
    paths:
    - 'apps/**'

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Install tools
      run: |
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

    - name: Generate diffs
      id: diff
      run: |
        DIFF_OUTPUT=""

        # For each changed app directory
        for app_dir in $(git diff --name-only origin/main | grep "^apps/" | cut -d/ -f1-2 | sort -u); do
          if [ ! -d "$app_dir" ]; then
            continue
          fi

          for overlay in "$app_dir"/overlays/*/; do
            [ -d "$overlay" ] || continue
            ENV=$(basename "$overlay")

            echo "Generating diff for $app_dir ($ENV)..."

            # Render current branch
            kustomize build "$overlay" > /tmp/current.yaml 2>/dev/null || continue

            # Render main branch
            git show "origin/main:$overlay/kustomization.yaml" > /dev/null 2>&1 || continue
            git stash
            git checkout origin/main -- "$app_dir" 2>/dev/null
            kustomize build "$overlay" > /tmp/main.yaml 2>/dev/null || true
            git checkout - -- "$app_dir" 2>/dev/null
            git stash pop 2>/dev/null || true

            DIFF=$(diff -u /tmp/main.yaml /tmp/current.yaml || true)
            if [ -n "$DIFF" ]; then
              DIFF_OUTPUT="${DIFF_OUTPUT}\n### ${app_dir} (${ENV})\n\`\`\`diff\n${DIFF}\n\`\`\`\n"
            fi
          done
        done

        echo "diff_output<<EOF" >> $GITHUB_OUTPUT
        echo -e "$DIFF_OUTPUT" >> $GITHUB_OUTPUT
        echo "EOF" >> $GITHUB_OUTPUT

    - name: Comment on PR
      uses: actions/github-script@v7
      with:
        script: |
          const diff = `${{ steps.diff.outputs.diff_output }}`;
          if (diff.trim()) {
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Manifest Changes\n\n${diff}`
            });
          }
```

## Method 6: ArgoCD Notifications for Pending Changes

Configure ArgoCD to notify when applications have pending changes waiting for review:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-outofsync: |
    - when: app.status.sync.status == 'OutOfSync'
      send: [pending-changes]
  template.pending-changes: |
    message: |
      Application {{.app.metadata.name}} has pending changes.
      Review: https://argocd.example.com/applications/{{.app.metadata.name}}?view=diff
```

This ensures that manual-sync applications do not have changes sitting unreviewed for long periods.

For monitoring production application health after changes are synced, integrate [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-degraded-applications/view) to catch deployment-related issues in real time.

## Choosing the Right Preview Method

| Method | Best For | Setup Effort |
|--------|----------|-------------|
| UI Diff | Quick visual review | None |
| CLI Diff | Scripting and automation | Low |
| Local Diff | Pre-commit verification | Low |
| Preview Environments | Full integration testing | High |
| CI Manifest Diff | PR-based review process | Medium |
| Notifications | Ensuring timely reviews | Medium |

## Summary

ArgoCD provides multiple ways to preview changes before they affect your clusters. The UI diff view and CLI diff command provide quick resource-level comparisons. Local manifest preview lets you test changes before committing. Pull request generators create full preview environments for integration testing. CI-generated diffs make PR reviews more informed. Use a combination of these methods based on your workflow: local preview during development, CI diffs during PR review, and UI review before production syncs. The goal is to never be surprised by what a sync actually changes.
