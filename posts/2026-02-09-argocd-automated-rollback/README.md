# How to configure ArgoCD automated rollback on deployment failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, Rollback, Reliability

Description: Learn how to configure automated rollback mechanisms in ArgoCD to automatically revert failed deployments, ensuring system reliability and minimizing downtime in Kubernetes GitOps workflows.

---

Automated rollbacks protect production systems from bad deployments. When a new version fails health checks or encounters errors during sync, ArgoCD can automatically revert to the previous working state. This guide shows you how to implement automated rollback strategies that keep your applications reliable while maintaining GitOps principles.

## Understanding ArgoCD Rollback Mechanisms

ArgoCD tracks application history and can revert to previous versions. However, true GitOps requires Git as the single source of truth. Automated rollbacks must balance immediate recovery with maintaining Git integrity.

ArgoCD provides several rollback approaches: manual rollbacks through the UI or CLI, automated rollbacks using sync hooks and health checks, and Git-based rollbacks that update the repository automatically.

## Rollback with Sync Failure Detection

Configure applications to detect sync failures and trigger rollbacks:

```yaml
# application-with-rollback.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 1m
```

While this configuration retries failed syncs, it doesn't automatically roll back. For true automated rollbacks, you need additional mechanisms.

## Health-Based Rollback with Hooks

Implement automated rollback using PostSync hooks that check application health:

```yaml
# postsync-health-check.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: health-check-rollback
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 0  # Don't retry, fail fast
  activeDeadlineSeconds: 300  # 5 minute timeout
  template:
    spec:
      serviceAccountName: rollback-sa
      restartPolicy: Never
      containers:
        - name: health-check
          image: bitnami/kubectl:latest
          command:
            - sh
            - -c
            - |
              # Wait for deployment to be ready
              echo "Waiting for deployment to be ready..."
              if ! kubectl rollout status deployment/demo-app -n demo --timeout=3m; then
                echo "Deployment failed to become ready"
                exit 1
              fi

              # Check application health endpoint
              echo "Checking application health..."
              for i in $(seq 1 10); do
                response=$(kubectl run curl-test --image=curlimages/curl:latest \
                  --restart=Never --rm -i --quiet -- \
                  curl -s -o /dev/null -w "%{http_code}" \
                  http://demo-app:8080/health)

                if [ "$response" = "200" ]; then
                  echo "Health check passed"

                  # Run smoke tests
                  echo "Running smoke tests..."
                  if kubectl run smoke-test --image=your-test-image:latest \
                    --restart=Never --rm -i -- ./run-smoke-tests.sh; then
                    echo "All checks passed"
                    exit 0
                  else
                    echo "Smoke tests failed, triggering rollback"
                    exit 1
                  fi
                fi

                echo "Health check attempt $i failed, retrying..."
                sleep 10
              done

              echo "Health check failed after 10 attempts"
              exit 1
---
# SyncFail hook to rollback on failure
apiVersion: batch/v1
kind: Job
metadata:
  name: auto-rollback
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      serviceAccountName: rollback-sa
      restartPolicy: Never
      containers:
        - name: rollback
          image: argoproj/argocd:latest
          command:
            - sh
            - -c
            - |
              # Get previous successful revision
              PREV_REVISION=$(argocd app history demo-app -o json | \
                jq -r '.[] | select(.status=="Synced") | .revision' | \
                head -n 1)

              if [ -z "$PREV_REVISION" ]; then
                echo "No previous successful revision found"
                exit 1
              fi

              echo "Rolling back to revision: $PREV_REVISION"

              # Perform rollback
              argocd app rollback demo-app "$PREV_REVISION" --prune

              echo "Rollback initiated to revision $PREV_REVISION"
          env:
            - name: ARGOCD_SERVER
              value: argocd-server:443
            - name: ARGOCD_AUTH_TOKEN
              valueFrom:
                secretKeyRef:
                  name: argocd-token
                  key: token
```

Create the service account with necessary permissions:

```yaml
# rollback-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rollback-sa
  namespace: demo
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rollback-role
  namespace: demo
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "create", "delete"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rollback-rolebinding
  namespace: demo
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: rollback-role
subjects:
  - kind: ServiceAccount
    name: rollback-sa
    namespace: demo
```

## Git-Based Automated Rollback

Implement true GitOps rollback by reverting Git commits on failure:

```yaml
# git-rollback-hook.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: git-rollback
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: git-revert
          image: alpine/git:latest
          command:
            - sh
            - -c
            - |
              # Clone repository
              git clone https://github.com/your-org/manifests /repo
              cd /repo

              # Configure git
              git config user.name "ArgoCD Rollback Bot"
              git config user.email "argocd-rollback@example.com"

              # Get the commit that caused the failure
              FAILED_COMMIT=$(git log -1 --format="%H")

              echo "Reverting commit: $FAILED_COMMIT"

              # Revert the commit
              git revert --no-edit $FAILED_COMMIT

              # Push the revert
              git push origin main

              echo "Rollback commit pushed to Git"

              # Notify team
              curl -X POST https://hooks.slack.com/YOUR_WEBHOOK \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"Automated rollback: reverted commit $FAILED_COMMIT due to deployment failure\"}"
          env:
            - name: GIT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: git-credentials
                  key: username
            - name: GIT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: git-credentials
                  key: password
```

