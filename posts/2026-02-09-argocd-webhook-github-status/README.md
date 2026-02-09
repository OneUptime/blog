# How to configure ArgoCD webhook notifications for GitHub commit status updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, GitHub, GitOps, Webhooks, CI/CD

Description: Learn how to configure ArgoCD webhook notifications to automatically update GitHub commit statuses, providing real-time deployment feedback directly in pull requests and commit interfaces for better GitOps visibility.

---

GitHub commit statuses show deployment state directly in your repository interface. By configuring ArgoCD to send webhook notifications that update commit statuses, you create tight integration between your Git workflow and deployment pipeline. This guide shows you how to implement GitHub status checks that reflect ArgoCD deployment results.

## Understanding GitHub Commit Statuses

GitHub commit statuses appear as checks on commits and pull requests. They show whether deployments succeeded, failed, or are in progress. Services can create multiple statuses per commit, each representing different stages or environments.

ArgoCD can update these statuses through the GitHub API, providing immediate feedback about deployment state without leaving the GitHub interface.

## Creating a GitHub App

Start by creating a GitHub App with permissions to update commit statuses:

1. Navigate to GitHub Settings > Developer settings > GitHub Apps > New GitHub App
2. Configure the app:
   - GitHub App name: ArgoCD Deployment Status
   - Homepage URL: Your ArgoCD instance URL
   - Webhook: Inactive (not needed for status updates)
   - Permissions: Repository > Commit statuses: Read & Write
3. Generate a private key and download it
4. Install the app on your repositories

Note the App ID and Installation ID for configuration.

## Configuring ArgoCD Notifications for GitHub

Store GitHub App credentials in a secret:

```bash
# Create secret with GitHub credentials
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=github-app-id=YOUR_APP_ID \
  --from-literal=github-installation-id=YOUR_INSTALLATION_ID \
  --from-file=github-private-key=path/to/private-key.pem
```

Configure the GitHub service in ArgoCD Notifications:

```yaml
# github-status-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # GitHub service configuration
  service.github: |
    appID: $github-app-id
    installationID: $github-installation-id
    privateKey: $github-private-key

  # Template for deployment started
  template.github-deployment-started: |
    message: |
      ArgoCD deployment started
    github:
      status:
        state: pending
        label: "continuous-delivery/argocd"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  # Template for successful deployment
  template.github-deployment-success: |
    message: |
      ArgoCD deployment succeeded
    github:
      status:
        state: success
        label: "continuous-delivery/argocd"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  # Template for failed deployment
  template.github-deployment-failure: |
    message: |
      ArgoCD deployment failed: {{.app.status.operationState.message}}
    github:
      status:
        state: error
        label: "continuous-delivery/argocd"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  # Template for degraded health
  template.github-health-degraded: |
    message: |
      Application health degraded
    github:
      status:
        state: failure
        label: "continuous-delivery/argocd-health"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  # Triggers for GitHub status updates
  trigger.on-deployment-started: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Running']
      oncePer: app.status.operationState.startedAt
      send: [github-deployment-started]

  trigger.on-deployment-success: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Succeeded']
      oncePer: app.status.operationState.finishedAt
      send: [github-deployment-success]

  trigger.on-deployment-failure: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Failed', 'Error']
      oncePer: app.status.operationState.finishedAt
      send: [github-deployment-failure]

  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      oncePer: app.status.sync.revision
      send: [github-health-degraded]
```

Apply the configuration:

```bash
kubectl apply -f github-status-config.yaml
```

## Subscribing Applications to GitHub Status Updates

Enable GitHub status notifications for applications:

