# Flux CD vs ArgoCD: Which Is Better for Progressive Delivery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Flagger, Argo Rollouts, Progressive Delivery, Canary, Blue-Green, GitOps

Description: Compare progressive delivery capabilities in Flux CD with Flagger and ArgoCD with Argo Rollouts for canary and blue-green deployments on Kubernetes.

---

## Introduction

Progressive delivery-canary releases, blue-green deployments, A/B testing-is the practice of gradually rolling out changes to reduce blast radius. Both Flux CD and ArgoCD have companion tools purpose-built for progressive delivery: Flagger for Flux CD and Argo Rollouts for ArgoCD. While both work independently of their parent GitOps tools, they integrate most naturally with their respective ecosystems.

This comparison examines both tools' progressive delivery capabilities, automation depth, metric analysis, and service mesh integration.

## Prerequisites

- Kubernetes cluster with Istio, Linkerd, or Nginx ingress
- Either Flux CD + Flagger or ArgoCD + Argo Rollouts installed
- Prometheus for metrics-based analysis

## Step 1: Flagger with Flux CD

Flagger is a Kubernetes operator that automates canary analysis using Prometheus metrics:

```yaml
# Deploy Flagger via Flux HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: flagger
  namespace: istio-system
spec:
  interval: 1h
  chart:
    spec:
      chart: flagger
      version: "1.37.x"
      sourceRef:
        kind: HelmRepository
        name: flagger
  values:
    meshProvider: istio
    metricsServer: http://prometheus:9090
```

Define a Canary resource for automated promotion:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 8080
    targetPort: 8080
    gateways:
      - public-gateway.istio-system.svc.cluster.local
    hosts:
      - myapp.example.com
  analysis:
    interval: 1m
    threshold: 5       # Max failed checks before rollback
    maxWeight: 50      # Max canary traffic percentage
    stepWeight: 10     # Increase traffic by 10% per interval
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99      # Require 99% success rate
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500     # Max 500ms p99 latency
        interval: 30s
    webhooks:
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        metadata:
          cmd: "hey -z 1m -q 10 http://myapp-canary.myapp:8080/"
```

## Step 2: Argo Rollouts with ArgoCD

Argo Rollouts replaces the standard Deployment resource with a Rollout CRD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
  namespace: myapp
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
          ports:
            - containerPort: 8080
  strategy:
    canary:
      canaryService: myapp-canary
      stableService: myapp-stable
      trafficRouting:
        istio:
          virtualService:
            name: myapp-vsvc
          destinationRule:
            name: myapp-destrule
            canarySubsetName: canary
            stableSubsetName: stable
      steps:
        - setWeight: 10
        - pause: {duration: 10m}
        - setWeight: 30
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: myapp-canary
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 100
      analysis:
        successfulRunHistoryLimit: 3
        unsuccessfulRunHistoryLimit: 3
```

## Step 3: Comparison of Features

| Feature | Flagger + Flux CD | Argo Rollouts + ArgoCD |
|---|---|---|
| Canary analysis | Automatic, metric-driven | Manual steps or AnalysisTemplate |
| Blue-green support | Yes | Yes |
| A/B testing | Yes (via header routing) | Yes |
| Service mesh support | Istio, Linkerd, App Mesh, Contour, Nginx | Istio, Linkerd, App Mesh, Nginx, Ambassador |
| Automatic rollback | Yes, metric threshold-based | Yes, analysis-based |
| UI for rollout status | No (Grafana dashboard) | Yes (Argo Rollouts UI plugin) |
| GitOps integration | Flux updates trigger Canary | ArgoCD syncs trigger Rollout |
| Metrics providers | Prometheus, Datadog, CloudWatch, Graphite | Prometheus, Datadog, CloudWatch, NewRelic |

## Step 4: Progressive Delivery GitOps Integration

**Flagger with Flux CD**: Flux updates the Deployment image tag, Flagger detects the new image and starts the canary analysis automatically. No additional configuration needed per release.

**Argo Rollouts with ArgoCD**: ArgoCD syncs the Rollout resource, and the rollout progresses through steps defined in the strategy. Manual promotion can be triggered via the CLI or UI.

```bash
# Promote a paused Argo Rollout manually
kubectl argo rollouts promote myapp -n myapp

# Or via ArgoCD UI plugin (if installed)
argocd app actions run myapp resume --kind Rollout --resource-name myapp
```

## Best Practices

- Use Flagger when you want fully automatic, metric-driven canary promotion without manual intervention.
- Use Argo Rollouts when you want explicit control over each step of the rollout with manual approval gates.
- Always define rollback thresholds based on error rate AND latency; error rate alone misses performance regressions.
- Test the load tester webhook (Flagger) or analysis template (Argo Rollouts) independently before relying on it for production decisions.
- Keep canary analysis intervals short enough to detect problems quickly but long enough to collect statistically significant metrics.

## Conclusion

Both Flagger and Argo Rollouts are mature, production-proven tools. Flagger's strength is fully automated, metric-driven canary analysis that requires minimal per-release intervention. Argo Rollouts excels when teams need explicit promotion steps and a rich UI for managing rollouts. The choice often aligns with your GitOps tool: teams using Flux CD tend to gravitate toward Flagger, while ArgoCD teams prefer the integrated Argo Rollouts experience.