This approach maintains Git as the source of truth while providing automated recovery.

## Progressive Delivery with Argo Rollouts

For sophisticated rollback strategies, integrate Argo Rollouts with ArgoCD:

```yaml
# rollout-with-automatic-rollback.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: demo-app
  namespace: demo
spec:
  replicas: 5
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: app
          image: your-app:v2.0.0
          ports:
            - containerPort: 8080
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: {duration: 1m}
        - setWeight: 40
        - pause: {duration: 1m}
        - setWeight: 60
        - pause: {duration: 1m}
        - setWeight: 80
        - pause: {duration: 1m}
      # Automatic rollback on metric failure
      trafficRouting:
        istio:
          virtualService:
            name: demo-app
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 1
        args:
          - name: service-name
            value: demo-app
---
# Analysis template for automated rollback decision
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: demo
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result >= 0.95
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"2.."}[1m])) /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[1m]))
    - name: error-rate
      interval: 1m
      successCondition: result <= 0.05
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"5.."}[1m])) /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[1m]))
```

ArgoCD manages the Rollout resource, and Argo Rollouts automatically rolls back when metrics fail.

## Notification Integration for Rollbacks

Send alerts when automated rollbacks occur:

```yaml
# rollback-notification-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-failed-rollback: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [rollback-alert]

  template.rollback-alert: |
    message: |
      ALERT: Deployment failed for {{.app.metadata.name}}
      Status: {{.app.status.operationState.phase}}
      Message: {{.app.status.operationState.message}}

      Automated rollback has been triggered.

      Please investigate: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}
    slack:
      attachments: |
        [{
          "title": "Deployment Failure - Automated Rollback",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "color": "#E96D76",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Status",
              "value": "{{.app.status.operationState.phase}}",
              "short": true
            },
            {
              "title": "Message",
              "value": "{{.app.status.operationState.message}}",
              "short": false
            }
          ]
        }]
    email:
      subject: "ALERT: Automated Rollback - {{.app.metadata.name}}"
```

Subscribe applications to rollback notifications:

```yaml
# application-with-rollback-notifications.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed-rollback.slack: incidents
    notifications.argoproj.io/subscribe.on-sync-failed-rollback.email: oncall@example.com
spec:
  # ... application spec
```

## Rollback Testing Strategy

Test rollback mechanisms regularly:

```bash
# Deploy a known-bad version to trigger rollback
kubectl set image deployment/demo-app app=your-app:bad-version -n demo

# Watch ArgoCD detect the issue
argocd app get demo-app --refresh

# Monitor rollback execution
kubectl get jobs -n demo -w

# Verify application recovered
kubectl rollout status deployment/demo-app -n demo

# Check rollback history
argocd app history demo-app
```

Schedule regular chaos engineering tests to verify rollback functionality.

## Multi-Stage Rollback Strategy

Implement progressive rollback across environments:

```yaml
# staging-with-aggressive-rollback.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 1  # Fail fast in staging
      backoff:
        duration: 5s
---
# production-with-conservative-rollback.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 5  # More retries in production
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
```

Different retry strategies provide environment-appropriate rollback behavior.

## Rollback Metrics and Monitoring

Track rollback frequency and success:

```bash
# Monitor rollback jobs
kubectl get jobs -n demo -l rollback=true

# Count rollback events
kubectl get events -n demo --field-selector reason=RollbackTriggered

# Check ArgoCD application sync history
argocd app history demo-app --output json | \
  jq '.[] | select(.status=="Failed")'
```

Set up alerts for high rollback frequency:

```yaml
# prometheus-rollback-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-rollback-alerts
spec:
  groups:
    - name: argocd-rollbacks
      rules:
        - alert: HighRollbackRate
          expr: |
            rate(argocd_app_sync_total{phase="Failed"}[1h]) > 0.1
          for: 5m
          annotations:
            summary: "High rollback rate detected"
            description: "Application {{ $labels.name }} has frequent rollbacks"
```

## Best Practices

Test rollback mechanisms in non-production environments before enabling in production. Failed rollbacks can compound issues.

Always maintain Git as the source of truth. Rollbacks that only affect cluster state create drift.

Document rollback procedures clearly so teams understand automated behavior.

Set appropriate timeouts for health checks. Too short causes false positives, too long delays recovery.

Monitor rollback frequency as a quality metric. Frequent rollbacks indicate deeper issues.

Implement circuit breakers to stop automatic rollbacks after repeated failures. This prevents infinite rollback loops.

Notify teams immediately when automated rollbacks occur. Human investigation should follow automation.

Keep rollback windows reasonable. Very old versions may have incompatible schemas or dependencies.

Combine automated rollbacks with progressive delivery for safer deployments with automatic quality gates.

## Conclusion

Automated rollbacks in ArgoCD provide critical safety nets for production deployments. By combining health checks, sync hooks, and Git-based reverts, you create systems that automatically recover from bad deployments while maintaining GitOps principles. Proper rollback implementation reduces mean time to recovery, prevents extended outages, and gives teams confidence to deploy frequently. Remember that automated rollbacks are part of a broader reliability strategy that includes testing, progressive delivery, and comprehensive monitoring to catch issues before they reach production.
