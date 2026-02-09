# How to Convert Kubernetes Deployments to Argo Rollouts for Progressive Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Argo Rollouts, Progressive Delivery

Description: Learn how to convert standard Kubernetes Deployments to Argo Rollouts for advanced deployment strategies like canary releases and blue-green deployments with automated analysis.

---

Standard Kubernetes Deployments provide basic rolling updates, but Argo Rollouts enables advanced deployment strategies with automated analysis and rollback. Converting to Argo Rollouts unlocks canary deployments, blue-green releases, and traffic shaping. This guide shows you how to migrate existing Deployments to Rollouts for progressive delivery.

## Installing Argo Rollouts

Deploy the Argo Rollouts controller to your cluster.

```bash
#!/bin/bash
# Install Argo Rollouts

kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install kubectl plugin
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Verify installation
kubectl argo rollouts version
```

Argo Rollouts extends Kubernetes with progressive delivery capabilities.

## Converting Deployment to Rollout

Transform a standard Deployment into a Rollout resource.

```yaml
# Original Deployment
apiVersion: apps/v1
kind: Deployment
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
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
---
# Converted to Argo Rollout
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
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
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

Rollouts add progressive deployment strategies.

## Implementing Canary Deployment

Configure canary releases with traffic shaping.

```yaml
# Canary rollout with traffic management
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-canary
spec:
  replicas: 10
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
      steps:
      - setWeight: 10
      - pause: {duration: 2m}
      - setWeight: 30
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 80
      - pause: {duration: 5m}
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
      - name: app
        image: myapp:v2.0
---
# Canary and stable services
apiVersion: v1
kind: Service
metadata:
  name: myapp-canary
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-stable
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
```

Canary deployments gradually shift traffic to new versions.

## Adding Automated Analysis

Enable automatic promotion or rollback based on metrics.

```yaml
# Rollout with analysis
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-analyzed
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 1m}
      - analysis:
          templates:
          - templateName: success-rate
          args:
          - name: service-name
            value: myapp
      - setWeight: 50
      - pause: {duration: 5m}
      - analysis:
          templates:
          - templateName: success-rate
          - templateName: latency
      - setWeight: 100
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
      - name: app
        image: myapp:v2.0
---
# Analysis template for success rate
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
    successCondition: result >= 0.95
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring:9090
        query: |
          sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[5m]))
          /
          sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
---
# Analysis template for latency
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency
spec:
  metrics:
  - name: p95-latency
    interval: 1m
    successCondition: result < 0.5
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring:9090
        query: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          )
```

Analysis templates define success criteria for automatic rollout decisions.

## Implementing Blue-Green Deployment

Configure blue-green strategy for instant rollback.

```yaml
# Blue-green rollout
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-bluegreen
spec:
  replicas: 10
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
      - name: app
        image: myapp:v2.0
  strategy:
    blueGreen:
      activeService: myapp-active
      previewService: myapp-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 300
      prePromotionAnalysis:
        templates:
        - templateName: smoke-tests
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
---
# Active and preview services
apiVersion: v1
kind: Service
metadata:
  name: myapp-active
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-preview
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
```

Blue-green provides instant rollback by switching services.

## Migrating Existing Deployments

Safely transition from Deployment to Rollout.

```bash
#!/bin/bash
# Migration script

NAMESPACE="production"
DEPLOYMENT="myapp"

# Backup current deployment
kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o yaml > deployment-backup.yaml

# Create Rollout from Deployment
cat deployment-backup.yaml | \
  sed 's/kind: Deployment/kind: Rollout/' | \
  sed 's/apiVersion: apps\/v1/apiVersion: argoproj.io\/v1alpha1/' | \
  yq eval '.spec.strategy = {"canary": {"steps": [{"setWeight": 20}, {"pause": {"duration": "5m"}}, {"setWeight": 50}, {"pause": {"duration": "5m"}}, {"setWeight": 100}]}}' - \
  > rollout.yaml

# Apply Rollout
kubectl apply -f rollout.yaml -n $NAMESPACE

# Delete old Deployment (Rollout controller takes over)
kubectl delete deployment $DEPLOYMENT -n $NAMESPACE

# Monitor rollout
kubectl argo rollouts get rollout $DEPLOYMENT -n $NAMESPACE --watch
```

This script converts and deploys the Rollout.

## Managing Rollouts with kubectl Plugin

Use the Argo Rollouts plugin for operations.

```bash
#!/bin/bash
# Rollout management commands

# Get rollout status
kubectl argo rollouts get rollout myapp -n production

# List all rollouts
kubectl argo rollouts list rollouts -n production

# Promote canary to next step
kubectl argo rollouts promote myapp -n production

# Abort rollout
kubectl argo rollouts abort myapp -n production

# Restart rollout
kubectl argo rollouts restart myapp -n production

# Watch rollout progress
kubectl argo rollouts get rollout myapp -n production --watch

# Dashboard UI
kubectl argo rollouts dashboard
```

The plugin simplifies rollout management.

## Integrating with CI/CD

Update pipelines to use Rollouts instead of Deployments.

```yaml
# GitLab CI pipeline with Argo Rollouts
stages:
  - build
  - deploy
  - verify

deploy:
  stage: deploy
  script:
    - kubectl argo rollouts set image myapp app=myapp:${CI_COMMIT_SHA} -n production
    - kubectl argo rollouts status myapp -n production --timeout 30m

verify:
  stage: verify
  script:
    - |
      STATUS=$(kubectl argo rollouts status myapp -n production -w --timeout 30m)
      if echo "$STATUS" | grep -q "Healthy"; then
        echo "Rollout successful"
        exit 0
      else
        echo "Rollout failed, aborting"
        kubectl argo rollouts abort myapp -n production
        exit 1
      fi
```

CI/CD pipelines trigger rollouts automatically.

## Conclusion

Converting Deployments to Argo Rollouts enables progressive delivery. Install the Argo Rollouts controller and kubectl plugin. Transform Deployment manifests to Rollout resources with minimal changes. Add canary deployment strategies with gradual traffic shifting. Implement automated analysis using Prometheus metrics for automatic promotion or rollback. Configure blue-green deployments for instant rollback capability. Migrate existing Deployments by creating equivalent Rollouts and deleting old resources. Use the kubectl plugin for rollout management operations. Integrate with CI/CD pipelines to trigger automated progressive deployments. Argo Rollouts reduces deployment risk through gradual rollouts with automated validation while maintaining the familiar Kubernetes resource model.
