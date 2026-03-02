# How to Implement Deployment Rate Limiting with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Rate Limiting, Deployment

Description: Learn how to implement deployment rate limiting with ArgoCD to prevent deployment storms, control rollout velocity, and protect production stability during busy periods.

---

In large organizations, dozens of teams might deploy simultaneously. Without rate limiting, this creates deployment storms where too many services change at once, making it impossible to isolate the cause of issues. ArgoCD provides several mechanisms to control deployment velocity and prevent these storms.

This guide covers strategies for rate limiting deployments in ArgoCD to keep your production environment stable.

## Why Rate Limit Deployments

Deployment storms cause several problems:

- **Blast radius** - If something breaks, you cannot tell which of 15 simultaneous deployments caused it
- **Resource pressure** - Many rolling updates happening at once compete for CPU and memory
- **Monitoring overload** - Alert systems get flooded with noise from multiple deployments
- **Rollback complexity** - Rolling back one deployment among many is error-prone

## Strategy 1: Sync Waves for Ordered Deployments

ArgoCD sync waves let you control the order in which resources are deployed within an application:

```yaml
# Infrastructure first (wave 0)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
# Database migrations (wave 1)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/sync-wave: "1"
---
# Backend deployment (wave 2)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    argocd.argoproj.io/sync-wave: "2"
---
# Frontend deployment (wave 3)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  annotations:
    argocd.argoproj.io/sync-wave: "3"
```

Each wave completes (resources become healthy) before the next wave starts. This ensures orderly deployment within an application.

## Strategy 2: Controller-Level Rate Limiting

Configure the ArgoCD application controller to limit concurrent syncs:

```yaml
# argocd-cmd-params-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Limit concurrent application syncs
  controller.status.processors: "20"
  controller.operation.processors: "10"

  # Rate limit API calls
  controller.repo.server.timeout.seconds: "60"

  # Limit concurrent manifest generations
  reposerver.parallelism.limit: "5"
```

The key settings:

- `controller.operation.processors` limits how many applications can sync simultaneously. Default is 10.
- `controller.status.processors` limits how many applications can have their status refreshed simultaneously.
- `reposerver.parallelism.limit` limits concurrent manifest generation requests.

For the controller deployment itself:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          args:
            - /usr/local/bin/argocd-application-controller
            - --operation-processors
            - "5"    # Only 5 concurrent syncs
            - --status-processors
            - "10"
            - --app-resync
            - "180"  # Check for changes every 3 minutes instead of default
```

Reducing `--operation-processors` is the most direct way to rate limit deployments.

## Strategy 3: ApplicationSet Progressive Rollout

When managing multiple instances of the same application, use ApplicationSet's progressive sync:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservice-fleet
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: us-east-1
            region: us-east
          - cluster: us-west-2
            region: us-west
          - cluster: eu-west-1
            region: eu-west
          - cluster: ap-southeast-1
            region: ap-southeast
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: region
              operator: In
              values:
                - us-east
          maxUpdate: 1  # Deploy to 1 cluster in us-east first
        - matchExpressions:
            - key: region
              operator: In
              values:
                - us-west
                - eu-west
          maxUpdate: 2  # Then deploy to 2 clusters
        - matchExpressions:
            - key: region
              operator: In
              values:
                - ap-southeast
          maxUpdate: 1  # Finally deploy to remaining
  template:
    metadata:
      name: 'api-server-{{cluster}}'
      labels:
        region: '{{region}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/api-server.git
        targetRevision: main
        path: k8s/production
      destination:
        server: 'https://{{cluster}}.example.com'
        namespace: api
```

This rolls out changes to one region at a time, giving you time to verify each region before proceeding.

## Strategy 4: Argo Rollouts with Rate-Limited Steps

