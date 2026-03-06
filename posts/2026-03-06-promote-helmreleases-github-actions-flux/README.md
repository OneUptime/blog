# How to Promote HelmReleases with GitHub Actions and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, github actions, helm, helmrelease, promotion, staging, production, gitops

Description: Learn how to implement a staging-to-production promotion workflow for HelmReleases using GitHub Actions and Flux CD with PR-based approvals.

---

## Introduction

Promoting applications from staging to production is a critical part of any deployment pipeline. With Flux CD and Helm, you can manage releases across environments using HelmReleases. By adding GitHub Actions to the mix, you can automate the promotion process through pull requests, giving your team a clear, auditable path from staging to production.

This guide covers setting up a multi-environment Flux configuration with HelmReleases and automating promotions through GitHub Actions.

## Prerequisites

- A Kubernetes cluster for each environment (staging and production), both with Flux CD bootstrapped
- Helm charts for your applications
- A GitHub repository for Flux configuration
- Flux CLI installed locally

## Repository Structure

Organize your Flux configuration repository to support multiple environments:

```
flux-config/
  clusters/
    staging/
      flux-system/          # Flux bootstrap manifests
      apps.yaml             # Kustomization pointing to apps/staging
      infrastructure.yaml   # Kustomization pointing to infrastructure
    production/
      flux-system/          # Flux bootstrap manifests
      apps.yaml             # Kustomization pointing to apps/production
      infrastructure.yaml   # Kustomization pointing to infrastructure
  apps/
    staging/
      my-app.yaml           # HelmRelease for staging
    production/
      my-app.yaml           # HelmRelease for production
  charts/
    helmrepository.yaml     # Shared Helm repository sources
```

## Step 1: Create the Staging HelmRelease

Define the HelmRelease for the staging environment:

```yaml
# apps/staging/my-app.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-app
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    # Staging-specific configuration
    replicaCount: 2
    image:
      repository: ghcr.io/my-org/my-app
      tag: "1.2.0"
    ingress:
      enabled: true
      host: my-app.staging.example.com
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 250m
        memory: 256Mi
    env:
      - name: ENVIRONMENT
        value: staging
      - name: LOG_LEVEL
        value: debug
```

## Step 2: Create the Production HelmRelease

Define the production HelmRelease with production-specific values:

```yaml
# apps/production/my-app.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-app
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      # Production is pinned to a specific tested version
      version: "1.1.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    # Production-specific configuration
    replicaCount: 5
    image:
      repository: ghcr.io/my-org/my-app
      tag: "1.1.0"
    ingress:
      enabled: true
      host: my-app.example.com
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    env:
      - name: ENVIRONMENT
        value: production
      - name: LOG_LEVEL
        value: warn
    # Production-specific settings
    podDisruptionBudget:
      enabled: true
      minAvailable: 3
    autoscaling:
      enabled: true
      minReplicas: 5
      maxReplicas: 20
      targetCPUUtilization: 70
```

## Step 3: Create the Promotion Workflow

Build a GitHub Actions workflow that promotes a HelmRelease from staging to production via a pull request.

