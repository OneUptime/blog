# How to Use Resource Health for Automated Rollbacks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Rollback, Deployment Safety

Description: Learn how to combine ArgoCD resource health checks with automated rollback strategies to automatically revert failed deployments when health degrades after a sync operation.

---

One of the most powerful applications of ArgoCD's health check system is using it to drive automated rollbacks. When a deployment goes bad and resources start reporting degraded health, you want the system to react without waiting for a human to notice and intervene. ArgoCD does not have a one-click "auto rollback on health failure" feature, but you can build this behavior using a combination of health checks, sync strategies, and integration with Argo Rollouts or external automation.

This guide covers several approaches to achieving automated rollbacks based on resource health in ArgoCD.

## Understanding the Building Blocks

Automated rollback in ArgoCD depends on three things working together:

1. **Accurate health checks** that detect failures quickly
2. **A rollback mechanism** that can revert changes
3. **A trigger** that connects health degradation to the rollback action

```mermaid
flowchart LR
    A[Sync completes] --> B[Health checks run]
    B --> C{Health status?}
    C -->|Healthy| D[Done - deployment succeeded]
    C -->|Degraded| E[Trigger rollback]
    C -->|Progressing| F[Wait with timeout]
    F --> B
    E --> G[Revert to last healthy state]
```

## Approach 1: Git Revert Strategy

The purest GitOps approach to rollback is reverting the Git commit that caused the problem. This keeps Git as the single source of truth and naturally triggers ArgoCD to sync back to the previous state.

You can automate this with a PostSync hook that checks health and triggers a Git revert if health is degraded:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: health-gate-rollback
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      serviceAccountName: rollback-sa
      containers:
        - name: health-check
          image: bitnami/kubectl:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Waiting for deployment to stabilize..."
              sleep 60

              # Check if the deployment is healthy
              AVAILABLE=$(kubectl get deployment my-app -n default -o jsonpath='{.status.availableReplicas}')
              DESIRED=$(kubectl get deployment my-app -n default -o jsonpath='{.spec.replicas}')

              if [ "$AVAILABLE" != "$DESIRED" ]; then
                echo "Deployment unhealthy: $AVAILABLE/$DESIRED replicas available"
                echo "Health check failed - manual intervention required"
                exit 1
              fi

              echo "Deployment healthy: $AVAILABLE/$DESIRED replicas available"
              exit 0
      restartPolicy: Never
  backoffLimit: 0
```

When this PostSync job fails, ArgoCD marks the sync as failed. Combine this with a SyncFail hook to trigger the actual rollback:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auto-revert
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: git-revert
          image: alpine/git:latest
          env:
            - name: GIT_REPO
              value: "https://github.com/myorg/myrepo.git"
            - name: GIT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: git-credentials
                  key: token
          command:
            - /bin/sh
            - -c
            - |
              git clone https://token:${GIT_TOKEN}@github.com/myorg/myrepo.git /workspace
              cd /workspace
              git config user.email "argocd@myorg.com"
              git config user.name "ArgoCD Auto-Rollback"
              git revert HEAD --no-edit
              git push origin main
              echo "Reverted last commit due to failed health check"
      restartPolicy: Never
  backoffLimit: 0
```

## Approach 2: Argo Rollouts with Analysis

The most robust approach to automated rollbacks is using Argo Rollouts. Rollouts integrates directly with ArgoCD and provides built-in analysis that can automatically abort and roll back a deployment based on metrics.

First, replace your Deployment with a Rollout:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: { duration: 60s }
        - analysis:
            templates:
              - templateName: health-check-analysis
        - setWeight: 50
        - pause: { duration: 60s }
        - analysis:
            templates:
              - templateName: health-check-analysis
        - setWeight: 100
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          ports:
            - containerPort: 8080
