# How to Use Argo Rollouts with ArgoCD for Progressive Delivery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Argo Rollouts, Progressive Delivery

Description: Learn how to integrate Argo Rollouts with ArgoCD to implement canary deployments, blue-green releases, and automated analysis for safe progressive delivery.

---

Standard Kubernetes Deployments give you rolling updates, but they lack fine-grained control over traffic shifting and automated rollback based on metrics. Argo Rollouts fills this gap by providing canary deployments, blue-green releases, and analysis-driven promotion - all managed through ArgoCD's GitOps workflow.

This guide covers how to integrate these two tools for production-grade progressive delivery.

## Why Argo Rollouts with ArgoCD

A regular Kubernetes Deployment has one strategy: rolling update. It replaces pods gradually, but you cannot control what percentage of traffic goes to the new version, and you cannot automatically roll back based on error rates or latency metrics.

Argo Rollouts replaces the Deployment resource with a Rollout resource that supports:

- **Canary releases**: Gradually shift traffic from 0% to 100%
- **Blue-green deployments**: Run two versions side by side and switch instantly
- **Analysis runs**: Automatically check metrics and decide whether to promote or rollback
- **Traffic management**: Integration with Istio, NGINX, ALB, and other ingress controllers

When managed through ArgoCD, the entire progressive delivery configuration lives in Git, making it fully declarative and auditable.

## Installing Argo Rollouts

Install the Argo Rollouts controller in your cluster:

```bash
# Create namespace
kubectl create namespace argo-rollouts

# Install Argo Rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install the kubectl plugin for easy management
brew install argoproj/tap/kubectl-argo-rollouts

# Verify installation
kubectl get pods -n argo-rollouts
```

## Converting a Deployment to a Rollout

The migration from Deployment to Rollout is straightforward. Here is a standard Deployment:

```yaml
# Before: Standard Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
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
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
```

And here is the equivalent Rollout with a canary strategy:

```yaml
# After: Argo Rollout with canary strategy
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
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
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
  strategy:
    canary:
      # Define the canary steps
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 80
        - pause: { duration: 5m }
      # Services for traffic splitting
      canaryService: myapp-canary
      stableService: myapp-stable
      trafficRouting:
        nginx:
          stableIngress: myapp-ingress
```

The only changes are the `apiVersion`, `kind`, and the addition of the `strategy` section. Your pod template stays exactly the same.

## Configuring ArgoCD for Argo Rollouts

ArgoCD needs to know about the Rollout CRD to display health status correctly. The good news is that ArgoCD has built-in support for Argo Rollouts since version 2.0. It automatically recognizes Rollout resources and shows their health status.

Create an ArgoCD Application that manages your Rollout:

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops-repo
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

When you update the image tag in Git, ArgoCD syncs the change, and Argo Rollouts executes the canary strategy step by step.

## Blue-Green Strategy with ArgoCD

For applications that need instant cutover rather than gradual traffic shifting, use the blue-green strategy:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
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
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
  strategy:
    blueGreen:
      # The active service routes production traffic
      activeService: myapp-active
      # The preview service routes to the new version for testing
      previewService: myapp-preview
      # Auto-promote after the new version is healthy
      autoPromotionEnabled: true
      # Wait this long before auto-promoting
      autoPromotionSeconds: 300
      # Scale down the old version after this delay
      scaleDownDelaySeconds: 60
      # Number of old ReplicaSets to keep
      scaleDownDelayRevisionLimit: 2
```

With this configuration, Argo Rollouts deploys the new version alongside the old one, routes preview traffic to it for testing, and auto-promotes after 5 minutes if everything looks healthy.

## Adding Analysis for Automated Decisions

The real power of Argo Rollouts comes from Analysis. You define metric queries that run during the rollout, and the controller automatically promotes or rolls back based on the results:

```yaml
# analysis-template.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate-check
spec:
  metrics:
    - name: success-rate
      # Check every 2 minutes
      interval: 2m
      # Need at least 3 successful checks
      successCondition: result[0] >= 0.95
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(rate(http_requests_total{app="myapp",status=~"2.*"}[5m]))
            /
            sum(rate(http_requests_total{app="myapp"}[5m]))

    - name: latency-p99
      interval: 2m
      successCondition: result[0] < 500
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_ms_bucket{app="myapp"}[5m]))
              by (le)
            )
```

Reference this template in your Rollout:

```yaml
strategy:
  canary:
    steps:
      - setWeight: 10
      - pause: { duration: 2m }
      - setWeight: 30
      - pause: { duration: 2m }
      - setWeight: 50
      - pause: { duration: 2m }
    analysis:
      templates:
        - templateName: success-rate-check
      # Start analysis at step 1 (after first weight change)
      startingStep: 1
```

If the success rate drops below 95% or p99 latency exceeds 500ms during any step, Argo Rollouts automatically aborts the rollout and scales the canary back to zero.

## ArgoCD Sync Behavior with Rollouts

There is an important interaction between ArgoCD's sync and Argo Rollouts. When ArgoCD syncs a Rollout with a new image tag, it updates the Rollout spec, which triggers the progressive delivery process. ArgoCD shows the application as "Progressing" until the rollout completes.

Configure ArgoCD to respect the rollout process:

```yaml
# In argocd-cm ConfigMap
data:
  # Tell ArgoCD not to diff on rollout status fields
  resource.customizations.health.argoproj.io_Rollout: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Healthy" then
        hs.status = "Healthy"
        hs.message = "Rollout is healthy"
      elseif obj.status.phase == "Paused" then
        hs.status = "Suspended"
        hs.message = "Rollout is paused"
      elseif obj.status.phase == "Degraded" then
        hs.status = "Degraded"
        hs.message = "Rollout is degraded"
      else
        hs.status = "Progressing"
        hs.message = "Rollout is progressing"
      end
    end
    return hs
```

## Handling Rollback Scenarios

When an analysis fails and Argo Rollouts aborts a canary, the Rollout spec in Git still points to the new image. ArgoCD will see this as "in sync" because the spec matches. The key thing to understand is that Argo Rollouts manages the actual pod versions independently of the spec.

To do a Git-level rollback, revert the image tag change in your Git repository. ArgoCD will sync the revert, and Argo Rollouts will see a new desired state matching the stable version.

## Monitoring Rollouts in ArgoCD UI

The ArgoCD UI shows Argo Rollouts with their current step, weight, and health. You can also use the Argo Rollouts dashboard for a dedicated view:

```bash
# Open the Argo Rollouts dashboard
kubectl argo rollouts dashboard

# Or watch a specific rollout
kubectl argo rollouts get rollout myapp --watch
```

## Summary

Argo Rollouts extends ArgoCD's deployment capabilities with progressive delivery strategies that go far beyond standard rolling updates. By defining your canary steps, blue-green configuration, and analysis templates in Git, you get automated, metric-driven deployments that roll back on their own when problems are detected. The combination of ArgoCD for GitOps and Argo Rollouts for progressive delivery gives you a production-grade deployment platform that balances speed with safety.
