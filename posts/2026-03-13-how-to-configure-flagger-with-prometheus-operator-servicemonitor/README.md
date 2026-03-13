# How to Configure Flagger with Prometheus Operator ServiceMonitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Prometheus Operator, ServiceMonitor, Kubernetes, Monitoring

Description: Learn how to configure Flagger with Prometheus Operator ServiceMonitor resources for reliable metrics collection during canary analysis.

---

## Introduction

The Prometheus Operator simplifies Prometheus deployment and management on Kubernetes by introducing custom resources like ServiceMonitor and PodMonitor for declarative scrape configuration. When using Flagger with the Prometheus Operator, you need to ensure that ServiceMonitor resources are properly configured to scrape metrics from both the primary and canary services that Flagger creates.

This guide covers setting up ServiceMonitor resources that work correctly with Flagger's dynamically created services, ensuring consistent metrics collection throughout the canary analysis process.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flagger installed.
- The Prometheus Operator installed (commonly part of the kube-prometheus-stack Helm chart).
- `kubectl` installed and configured.
- Helm 3 installed.

## Understanding Flagger's Service Creation

When Flagger initializes a Canary resource, it creates several services and deployments. For an application named `podinfo`, Flagger creates `podinfo-primary` and `podinfo-canary` services along with their corresponding Deployments. Your ServiceMonitor must match these services to ensure Prometheus scrapes metrics from both versions during canary analysis.

## Creating a ServiceMonitor for the Application

Create a ServiceMonitor that matches all services created by Flagger for your application.

```yaml
# servicemonitor.yaml
# ServiceMonitor that matches primary and canary services
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: podinfo
  namespace: test
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: podinfo
  namespaceSelector:
    matchNames:
      - test
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

This ServiceMonitor uses a label selector that matches all services with the `app: podinfo` label. Since Flagger copies labels from the original service to the primary and canary services, this selector will match all three.

Apply the ServiceMonitor.

```bash
kubectl apply -f servicemonitor.yaml
```

## Verifying ServiceMonitor Label Matching

Ensure that the ServiceMonitor selector labels match the services Flagger creates.

```bash
# Check labels on all podinfo services
kubectl get svc -n test -l app=podinfo --show-labels

# Verify the ServiceMonitor is being picked up by Prometheus
kubectl get servicemonitor -n test

# Check Prometheus targets
kubectl port-forward svc/prometheus-operated -n monitoring 9090:9090
```

Navigate to the Prometheus targets page to verify that all three services (original, primary, and canary) are being scraped.

## Configuring ServiceMonitor for NGINX Ingress Metrics

If you use Flagger with the NGINX Ingress Controller, create a ServiceMonitor for the controller's metrics endpoint.

```yaml
# nginx-servicemonitor.yaml
# ServiceMonitor for NGINX Ingress Controller metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
      app.kubernetes.io/component: controller
  namespaceSelector:
    matchNames:
      - ingress-nginx
  endpoints:
    - port: metrics
      interval: 15s
```

## Configuring ServiceMonitor for Istio Metrics

For Istio-based deployments, Prometheus needs to scrape the Envoy sidecar proxies. The Istio installation typically includes ServiceMonitor or PodMonitor resources, but you may need to verify or create them.

```yaml
# istio-servicemonitor.yaml
# PodMonitor for Istio Envoy sidecar proxy metrics
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchExpressions:
      - key: security.istio.io/tlsMode
        operator: Exists
  namespaceSelector:
    any: true
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 15s
```

## Ensuring Prometheus Operator Discovers ServiceMonitors

The Prometheus Operator needs to be configured to discover ServiceMonitors in the correct namespaces. Check the Prometheus custom resource for the serviceMonitorSelector and serviceMonitorNamespaceSelector settings.

```bash
# Check the Prometheus resource configuration
kubectl get prometheus -n monitoring -o yaml | grep -A 10 serviceMonitor
```

If your Prometheus is configured to only discover ServiceMonitors with specific labels, ensure your ServiceMonitors include those labels.

```yaml
# Common label requirement for Prometheus Operator
metadata:
  labels:
    release: prometheus  # Must match serviceMonitorSelector
```

If the Prometheus resource uses namespace selectors, ensure the namespaces are included.

```yaml
# Prometheus resource with namespace selector
spec:
  serviceMonitorNamespaceSelector:
    matchLabels:
      monitoring: enabled
```

Add the required label to your application namespace.

```bash
kubectl label namespace test monitoring=enabled
```

## Creating a ServiceMonitor for Flagger Metrics

Flagger itself exposes Prometheus metrics for canary status, weight, and analysis results. Create a ServiceMonitor to scrape Flagger's metrics endpoint.

```yaml
# flagger-servicemonitor.yaml
# ServiceMonitor for Flagger's own metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flagger
  namespace: flagger-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: flagger
  namespaceSelector:
    matchNames:
      - flagger-system
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

This enables monitoring of Flagger's own health and provides the `flagger_canary_status`, `flagger_canary_weight`, and other metrics used in Grafana dashboards.

## Handling Dynamic Service Creation

When Flagger creates canary and primary services during initialization, there can be a delay before Prometheus discovers and starts scraping the new targets. To minimize this delay, configure a shorter resync period on the Prometheus Operator.

```yaml
# prometheus-values.yaml
# Helm values for kube-prometheus-stack
prometheus:
  prometheusSpec:
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
```

Setting `serviceMonitorSelectorNilUsesHelmValues` to false allows Prometheus to discover all ServiceMonitors regardless of their labels, which simplifies setup.

## Verifying the Complete Setup

Run through the following checks to verify everything is properly configured.

```bash
# List all ServiceMonitors
kubectl get servicemonitor --all-namespaces

# Check Prometheus targets for your application
kubectl port-forward svc/prometheus-operated -n monitoring 9090:9090

# Query for application metrics
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=up{job="podinfo"}'

# Check Flagger metrics
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=flagger_canary_status'
```

## Conclusion

Configuring Flagger with Prometheus Operator ServiceMonitor resources ensures reliable metrics collection for canary analysis. The key is to create ServiceMonitors with selectors that match all services Flagger creates, verify that the Prometheus Operator discovers those ServiceMonitors, and ensure the scrape configuration collects the metrics that Flagger's analysis queries expect. With proper ServiceMonitor configuration, Flagger can consistently evaluate canary health and make reliable promotion or rollback decisions.
