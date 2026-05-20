# How to Implement Auto-Merge Policies for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Automation, CI/CD

Description: Learn how to implement safe auto-merge policies for ArgoCD configuration repositories to speed up low-risk deployments while maintaining safety for critical changes.

---

Not every deployment change needs a human reviewer. Bumping an image tag to a version that already passed CI tests, or updating a non-production environment, can be safely automated. Auto-merge policies let you speed up low-risk changes while keeping strict review requirements for anything that could impact production stability. This guide shows you how to implement auto-merge safely for ArgoCD config repos.

## The Risk Spectrum

Different changes carry different risk levels:

```mermaid
graph LR
    A[Low Risk] --> B[Medium Risk] --> C[High Risk]
    A --> D["Image tag updates<br>Dev environment changes<br>Label/annotation changes"]
    B --> E["Config changes<br>Staging deployments<br>Resource adjustments"]
    C --> F["Production deployments<br>RBAC changes<br>Network policies<br>New services"]
```

Auto-merge is appropriate for low-risk changes. Medium and high-risk changes should always have human review.

## Setting Up Auto-Merge with GitHub

### Renovate Bot for Dependency Updates

Renovate can automatically update image tags and Helm chart versions:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "kubernetes": {
    "fileMatch": ["(^|/).*\\.yaml$"]
  },
  "packageRules": [
    {
      "description": "Auto-merge patch version updates in dev",
      "matchFileNames": ["services/*/overlays/dev/**"],
      "matchUpdateTypes": ["patch", "digest"],
      "automerge": true,
      "automergeType": "pr",
      "automergeStrategy": "squash",
      "platformAutomerge": true
    },
    {
      "description": "Auto-merge minor updates in dev after CI passes",
      "matchFileNames": ["services/*/overlays/dev/**"],
      "matchUpdateTypes": ["minor"],
      "automerge": true,
      "automergeType": "pr",
      "automergeStrategy": "squash",
      "minimumReleaseAge": "1 day"
    },
    {
      "description": "Never auto-merge production changes",
      "matchFileNames": ["services/*/overlays/production/**"],
      "automerge": false
    },
    {
      "description": "Auto-merge platform tool patch updates in staging",
      "matchFileNames": ["platform/**"],
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "minimumReleaseAge": "3 days"
    }
  ]
}
```

### GitHub Auto-Merge via Actions

Create a workflow that enables auto-merge for qualifying PRs:

```yaml
# .github/workflows/auto-merge.yaml

name: Auto-Merge Low Risk Changes
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled]

permissions:
  pull-requests: write
  contents: read
  issues: write

jobs:
  evaluate-risk:
    runs-on: ubuntu-latest
    outputs:
      auto-mergeable: ${{ steps.check.outputs.auto-mergeable }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Evaluate change risk
        id: check
        run: |
          auto_merge="false"
          blocked="false"
          base_ref="${{ github.base_ref }}"
          git fetch origin "$base_ref"
          changed_files=$(git diff --name-only "origin/$base_ref...HEAD")
          diff_output=$(git diff --unified=0 "origin/$base_ref...HEAD")

          # Block auto-merge for production changes
          if echo "$changed_files" | grep -q "/production/"; then
            echo "Production changes detected - blocking auto-merge"
            blocked="true"
          fi

          # Block for RBAC changes
          if echo "$changed_files" | grep -qi "rbac\|role\|rolebinding"; then
            echo "RBAC changes detected - blocking auto-merge"
            blocked="true"
          fi

          # Block for network policy changes
          if echo "$changed_files" | grep -qi "networkpolic"; then
            echo "Network policy changes detected - blocking auto-merge"
            blocked="true"
          fi

          # Block for new application definitions
          if echo "$changed_files" | grep -q "^apps/"; then
            echo "Application definition changes detected - blocking auto-merge"
            blocked="true"
          fi

          # Block for namespace or cluster-scoped resource changes
          if echo "$diff_output" | grep -q "kind: Namespace\|kind: ClusterRole"; then
            echo "Cluster-scoped changes detected - blocking auto-merge"
            blocked="true"
          fi

          # Allow: image tag only changes in dev/staging
          non_image_changes=$(echo "$diff_output" | grep -E "^[+-]" | grep -vE "^(\+\+\+|---)" | grep -vE "^[+-].*(image:|newTag:)" || true)
          if [ "$blocked" = "false" ] && \
             echo "$changed_files" | grep -qE "/(dev|staging)/" && \
             echo "$diff_output" | grep -qE "^[+-].*(image:|newTag:)" && \
             [ -z "$non_image_changes" ]; then
            echo "Image-only change in non-production - eligible for auto-merge"
            auto_merge="true"
          fi

          echo "auto-mergeable=$auto_merge" >> $GITHUB_OUTPUT

  auto-merge:
    needs: evaluate-risk
    if: needs.evaluate-risk.outputs.auto-mergeable == 'true' && github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    steps:
      - name: Enable auto-merge
        run: |
          gh pr merge "$PR_NUMBER" --auto --squash --match-head-commit "$HEAD_SHA"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}

      - name: Add auto-merge label
        run: |
          gh label create "auto-merge-enabled" --color "0E8A16" --description "Auto-merge has been enabled by policy" --force
          gh pr edit "$PR_NUMBER" --add-label "auto-merge-enabled"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
