# How to Configure Flagger Metrics Analysis with Graphite

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, Flagger, Graphite, Metrics, Canary, Kubernetes, GitOps, Monitoring

Description: Learn how to integrate Graphite as a metrics provider for Flagger canary analysis in Flux-managed Kubernetes clusters.

---

## Introduction

Graphite is a popular open-source monitoring tool that stores time-series data and provides a powerful query language for retrieving and transforming metrics. Flagger, the progressive delivery tool for Kubernetes, supports Graphite as an external metrics provider for canary analysis. This means you can use your existing Graphite metrics to automate canary promotion and rollback decisions.

In this guide, you will configure Flagger to query Graphite metrics during canary deployments managed by Flux.

## Prerequisites

- A Kubernetes cluster with Flux installed and configured
- Flagger installed in the cluster
- A running Graphite instance accessible from the cluster
- An application sending metrics to Graphite
- kubectl and flux CLI tools

## Step 1: Deploy Graphite in Kubernetes

If you do not already have Graphite running, you can deploy it in your cluster. Here is a basic deployment for development purposes.

```yaml
# graphite-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphite
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: graphite
  template:
    metadata:
      labels:
        app: graphite
    spec:
      containers:
        - name: graphite
          image: graphiteapp/graphite-statsd:1.1.10-5
          ports:
            # Graphite web UI and API
            - containerPort: 80
              name: http
            # Carbon line receiver
            - containerPort: 2003
              name: carbon
            # StatsD UDP
            - containerPort: 8125
              name: statsd
              protocol: UDP
          volumeMounts:
            - name: graphite-data
              mountPath: /opt/graphite/storage
      volumes:
        - name: graphite-data
          persistentVolumeClaim:
            claimName: graphite-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: graphite
  namespace: monitoring
spec:
  selector:
    app: graphite
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: carbon
      port: 2003
      targetPort: 2003
    - name: statsd
      port: 8125
      targetPort: 8125
      protocol: UDP
```

## Step 2: Configure Graphite Authentication Secret

If your Graphite instance requires authentication, create a secret with the credentials.

```yaml
# graphite-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: graphite-credentials
  namespace: flagger-system
type: Opaque
stringData:
  # Basic auth username for Graphite API
  username: "admin"
  # Basic auth password for Graphite API
  password: "your-graphite-password"
```

Apply the secret:

```bash
kubectl apply -f graphite-credentials.yaml
```

## Step 3: Create a Graphite MetricTemplate for Request Duration

Define a MetricTemplate that queries Graphite for request duration metrics.

```yaml
# graphite-request-duration.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: graphite-request-duration
  namespace: flagger-system
spec:
  provider:
    # Specify Graphite as the provider
    type: graphite
    # URL of your Graphite instance render API
    address: http://graphite.monitoring.svc.cluster.local
    # Optional: reference to auth credentials
    secretRef:
      name: graphite-credentials
  # Graphite render API query
  # The {{ target }} variable is replaced with the canary target name
  query: |
    averageSeries(app.{{ target }}.request.duration.mean)
```

The query uses Graphite functions to calculate the average request duration. Graphite has a rich set of functions including `averageSeries`, `sumSeries`, `maxSeries`, and many more.

## Step 4: Create a Graphite MetricTemplate for Error Rate

Create a metric template that calculates the error rate from Graphite data.

```yaml
# graphite-error-rate.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: graphite-error-rate
  namespace: flagger-system
spec:
  provider:
    type: graphite
    address: http://graphite.monitoring.svc.cluster.local
    secretRef:
      name: graphite-credentials
  # Calculate error rate as a percentage using Graphite functions
  # divideSeries divides error count by total request count
  # scale multiplies the result by 100 to get a percentage
  query: |
    scale(divideSeries(sumSeries(app.{{ target }}.request.status.5xx), sumSeries(app.{{ target }}.request.count)), 100)
```

## Step 5: Create a Graphite MetricTemplate for Throughput

Monitor request throughput to ensure the canary is handling an adequate volume of traffic.

