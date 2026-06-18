# How to Configure Canary Testing Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Canary Testing, Deployment, Kubernetes, DevOps, Automation

Description: Learn to automate canary deployments with progressive traffic shifting, automated rollback triggers, and metric-based promotion decisions using Kubernetes and Flagger.

---

Canary testing reduces deployment risk by routing a small percentage of traffic to new versions before full rollout. When problems occur, only a fraction of users are affected, and the system can automatically roll back. This guide covers setting up fully automated canary deployments with Kubernetes and Flagger.

## Canary Deployment Flow

The automated canary process follows a predictable pattern:

```mermaid
flowchart TD
    A[New Version Deployed] --> B[Route 10% Traffic to Canary]
    B --> C{Metrics OK?}
    C -->|Yes| D[Increase Traffic 10%]
    D --> E{Max Canary Traffic Reached?}
    E -->|No| C
    E -->|Yes| F[Promote Canary]
    C -->|No| G[Automatic Rollback]
    G --> H[Alert Team]
```

## Flagger Installation

Flagger is a Kubernetes operator that automates canary deployments. Install it with Helm:

```bash
# Add Flagger Helm repository

helm repo add flagger https://flagger.app

# Install Flagger's Canary CRD
kubectl apply -f https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml

# Install Flagger for Istio with Prometheus metrics support
helm upgrade -i flagger flagger/flagger \
    --namespace=flagger-system \
    --create-namespace \
    --set crd.create=false \
    --set meshProvider=istio \
    --set metricsServer=http://prometheus.istio-system:9090

# Install the load tester for automated testing
helm upgrade -i flagger-loadtester flagger/loadtester \
    --namespace=flagger-system
```

## Application Deployment

Deploy your application using a standard Kubernetes Deployment. Flagger will manage the canary process:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels:
    app: payment-service
spec:
  # Start with minimum replicas
  # Flagger will scale based on canary configuration
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
      annotations:
        # Prometheus scrape configuration
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: payment-service
          image: myregistry/payment-service:v1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          # Health checks are essential for canary analysis
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

## Canary Resource Configuration

The Canary custom resource defines how Flagger manages deployments:

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: payment-service
  namespace: production
spec:
  # Reference to the deployment
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service

  # Horizontal Pod Autoscaler reference (optional)
  autoscalerRef:
    apiVersion: autoscaling/v2
    kind: HorizontalPodAutoscaler
    name: payment-service

  # Service configuration
  service:
    port: 8080
    targetPort: 8080
    # Gateway configuration for Istio
    gateways:
      - istio-system/public-gateway
    hosts:
      - payment.example.com

  # Canary analysis configuration
  analysis:
    # Time between traffic weight increases
    interval: 1m
    # Maximum number of failed checks before rollback
    threshold: 10
    # Maximum traffic weight for canary
    maxWeight: 50
    # Traffic weight increment per step
    stepWeight: 10
    # Custom metrics for analysis
    metrics:
      - name: request-success-rate
        # Prometheus query to calculate success rate
        templateRef:
          name: request-success-rate
          namespace: flagger-system
        # Minimum acceptable success rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        templateRef:
          name: request-duration
          namespace: flagger-system
        # Maximum acceptable latency in milliseconds
        thresholdRange:
          max: 500
        interval: 1m

    # Webhooks for custom validation
    webhooks:
      # Pre-rollout check
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.flagger-system/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -s http://payment-service-canary.production:8080/health"

      # Load test during canary analysis
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://payment-service-canary.production:8080/"

      # Manual rollback gate
      - name: rollback
        type: rollback
        url: http://flagger-loadtester.flagger-system/rollback/check
```

## Metric Templates

Define reusable metric templates that Flagger uses to evaluate canary health:

```yaml
# metric-templates.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: request-success-rate
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(rate(
      http_requests_total{
        namespace="{{ namespace }}",
        pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
        status!~"5.*"
      }[{{ interval }}]
    )) /
    sum(rate(
      http_requests_total{
        namespace="{{ namespace }}",
        pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
      }[{{ interval }}]
    )) * 100
---
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: request-duration
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    histogram_quantile(0.99,
      sum(rate(
        http_request_duration_seconds_bucket{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      )) by (le)
    ) * 1000
```

## Custom Metrics for Business Logic

Add application-specific metrics for deeper canary analysis:

```yaml
# custom-metrics.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: payment-success-rate
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(rate(
      payment_transactions_total{
        namespace="{{ namespace }}",
        pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
        status="success"
      }[{{ interval }}]
    )) /
    sum(rate(
      payment_transactions_total{
        namespace="{{ namespace }}",
        pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
      }[{{ interval }}]
    )) * 100
---
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-budget-consumption
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    (
      sum(rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
          status=~"5.*"
        }[{{ interval }}]
      )) /
      sum(rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      ))
    ) / 0.001 * 100
