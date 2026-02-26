# How to Preview Application Changes Before Syncing in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Preview, Deployment

Description: Learn how to preview and review application changes before syncing them in ArgoCD, using diff tools, PR previews, and preview environments.

---

When you push a change to your GitOps repository, ArgoCD detects the drift and shows the application as OutOfSync. But before you hit sync, you want to know exactly what will change. ArgoCD provides several ways to preview changes, from simple diffs to full preview environments.

This guide covers all the approaches for reviewing changes before they reach your cluster.

## The ArgoCD UI Diff View

The simplest way to preview changes is through the ArgoCD web UI. When an application is OutOfSync, ArgoCD shows a diff view for each affected resource.

Navigate to your application and click on a resource that shows as OutOfSync. The diff view shows three panels:

- **Desired State** - What is declared in Git
- **Live State** - What is currently running in the cluster
- **Diff** - The differences between the two

The diff highlights added lines in green and removed lines in red. You can review each resource individually before deciding to sync.

## Using argocd app diff

The CLI provides more detailed diff output:

```bash
# Show diff for all resources in an application
argocd app diff my-app

# Show diff in a specific format
argocd app diff my-app --output json

# Show diff against local manifests (useful during development)
argocd app diff my-app --local ./apps/my-app/production/

# Show diff for a specific revision
argocd app diff my-app --revision abc123
```

The local diff is particularly useful because you can check changes before even pushing to Git:

```bash
# Edit your manifests locally
vim apps/my-app/production/deployment.yaml

# Preview what ArgoCD would see as different
argocd app diff my-app --local ./apps/my-app/production/

# Output shows the exact differences:
===== apps/Deployment production/my-app ======
  spec:
    template:
      spec:
        containers:
        - name: my-app
-         image: myorg/my-app:v1.0.0
+         image: myorg/my-app:v2.0.0
          resources:
            limits:
-             memory: 512Mi
+             memory: 1Gi
```

## PR-Based Preview Workflow

Integrate change previews into your pull request workflow so reviewers can see the impact before merging:

### GitHub Actions for PR Diff

```yaml
# .github/workflows/argocd-diff.yaml
name: ArgoCD Diff Preview
on:
  pull_request:
    paths:
      - 'apps/**'
      - 'charts/**'

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd

      - name: Login to ArgoCD
        run: |
          argocd login ${{ secrets.ARGOCD_SERVER }} \
            --username ${{ secrets.ARGOCD_USER }} \
            --password ${{ secrets.ARGOCD_PASSWORD }} \
            --grpc-web

      - name: Generate diffs
        id: diff
        run: |
          # Find changed app directories
          changed_apps=$(git diff --name-only origin/main...HEAD -- apps/ | \
            cut -d'/' -f2 | sort -u)

          diff_output=""
          for app in $changed_apps; do
            echo "Generating diff for: $app"
            app_diff=$(argocd app diff "$app" \
              --local "apps/$app/production/" 2>&1) || true
            if [ -n "$app_diff" ]; then
              diff_output="${diff_output}\n### ${app}\n\`\`\`diff\n${app_diff}\n\`\`\`\n"
            else
              diff_output="${diff_output}\n### ${app}\nNo changes detected.\n"
            fi
          done

          # Save diff for PR comment
          echo "$diff_output" > /tmp/diff-output.md

      - name: Comment PR with diff
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('/tmp/diff-output.md', 'utf8');

            const body = `## ArgoCD Diff Preview

            The following changes will be applied when this PR is merged:

            ${diff}

            > Generated automatically by ArgoCD diff preview`;

            // Find existing comment
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existing = comments.data.find(c =>
              c.body.includes('ArgoCD Diff Preview'));

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body: body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }
```

## Preview Environments with ApplicationSet

Use ArgoCD ApplicationSet to automatically create preview environments for pull requests:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: preview-environments
  namespace: argocd
spec:
  generators:
    - pullRequest:
        github:
          owner: myorg
          repo: gitops-repo
          tokenRef:
            secretName: github-token
            key: token
          labels:
            - preview
        requeueAfterSeconds: 60
  template:
    metadata:
      name: 'preview-{{branch_slug}}-{{number}}'
      namespace: argocd
      labels:
        type: preview
        pr: '{{number}}'
    spec:
      project: preview
      source:
        repoURL: 'https://github.com/myorg/gitops-repo'
        path: apps/my-app/staging
        targetRevision: '{{branch}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: 'preview-{{number}}'
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
        syncOptions:
          - CreateNamespace=true
