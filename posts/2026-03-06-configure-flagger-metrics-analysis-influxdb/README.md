# How to Configure Flagger Metrics Analysis with InfluxDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, flagger, InfluxDB, Metrics, Canary, Kubernetes, GitOps, Time-Series

Description: Step-by-step guide to using InfluxDB as a metrics provider for Flagger canary analysis in Flux-managed Kubernetes environments.

---

## Introduction

InfluxDB is a high-performance time-series database designed for handling large volumes of metrics data. When combined with Flagger, you can use InfluxDB queries to drive canary analysis decisions. This is particularly useful if your observability stack already relies on InfluxDB for storing application and infrastructure metrics.

This guide walks through the complete setup of InfluxDB as a metrics provider for Flagger canary deployments managed by Flux.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Flagger deployed in the cluster
- An InfluxDB instance (v1.x or v2.x) accessible from the cluster
- An application instrumented to send metrics to InfluxDB
- kubectl and flux CLI tools

## Step 1: Deploy InfluxDB in Kubernetes

If you need to deploy InfluxDB, use a Flux HelmRelease.

```yaml
# influxdb-helmrelease.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: influxdata
  namespace: monitoring
spec:
  interval: 1h
  url: https://helm.influxdata.com
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: influxdb
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: influxdb2
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: influxdata
        namespace: monitoring
  values:
    # Persistence configuration
    persistence:
      enabled: true
      size: 50Gi
    # Admin user configuration
    adminUser:
      organization: "myorg"
      bucket: "default"
      retention_policy: "30d"
```

## Step 2: Create InfluxDB Authentication Secret

Flagger needs credentials to query InfluxDB. Create a secret with the authentication token.

```yaml
# influxdb-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: influxdb-credentials
  namespace: flagger-system
type: Opaque
stringData:
  # For InfluxDB v2, use an API token
  token: "your-influxdb-api-token"
  # For InfluxDB v1, use username and password
  username: "admin"
  password: "your-influxdb-password"
```

Apply the secret:

```bash
kubectl apply -f influxdb-credentials.yaml
```

## Step 3: Create MetricTemplate for Request Duration (InfluxDB v2 Flux Query)

InfluxDB v2 uses the Flux query language. Create a MetricTemplate with a Flux query.

```yaml
# influxdb-request-duration.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: influxdb-request-duration
  namespace: flagger-system
spec:
  provider:
    # Use influxdb as the provider type
    type: influxdb
    # InfluxDB API endpoint
    address: http://influxdb.monitoring.svc.cluster.local:8086
    # Reference to the credentials secret
    secretRef:
      name: influxdb-credentials
  # InfluxDB Flux query language
  # {{ target }} is replaced with the canary target name
  query: |
    from(bucket: "metrics")
      |> range(start: -1m)
      |> filter(fn: (r) => r["_measurement"] == "http_request_duration_seconds")
      |> filter(fn: (r) => r["app"] == "{{ target }}")
      |> filter(fn: (r) => r["_field"] == "mean")
      |> mean()
      |> yield(name: "mean")
```

## Step 4: Create MetricTemplate for Error Rate

Define a metric template that calculates the HTTP error rate from InfluxDB data.

```yaml
# influxdb-error-rate.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: influxdb-error-rate
  namespace: flagger-system
spec:
  provider:
    type: influxdb
    address: http://influxdb.monitoring.svc.cluster.local:8086
    secretRef:
      name: influxdb-credentials
  # Calculate error rate as percentage of 5xx responses
  query: |
    total = from(bucket: "metrics")
      |> range(start: -1m)
      |> filter(fn: (r) => r["_measurement"] == "http_requests_total")
      |> filter(fn: (r) => r["app"] == "{{ target }}")
      |> sum()
      |> tableFind(fn: (key) => true)
      |> getRecord(idx: 0)

    errors = from(bucket: "metrics")
      |> range(start: -1m)
      |> filter(fn: (r) => r["_measurement"] == "http_requests_total")
      |> filter(fn: (r) => r["app"] == "{{ target }}")
      |> filter(fn: (r) => r["status_code"] =~ /5../)
      |> sum()
      |> tableFind(fn: (key) => true)
      |> getRecord(idx: 0)

    // Return error rate as a percentage
    errors._value / total._value * 100.0
```

## Step 5: Create MetricTemplate for Custom Business Metrics

InfluxDB often stores custom business metrics. Here is how to query them for canary analysis.

```yaml
# influxdb-business-metric.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: influxdb-conversion-rate
  namespace: flagger-system
spec:
  provider:
    type: influxdb
    address: http://influxdb.monitoring.svc.cluster.local:8086
    secretRef:
      name: influxdb-credentials
  # Query a business metric like conversion rate
  query: |
    from(bucket: "business_metrics")
      |> range(start: -5m)
      |> filter(fn: (r) => r["_measurement"] == "checkout_conversions")
      |> filter(fn: (r) => r["service"] == "{{ target }}")
      |> filter(fn: (r) => r["_field"] == "rate")
      |> mean()
      |> yield(name: "conversion_rate")
```