```yaml
# graphite-throughput.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: graphite-throughput
  namespace: flagger-system
spec:
  provider:
    type: graphite
    address: http://graphite.monitoring.svc.cluster.local
    secretRef:
      name: graphite-credentials
  # Query for requests per second over the last minute
  query: |
    summarize(sumSeries(app.{{ target }}.request.count), '1min', 'sum')
```

## Step 6: Reference Graphite Metrics in the Canary Resource

Now wire up the metric templates in your Canary resource.

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Run analysis every 1 minute
    interval: 1m
    # Maximum number of failed checks before rollback
    threshold: 5
    # Maximum traffic percentage for canary
    maxWeight: 50
    # Increment traffic by 10% each iteration
    stepWeight: 10
    metrics:
      # Graphite request duration metric
      - name: graphite-request-duration
        templateRef:
          name: graphite-request-duration
          namespace: flagger-system
        # Fail if average request duration exceeds 500ms
        thresholdRange:
          max: 500
        interval: 1m
      # Graphite error rate metric
      - name: graphite-error-rate
        templateRef:
          name: graphite-error-rate
          namespace: flagger-system
        # Fail if error rate exceeds 1%
        thresholdRange:
          max: 1
        interval: 1m
      # Graphite throughput metric
      - name: graphite-throughput
        templateRef:
          name: graphite-throughput
          namespace: flagger-system
        # Fail if throughput drops below 10 requests per minute
        thresholdRange:
          min: 10
        interval: 1m
```

## Step 7: Advanced Graphite Queries

Graphite supports many powerful functions. Here are some useful patterns for canary analysis.

### Percentile Latency

```yaml
# graphite-p99-latency.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: graphite-p99-latency
  namespace: flagger-system
spec:
  provider:
    type: graphite
    address: http://graphite.monitoring.svc.cluster.local
    secretRef:
      name: graphite-credentials
  # Query the 99th percentile latency
  query: |
    nPercentile(app.{{ target }}.request.duration, 99)
```

### Comparison with Baseline

```yaml
# graphite-latency-comparison.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: graphite-latency-comparison
  namespace: flagger-system
spec:
  provider:
    type: graphite
    address: http://graphite.monitoring.svc.cluster.local
    secretRef:
      name: graphite-credentials
  # Compare canary latency against the primary
  # Returns the ratio of canary to primary latency
  query: |
    divideSeries(averageSeries(app.{{ target }}-canary.request.duration.mean), averageSeries(app.{{ target }}-primary.request.duration.mean))
```

## Step 8: Verify and Test

Apply all the resources and verify that Flagger can query Graphite:

```bash
# Apply metric templates
kubectl apply -f graphite-request-duration.yaml
kubectl apply -f graphite-error-rate.yaml
kubectl apply -f graphite-throughput.yaml

# Apply the canary resource
kubectl apply -f canary.yaml

# Check the canary status
kubectl get canary my-app -n default

# Watch Flagger logs for Graphite query results
kubectl logs -n flagger-system deployment/flagger -f | grep graphite
```

Trigger a canary deployment:

```bash
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default
```

## Troubleshooting

Common issues when integrating Flagger with Graphite:

1. **Connection refused**: Ensure the Graphite service URL is correct and accessible from the Flagger pod
2. **Empty metric result**: Verify that your application is sending metrics to Graphite with the correct metric path
3. **Authentication errors**: Check that the credentials secret is correctly configured

```bash
# Test Graphite connectivity from within the cluster
kubectl run -n flagger-system test-graphite --rm -it --image=curlimages/curl -- \
  curl -s "http://graphite.monitoring.svc.cluster.local/render?target=app.my-app.request.count&from=-5min&format=json"

# Check Flagger logs for errors
kubectl logs -n flagger-system deployment/flagger --tail=50 | grep -i error
```

## Conclusion

You have configured Flagger to use Graphite as an external metrics provider for canary analysis. Graphite's powerful query language allows you to create sophisticated metric queries for request duration, error rates, throughput, percentile latencies, and baseline comparisons. Combined with Flux GitOps, this setup provides a fully automated progressive delivery pipeline with data-driven promotion decisions.
