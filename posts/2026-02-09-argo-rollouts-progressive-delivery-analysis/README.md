# How to Use Argo Rollouts for Progressive Delivery with Analysis Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitOps, Progressive Delivery

Description: Learn how to implement advanced deployment strategies with Argo Rollouts, including automated canary analysis, blue-green deployments, and metric-driven progressive delivery in Kubernetes.

---

Argo Rollouts is a Kubernetes controller that provides advanced deployment capabilities beyond standard Deployments, including blue-green, canary, and automated rollback based on metric analysis. It integrates with service meshes and ingress controllers to control traffic precisely, and uses Analysis Templates to automatically determine if a rollout should proceed or abort.

This tool is essential for teams practicing progressive delivery and wanting automated, metric-driven deployment workflows.

## Installing Argo Rollouts

Install the controller:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install kubectl plugin
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Verify installation
kubectl argo rollouts version
```

## Basic Rollout Resource

Replace Deployment with Rollout:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:v1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 5m}
      - setWeight: 40
      - pause: {duration: 5m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 80
      - pause: {duration: 5m}
```

Deploy and manage:

```bash
# Deploy the rollout
kubectl apply -f rollout.yaml

# Watch rollout progress
kubectl argo rollouts get rollout web-app --watch

# Update image
kubectl argo rollouts set image web-app app=web-app:v2.0

# Promote rollout manually
kubectl argo rollouts promote web-app

# Abort rollout
kubectl argo rollouts abort web-app
```

## Canary with Analysis

Automate rollout decisions based on metrics:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-service
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api:v1.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      canaryService: api-canary
      stableService: api-stable
      trafficRouting:
        istio:
          virtualService:
            name: api-vsvc
            routes:
            - primary
      steps:
      - setWeight: 10
      - pause: {duration: 2m}
      - analysis:
          templates:
          - templateName: success-rate
          - templateName: latency
          args:
          - name: service-name
            value: api-canary
      - setWeight: 25
      - pause: {duration: 5m}
      - analysis:
          templates:
          - templateName: success-rate
          - templateName: latency
      - setWeight: 50
      - pause: {duration: 10m}
      - analysis:
          templates:
          - templateName: success-rate
          - templateName: latency
      - setWeight: 75
      - pause: {duration: 10m}
---
# Canary service
apiVersion: v1
kind: Service
metadata:
  name: api-canary
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
---
# Stable service
apiVersion: v1
kind: Service
metadata:
  name: api-stable
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
---
# Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vsvc
spec:
  hosts:
  - api
  http:
  - name: primary
    route:
    - destination:
        host: api-stable
      weight: 100
    - destination:
        host: api-canary
      weight: 0
```

## Analysis Templates

Define success criteria using Prometheus metrics:

```yaml
# Success rate analysis
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    interval: 1m
    count: 5
    successCondition: result[0] >= 0.95
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(
            http_requests_total{
              service="{{args.service-name}}",
              status!~"5.."
            }[5m]
          ))
          /
          sum(rate(
            http_requests_total{
              service="{{args.service-name}}"
            }[5m]
          ))
---
# Latency analysis
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency
spec:
  args:
  - name: service-name
  metrics:
  - name: p99-latency
    interval: 1m
    count: 5
    successCondition: result[0] <= 1.0
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          histogram_quantile(0.99,
            sum(rate(
              http_request_duration_seconds_bucket{
                service="{{args.service-name}}"
              }[5m]
            )) by (le)
          )
```

## Advanced Analysis with Multiple Metrics

Combine multiple analysis templates:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: comprehensive-analysis
spec:
  args:
  - name: canary-service
  - name: stable-service
  metrics:
  # Error rate comparison
  - name: error-rate-comparison
    interval: 2m
    count: 5
    failureLimit: 2
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          (
            sum(rate(http_requests_total{service="{{args.canary-service}}",status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.canary-service}}"}[5m]))
          )
          <=
          (
            sum(rate(http_requests_total{service="{{args.stable-service}}",status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.stable-service}}"}[5m]))
          ) * 1.2

  # CPU usage check
  - name: cpu-usage
    interval: 1m
    count: 5
    successCondition: result[0] <= 0.8
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(container_cpu_usage_seconds_total{
            pod=~"{{args.canary-service}}.*"
          }[5m]))
          /
          sum(container_spec_cpu_quota{
            pod=~"{{args.canary-service}}.*"
          })

  # Memory usage check
  - name: memory-usage
    interval: 1m
    count: 5
    successCondition: result[0] <= 0.9
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(container_memory_working_set_bytes{
            pod=~"{{args.canary-service}}.*"
          })
          /
          sum(container_spec_memory_limit_bytes{
            pod=~"{{args.canary-service}}.*"
          })
```

