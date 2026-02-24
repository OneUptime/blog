# How to Integrate Istio with Argo Rollouts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Argo Rollouts, Canary, Kubernetes, Progressive Delivery

Description: How to use Argo Rollouts with Istio traffic management for canary and blue-green deployments in Kubernetes.

---

Argo Rollouts is a Kubernetes controller that provides advanced deployment strategies like canary and blue-green deployments. When you pair it with Istio, Argo Rollouts uses Istio VirtualService resources to control traffic splitting during rollouts. If your team is already using Argo CD or other Argo projects, adding Argo Rollouts for progressive delivery feels like a natural fit.

## How Argo Rollouts Differs from Flagger

Both Argo Rollouts and Flagger do progressive delivery with Istio, but they take different approaches. Flagger watches standard Deployments and creates its own resources behind the scenes. Argo Rollouts replaces the Deployment resource entirely with a Rollout resource that gives you more direct control over the rollout process. You can pause, resume, and promote rollouts manually or automatically.

## Installing Argo Rollouts

Install the Argo Rollouts controller:

```bash
kubectl create namespace argo-rollouts

kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

Install the kubectl plugin for convenient management:

```bash
brew install argoproj/tap/kubectl-argo-rollouts
```

Verify the installation:

```bash
kubectl argo rollouts version
kubectl get pods -n argo-rollouts
```

## Creating a Rollout with Istio

Replace your Deployment with a Rollout resource. The key addition is the `strategy` section that tells Argo Rollouts to use Istio for traffic management:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 5
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
          - name: my-app-vsvc
            routes:
            - primary
          destinationRule:
            name: my-app-destrule
            canarySubsetName: canary
            stableSubsetName: stable
      steps:
      - setWeight: 10
      - pause: {duration: 2m}
      - setWeight: 30
      - pause: {duration: 2m}
      - setWeight: 50
      - pause: {duration: 5m}
      - setWeight: 80
      - pause: {duration: 5m}
```

You also need the supporting Service, VirtualService, and DestinationRule resources:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-stable
spec:
  selector:
    app: my-app
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-canary
spec:
  selector:
    app: my-app
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
spec:
  hosts:
  - my-app
  http:
  - name: primary
    route:
    - destination:
        host: my-app-stable
        subset: stable
      weight: 100
    - destination:
        host: my-app-canary
        subset: canary
      weight: 0
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-destrule
spec:
  host: my-app
  subsets:
  - name: stable
    labels:
      app: my-app
  - name: canary
    labels:
      app: my-app
```

## Triggering a Rollout

Update the image to start a rollout:

```bash
kubectl argo rollouts set image my-app my-app=my-app:2.0.0
```

Watch the rollout progress:

```bash
kubectl argo rollouts get rollout my-app --watch
```

This gives you a nice terminal UI showing the rollout status, revision info, and current traffic weight.

## Adding Analysis to Canary Steps

Argo Rollouts can run automated analysis at each step using AnalysisTemplates. Create an analysis that checks Istio metrics:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: istio-success-rate
spec:
  args:
  - name: service-name
  - name: namespace
  metrics:
  - name: success-rate
    interval: 30s
    successCondition: result[0] >= 0.99
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.istio-system:9090
        query: |
          sum(rate(istio_requests_total{
            reporter="destination",
            destination_service=~"{{args.service-name}}",
            destination_workload_namespace="{{args.namespace}}",
            response_code!~"5.*"
          }[2m])) / sum(rate(istio_requests_total{
            reporter="destination",
            destination_service=~"{{args.service-name}}",
            destination_workload_namespace="{{args.namespace}}"
          }[2m]))
```

Reference the analysis in your rollout steps:

```yaml
strategy:
  canary:
    steps:
    - setWeight: 10
    - pause: {duration: 1m}
    - analysis:
        templates:
        - templateName: istio-success-rate
        args:
        - name: service-name
          value: my-app-canary.default.svc.cluster.local
        - name: namespace
          value: default
    - setWeight: 50
    - pause: {duration: 2m}
    - analysis:
        templates:
        - templateName: istio-success-rate
        args:
        - name: service-name
          value: my-app-canary.default.svc.cluster.local
        - name: namespace
          value: default
```

## Blue-Green Deployments with Istio

Argo Rollouts also supports blue-green deployments. With Istio, this means the VirtualService switches 100% of traffic from the old version to the new version after verification:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 5
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
  strategy:
    blueGreen:
      activeService: my-app-active
      previewService: my-app-preview
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
        - templateName: istio-success-rate
        args:
        - name: service-name
          value: my-app-preview.default.svc.cluster.local
        - name: namespace
          value: default
```

## Manual Promotion and Rollback

Sometimes you want human approval before proceeding. Use pause steps without a duration:

```yaml
steps:
- setWeight: 10
- pause: {}  # Waits for manual promotion
- setWeight: 50
- pause: {duration: 5m}
```

Promote manually:

```bash
kubectl argo rollouts promote my-app
```

Roll back if something is wrong:

```bash
kubectl argo rollouts abort my-app
```

After an abort, the VirtualService weights go back to 100% stable.

## Argo Rollouts Dashboard

Argo Rollouts includes a web dashboard:

```bash
kubectl argo rollouts dashboard
```

This opens a browser showing all your Rollouts with their status, revision history, and traffic weights. It is useful for teams that prefer a visual interface over the command line.

## Notifications

Set up notifications for rollout events using the Argo Rollouts notification engine:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argo-rollouts-notification-configmap
  namespace: argo-rollouts
data:
  service.slack: |
    token: $slack-token
  template.rollout-completed: |
    message: "Rollout {{.rollout.metadata.name}} completed successfully"
  trigger.on-rollout-completed: |
    - send: [rollout-completed]
      when: rollout.status.phase == "Healthy"
```

Argo Rollouts with Istio gives you fine-grained control over the deployment process. The step-based configuration makes it easy to define exactly how you want traffic to shift, and the analysis integration ensures you catch problems before they affect all your users. The manual promotion option is particularly nice for teams that want automated analysis but still want a human to make the final call.