```

This creates a complete environment for each PR labeled with "preview", letting you test the full application before merging.

## Comparing Across Environments

Preview changes by comparing manifests across environments:

```bash
# Compare staging to production
diff <(argocd app manifests my-app-staging --source git) \
     <(argocd app manifests my-app-production --source git)

# Compare rendered Kustomize overlays
diff <(kustomize build overlays/staging/) \
     <(kustomize build overlays/production/)

# Compare Helm values
diff values/staging.yaml values/production.yaml
```

Create a script to generate a comprehensive environment comparison:

```bash
#!/bin/bash
# compare-envs.sh - Compare manifests between environments
set -euo pipefail

ENV1="${1:?Usage: compare-envs.sh <env1> <env2>}"
ENV2="${2:?Usage: compare-envs.sh <env1> <env2>}"

echo "=== Comparing $ENV1 to $ENV2 ==="

# Build both environments
kustomize build "overlays/$ENV1" > "/tmp/env-$ENV1.yaml"
kustomize build "overlays/$ENV2" > "/tmp/env-$ENV2.yaml"

# Count resources
echo ""
echo "Resource counts:"
echo "  $ENV1: $(grep -c '^kind:' /tmp/env-$ENV1.yaml) resources"
echo "  $ENV2: $(grep -c '^kind:' /tmp/env-$ENV2.yaml) resources"

# Show diff
echo ""
echo "Differences:"
diff --color "/tmp/env-$ENV1.yaml" "/tmp/env-$ENV2.yaml" || true
```

## Preview with Argo Rollouts Analysis

For canary deployments, Argo Rollouts provides a built-in preview mechanism:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  strategy:
    canary:
      canaryService: my-app-canary
      stableService: my-app-stable
      trafficRouting:
        nginx:
          stableIngress: my-app-ingress
          additionalIngressAnnotations:
            canary-by-header: X-Canary
      steps:
        - setWeight: 10
        - pause: {}  # Manual gate - review before proceeding
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 60
        - pause: { duration: 5m }
        - setWeight: 100
```

The `pause: {}` step creates a manual gate where you can inspect the canary before promoting:

```bash
# Check canary status
kubectl argo rollouts status my-app -n production

# Preview canary with header routing
curl -H "X-Canary: always" https://my-app.example.com/health

# Promote after review
kubectl argo rollouts promote my-app -n production

# Or abort if issues found
kubectl argo rollouts abort my-app -n production
```

## Notification-Based Preview

Configure ArgoCD notifications to alert your team when changes are pending:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.app-out-of-sync: |
    message: |
      Application {{.app.metadata.name}} is OutOfSync.
      Changes detected in: {{range .app.status.resources}}{{if eq .status "OutOfSync"}}{{.kind}}/{{.name}} {{end}}{{end}}
      Review changes: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}?view=tree&diffMode=true
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": "{{.app.metadata.name}} has pending changes",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "text": "Review the diff before syncing to production"
        }]

  trigger.on-out-of-sync: |
    - when: app.status.sync.status == 'OutOfSync'
      send: [app-out-of-sync]
```

Apply the trigger to your application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    notifications.argoproj.io/subscribe.on-out-of-sync.slack: production-deploys
```

## Best Practices for Change Preview

1. **Make PR diffs a required check.** Do not merge changes without reviewing the ArgoCD diff.

2. **Use preview environments for complex changes.** Simple image tag updates can be reviewed via diff. Infrastructure changes deserve a preview environment.

3. **Compare across environments.** Before promoting from staging to production, verify the environment-specific differences are intentional.

4. **Archive diffs for audit.** Store the diff output with your deployment records for post-incident analysis.

5. **Monitor deployment impact.** Use [OneUptime](https://oneuptime.com) to compare application metrics before and after syncing changes, confirming the preview matched the actual outcome.

## Conclusion

Previewing changes before syncing is a fundamental practice for safe GitOps deployments. ArgoCD provides built-in diff capabilities, and you can extend them with PR-based previews, preview environments, and notification-based workflows. The goal is to ensure that no change reaches your cluster without a human (or automated analysis) verifying it first.