```yaml
# application-with-github-status.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
  annotations:
    # Subscribe to GitHub status triggers
    notifications.argoproj.io/subscribe.on-deployment-started.github: ""
    notifications.argoproj.io/subscribe.on-deployment-success.github: ""
    notifications.argoproj.io/subscribe.on-deployment-failure.github: ""
    notifications.argoproj.io/subscribe.on-health-degraded.github: ""
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/application-manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

The empty string after the service name tells ArgoCD to use the commit SHA from the application's source repository.

## Environment-Specific Status Labels

Create different status labels for different environments:

```yaml
# multi-environment-github-status.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Production deployment status
  template.github-production-success: |
    message: |
      Production deployment succeeded
    github:
      status:
        state: success
        label: "argocd/production"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  # Staging deployment status
  template.github-staging-success: |
    message: |
      Staging deployment succeeded
    github:
      status:
        state: success
        label: "argocd/staging"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  # Development deployment status
  template.github-dev-success: |
    message: |
      Development deployment succeeded
    github:
      status:
        state: success
        label: "argocd/development"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  trigger.on-production-success: |
    - when: app.status.operationState.phase == 'Succeeded' and app.metadata.namespace == 'production'
      send: [github-production-success]

  trigger.on-staging-success: |
    - when: app.status.operationState.phase == 'Succeeded' and app.metadata.namespace == 'staging'
      send: [github-staging-success]

  trigger.on-dev-success: |
    - when: app.status.operationState.phase == 'Succeeded' and app.metadata.namespace == 'development'
      send: [github-dev-success]
```

Subscribe production, staging, and development applications to their respective triggers. This creates separate status checks for each environment in GitHub.

## Integrating with Pull Request Workflows

Configure status checks that block PR merges until successful deployment:

```yaml
# pr-deployment-status.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.github-pr-preview-deployed: |
    message: |
      Preview environment deployed successfully
    github:
      status:
        state: success
        label: "argocd/preview-environment"
        targetURL: "https://{{.app.metadata.name}}.preview.example.com"

  template.github-pr-preview-failed: |
    message: |
      Preview environment deployment failed
    github:
      status:
        state: failure
        label: "argocd/preview-environment"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"

  trigger.on-pr-preview-deployed: |
    - when: app.status.operationState.phase == 'Succeeded' and app.metadata.labels['preview'] == 'true'
      send: [github-pr-preview-deployed]

  trigger.on-pr-preview-failed: |
    - when: app.status.operationState.phase in ['Failed', 'Error'] and app.metadata.labels['preview'] == 'true'
      send: [github-pr-preview-failed]
```

Create preview environment applications with the preview label:

```yaml
# pr-preview-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app-pr-123
  namespace: argocd
  labels:
    preview: "true"
  annotations:
    notifications.argoproj.io/subscribe.on-pr-preview-deployed.github: ""
    notifications.argoproj.io/subscribe.on-pr-preview-failed.github: ""
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/application-manifests
    targetRevision: pr-123
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo-pr-123
```

Configure GitHub branch protection to require the ArgoCD status check before merging.

## Detailed Status Descriptions

Provide comprehensive status descriptions with deployment details:

```yaml
# detailed-status-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.github-detailed-success: |
    message: |
      Deployment completed successfully
    github:
      status:
        state: success
        label: "argocd/deployment"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
        description: |
          Deployed {{.app.status.sync.revision | trunc 7}} to {{.app.spec.destination.namespace}}
          Health: {{.app.status.health.status}}
          Synced at: {{.app.status.operationState.finishedAt}}

  template.github-detailed-failure: |
    message: |
      Deployment failed
    github:
      status:
        state: error
        label: "argocd/deployment"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
        description: |
          Failed to deploy {{.app.status.sync.revision | trunc 7}}
          Error: {{.app.status.operationState.message | trunc 100}}
          Check ArgoCD for details

  template.github-sync-progress: |
    message: |
      Deployment in progress
    github:
      status:
        state: pending
        label: "argocd/deployment"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
        description: |
          Deploying {{.app.status.sync.revision | trunc 7}} to {{.app.spec.destination.namespace}}
          Started at: {{.app.status.operationState.startedAt}}
```

These descriptions appear in the GitHub UI, providing context without requiring users to open ArgoCD.

## Monorepo Path-Specific Status Updates

For monorepos, create status checks per application path:

```yaml
# monorepo-status-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.github-monorepo-status: |
    message: |
      Deployment status for {{.app.spec.source.path}}
    github:
      status:
        state: "{{- if eq .app.status.operationState.phase \"Succeeded\"}}success{{- else if eq .app.status.operationState.phase \"Failed\"}}failure{{- else}}pending{{- end}}"
        label: "argocd/{{.app.spec.source.path}}"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
        description: |
          Path: {{.app.spec.source.path}}
          Status: {{.app.status.operationState.phase}}
          Health: {{.app.status.health.status}}

  trigger.on-monorepo-sync: |
    - when: app.status.operationState != nil
      oncePer: app.status.operationState.finishedAt
      send: [github-monorepo-status]
