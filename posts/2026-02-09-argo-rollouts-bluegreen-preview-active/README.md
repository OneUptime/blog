# How to Use Argo Rollouts BlueGreen Strategy with Preview and Active Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Argo Rollouts, BlueGreen

Description: Learn how to implement blue-green deployments with Argo Rollouts using preview and active services for safe testing and instant cutover with zero-downtime rollback capability.

---

Standard Kubernetes deployments force you to choose between gradual rollouts with mixed versions and risky all-at-once updates. Blue-green deployments give you the best of both worlds: test the new version completely before switching traffic, then cut over instantly.

Argo Rollouts makes blue-green deployments declarative and automated with preview and active services.

## Understanding Blue-Green with Preview

Traditional blue-green uses two environments: blue (current) and green (new). Argo Rollouts enhances this with two services:

**Active Service**: Receives production traffic, points to the stable version.

**Preview Service**: Receives test traffic, points to the new version during rollout.

Workflow:
1. Deploy new version
2. Preview service points to new version
3. Test new version through preview service
4. Promote manually or automatically
5. Active service switches to new version
6. Old version remains for rollback

## Installing Argo Rollouts

Install the Argo Rollouts controller:

```bash
# Install with kubectl
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Verify installation
kubectl get pods -n argo-rollouts

# Install the kubectl plugin
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
```

## Basic Blue-Green Rollout

Create a Rollout resource with blue-green strategy:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 5
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v1.0.0
        ports:
        - name: http
          containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
  strategy:
    blueGreen:
      # Active service receives production traffic
      activeService: api-active
      # Preview service receives test traffic
      previewService: api-preview
      # Auto-promote after analysis passes
      autoPromotionEnabled: false
---
# Active service for production traffic
apiVersion: v1
kind: Service
metadata:
  name: api-active
spec:
  ports:
  - port: 80
    targetPort: http
  selector:
    app: api-server
---
# Preview service for testing new version
apiVersion: v1
kind: Service
metadata:
  name: api-preview
spec:
  ports:
  - port: 80
    targetPort: http
  selector:
    app: api-server
```

## Deployment Workflow

Deploy a new version:

```bash
# Update the image
kubectl argo rollouts set image api-server \
  api=myregistry.io/api-server:v2.0.0

# Watch the rollout
kubectl argo rollouts get rollout api-server --watch
```

You'll see output showing the blue-green progression:

```
Name:            api-server
Namespace:       default
Status:          ॥ Paused
Strategy:        BlueGreen
Images:          myregistry.io/api-server:v1.0.0 (stable, active)
                 myregistry.io/api-server:v2.0.0 (preview)
Replicas:
  Desired:       5
  Current:       10
  Updated:       5
  Ready:         5
  Available:     5

NAME                                   KIND        STATUS     AGE  INFO
⟳ api-server                           Rollout     ॥ Paused   5m
├──# revision:2
│  └──⧉ api-server-7d8f9c5b4d          ReplicaSet  ✔ Healthy  1m   preview
└──# revision:1
   └──⧉ api-server-9f6e8d3c2a          ReplicaSet  ✔ Healthy  5m   active
```

The new version (revision 2) is running and available through the preview service, but production traffic still goes to the old version (revision 1).

## Testing Through Preview Service

Access the new version through the preview service:

```bash
# Get preview service endpoint
kubectl get service api-preview

# Test the new version
curl http://api-preview/health

# Run integration tests against preview
./run-tests.sh --endpoint http://api-preview
```

Your tests run against the new version while production users still use the stable version.

## Manual Promotion

After testing, promote the new version:

```bash
# Promote to production
kubectl argo rollouts promote api-server
```

This:
1. Switches active service to point to new version
2. Production traffic now goes to new version
3. Old version remains running for quick rollback

Check status:

```bash
kubectl argo rollouts get rollout api-server

# Output shows both versions as active
Name:            api-server
Namespace:       default
Status:          ✔ Healthy
Strategy:        BlueGreen
Images:          myregistry.io/api-server:v2.0.0 (stable, active)
```

## Automatic Promotion with Analysis

Configure automatic promotion based on metrics:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v1.0.0
        ports:
        - name: http
          containerPort: 8080
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: true
      # Wait before starting analysis
      scaleDownDelaySeconds: 30
      # Analysis template
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: api-preview
---
# Analysis template
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
    successCondition: result >= 0.95
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(
            http_requests_total{
              service="{{ args.service-name }}",
              status!~"5.."
            }[5m]
          ))
          /
          sum(rate(
            http_requests_total{
              service="{{ args.service-name }}"
            }[5m]
          ))
```