```yaml
# .github/workflows/promote-helmrelease.yaml
name: Promote HelmRelease to Production

on:
  workflow_dispatch:
    inputs:
      app-name:
        description: "Application name to promote"
        required: true
        type: string
      version:
        description: "Version to promote (leave empty to use current staging version)"
        required: false
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Get staging version
        id: staging
        run: |
          APP_NAME="${{ inputs.app-name }}"
          STAGING_FILE="apps/staging/${APP_NAME}.yaml"

          if [ ! -f "$STAGING_FILE" ]; then
            echo "Error: Staging file not found: $STAGING_FILE"
            exit 1
          fi

          # Extract the chart version from the staging HelmRelease
          CHART_VERSION=$(grep -A2 'chart:' "$STAGING_FILE" | grep 'version:' | head -1 | awk '{print $2}' | tr -d '"')
          IMAGE_TAG=$(grep -A2 'image:' "$STAGING_FILE" | grep 'tag:' | head -1 | awk '{print $2}' | tr -d '"')

          # Use the provided version or fall back to staging
          if [ -n "${{ inputs.version }}" ]; then
            PROMOTE_VERSION="${{ inputs.version }}"
          else
            PROMOTE_VERSION="$CHART_VERSION"
          fi

          echo "chart_version=$CHART_VERSION" >> $GITHUB_OUTPUT
          echo "image_tag=$IMAGE_TAG" >> $GITHUB_OUTPUT
          echo "promote_version=$PROMOTE_VERSION" >> $GITHUB_OUTPUT

          echo "Promoting $APP_NAME version $PROMOTE_VERSION from staging to production"

      - name: Get current production version
        id: production
        run: |
          APP_NAME="${{ inputs.app-name }}"
          PROD_FILE="apps/production/${APP_NAME}.yaml"

          if [ ! -f "$PROD_FILE" ]; then
            echo "Error: Production file not found: $PROD_FILE"
            exit 1
          fi

          CURRENT_VERSION=$(grep -A2 'chart:' "$PROD_FILE" | grep 'version:' | head -1 | awk '{print $2}' | tr -d '"')
          echo "current_version=$CURRENT_VERSION" >> $GITHUB_OUTPUT

      - name: Create promotion branch
        run: |
          BRANCH_NAME="promote/${{ inputs.app-name }}-${{ steps.staging.outputs.promote_version }}"
          git checkout -b "$BRANCH_NAME"
          echo "branch_name=$BRANCH_NAME" >> $GITHUB_ENV

      - name: Update production HelmRelease
        run: |
          APP_NAME="${{ inputs.app-name }}"
          PROD_FILE="apps/production/${APP_NAME}.yaml"
          VERSION="${{ steps.staging.outputs.promote_version }}"

          # Update the chart version
          sed -i "s/version: \".*\"/version: \"${VERSION}\"/" "$PROD_FILE"

          # Update the image tag to match
          sed -i "/image:/,/tag:/ s/tag: \".*\"/tag: \"${VERSION}\"/" "$PROD_FILE"

          echo "Updated $PROD_FILE to version $VERSION"
          cat "$PROD_FILE"

      - name: Commit and push changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add apps/production/
          git commit -m "promote: ${{ inputs.app-name }} ${{ steps.production.outputs.current_version }} -> ${{ steps.staging.outputs.promote_version }}"
          git push origin "${{ env.branch_name }}"

      - name: Create pull request
        run: |
          gh pr create \
            --title "Promote ${{ inputs.app-name }} to ${{ steps.staging.outputs.promote_version }} in production" \
            --head "${{ env.branch_name }}" \
            --base main \
            --body "$(cat <<'EOF'
          ## HelmRelease Promotion

          **Application:** ${{ inputs.app-name }}
          **Current Production Version:** ${{ steps.production.outputs.current_version }}
          **Promoting to Version:** ${{ steps.staging.outputs.promote_version }}

          ### Changes
          - Chart version: `${{ steps.production.outputs.current_version }}` -> `${{ steps.staging.outputs.promote_version }}`
          - Image tag: `${{ steps.staging.outputs.promote_version }}`

          ### Pre-Promotion Checklist
          - [ ] Version has been tested in staging
          - [ ] No regressions observed in staging metrics
          - [ ] Release notes reviewed
          - [ ] Rollback plan confirmed

          ### Rollback
          If issues are detected after promotion, revert this PR or manually update the production HelmRelease to the previous version.
          EOF
          )"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Step 4: Create an Automated Promotion Trigger

Automatically trigger promotion when staging tests pass:

```yaml
# .github/workflows/auto-promote.yaml
name: Auto-Promote After Staging Tests

on:
  # Trigger when a staging deployment succeeds
  repository_dispatch:
    types:
      - staging-deploy-success

jobs:
  run-staging-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run integration tests against staging
        run: |
          # Run your test suite against the staging environment
          echo "Running integration tests against staging..."

          # Example: run API tests
          # npm run test:integration -- --env staging

          # Example: run smoke tests
          # curl -f https://my-app.staging.example.com/health || exit 1

      - name: Trigger promotion if tests pass
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            // Trigger the promotion workflow
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'promote-helmrelease.yaml',
              ref: 'main',
              inputs: {
                'app-name': '${{ github.event.client_payload.app_name }}',
                'version': '${{ github.event.client_payload.version }}'
              }
            });
```

## Step 5: Add Promotion Validation

Create a validation workflow that runs when a promotion PR is created:

```yaml
# .github/workflows/validate-promotion.yaml
name: Validate Promotion

