# How to Configure Istio for Blue-Green Deployment with Argo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Argo Rollouts, Blue-Green Deployment, Kubernetes, GitOps

Description: Complete walkthrough for setting up blue-green deployments using Istio traffic management and Argo Rollouts for safe production releases.

---

Blue-green deployments give you a way to release new versions with minimal risk. You run two identical environments (blue and green), switch traffic from one to the other, and roll back instantly if something goes wrong. When you combine this pattern with Istio and Argo Rollouts, you get precise traffic control and automated promotion logic that makes deployments much safer.

Argo Rollouts has native Istio integration, meaning it can directly manipulate VirtualService weights to shift traffic between blue and green revisions. You don't have to write custom scripts or manage the traffic split manually.

## Prerequisites

You need three things installed in your cluster:
- Istio (with sidecar injection or ambient mode enabled)
- Argo Rollouts controller
- The Argo Rollouts kubectl plugin (optional but very helpful)

Install Argo Rollouts:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

Install the kubectl plugin:

```bash
kubectl argo rollouts version
```

## Setting Up the Istio Resources

Start by creating the VirtualService and DestinationRule that Argo Rollouts will manage:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - name: primary
    route:
    - destination:
        host: my-app
        subset: stable
      weight: 100
    - destination:
        host: my-app
        subset: canary
      weight: 0
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
  namespace: default
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

Note: Argo Rollouts will dynamically update the pod selector labels on these subsets to point to the correct ReplicaSet.

## Creating the Services

You need two Kubernetes services: one for the stable version and one for the preview (canary/green) version:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
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
  name: my-app-preview
  namespace: default
spec:
  selector:
    app: my-app
  ports:
  - port: 8080
    targetPort: 8080
```

## Creating the Rollout

Now define the Argo Rollout resource. This replaces a standard Deployment:

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
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: my-registry/my-app:v1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
  strategy:
    blueGreen:
      activeService: my-app
      previewService: my-app-preview
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: my-app-preview
      trafficRouting:
        istio:
          virtualServices:
          - name: my-app-vsvc
            routes:
            - primary
          destinationRule:
            name: my-app-dr
            stableSubsetName: stable
            canarySubsetName: canary
```

The key configuration here is the `strategy.blueGreen` section. It tells Argo Rollouts to:

1. Use `my-app` as the active (stable) service
2. Use `my-app-preview` as the preview service for the new version
3. Wait for manual promotion (or pass analysis) before switching
4. Use the Istio VirtualService and DestinationRule for traffic routing

## Adding Analysis Templates

The pre-promotion analysis runs before traffic switches. Define what "healthy" means:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: default
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    interval: 30s
    count: 5
    successCondition: result[0] >= 0.95
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring.svc.cluster.local:9090
        query: |
          sum(rate(istio_requests_total{
            destination_service_name="{{args.service-name}}",
            response_code!~"5.*"
          }[2m])) /
          sum(rate(istio_requests_total{
            destination_service_name="{{args.service-name}}"
          }[2m]))
```

This checks that the preview service maintains a 95%+ success rate before promotion. It runs 5 checks, 30 seconds apart, and tolerates up to 3 failures.

## Deploying and Managing Rollouts

Apply all the resources:

```bash
kubectl apply -f my-app-rollout.yaml
kubectl apply -f my-app-services.yaml
kubectl apply -f my-app-istio.yaml
kubectl apply -f analysis-template.yaml
```

Check the rollout status:

```bash
kubectl argo rollouts get rollout my-app -n default
```

To trigger a new deployment, update the image:

```bash
kubectl argo rollouts set image my-app my-app=my-registry/my-app:v2 -n default
```

This starts the blue-green process:
1. New pods are created with the v2 image
2. The preview service points to the new pods
3. Pre-promotion analysis runs against the preview
4. If analysis passes (or you manually promote), traffic switches

Watch the rollout progress:

```bash
kubectl argo rollouts get rollout my-app -n default --watch
```

To manually promote after verification:

```bash
kubectl argo rollouts promote my-app -n default
```

To abort and roll back:

```bash
kubectl argo rollouts abort my-app -n default
```

## How Argo Updates Istio Resources

When a blue-green deployment is in progress, Argo Rollouts modifies the DestinationRule subsets to point to the correct ReplicaSet. It adds a rollouts-pod-template-hash label selector to each subset.

During preview phase:
- `stable` subset points to the old ReplicaSet (blue)
- `canary` subset points to the new ReplicaSet (green)
- VirtualService sends 100% to stable

After promotion:
- `stable` subset gets updated to point to the new ReplicaSet
- VirtualService stays at 100% to stable
- Old ReplicaSet gets scaled down

You can verify this by checking the DestinationRule during a rollout:

```bash
kubectl get destinationrule my-app-dr -n default -o yaml
```

## Adding Post-Promotion Analysis

You can also run analysis after promotion to catch issues and trigger automatic rollback:

```yaml
spec:
  strategy:
    blueGreen:
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: my-app
```

If the post-promotion analysis fails, Argo Rollouts will automatically roll back to the previous stable version.

## Troubleshooting

If traffic isn't switching properly:

1. Check that the VirtualService route name matches what's in the Rollout spec
2. Verify the DestinationRule subset names match
3. Make sure Istio sidecar injection is working (or ambient mode is enabled)
4. Look at the Rollout events for errors:

```bash
kubectl describe rollout my-app -n default
kubectl argo rollouts status my-app -n default
```

The combination of Argo Rollouts and Istio gives you a robust blue-green deployment pipeline. Argo handles the orchestration and analysis, Istio handles the traffic routing, and you get safe, automated releases with instant rollback capability.
