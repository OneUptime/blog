# How to Use Argo Rollouts Canary Strategy with Traffic Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Argo Rollouts, Canary

Description: Master Argo Rollouts canary deployments with precise traffic management, automated analysis, and progressive rollout steps for gradual and safe version releases in Kubernetes.

---

Canary deployments reduce deployment risk by gradually exposing new versions to increasing percentages of traffic. But manual canary rollouts require constant monitoring and manual traffic adjustments. Argo Rollouts automates the entire canary process with intelligent traffic management.

## Installing Argo Rollouts

If not already installed:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

## Basic Canary Rollout

Create a Rollout with canary strategy:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      steps:
      - setWeight: 10    # 10% traffic to canary
      - pause: {duration: 5m}
      - setWeight: 25    # 25% traffic to canary
      - pause: {duration: 5m}
      - setWeight: 50    # 50% traffic to canary
      - pause: {duration: 5m}
      - setWeight: 75    # 75% traffic to canary
      - pause: {duration: 5m}
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
```

Deploy and watch:

```bash
kubectl argo rollouts set image web-app \
  web=myregistry.io/web-app:v2.0.0

kubectl argo rollouts get rollout web-app --watch
```

## Traffic Management with Istio

Use Istio for precise traffic splitting:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      # Traffic management with Istio
      trafficRouting:
        istio:
          virtualService:
            name: web-app-vsvc
          destinationRule:
            name: web-app-destrule
            canarySubsetName: canary
            stableSubsetName: stable
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 75
      - pause: {duration: 5m}
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app-vsvc
spec:
  hosts:
  - web-app
  http:
  - route:
    - destination:
        host: web-app
        subset: stable
      weight: 100
    - destination:
        host: web-app
        subset: canary
      weight: 0
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-app-destrule
spec:
  host: web-app
  subsets:
  - name: stable
    labels:
      app: web-app
  - name: canary
    labels:
      app: web-app
```

Argo Rollouts automatically updates the VirtualService weights during rollout.

## Automated Analysis

Add metric analysis at each step:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      analysis:
        templates:
        - templateName: success-rate
        - templateName: latency
        startingStep: 1
        args:
        - name: service-name
          value: web-app
      steps:
      - setWeight: 10
      - pause: {duration: 2m}
      - analysis:
          templates:
          - templateName: success-rate
      - setWeight: 25
      - pause: {duration: 2m}
      - setWeight: 50
      - pause: {duration: 2m}
      - setWeight: 75
      - pause: {duration: 2m}
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    interval: 30s
    count: 5
    successCondition: result >= 0.95
    failureLimit: 2
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(
            http_requests_total{
              service="{{ args.service-name }}",
              status!~"5.."
            }[2m]
          ))
          /
          sum(rate(
            http_requests_total{
              service="{{ args.service-name }}"
            }[2m]
          ))
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency
spec:
  metrics:
  - name: p95-latency
    interval: 30s
    count: 5
    successCondition: result < 0.5
    failureLimit: 2
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          histogram_quantile(0.95,
            sum(rate(
              http_request_duration_seconds_bucket{
                service="web-app"
              }[2m]
            )) by (le)
          )
```

If analysis fails at any step, the rollout automatically aborts and rolls back.

## Header-Based Canary

Route specific users to canary based on headers:

```yaml
spec:
  strategy:
    canary:
      trafficRouting:
        istio:
          virtualService:
            name: web-app-vsvc
      canaryService: web-app-canary
      stableService: web-app-stable
      steps:
      - setHeaderRoute:
          name: internal-users
          match:
          - headerName: X-User-Group
            headerValue:
              exact: internal
      - pause: {duration: 10m}
      - setWeight: 10
      - pause: {duration: 5m}
```

Internal users with `X-User-Group: internal` header see the canary immediately, while regular traffic gradually increases.

## Manual Promotion Gates

Require manual approval before proceeding:

```yaml
spec:
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {}  # Indefinite pause, requires manual promotion
      - setWeight: 50
      - pause: {duration: 5m}
```

Promote manually:

```bash
kubectl argo rollouts promote web-app
```

## Background Analysis

Run continuous analysis throughout rollout:

```yaml
spec:
  strategy:
    canary:
      analysis:
        templates:
        - templateName: continuous-analysis
        startingStep: 1
      backgroundAnalysis:
        templates:
        - templateName: background-metrics
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {duration: 5m}
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: background-metrics
spec:
  metrics:
  - name: error-rate
    interval: 1m
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          rate(http_requests_total{status=~"5..",service="web-app"}[5m])
          > 0.01
```

Background analysis runs continuously and fails the rollout if metrics degrade.

## Experiment-Based Canary

Run experiments alongside canary:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      steps:
      - experiment:
          templates:
          - name: experimental-feature
            specRef: canary
            weight: 5
          - name: baseline
            specRef: stable
            weight: 5
          analyses:
          - name: compare-experiment
            templateName: experiment-comparison
      - pause: {duration: 10m}
      - setWeight: 25
```

This creates experimental pods for A/B testing before rolling out to all traffic.

## Dynamic Canary with Metrics

Adjust canary speed based on metrics:

```yaml
spec:
  strategy:
    canary:
      analysis:
        templates:
        - templateName: dynamic-analysis
      dynamicStableScale: true
      steps:
      - setWeight: 5
      - pause: {duration: 2m}
      - setWeight: 10
      - pause: {duration: 2m}
      - setWeight: 20
      - pause: {duration: 3m}
      - setWeight: 40
      - pause: {duration: 5m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 80
      - pause: {duration: 5m}
```

Longer pauses at higher weights give more time to detect issues when exposure is greater.

## Rollback on Failure

Automatic rollback when analysis fails:

```bash
# Watch rollout with automatic rollback
kubectl argo rollouts get rollout web-app --watch

# If analysis fails, you'll see:
# Status: ✖ Degraded
# Message: RolloutAborted: Metric "success-rate" assessed Failed
```

The rollout automatically reverts to the stable version.

## Best Practices

**Start with small weights**. Begin at 5-10% to limit blast radius.

**Increase pauses at higher weights**. More traffic means more risk, so wait longer.

**Use multiple metrics**. Don't rely on just success rate; monitor latency, errors, and business metrics.

**Set failure limits**. Allow a few temporary failures before aborting.

**Test rollback procedures**. Verify automatic rollback works as expected.

**Monitor continuously**. Use background analysis to catch issues throughout the rollout.

## Conclusion

Argo Rollouts canary strategy with traffic management provides automated, gradual rollouts with built-in safety through metric analysis. You define the rollout steps and success criteria once, then let Argo Rollouts handle the execution, automatically progressing or rolling back based on real metrics.

Combined with service mesh traffic management, you get precise control over what percentage of users see each version, enabling safe, data-driven deployments.
