# How to Automate Dapr Upgrades with CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CI/CD, Automation, GitHub Action, Upgrade

Description: Learn how to automate Dapr version upgrades using GitHub Actions and ArgoCD, with automated compatibility testing and staged rollout to production.

---

## Automating Dapr Upgrades

Manual Dapr upgrades are error-prone and time-consuming. Automating the upgrade pipeline ensures upgrades happen consistently, are validated before reaching production, and can be triggered without manual intervention. The pipeline should: detect new versions, upgrade staging, run tests, and promote to production with approval gates.

## GitHub Actions - Automated Version Detection

Detect new Dapr releases and open an upgrade pull request:

```yaml
# .github/workflows/dapr-upgrade-detect.yaml
name: Detect Dapr Version Updates
on:
  schedule:
  - cron: "0 8 * * 1"
  workflow_dispatch: {}

jobs:
  check-version:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Get latest Dapr version
      id: latest
      run: |
        LATEST=$(curl -s https://api.github.com/repos/dapr/dapr/releases/latest | jq -r '.tag_name' | tr -d 'v')
        echo "version=$LATEST" >> $GITHUB_OUTPUT

    - name: Get current version from Helm values
      id: current
      run: |
        CURRENT=$(grep "daprVersion:" infrastructure/helm/values.yaml | awk '{print $2}')
        echo "version=$CURRENT" >> $GITHUB_OUTPUT

    - name: Create upgrade PR if version differs
      if: steps.latest.outputs.version != steps.current.outputs.version
      run: |
        git config user.name "upgrade-bot"
        git config user.email "upgrade-bot@myorg.com"
        git checkout -b "upgrade/dapr-${{ steps.latest.outputs.version }}"
        sed -i "s/daprVersion: .*/daprVersion: ${{ steps.latest.outputs.version }}/" \
          infrastructure/helm/values.yaml
        git add infrastructure/helm/values.yaml
        git commit -m "upgrade: Dapr ${{ steps.current.outputs.version }} to ${{ steps.latest.outputs.version }}"
        git push origin HEAD
        gh pr create \
          --title "Upgrade Dapr to v${{ steps.latest.outputs.version }}" \
          --body "Automated Dapr upgrade PR. Review release notes before merging." \
          --label "upgrade,dapr"
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Staging Upgrade Pipeline

Automatically upgrade staging when an upgrade PR is merged:

```yaml
# .github/workflows/dapr-upgrade-staging.yaml
name: Upgrade Dapr in Staging
on:
  push:
    branches: [main]
    paths:
    - "infrastructure/helm/values.yaml"

jobs:
  upgrade-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v4
      with:
        kubeconfig: ${{ secrets.STAGING_KUBECONFIG }}

    - name: Extract target version
      id: version
      run: |
        VERSION=$(grep "daprVersion:" infrastructure/helm/values.yaml | awk '{print $2}')
        echo "version=$VERSION" >> $GITHUB_OUTPUT

    - name: Backup Dapr config
      run: |
        kubectl get components,configurations,subscriptions --all-namespaces \
          -o yaml > dapr-staging-backup-$(date +%Y%m%d).yaml

    - name: Upgrade Dapr in staging
      run: |
        helm repo add dapr https://dapr.github.io/helm-charts/
        helm repo update
        helm upgrade dapr dapr/dapr \
          --namespace dapr-system \
          --version ${{ steps.version.outputs.version }} \
          --atomic --wait --timeout 15m

    - name: Restart staging services
      run: kubectl rollout restart deployment -n staging

    - name: Run compatibility tests
      run: |
        kubectl wait --for=condition=available deployment --all -n staging --timeout=5m
        pytest tests/compat/ -v --junitxml=reports/staging-compat.xml

    - name: Upload test results
      uses: actions/upload-artifact@v4
      with:
        name: staging-compat-results
        path: reports/staging-compat.xml
```

## Production Promotion with Manual Approval

Require human approval before promoting to production:

```yaml
# .github/workflows/dapr-upgrade-production.yaml
name: Upgrade Dapr in Production
on:
  workflow_dispatch:
    inputs:
      version:
        description: "Dapr version to deploy"
        required: true

jobs:
  upgrade-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v4
      with:
        kubeconfig: ${{ secrets.PRODUCTION_KUBECONFIG }}

    - name: Add Dapr Helm repo
      run: |
        helm repo add dapr https://dapr.github.io/helm-charts/
        helm repo update

    - name: Upgrade Dapr in production
      run: |
        helm upgrade dapr dapr/dapr \
          --namespace dapr-system \
          --version ${{ inputs.version }} \
          --atomic --wait --timeout 15m

    - name: Rolling restart of production services
      run: |
        for ns in production production-critical; do
          kubectl rollout restart deployment -n "$ns"
          kubectl rollout status deployment -n "$ns" --timeout=10m
        done

    - name: Notify Slack on success
      if: success()
      run: |
        curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
          -H "Content-Type: application/json" \
          -d '{"text": "Dapr upgraded to ${{ inputs.version }} in production"}'
```

## Summary

Automating Dapr upgrades with CI/CD requires three pipeline stages: automated version detection that opens upgrade pull requests, a staging pipeline triggered by merged PRs that upgrades staging and runs compatibility tests, and a production promotion workflow with manual approval gates. Store the target Dapr version in infrastructure-as-code (Helm values), use `helm upgrade --atomic` to auto-rollback on failure, and notify your team via Slack or PagerDuty on upgrade completion or failure.
