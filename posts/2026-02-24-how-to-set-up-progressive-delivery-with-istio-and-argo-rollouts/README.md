# How to Set Up Progressive Delivery with Istio and Argo Rollouts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Argo Rollouts, Progressive Delivery, Kubernetes, Canary

Description: How to set up progressive delivery using Argo Rollouts with Istio for automated canary deployments, traffic management, analysis, and promotion.

---

Argo Rollouts is a Kubernetes controller that provides advanced deployment strategies including canary, blue-green, and experimentation. When paired with Istio, it uses VirtualServices for traffic management instead of relying on replica counts. This gives you precise, percentage-based traffic splitting that is independent of how many pods are running.

If you are already using ArgoCD for GitOps, Argo Rollouts fits naturally into your workflow. This post covers the setup and configuration for progressive delivery with Istio as the traffic management provider.

## Installing Argo Rollouts

Install the controller and CRDs:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

Install the kubectl plugin for easier management:

```bash
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
```

Verify the installation:

```bash
kubectl argo rollouts version
```

## Converting a Deployment to a Rollout

Argo Rollouts uses a Rollout resource instead of a Deployment. The spec is almost identical - you just add a `strategy` section:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
  namespace: app
spec:
  replicas: 5
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
  strategy:
    canary:
      canaryService: my-app-canary
      stableService: my-app-stable
      trafficRouting:
        istio:
          virtualServices:
            - name: my-app
              routes:
                - primary
      steps:
        - setWeight: 10
        - pause: { duration: 2m }
        - setWeight: 30
        - pause: { duration: 2m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 80
        - pause: { duration: 5m }
```

## Required Kubernetes Services

Argo Rollouts needs two Services - one for stable traffic and one for canary traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-stable
  namespace: app
spec:
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-canary
  namespace: app
spec:
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

Argo Rollouts dynamically updates the selectors on these Services to point to the appropriate ReplicaSets.

## VirtualService Configuration

Create the VirtualService that Argo Rollouts will manage:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: app
spec:
  hosts:
    - my-app.app.svc.cluster.local
  http:
    - name: primary
      route:
        - destination:
            host: my-app-stable
            port:
              number: 80
          weight: 100
        - destination:
            host: my-app-canary
            port:
              number: 80
          weight: 0
```

The route name `primary` must match what you specified in the Rollout's `trafficRouting.istio.virtualServices.routes`. Argo Rollouts updates the weights on this specific route during the canary process.

## DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: app
spec:
  host: my-app-stable
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-canary
  namespace: app
spec:
  host: my-app-canary
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

## Adding Automated Analysis

The real power comes from automated analysis that decides whether to promote or rollback. Define an AnalysisTemplate:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: app
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(istio_requests_total{
              reporter="source",
              destination_service=~"{{args.service-name}}",
              response_code!~"5.*"
            }[2m])) /
            sum(rate(istio_requests_total{
              reporter="source",
              destination_service=~"{{args.service-name}}"
            }[2m]))
```

And a latency check:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency
  namespace: app
spec:
  args:
    - name: service-name
  metrics:
    - name: latency-p99
      interval: 1m
      successCondition: result[0] < 500
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{
              reporter="source",
              destination_service=~"{{args.service-name}}"
            }[2m])) by (le))
```

## Adding Analysis to the Rollout

Reference the analysis templates in the Rollout steps:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
  namespace: app
spec:
  strategy:
    canary:
      canaryService: my-app-canary
      stableService: my-app-stable
      trafficRouting:
        istio:
          virtualServices:
            - name: my-app
              routes:
                - primary
      steps:
        - setWeight: 10
        - pause: { duration: 1m }
        - analysis:
            templates:
              - templateName: success-rate
              - templateName: latency
            args:
              - name: service-name
                value: my-app-canary.app.svc.cluster.local
        - setWeight: 30
        - pause: { duration: 2m }
        - setWeight: 50
        - pause: { duration: 2m }
        - setWeight: 80
        - pause: { duration: 5m }
```

The analysis step runs after the first weight increase. If the success rate drops below 99% or latency exceeds 500ms for 3 consecutive checks, the rollout is aborted and traffic returns to stable.

## Background Analysis

Instead of running analysis at specific steps, you can run it continuously in the background:

```yaml
strategy:
  canary:
    analysis:
      templates:
        - templateName: success-rate
        - templateName: latency
      startingStep: 1
      args:
        - name: service-name
          value: my-app-canary.app.svc.cluster.local
    steps:
      - setWeight: 10
      - pause: { duration: 2m }
      - setWeight: 30
      - pause: { duration: 2m }
      - setWeight: 50
      - pause: { duration: 5m }