```

Create an AnalysisTemplate that checks health metrics:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: health-check-analysis
  namespace: default
spec:
  metrics:
    - name: success-rate
      interval: 10s
      count: 5
      successCondition: result[0] >= 0.95
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{app="my-app",status=~"2.."}[1m]))
            /
            sum(rate(http_requests_total{app="my-app"}[1m]))
    - name: pod-health
      interval: 10s
      count: 5
      successCondition: result[0] == 1
      failureLimit: 1
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            kube_deployment_status_replicas_available{deployment="my-app"}
            /
            kube_deployment_spec_replicas{deployment="my-app"}
```

When the analysis fails, Argo Rollouts automatically rolls back to the previous stable version.

## Approach 3: ArgoCD Notification-Driven Rollback

Use ArgoCD notifications to trigger a rollback when health degrades. Configure a webhook notification that calls an external service:

```yaml
# argocd-notifications-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [rollback-webhook]

  template.rollback-webhook: |
    webhook:
      rollback-service:
        method: POST
        body: |
          {
            "app": "{{.app.metadata.name}}",
            "namespace": "{{.app.spec.destination.namespace}}",
            "health": "{{.app.status.health.status}}",
            "revision": "{{.app.status.sync.revision}}",
            "previousRevision": "{{.app.status.history | last | .revision}}"
          }

  service.webhook.rollback-service: |
    url: https://rollback-service.internal/api/rollback
    headers:
      - name: Authorization
        value: Bearer $webhook-token
```

Then annotate your application to subscribe to this trigger:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    notifications.argoproj.io/subscribe.on-health-degraded.rollback-service: ""
```

The external rollback service would receive the webhook and use the ArgoCD API to roll back:

```bash
# The external service calls this
argocd app rollback my-app <previous-revision-id>
```

## Approach 4: ArgoCD History-Based Rollback Script

You can run a CronJob or controller that monitors ArgoCD application health and triggers rollbacks using the ArgoCD API:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: health-rollback-monitor
  namespace: argocd
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-rollback
          containers:
            - name: monitor
              image: argoproj/argocd:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Login to ArgoCD
                  argocd login argocd-server.argocd --insecure \
                    --username admin \
                    --password $(cat /etc/argocd/password)

                  # Check health of specific apps
                  HEALTH=$(argocd app get my-app -o json | jq -r '.status.health.status')

                  if [ "$HEALTH" = "Degraded" ]; then
                    echo "App is degraded, checking sync history..."
                    # Get the previous successful revision
                    PREV_ID=$(argocd app history my-app -o json | jq -r '.[1].id')
                    if [ -n "$PREV_ID" ]; then
                      echo "Rolling back to revision $PREV_ID"
                      argocd app rollback my-app "$PREV_ID"
                    fi
                  fi
          restartPolicy: OnFailure
```

## Choosing the Right Approach

| Approach | Complexity | GitOps Purity | Speed | Best For |
|----------|-----------|---------------|-------|----------|
| Git Revert | Medium | High | Slow (full sync cycle) | Small teams, simple apps |
| Argo Rollouts | High | High | Fast (canary/blue-green) | Production workloads |
| Notifications | Medium | Medium | Medium | Multi-tool environments |
| CronJob Monitor | Low | Low | Slow (polling interval) | Quick prototyping |

For production environments, I strongly recommend Argo Rollouts. It gives you the most control over the rollback process and integrates cleanly with ArgoCD's health system.

## Important Considerations

**Health check accuracy matters**: Automated rollbacks are only as good as your health checks. A false positive (marking a healthy deployment as degraded) will cause unnecessary rollbacks. A false negative (marking a broken deployment as healthy) will let bad deployments stay. Invest time in getting your health checks right before enabling automation.

**Rollback loops**: Be careful about creating rollback loops where a rollback triggers another sync that triggers another rollback. Use annotations or labels to mark rollback syncs and skip health-triggered rollbacks for those.

**Partial failures**: Sometimes only some resources in an application are degraded. Make sure your rollback logic accounts for this and does not unnecessarily roll back the entire application.

For more on ArgoCD's rollback capabilities, see [how to create custom rollback actions](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-rollback-actions/view). For setting up health checks, check out how to understand built-in health checks in ArgoCD.
