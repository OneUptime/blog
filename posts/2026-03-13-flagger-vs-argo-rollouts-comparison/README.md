# Flagger vs Argo Rollouts: Progressive Delivery Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Argo Rollouts, Progressive Delivery, Canary, Blue-Green, Kubernetes, GitOps

Description: A detailed comparison of Flagger and Argo Rollouts for progressive delivery in Kubernetes, covering canary analysis, service mesh integration, and operational experience.

---

## Introduction

Progressive delivery reduces deployment risk by gradually shifting traffic to new versions while monitoring for errors. Two Kubernetes-native tools dominate this space: Flagger (from the Flux CD ecosystem) and Argo Rollouts (from the ArgoCD ecosystem). Both support canary deployments, blue-green deployments, and A/B testing, but differ in their approach to traffic management and analysis automation.

## Prerequisites

- A Kubernetes cluster with Istio or another supported service mesh
- Prometheus for metrics collection
- Either Flagger or Argo Rollouts installed

## Step 1: Flagger Architecture

Flagger operates by managing existing Kubernetes Deployments. It creates primary and canary variants automatically:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 8080
    gateways:
      - istio-system/public-gateway
    hosts:
      - myapp.example.com
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 30s
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://myapp-canary.production:8080/api/ping | grep ping"
```

Flagger automatically creates `myapp-primary` and `myapp-canary` Deployments and shifts traffic via Istio VirtualService.

## Step 2: Argo Rollouts Architecture

Argo Rollouts replaces the Deployment resource with a Rollout CRD that includes the rollout strategy:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: your-org/myapp:1.0.0
  strategy:
    canary:
      canaryService: myapp-canary
      stableService: myapp-stable
      trafficRouting:
        istio:
          virtualService:
            name: myapp-vsvc
            routes:
              - primary
          destinationRule:
            name: myapp-destrule
            canarySubsetName: canary
            stableSubsetName: stable
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 30
        - pause: {duration: 5m}
        - setWeight: 100
      analysis:
        successfulRunHistoryLimit: 3
        unsuccessfulRunHistoryLimit: 3
```

AnalysisTemplate for metric evaluation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: production
spec:
  metrics:
    - name: success-rate
      interval: 5m
      successCondition: result[0] >= 0.95
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{app="myapp",status!~"5.."}[5m])) /
            sum(rate(http_requests_total{app="myapp"}[5m]))
```

## Step 3: Feature Comparison

| Feature | Flagger | Argo Rollouts |
|---|---|---|
| Kubernetes resource | Wraps existing Deployment | Replaces Deployment with Rollout |
| Traffic management | Automatic via Canary CR | Explicit via Rollout strategy |
| Metric analysis | Automatic, continuous | Template-based, at defined steps |
| Manual promotion | Via flagger CLI or webhook | Via argo rollouts CLI or UI |
| UI | Grafana dashboard only | Argo Rollouts Dashboard |
| Service mesh support | Istio, Linkerd, App Mesh, Contour, Nginx, Gloo, Traefik | Istio, Linkerd, App Mesh, Nginx, Traefik, Ambassador |
| Kubernetes Deployments | Yes, wraps them | No, uses Rollout CRD |
| Analysis providers | Prometheus, Datadog, CloudWatch, Graphite, Dynatrace | Prometheus, Datadog, CloudWatch, NewRelic, Wavefront |

## Step 4: Operational Considerations

**Flagger**: Zero manifest changes required to adopt canary-you continue using standard Deployments. Flagger manages the traffic splitting automatically. Ideal for teams that want to add progressive delivery without rearchitecting their manifests.

**Argo Rollouts**: Requires migrating Deployment resources to Rollout CRDs. This is a larger migration effort but provides more explicit control via the step-based strategy definition.

## Best Practices

- Use Flagger when you want automatic, metric-driven canary promotion with minimal manifest changes.
- Use Argo Rollouts when you need explicit, step-based rollout control with manual approval gates between stages.
- Always define both success rate AND latency thresholds; error rate alone misses performance degradations.
- Test rollback scenarios before going to production: ensure both tools can automatically roll back on threshold violations.
- Use the load testing webhook (Flagger) or pre-analysis job (Argo Rollouts) to generate synthetic traffic during canary analysis.

## Conclusion

Flagger and Argo Rollouts are both excellent progressive delivery solutions. Flagger's strength is in its automation-once configured, it manages the entire canary lifecycle without per-release intervention. Argo Rollouts' strength is in explicit control and a dedicated UI plugin. Teams using Flux CD will typically reach for Flagger; ArgoCD teams will use Argo Rollouts. Both are valid choices when configured with appropriate metric thresholds.
