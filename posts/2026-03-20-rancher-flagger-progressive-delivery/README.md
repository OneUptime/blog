# How to Configure Progressive Delivery with Flagger on Rancher (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Flagger, Progressive-delivery, Canary, Deployment, Kubernetes

Description: A guide to setting up progressive delivery with Flagger on Rancher-managed clusters for automated canary deployments, A/B testing, and blue-green deployments.

## Overview

Progressive delivery extends continuous delivery by gradually rolling out changes to a subset of users and using metrics to automatically decide whether to proceed or rollback. Flagger is a CNCF project that automates canary deployments, A/B testing, and blue-green deployments on Kubernetes. This guide covers installing Flagger on Rancher and configuring progressive delivery workflows.

## What Is Flagger?

Flagger uses Kubernetes custom resources to automate the promotion or rollback of deployments based on user-defined metrics (request success rate, P99 latency, custom Prometheus queries). It integrates with Istio, Nginx Ingress, Contour, and other service meshes and ingress controllers.

## Step 1: Install Flagger

```bash
# Install Flagger with Helm

helm repo add flagger https://flagger.app
helm repo update

# Install Flagger with Nginx Ingress integration
helm install flagger flagger/flagger \
  --namespace flagger-system \
  --create-namespace \
  --set meshProvider=nginx \
  --set metricsServer=http://rancher-monitoring-prometheus.cattle-monitoring-system.svc:9090

# Install Flagger's load testing tool for traffic generation
helm install flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

## Step 2: Configure Prometheus Metrics

Flagger needs Prometheus metrics to evaluate deployment success. With the NGINX provider, the built-in request success rate and duration checks come from ingress controller metrics that Rancher Monitoring must scrape. If you plan to use custom application metrics, ensure your applications expose metrics:

```yaml
# ServiceMonitor for application metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: webapp-metrics
  namespace: production
spec:
  selector:
    matchLabels:
      app: webapp
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Step 3: Create a Canary Deployment

```yaml
# Canary resource for progressive deployment
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: webapp
  namespace: production
spec:
  # Deployment being managed by Flagger
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp

  # Ingress for traffic splitting
  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: webapp-ingress

  service:
    port: 8080
    portName: http

  # Canary analysis configuration
  analysis:
    interval: 1m              # Check metrics every minute
    threshold: 5              # Max number of failed checks before rollback
    maxWeight: 50             # Max 50% traffic to canary
    stepWeight: 10            # Increase traffic by 10% each step

    # Metrics to evaluate for promotion
    metrics:
      # Success rate must be > 99%
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m

      # P99 latency must be < 500ms
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m

      # Custom metric: error rate
      - name: error-rate
        templateRef:
          name: error-rate
          namespace: flagger-system
        thresholdRange:
          max: 1    # Max 1% error rate
        interval: 1m

    # Webhooks for load testing during canary
    webhooks:
      - name: load-test
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: "hey -z 1m -q 10 -c 2 http://webapp.example.com/"

      # Pre-rollout smoke test
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 15s
        metadata:
          type: bash
          cmd: |
            curl -fsS http://webapp-canary.production:8080/api/v1/health \
              | jq -e '.status == "ok"'
```

## Step 4: Custom Metric Templates

```yaml
# Custom Prometheus metric template for error rate
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: flagger-system
spec:
  provider:
    type: prometheus
    address: http://rancher-monitoring-prometheus.cattle-monitoring-system.svc:9090
  query: |
    sum(
      rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
          status=~"5.*"
        }[{{ interval }}]
      )
    )
    /
    sum(
      rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      )
    )
    * 100
```

## Step 5: Trigger a Canary Deployment

```bash
# Update the deployment image to trigger Flagger
kubectl -n production set image deployment/webapp \
  webapp=registry.example.com/webapp:v2.0.0

# Watch Flagger progress
kubectl -n production get canary webapp --watch

# Monitor Flagger events
kubectl -n production describe canary webapp
```

Output from `kubectl describe canary webapp` shows the rollout progressing:

```text
Events:
  Type     Reason  Age   From     Message
  ----     ------  ----  ----     -------
  Normal   Synced  3m    flagger  New revision detected webapp.production
  Normal   Synced  3m    flagger  Scaling up webapp.production
  Normal   Synced  3m    flagger  Advance webapp.production canary weight 10
  Normal   Synced  2m    flagger  Advance webapp.production canary weight 20
  Normal   Synced  2m    flagger  Advance webapp.production canary weight 30
  Normal   Synced  1m    flagger  Advance webapp.production canary weight 40
  Normal   Synced  1m    flagger  Advance webapp.production canary weight 50
  Normal   Synced  25s   flagger  Copying webapp.production template spec to webapp-primary.production
  Normal   Synced  5s    flagger  Promotion completed! Scaling down webapp.production
```

## Step 6: A/B Testing Configuration

```yaml
# A/B testing with header and cookie-based routing
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: webapp
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp

  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: webapp-ingress

  service:
    port: 8080
    portName: http

  analysis:
    interval: 1m
    threshold: 5
    iterations: 10    # Run 10 iterations before promoting

    # Route based on headers or cookies (A/B test for beta users)
    match:
      - headers:
          x-beta-user:
            exact: "true"
      - headers:
          cookie:
            exact: "beta"
```

## Step 7: Blue-Green Deployment

```yaml
# Blue-Green deployment - no traffic splitting
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: webapp
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp

  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: webapp-ingress

  service:
    port: 8080
    portName: http

  analysis:
    interval: 30s
    threshold: 1
    iterations: 10    # Run 10 analysis iterations before promoting

    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "bash /tests/acceptance-tests.sh"
```

## Flagger Alerts Integration

```yaml
# Send deployment status to Slack
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack-alerts
  namespace: flagger-system
spec:
  type: slack
  channel: "#deployments"
  username: "Flagger"
  secretRef:
    name: slack-webhook-secret
```

```yaml
# Reference alert provider in Canary
spec:
  analysis:
    alerts:
      - name: "deployment-status"
        severity: info
        providerRef:
          name: slack-alerts
          namespace: flagger-system
```

## Conclusion

Flagger on Rancher enables sophisticated progressive delivery workflows that reduce deployment risk significantly. Canary deployments with automated metric evaluation ensure that bad deployments are caught and rolled back automatically before they impact all users. A/B testing allows data-driven feature decisions, and blue-green deployments provide instant cutover with easy rollback. Integrating Flagger with Rancher Monitoring (Prometheus) provides the metrics infrastructure needed for automated analysis without additional tooling.