```

This creates unique status checks for each application in your monorepo, making it clear which components deployed successfully.

## Webhook Endpoint for Bidirectional Integration

While ArgoCD Notifications push status to GitHub, you can also configure webhooks for GitHub to trigger syncs:

```yaml
# github-webhook-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-webhook-secret
  namespace: argocd
type: Opaque
stringData:
  webhook.github.secret: your-webhook-secret
```

Configure the webhook in ArgoCD:

```bash
# Add webhook configuration to argocd-cm
kubectl patch configmap argocd-cm -n argocd --type merge -p '{
  "data": {
    "webhook.github.secret": "github-webhook-secret"
  }
}'
```

Set up the webhook in GitHub repository settings:
- Payload URL: `https://argocd.example.com/api/webhook`
- Content type: `application/json`
- Secret: Your webhook secret
- Events: Push events, Pull request events

This enables push-based synchronization in addition to status updates.

## Monitoring GitHub Status Updates

Track status update delivery:

```bash
# Check notification controller logs for GitHub updates
kubectl logs -n argocd deployment/argocd-notifications-controller -f | grep github

# View recent notifications
kubectl get events -n argocd --field-selector involvedObject.name=argocd-notifications-controller

# Check for failed notifications
kubectl logs -n argocd deployment/argocd-notifications-controller | grep -i error
```

Monitor GitHub API rate limits to ensure you don't exceed quotas:

```yaml
# prometheus-github-metrics.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-notifications
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-notifications-controller
  endpoints:
    - port: metrics
      interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-github-alerts
  namespace: argocd
spec:
  groups:
    - name: github-status-updates
      rules:
        - alert: GitHubStatusUpdateFailures
          expr: rate(argocd_notifications_deliveries_total{service="github",status="failed"}[5m]) > 0.1
          annotations:
            summary: "High rate of GitHub status update failures"
```

## Testing GitHub Status Integration

Verify status updates work correctly:

```bash
# Trigger a sync to test status updates
argocd app sync demo-app

# Check GitHub commit status
gh api repos/your-org/your-repo/commits/COMMIT_SHA/statuses

# Verify status appears in PR
gh pr view 123 --json statusCheckRollup

# Test failure scenario
kubectl delete deployment demo-app -n demo
argocd app sync demo-app

# Verify error status appears in GitHub
```

Automate testing with GitHub Actions:

```yaml
# .github/workflows/test-argocd-status.yaml
name: Test ArgoCD Status Integration
on:
  push:
    branches: [main]
jobs:
  verify-status:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Wait for ArgoCD status
        uses: fountainhead/action-wait-for-check@v1.1.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          checkName: "continuous-delivery/argocd"
          timeoutSeconds: 600
      - name: Verify deployment succeeded
        run: |
          if gh api repos/${{ github.repository }}/commits/${{ github.sha }}/statuses | \
             jq -e '.[] | select(.context=="continuous-delivery/argocd" and .state=="success")'; then
            echo "ArgoCD deployment succeeded"
          else
            echo "ArgoCD deployment failed or not found"
            exit 1
          fi
```

## Best Practices

Use descriptive status labels that clearly indicate what they represent: environment, component, or stage.

Keep status descriptions concise but informative. GitHub truncates long descriptions in the UI.

Implement status checks for critical paths only. Too many checks create noise.

Configure appropriate timeouts for status updates. Long-running deployments need longer pending states.

Monitor GitHub API rate limits. Frequent status updates can consume quota quickly.

Test status integration thoroughly in development before enabling in production repositories.

Use different GitHub Apps for different environments to isolate credentials and permissions.

Document which status checks are required for PR merges so contributors understand expectations.

Implement fallback notifications when GitHub status updates fail to ensure visibility isn't lost.

## Conclusion

GitHub commit status integration with ArgoCD creates seamless visibility between Git repositories and Kubernetes deployments. By configuring webhook notifications that update commit statuses, you bring deployment feedback directly into developer workflows, reducing context switching and improving deployment awareness. This integration strengthens GitOps practices by making the deployment state visible where developers already work, encouraging better collaboration between development and operations teams while maintaining deployment quality through automated status checks.