## Step 6: Using InfluxDB v1 InfluxQL Queries

If you are running InfluxDB v1, use InfluxQL instead of Flux query language.

```yaml
# influxdb-v1-request-duration.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: influxdb-v1-request-duration
  namespace: flagger-system
spec:
  provider:
    type: influxdb
    address: http://influxdb.monitoring.svc.cluster.local:8086
    secretRef:
      name: influxdb-credentials
  # InfluxQL query for v1 instances
  query: |
    SELECT mean("duration")
    FROM "http_request_duration"
    WHERE "app" = '{{ target }}'
    AND time > now() - 1m
    GROUP BY time(1m)
    ORDER BY time DESC
    LIMIT 1
```

## Step 7: Wire Up Metrics in the Canary Resource

Reference all metric templates in your Canary resource.

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
    # Analyze every 1 minute
    interval: 1m
    # Roll back after 5 failed checks
    threshold: 5
    # Maximum canary traffic weight
    maxWeight: 50
    # Step size for traffic increment
    stepWeight: 10
    metrics:
      # Request duration from InfluxDB
      - name: influxdb-request-duration
        templateRef:
          name: influxdb-request-duration
          namespace: flagger-system
        # Maximum acceptable average duration in seconds
        thresholdRange:
          max: 0.5
        interval: 1m
      # Error rate from InfluxDB
      - name: influxdb-error-rate
        templateRef:
          name: influxdb-error-rate
          namespace: flagger-system
        # Maximum acceptable error rate percentage
        thresholdRange:
          max: 1
        interval: 1m
      # Business conversion rate from InfluxDB
      - name: influxdb-conversion-rate
        templateRef:
          name: influxdb-conversion-rate
          namespace: flagger-system
        # Minimum acceptable conversion rate
        thresholdRange:
          min: 5
        interval: 5m
```

## Step 8: Set Up InfluxDB Data Retention

Configure data retention policies to manage storage for your canary metrics.

```bash
# For InfluxDB v2, create a retention policy via the CLI
influx bucket update \
  --id your-bucket-id \
  --retention 7d \
  --org myorg

# For InfluxDB v1, set retention policy
influx -execute "CREATE RETENTION POLICY canary_metrics ON mydb DURATION 7d REPLICATION 1"
```

## Step 9: Verify and Monitor

Validate the setup by checking Flagger status and logs.

```bash
# Check the canary resource status
kubectl get canary my-app -n default -o wide

# View detailed canary conditions
kubectl describe canary my-app -n default

# Monitor Flagger logs for InfluxDB query activity
kubectl logs -n flagger-system deployment/flagger -f | grep influxdb

# Test InfluxDB connectivity from the cluster
kubectl run -n flagger-system test-influx --rm -it --image=curlimages/curl -- \
  curl -s -H "Authorization: Token your-token" \
  "http://influxdb.monitoring.svc.cluster.local:8086/api/v2/query" \
  --data-urlencode 'org=myorg' \
  --data-urlencode 'query=from(bucket:"metrics") |> range(start:-5m) |> limit(n:1)'
```

## Step 10: Trigger and Observe a Canary Deployment

Deploy a new version and watch Flagger use InfluxDB metrics for analysis.

```bash
# Update the deployment to trigger a canary rollout
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default

# Watch the canary progression
kubectl get canary my-app -n default -w
```

Expected output during a successful canary:

```text
NAME     STATUS        WEIGHT   LASTTRANSITIONTIME
my-app   Progressing   0        2026-03-06T10:00:00Z
my-app   Progressing   10       2026-03-06T10:01:00Z
my-app   Progressing   20       2026-03-06T10:02:00Z
my-app   Progressing   30       2026-03-06T10:03:00Z
my-app   Progressing   40       2026-03-06T10:04:00Z
my-app   Progressing   50       2026-03-06T10:05:00Z
my-app   Promoting     0        2026-03-06T10:06:00Z
my-app   Finalising    0        2026-03-06T10:07:00Z
my-app   Succeeded     0        2026-03-06T10:08:00Z
```

## Troubleshooting

Common issues and their solutions:

- **Connection timeout**: Verify the InfluxDB service address is reachable from the flagger-system namespace
- **Authentication failed**: Ensure the token or credentials in the secret are valid
- **Empty query result**: Check that your application is writing metrics to the correct bucket and measurement
- **Query syntax error**: Validate your Flux or InfluxQL query against the InfluxDB UI before using it in the MetricTemplate

```bash
# Check Flagger logs for detailed errors
kubectl logs -n flagger-system deployment/flagger --tail=100 | grep -i "error\|influx"
```

## Conclusion

You have successfully configured Flagger to use InfluxDB for canary metrics analysis. Whether you use InfluxDB v1 with InfluxQL or InfluxDB v2 with Flux queries, Flagger can leverage your time-series data for automated progressive delivery decisions. This integration fits naturally into a Flux GitOps workflow, giving you a fully automated pipeline from code commit to production deployment.
