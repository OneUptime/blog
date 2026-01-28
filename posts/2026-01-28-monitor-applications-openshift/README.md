# How to Monitor Applications on OpenShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Monitoring, Observability, Prometheus, Grafana

Description: Learn how to monitor applications on OpenShift using built-in Prometheus and Grafana, custom metrics endpoints, and alerting for production workloads.

---

OpenShift ships with a powerful monitoring stack based on Prometheus and Grafana. You can use it to monitor cluster health, and you can also hook in application metrics and alerts. This guide shows how to enable and consume app metrics safely.

## OpenShift Monitoring Overview

OpenShift provides:

- **Cluster Monitoring**: Metrics for nodes, control plane, and platform components.
- **User Workload Monitoring**: Metrics you expose from your apps.
- **Alertmanager**: Built-in alerting and routing.
- **Grafana**: Dashboards for system and application metrics.

User workload monitoring is the part you need for app-level metrics.

## Step 1: Enable User Workload Monitoring

Create a ConfigMap in the `openshift-monitoring` namespace to enable monitoring for user namespaces.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
```

Apply it:

```bash
oc apply -f cluster-monitoring-config.yaml
```

## Step 2: Expose App Metrics

Expose a `/metrics` endpoint from your app. Use Prometheus client libraries and keep the endpoint fast.

Example for a container port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  labels:
    app: api
spec:
  selector:
    app: api
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Step 3: Create a ServiceMonitor

A `ServiceMonitor` tells Prometheus how to scrape your service.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-metrics
  labels:
    app: api
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

Apply it in the same namespace as your app.

## Step 4: Validate the Metrics

Check that Prometheus is scraping your metrics.

```bash
# List ServiceMonitors
oc get servicemonitors

# Check Prometheus targets (requires access)
oc -n openshift-user-workload-monitoring get pods
```

You can also open the Prometheus UI in the OpenShift console and verify targets are up.

## Step 5: Build Alerts

Create alert rules with `PrometheusRule` resources. Example alert on high error rate:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-alerts
spec:
  groups:
    - name: api.rules
      rules:
        - alert: ApiHighErrorRate
          expr: rate(http_requests_total{job="api",status=~"5.."}[5m]) > 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High error rate detected"
            description: "API 5xx rate is above 1 req/sec for 10 minutes"
```

## Step 6: Dashboards in Grafana

Use Grafana to visualize app latency, errors, and throughput. A good dashboard includes:

- Requests per second
- Error rate by status
- p95 latency
- Resource usage

If you want distributed tracing, integrate OpenTelemetry and export traces to your backend. For OneUptime, you can connect OpenTelemetry data for a unified view of metrics and traces.

## Common Pitfalls

- **ServiceMonitor not found**: Make sure labels match the Service.
- **Scrape errors**: Check for auth or TLS problems.
- **Missing metrics**: Ensure the `/metrics` endpoint is reachable and fast.

## Conclusion

OpenShift makes application monitoring straightforward once user workload monitoring is enabled. Use ServiceMonitors for scraping, PrometheusRule for alerting, and Grafana for dashboards. For deeper visibility, add OpenTelemetry and send traces and metrics to OneUptime.