on:
  pull_request:
    branches:
      - main
    paths:
      - "apps/production/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Validate HelmRelease manifests
        run: |
          # Validate all production HelmRelease files
          for file in apps/production/*.yaml; do
            echo "Validating $file"
            flux build kustomization apps \
              --path ./apps/production \
              --dry-run 2>&1 || true

            # Basic YAML validation
            python3 -c "import yaml; yaml.safe_load(open('$file'))"
            echo "  Valid YAML"
          done

      - name: Compare staging and production configs
        run: |
          # Show the diff between staging and production for review
          echo "=== Configuration Differences ==="
          for prod_file in apps/production/*.yaml; do
            app_name=$(basename "$prod_file")
            staging_file="apps/staging/$app_name"
            if [ -f "$staging_file" ]; then
              echo "--- $app_name ---"
              diff "$staging_file" "$prod_file" || true
              echo ""
            fi
          done

      - name: Check version consistency
        run: |
          # Verify chart version and image tag are consistent
          for file in apps/production/*.yaml; do
            CHART_VER=$(grep -A2 'chart:' "$file" | grep 'version:' | head -1 | awk '{print $2}' | tr -d '"')
            IMAGE_TAG=$(grep -A2 'image:' "$file" | grep 'tag:' | head -1 | awk '{print $2}' | tr -d '"')

            echo "File: $file"
            echo "  Chart version: $CHART_VER"
            echo "  Image tag: $IMAGE_TAG"

            if [ "$CHART_VER" != "$IMAGE_TAG" ]; then
              echo "  WARNING: Chart version and image tag do not match"
            fi
          done
```

## Step 6: Configure Flux Notifications for Promotions

Set up Flux to notify your team when a promoted HelmRelease is deployed:

```yaml
# clusters/production/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: production-deployments
  secretRef:
    name: slack-webhook

---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: helmrelease-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: my-app
  # Only alert on specific event reasons
  inclusionList:
    - ".*succeeded.*"
    - ".*failed.*"
```

## Step 7: Add Rollback Support

Create a workflow for quick rollbacks:

```yaml
# .github/workflows/rollback-helmrelease.yaml
name: Rollback HelmRelease

on:
  workflow_dispatch:
    inputs:
      app-name:
        description: "Application name to rollback"
        required: true
        type: string
      target-version:
        description: "Version to rollback to"
        required: true
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Create rollback branch
        run: |
          BRANCH="rollback/${{ inputs.app-name }}-${{ inputs.target-version }}"
          git checkout -b "$BRANCH"
          echo "branch=$BRANCH" >> $GITHUB_ENV

      - name: Update production HelmRelease
        run: |
          PROD_FILE="apps/production/${{ inputs.app-name }}.yaml"
          VERSION="${{ inputs.target-version }}"

          # Revert to the target version
          sed -i "s/version: \".*\"/version: \"${VERSION}\"/" "$PROD_FILE"
          sed -i "/image:/,/tag:/ s/tag: \".*\"/tag: \"${VERSION}\"/" "$PROD_FILE"

      - name: Commit, push, and create PR
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add apps/production/
          git commit -m "rollback: ${{ inputs.app-name }} to ${{ inputs.target-version }}"
          git push origin "${{ env.branch }}"

          gh pr create \
            --title "ROLLBACK: ${{ inputs.app-name }} to ${{ inputs.target-version }}" \
            --head "${{ env.branch }}" \
            --base main \
            --label "rollback,urgent" \
            --body "$(cat <<'EOF'
          ## Emergency Rollback

          **Application:** ${{ inputs.app-name }}
          **Rolling back to:** ${{ inputs.target-version }}

          This is a rollback PR. Please review and merge promptly.
          EOF
          )"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Step 8: Verify the Promotion Workflow

Test the end-to-end promotion flow:

```bash
# Trigger the promotion workflow manually
gh workflow run promote-helmrelease.yaml \
  -f app-name=my-app \
  -f version=1.2.0

# Watch the workflow run
gh run watch

# Check the PR was created
gh pr list

# After merging, verify Flux deploys the update
flux get helmreleases -n my-app --watch

# Check the Helm release status
kubectl get helmrelease -n my-app
```

## Troubleshooting

### Promotion PR Has Conflicts

```bash
# Rebase the promotion branch on main
git checkout promote/my-app-1.2.0
git rebase origin/main
git push --force-with-lease origin promote/my-app-1.2.0
```

### HelmRelease Not Upgrading

```bash
# Check the HelmRelease status
flux get helmreleases -n my-app

# Force a reconciliation
flux reconcile helmrelease my-app -n my-app

# Check Helm controller logs
kubectl logs -n flux-system deployment/helm-controller | grep my-app
```

## Conclusion

You now have a complete HelmRelease promotion pipeline that moves releases from staging to production through pull requests. This approach provides clear visibility into what is being deployed, enforces review requirements, and maintains a full audit trail of promotions. The rollback workflow ensures you can quickly revert if issues arise after promotion.