## Blue-Green Deployment with Argo Rollouts

Implement blue-green pattern:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: database-app
spec:
  replicas: 3
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: database-app
  template:
    metadata:
      labels:
        app: database-app
    spec:
      containers:
      - name: app
        image: database-app:v1.0
        ports:
        - containerPort: 8080
  strategy:
    blueGreen:
      activeService: database-app-active
      previewService: database-app-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 300
      prePromotionAnalysis:
        templates:
        - templateName: smoke-tests
        args:
        - name: service-name
          value: database-app-preview
---
apiVersion: v1
kind: Service
metadata:
  name: database-app-active
spec:
  selector:
    app: database-app
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: database-app-preview
spec:
  selector:
    app: database-app
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: smoke-tests
spec:
  args:
  - name: service-name
  metrics:
  - name: smoke-test
    count: 1
    provider:
      job:
        spec:
          template:
            spec:
              containers:
              - name: test
                image: curlimages/curl:8.0.1
                command: ["/bin/sh", "-c"]
                args:
                - |
                  # Run smoke tests
                  curl -f http://{{args.service-name}}/healthz || exit 1
                  curl -f http://{{args.service-name}}/api/status || exit 1
                  echo "Smoke tests passed!"
              restartPolicy: Never
          backoffLimit: 1
```

Promote blue-green deployment:

```bash
# View rollout status
kubectl argo rollouts get rollout database-app

# Promote to active after preview tests pass
kubectl argo rollouts promote database-app
```

## Integrating with Notifications

Get notifications on rollout events:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
  annotations:
    notifications.argoproj.io/subscribe.on-rollout-completed.slack: channel-name
    notifications.argoproj.io/subscribe.on-rollout-aborted.slack: channel-name
spec:
  # ... rollout spec ...
```

## Progressive Delivery with Experiment

Run experiments during rollout:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: experiment-rollout
spec:
  replicas: 5
  selector:
    matchLabels:
      app: experiment-app
  template:
    metadata:
      labels:
        app: experiment-app
    spec:
      containers:
      - name: app
        image: app:v1.0
  strategy:
    canary:
      steps:
      - experiment:
          duration: 10m
          templates:
          - name: canary-experiment
            specRef: canary
            replicas: 2
          - name: baseline
            specRef: stable
            replicas: 2
          analyses:
          - name: experiment-analysis
            templateName: ab-test-analysis
      - setWeight: 20
      - pause: {duration: 5m}
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: ab-test-analysis
spec:
  metrics:
  - name: conversion-rate
    interval: 1m
    count: 10
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(conversions_total{version="canary"}[5m]))
          /
          sum(rate(requests_total{version="canary"}[5m]))
          >=
          sum(rate(conversions_total{version="stable"}[5m]))
          /
          sum(rate(requests_total{version="stable"}[5m]))
```

## Monitoring Rollouts

Dashboard for rollout status:

```bash
# Install Argo Rollouts dashboard
kubectl argo rollouts dashboard

# Access at http://localhost:3100
```

Create Prometheus alerts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollout-alerts
data:
  alerts.yaml: |
    groups:
    - name: argo-rollouts
      rules:
      - alert: RolloutAborted
        expr: argo_rollout_phase{phase="Degraded"} == 1
        labels:
          severity: critical
        annotations:
          summary: "Rollout {{ $labels.rollout }} was aborted"

      - alert: RolloutStuck
        expr: time() - argo_rollout_phase_timestamp > 1800
        labels:
          severity: warning
        annotations:
          summary: "Rollout {{ $labels.rollout }} stuck for >30min"
```

## Best Practices

Start with manual promotion before enabling auto-promotion. Build confidence in your analysis templates.

Define clear success criteria in analysis templates. Avoid ambiguous metrics.

Use multiple analysis templates for comprehensive validation. Check error rates, latency, resource usage, and business metrics.

Set appropriate failure limits. Don't abort on transient metric spikes.

Test analysis templates with historical data. Ensure they would have caught real incidents.

Implement gradual traffic increases. Start with small percentages to limit blast radius.

Use pre-promotion analysis for blue-green. Verify the preview environment before switching traffic.

Monitor analysis run status. Set alerts for failed analyses.

Keep rollout history for debugging. Set revisionHistoryLimit appropriately.

Document rollout strategies for each application. Different apps may need different strategies.

Argo Rollouts brings enterprise-grade progressive delivery to Kubernetes, enabling automated, metric-driven deployments that reduce risk and improve reliability through intelligent traffic management and analysis-based decision making.