```

## Image Updater Auto-Merge

When using ArgoCD Image Updater, configure an `ImageUpdater` resource to write back to Git:

```yaml
apiVersion: argocd-image-updater.argoproj.io/v1alpha1
kind: ImageUpdater
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  writeBackConfig:
    method: "git"
    gitConfig:
      branch: "main"
      writeBackTarget: "kustomization"
  applicationRefs:
    - namePattern: "my-app-dev"
      images:
        - alias: "app"
          imageName: "org/my-app"
          commonUpdateSettings:
            updateStrategy: "latest"
          manifestTargets:
            kustomize:
              name: "org/my-app"
```

For dev environments, Image Updater can write directly to the main branch (if branch protection allows it for the bot account). For production, configure it to create PRs instead:

```yaml
spec:
  writeBackConfig:
    method: "git:secret:argocd-image-updater/git-creds"
    gitConfig:
      branch: "main"
      pullRequest:
        github: {}
```

## Policy Enforcement

Use a policy engine to enforce auto-merge rules:

```yaml
# .github/auto-merge-policy.yaml
policies:
  # Dev environment: auto-merge most changes
  dev:
    auto_merge: true
    conditions:
      - all_checks_passed: true
      - no_security_findings: true
    exceptions:
      - path_contains: "secret"
      - path_contains: "rbac"

  # Staging environment: auto-merge image updates only
  staging:
    auto_merge: true
    conditions:
      - all_checks_passed: true
      - no_security_findings: true
      - change_type: image_update_only
    exceptions:
      - path_contains: "secret"
      - path_contains: "rbac"
      - path_contains: "networkpolic"

  # Production: never auto-merge
  production:
    auto_merge: false
    required_reviewers: 2
    required_teams:
      - platform-team
```

## Implementing Staged Auto-Merge

For extra safety, implement a staged approach where changes auto-deploy to dev, wait, then promote:

```yaml
# .github/workflows/staged-deploy.yaml
name: Staged Deployment
on:
  push:
    branches: [main]
    paths:
      - 'services/*/overlays/dev/**'

permissions:
  contents: write
  pull-requests: write

jobs:
  # Stage 1: Dev deploys automatically via ArgoCD auto-sync
  wait-for-dev:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for ArgoCD sync
        run: sleep 120  # Wait for ArgoCD to detect and sync

      - name: Verify dev deployment health
        env:
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_AUTH_TOKEN }}
        run: |
          argocd login "$ARGOCD_SERVER" --auth-token "$ARGOCD_AUTH_TOKEN" --grpc-web

          # Check all dev apps are healthy
          unhealthy=$(argocd app list -l env=dev -o json | \
            jq '[.[] | select(.status.health.status != "Healthy")] | length')

          if [ "$unhealthy" -gt 0 ]; then
            echo "Dev deployment unhealthy - not promoting"
            exit 1
          fi

  # Stage 2: Auto-create staging promotion PR
  promote-to-staging:
    needs: wait-for-dev
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install yq
        run: |
          sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/v4.45.1/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

      - name: Create staging promotion PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Copy dev image tags to staging
          git checkout -b auto-promote/staging-$(date +%Y%m%d%H%M)
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          # Extract image tags from dev overlays and apply to staging
          for service_dir in services/*/overlays/dev; do
            service=$(echo "$service_dir" | cut -d/ -f2)
            staging_dir="services/$service/overlays/staging"

            if [ -f "$service_dir/kustomization.yaml" ] && [ -f "$staging_dir/kustomization.yaml" ]; then
              # Copy image section from dev to staging kustomization.
              if yq -e '.images' "$service_dir/kustomization.yaml" >/dev/null; then
                images_file=$(mktemp)
                yq '.images' "$service_dir/kustomization.yaml" > "$images_file"
                IMAGES_FILE="$images_file" yq -i '.images = load(strenv(IMAGES_FILE))' "$staging_dir/kustomization.yaml"
                rm -f "$images_file"
              fi
              echo "Promoting $service to staging"
            fi
          done

          if git diff --quiet; then
            echo "No staging changes to promote"
            exit 0
          fi

          git add .
          git commit -m "Auto-promote dev images to staging"
          git push -u origin HEAD
          gh pr create \
            --title "Auto-promote: dev to staging" \
            --body "Automated promotion after successful dev deployment" \
            --label "auto-promotion"
```

## Safety Guardrails

Even with auto-merge, maintain safety:

1. **All CI checks must pass** - Never auto-merge if validation fails
2. **Time delays for stability** - Wait for `minimumReleaseAge` before merging dependency updates
3. **Blast radius limits** - Only auto-merge changes affecting a single service
4. **Rollback readiness** - Ensure the previous version can be restored quickly
5. **Monitoring hooks** - Auto-merge should trigger deployment monitoring
6. **Kill switch** - Maintain a way to disable auto-merge globally

```yaml
# Emergency: disable all auto-merge
# Create a file that blocks auto-merge
# .github/AUTO_MERGE_DISABLED
# When this file exists, no auto-merges are processed
```

Auto-merge policies let you move fast for routine changes while maintaining rigorous review for anything risky. The key is clearly defining what "low risk" means for your organization and enforcing those boundaries with automation. For more on ArgoCD automated sync policies, see our guide on [ArgoCD automated sync policy](https://oneuptime.com/blog/post/2026-01-30-argocd-automated-sync-policy/view).