With this configuration:
1. New version deploys to preview
2. Analysis runs for 5 minutes (5 checks at 1-minute intervals)
3. If success rate stays above 95%, auto-promotes
4. If success rate falls below 95%, auto-rollbacks

## Abort and Rollback

Manually abort a rollout before promotion:

```bash
# Abort rollout
kubectl argo rollouts abort api-server

# This keeps the old version active and stops the rollout
```

After promotion, if you discover issues, roll back quickly:

```bash
# Rollback to previous version
kubectl argo rollouts undo api-server
```

This instantly switches the active service back to the old version. No waiting for pods to scale down and up.

## Preview with Ingress

Expose preview service through a separate hostname:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  rules:
  # Production traffic
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-active
            port:
              number: 80
  # Preview traffic
  - host: api-preview.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-preview
            port:
              number: 80
```

Now you can test at `https://api-preview.example.com` before promoting to `https://api.example.com`.

## Scaledown Delay

Keep old version running after promotion for quick rollback:

```yaml
spec:
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: false
      # Keep old version for 5 minutes after promotion
      scaleDownDelaySeconds: 300
      # Alternative: scale to specific count instead of 0
      scaleDownDelayRevisionLimit: 1
```

This gives you 5 minutes to detect issues and rollback before the old version scales down.

## Anti-Affinity for Blue-Green

Ensure blue and green versions run on different nodes:

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-server
              topologyKey: kubernetes.io/hostname
```

This spreads pods across nodes, reducing the risk of infrastructure issues affecting both versions.

## Monitoring Blue-Green Rollouts

Track rollout status with Prometheus:

```promql
# Current rollout phase
argo_rollouts_info{name="api-server"}

# Number of replicas in each revision
argo_rollouts_pod_count{rollout="api-server"}

# Analysis run status
argo_rollouts_analysis_run_status{rollout="api-server"}
```

Alert on failed analysis:

```yaml
groups:
- name: argo_rollouts
  rules:
  - alert: RolloutAnalysisFailed
    expr: |
      argo_rollouts_analysis_run_status{
        phase="Failed",
        rollout="api-server"
      } == 1
    labels:
      severity: warning
    annotations:
      summary: "Rollout analysis failed for {{ $labels.rollout }}"
```

## Progressive Exposure

Gradually shift production traffic to preview before full promotion:

```yaml
spec:
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: false
      # Send subset of active traffic to preview
      trafficRouting:
        istio:
          virtualService:
            name: api-vsvc
          destinationRule:
            name: api-destrule
            canarySubsetName: canary
            stableSubsetName: stable
      # Progressive steps
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
```

This requires a service mesh like Istio to split traffic between active and preview.

## Blue-Green with Notifications

Send notifications at each stage:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    blueGreen:
      activeService: api-active
      previewService: api-preview
      autoPromotionEnabled: false
      # Webhooks for notifications
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
      postPromotionAnalysis:
        templates:
        - templateName: smoke-test
```

Configure Argo Rollouts notifications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argo-rollouts-notification-configmap
  namespace: argo-rollouts
data:
  service.slack: |
    token: $slack-token
  template.rollout-ready: |
    message: "Rollout {{.rollout.metadata.name}} is ready for promotion"
  trigger.on-rollout-paused: |
    - when: rollout.status.phase == 'Paused'
      send: [rollout-ready]
```

## Best Practices

**Use preview service extensively**. Run comprehensive tests before promotion.

**Set appropriate scaledown delays**. Keep old version running long enough to detect issues.

**Automate analysis**. Don't rely on manual promotion for production systems.

**Monitor both versions**. Track metrics for active and preview separately.

**Test rollback procedures**. Practice rolling back regularly to ensure it works when needed.

**Document promotion criteria**. Make it clear what needs to pass before promoting:

```yaml
metadata:
  annotations:
    rollout.argoproj.io/promotion-criteria: |
      1. Success rate > 95% for 5 minutes
      2. P99 latency < 500ms
      3. Zero critical errors
      4. Manual smoke tests pass
```

## Conclusion

Argo Rollouts blue-green strategy with preview and active services provides the safest possible deployment method. You deploy the new version, test it thoroughly in production infrastructure with the preview service, verify it meets your criteria, and then instantly cut over.

The ability to rollback instantly by switching services back makes this strategy ideal for risk-averse deployments. Combined with automated analysis, you get both safety and speed: automated promotions when everything looks good, instant rollbacks when something goes wrong.

Use blue-green for critical services where downtime or errors are unacceptable, and where you have the resources to run two full versions simultaneously.