```

Background analysis starts at step 1 and runs throughout the entire rollout. If metrics degrade at any point, the rollout is aborted.

## Triggering a Rollout

Update the image to start a rollout:

```bash
kubectl argo rollouts set image my-app my-app=my-app:1.1.0 -n app
```

Or update the Rollout manifest:

```bash
kubectl patch rollout my-app -n app --type=merge -p '
  {"spec":{"template":{"spec":{"containers":[{"name":"my-app","image":"my-app:1.1.0"}]}}}}'
```

Watch the rollout progress:

```bash
kubectl argo rollouts get rollout my-app -n app --watch
```

This shows a live view of the rollout with traffic weights, analysis status, and pod health.

## Manual Promotion and Abort

If you include a pause without a duration, the rollout waits for manual approval:

```yaml
steps:
  - setWeight: 10
  - pause: {}   # Manual gate
  - setWeight: 50
  - pause: { duration: 5m }
```

Promote manually:

```bash
kubectl argo rollouts promote my-app -n app
```

Abort and rollback:

```bash
kubectl argo rollouts abort my-app -n app
```

## CI/CD Integration

In a GitHub Actions pipeline:

```yaml
name: Deploy with Argo Rollouts
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push
        run: |
          docker build -t my-registry/my-app:${{ github.sha }} .
          docker push my-registry/my-app:${{ github.sha }}

      - name: Install kubectl-argo-rollouts
        run: |
          curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
          chmod +x kubectl-argo-rollouts-linux-amd64
          mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

      - name: Update image
        run: |
          kubectl argo rollouts set image my-app \
            my-app=my-registry/my-app:${{ github.sha }} -n app

      - name: Wait for rollout
        run: |
          kubectl argo rollouts status my-app -n app --timeout 600s

      - name: Notify on failure
        if: failure()
        run: |
          STATUS=$(kubectl argo rollouts status my-app -n app --timeout 1s 2>&1 || true)
          echo "Rollout failed: $STATUS"
```

## ArgoCD Integration

If you use ArgoCD, it natively supports Argo Rollouts. Your Application manifest stays the same, and ArgoCD detects Rollout resources automatically. You can view and manage rollouts directly from the ArgoCD UI.

Enable the Argo Rollouts extension in ArgoCD:

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations: |
    argoproj.io/Rollout:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          if obj.status.phase == "Healthy" then
            hs.status = "Healthy"
            hs.message = "Rollout is healthy"
          elseif obj.status.phase == "Degraded" then
            hs.status = "Degraded"
            hs.message = "Rollout is degraded"
          elseif obj.status.phase == "Paused" then
            hs.status = "Suspended"
            hs.message = "Rollout is paused"
          else
            hs.status = "Progressing"
            hs.message = "Rollout is progressing"
          end
        end
        return hs
```

## Header-Based Routing

Argo Rollouts supports header-based routing for targeted testing:

```yaml
strategy:
  canary:
    canaryService: my-app-canary
    stableService: my-app-stable
    trafficRouting:
      istio:
        virtualServices:
          - name: my-app
            routes:
              - primary
      managedRoutes:
        - name: canary-header
    steps:
      - setHeaderRoute:
          name: canary-header
          match:
            - headerName: x-canary
              headerValue:
                exact: "true"
      - pause: {}
      - setWeight: 20
      - pause: { duration: 2m }
```

This first adds a header route so you can test the canary by sending `x-canary: true`, then starts the weighted rollout after manual approval.

## Comparing Flagger vs Argo Rollouts

Both tools achieve progressive delivery with Istio, but they have different philosophies:

- Flagger creates and manages the canary Deployment automatically. You only manage one Deployment.
- Argo Rollouts replaces the Deployment with a Rollout resource. You manage the Rollout directly.
- Flagger has simpler configuration for basic canary patterns.
- Argo Rollouts has more step types (experiments, header routes, manual gates).
- Argo Rollouts integrates tightly with ArgoCD.
- Both support Prometheus-based analysis.

Choose Flagger if you want minimal changes to your existing Deployments. Choose Argo Rollouts if you want more control over the rollout process and already use the Argo ecosystem.

Argo Rollouts with Istio gives you a powerful progressive delivery system. The Rollout resource replaces your Deployment, the analysis templates automate safety checks, and Istio handles the traffic splitting. Once set up, new versions are rolled out gradually with automatic rollback if metrics degrade.