Use Argo Rollouts to control the pace of individual service deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        # Slow ramp-up
        - setWeight: 5
        - pause: { duration: 5m }    # Wait 5 minutes
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 20
        - pause: { duration: 10m }   # Longer pause at higher percentages
        - setWeight: 40
        - pause: { duration: 10m }
        - setWeight: 60
        - pause: { duration: 10m }
        - setWeight: 80
        - pause: { duration: 5m }
        - setWeight: 100
      # Total rollout time: ~50 minutes
      maxSurge: "10%"
      maxUnavailable: 0
```

## Strategy 5: Webhook-Based Deployment Gating

Use ArgoCD resource hooks with an external gating service:

```yaml
# Pre-sync hook that checks with a deployment gate
apiVersion: batch/v1
kind: Job
metadata:
  name: deployment-gate-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 12  # Retry for up to ~1 hour
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: gate-check
          image: curlimages/curl:8.5.0
          command:
            - /bin/sh
            - -c
            - |
              # Check if we are allowed to deploy
              RESPONSE=$(curl -s -w "%{http_code}" \
                -X POST \
                -H "Content-Type: application/json" \
                -d '{
                  "service": "api-server",
                  "namespace": "production",
                  "requestor": "argocd"
                }' \
                http://deployment-gate.platform:8080/api/v1/request-deploy)

              HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)

              if [ "$HTTP_CODE" = "200" ]; then
                echo "Deployment approved"
                exit 0
              elif [ "$HTTP_CODE" = "429" ]; then
                echo "Too many concurrent deployments. Retrying..."
                exit 1
              else
                echo "Deployment gate returned: $HTTP_CODE"
                exit 1
              fi
```

The deployment gate service tracks how many deployments are in progress and returns HTTP 429 when the limit is reached.

## Strategy 6: Time-Based Staggering with Cron Sync

For non-urgent deployments, stagger syncs across time windows:

```yaml
# Team A deploys at the top of each hour
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
spec:
  syncWindows:
    - kind: allow
      schedule: '0 * * * *'    # Top of each hour
      duration: 15m             # 15-minute window
      applications:
        - 'team-a-*'

# Team B deploys at :15 past each hour
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-b
spec:
  syncWindows:
    - kind: allow
      schedule: '15 * * * *'   # 15 past each hour
      duration: 15m
      applications:
        - 'team-b-*'

# Team C deploys at :30 past each hour
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-c
spec:
  syncWindows:
    - kind: allow
      schedule: '30 * * * *'   # 30 past each hour
      duration: 15m
      applications:
        - 'team-c-*'
```

This ensures that at most one team is deploying at any given time.

## Monitoring Deployment Velocity

Track deployment frequency to understand your deployment patterns:

```yaml
# Prometheus recording rule for deployment frequency
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: deployment-velocity
spec:
  groups:
    - name: deployment_metrics
      rules:
        - record: deployment:rate:1h
          expr: |
            count(
              argocd_app_sync_total{
                phase="Succeeded"
              } offset 1h
            ) - count(
              argocd_app_sync_total{
                phase="Succeeded"
              }
            )
        - alert: DeploymentStorm
          expr: deployment:rate:1h > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "More than 10 deployments in the last hour"
```

## Best Practices

1. **Set operation-processors based on your cluster size** - A small cluster should have 3 to 5 concurrent syncs. A large multi-cluster setup might handle 20 or more.

2. **Use progressive rollout for multi-cluster** - ApplicationSet's RollingSync strategy prevents deploying bad changes to all clusters simultaneously.

3. **Combine strategies** - Use controller-level limits as a safety net, sync waves for ordering, and Argo Rollouts for individual service pacing.

4. **Monitor deployment velocity** - Alert when deployment frequency exceeds normal patterns.

5. **Communicate deployment windows** - When teams have designated deployment windows, make them visible through dashboards or Slack integrations.

6. **Allow emergency bypass** - Rate limiting should not block emergency deployments. Have a documented override process.

Deployment rate limiting with ArgoCD is about finding the right balance between deployment velocity and production stability. The strategies in this guide give you tools to control that balance at every level, from individual services to entire fleets.