```

## Alert Configuration

Set up alerts for canary events:

```yaml
# alerts.yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: flagger-system
spec:
  type: slack
  channel: deployments
  username: flagger
  # Webhook URL stored in a secret data field named address
  secretRef:
    name: slack-webhook
---
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: msteams
  namespace: flagger-system
spec:
  type: msteams
  # Teams webhook URL stored in a secret data field named address
  secretRef:
    name: msteams-webhook
```

Reference alerts in your Canary resource:

```yaml
spec:
  analysis:
    alerts:
      - name: "Slack notification"
        severity: info
        providerRef:
          name: slack
          namespace: flagger-system
      - name: "Teams alert"
        severity: error
        providerRef:
          name: msteams
          namespace: flagger-system
```

## CI/CD Integration

Trigger canary deployments from your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yaml
name: Deploy Canary

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push image
        run: |
          docker build -t myregistry/payment-service:${{ github.sha }} .
          docker push myregistry/payment-service:${{ github.sha }}

      - name: Update deployment
        run: |
          kubectl set image deployment/payment-service \
            payment-service=myregistry/payment-service:${{ github.sha }} \
            -n production

      - name: Wait for canary completion
        run: |
          # Flagger automatically detects the image change
          # and starts the canary analysis
          until kubectl get canary/payment-service -n production | grep 'Progressing'; do
            sleep 5
          done

          kubectl wait canary/payment-service \
            --for=condition=promoted \
            -n production \
            --timeout=30m
```

## Monitoring Canary Progress

Track canary status with kubectl:

```bash
# Watch canary status
kubectl get canary payment-service -n production -w

# View detailed canary status
kubectl describe canary payment-service -n production

# Check canary events
kubectl get events --field-selector involvedObject.name=payment-service \
    -n production --sort-by='.lastTimestamp'
```

Example status output during progression:

```text
NAME              STATUS        WEIGHT   LASTTRANSITIONTIME
payment-service   Progressing   10       2024-01-25T10:15:00Z
payment-service   Progressing   20       2024-01-25T10:16:00Z
payment-service   Progressing   30       2024-01-25T10:17:00Z
payment-service   Promoting     0        2024-01-25T10:25:00Z
payment-service   Succeeded     0        2024-01-25T10:26:00Z
```

## Manual Intervention

Sometimes you need to manually control canaries:

```bash
# Pause a canary deployment
kubectl patch canary payment-service -n production \
    --type='merge' -p '{"spec":{"suspend":true}}'

# Resume canary
kubectl patch canary payment-service -n production \
    --type='merge' -p '{"spec":{"suspend":false}}'

# Start port-forwarding to the load tester in another terminal, then open rollback
kubectl -n flagger-system port-forward svc/flagger-loadtester 8080:80
curl -d '{"name":"payment-service","namespace":"production"}' \
    http://localhost:8080/rollback/open

# Skip remaining analysis and promote
kubectl patch canary payment-service -n production \
    --type='merge' -p '{"spec":{"skipAnalysis":true}}'
```

## Rollback Scenarios

Configure automatic rollback thresholds:

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Success rate** | Below 99% | Rollback after failed checks reach `threshold` |
| **P99 latency** | Above 500ms | Rollback after failed checks reach `threshold` |
| **Error budget consumption** | Above your configured limit | Rollback after failed checks reach `threshold` |
| **Custom metric** | Out of range | Rollback after failed checks reach `threshold` |

## Testing Rollback Behavior

Verify rollback works correctly with deliberate failures:

```bash
# Deploy a known-bad version
kubectl set image deployment/payment-service \
    payment-service=myregistry/payment-service:broken \
    -n production

# Watch Flagger detect issues and rollback
kubectl get canary payment-service -n production -w

# Expected output:
# NAME              STATUS        WEIGHT   LASTTRANSITIONTIME
# payment-service   Progressing   10       2024-01-25T11:00:00Z
# payment-service   Failed        0        2024-01-25T11:05:00Z
```

## Summary

Automated canary testing significantly reduces deployment risk:

| Feature | Benefit |
|---------|---------|
| **Progressive traffic** | Limits blast radius of bad deployments |
| **Metric-based decisions** | Removes human bias from promotion |
| **Automatic rollback** | Fast recovery without manual intervention |
| **Webhook integration** | Custom validation before and during rollout |
| **Alert providers** | Team awareness of deployment status |

Start with conservative settings like 5% traffic increments and high success rate thresholds. Adjust based on your application's traffic patterns and risk tolerance.
