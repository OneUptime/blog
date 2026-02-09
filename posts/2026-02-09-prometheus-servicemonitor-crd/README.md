# How to Configure Prometheus ServiceMonitor CRD for Application Metrics Scraping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, ServiceMonitor, Monitoring, CRD

Description: Master the Prometheus ServiceMonitor Custom Resource Definition to automatically discover and scrape metrics from your Kubernetes services.

---

The Prometheus Operator introduces Custom Resource Definitions (CRDs) that simplify metrics collection in Kubernetes. The ServiceMonitor CRD is a declarative way to specify how groups of services should be monitored. Instead of manually editing Prometheus configuration files, you create ServiceMonitor resources that the Operator automatically converts into scrape configurations.

## Understanding ServiceMonitor

A ServiceMonitor defines a set of targets to be monitored by Prometheus. It uses label selectors to discover services and automatically configures Prometheus to scrape metrics from them. When you create or update a ServiceMonitor, the Prometheus Operator updates the Prometheus configuration without requiring a restart.

The ServiceMonitor abstraction provides several advantages:
- Automatic service discovery based on labels
- No need to reload Prometheus configuration manually
- Consistent monitoring configuration across teams
- Easy to version control alongside application code
- Namespace-scoped for better multi-tenancy

## Basic ServiceMonitor Configuration

Here's a simple ServiceMonitor that scrapes metrics from a web application:

```yaml
# basic-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: web-app-monitor
  namespace: production
  labels:
    team: backend
    release: prometheus-stack  # Must match Prometheus serviceMonitorSelector
spec:
  # Select services with matching labels
  selector:
    matchLabels:
      app: web-app
      tier: frontend

  # Define scrape endpoints
  endpoints:
    - port: metrics  # Named port from the Service
      interval: 30s  # Scrape every 30 seconds
      path: /metrics # Metrics endpoint path
```

The corresponding Kubernetes Service must have a matching label:

```yaml
# web-app-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: production
  labels:
    app: web-app      # Matches ServiceMonitor selector
    tier: frontend    # Matches ServiceMonitor selector
spec:
  selector:
    app: web-app
  ports:
    - name: metrics   # Named port referenced by ServiceMonitor
      port: 8080
      targetPort: 8080
    - name: http
      port: 80
      targetPort: 8080
```

Apply both resources:

```bash
# Apply the Service
kubectl apply -f web-app-service.yaml

# Apply the ServiceMonitor
kubectl apply -f basic-servicemonitor.yaml
```

## Configuring Prometheus to Use ServiceMonitors

For Prometheus to discover your ServiceMonitors, it must have a matching selector. Check your Prometheus configuration:

```bash
# Get the Prometheus serviceMonitorSelector
kubectl get prometheus -n monitoring -o yaml | grep -A 5 serviceMonitorSelector
```

If using kube-prometheus-stack, the default selector looks for a specific label:

```yaml
# prometheus-instance.yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: main
  namespace: monitoring
spec:
  serviceMonitorSelector:
    matchLabels:
      release: prometheus-stack  # ServiceMonitors need this label

  # Which namespaces to watch for ServiceMonitors
  serviceMonitorNamespaceSelector:
    matchLabels:
      monitoring: enabled
```

To monitor services across all namespaces, use an empty selector:

```yaml
spec:
  serviceMonitorNamespaceSelector: {}  # Watch all namespaces
```

## Advanced ServiceMonitor Features

### Multiple Endpoints

Monitor multiple ports on the same service:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: multi-port-monitor
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  endpoints:
    # Main application metrics
    - port: metrics
      interval: 30s
      path: /metrics

    # JVM-specific metrics
    - port: jmx-metrics
      interval: 60s
      path: /jmx_metrics

    # Custom business metrics
    - port: business-metrics
      interval: 120s
      path: /business/metrics
```

### Metric Relabeling

Transform or filter metrics before storage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: relabel-example
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics

      # Relabel configurations
      metricRelabelings:
        # Drop metrics with high cardinality
        - sourceLabels: [__name__]
          regex: 'http_request_duration_seconds_bucket'
          action: drop

        # Rename a label
        - sourceLabels: [old_label]
          targetLabel: new_label
          action: replace

        # Add a static label
        - targetLabel: environment
          replacement: production
          action: replace

        # Keep only specific metrics
        - sourceLabels: [__name__]
          regex: '(http_requests_total|process_cpu_seconds_total)'
          action: keep
```

### Basic Authentication

Scrape endpoints requiring authentication:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: secured-app-monitor
  namespace: production
spec:
  selector:
    matchLabels:
      app: secured-app
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics

      # Reference a secret containing credentials
      basicAuth:
        username:
          name: metrics-auth
          key: username
        password:
          name: metrics-auth
          key: password
```

Create the secret:

```bash
# Create the authentication secret
kubectl create secret generic metrics-auth \
  --from-literal=username=metrics-user \
  --from-literal=password=secure-password \
  -n production
```

### TLS Configuration

Scrape HTTPS endpoints with custom certificates:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: tls-app-monitor
  namespace: production
spec:
  selector:
    matchLabels:
      app: tls-app
  endpoints:
    - port: metrics-https
      interval: 30s
      path: /metrics
      scheme: https

      # TLS configuration
      tlsConfig:
        # Skip certificate verification (not recommended for production)
        insecureSkipVerify: false

        # Use custom CA certificate
        ca:
          secret:
            name: metrics-ca-cert
            key: ca.crt

        # Client certificate authentication
        cert:
          secret:
            name: metrics-client-cert
            key: tls.crt
        keySecret:
          name: metrics-client-cert
          key: tls.key
```

### Scrape Timeout and Parameters

Configure timeouts and query parameters:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: custom-params-monitor
  namespace: production
spec:
  selector:
    matchLabels:
      app: parameterized-app
  endpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s  # Must be less than interval
      path: /metrics

      # Add query parameters to scrape URL
      params:
        format:
          - prometheus
        verbose:
          - "true"

      # Honor labels from the target
      honorLabels: true

      # Honor timestamps from the target
      honorTimestamps: true
```

## Label Selection Strategies

### Exact Match

Select services with exact label matches:

```yaml
spec:
  selector:
    matchLabels:
      app: my-app
      version: v2
```

### Expression-Based Selection

Use more complex label queries:

```yaml
spec:
  selector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - web-app
          - api-app

      - key: environment
        operator: NotIn
        values:
          - development
          - testing

      - key: monitoring
        operator: Exists
```

### Namespace Selection

Monitor services across specific namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: multi-namespace-monitor
  namespace: monitoring
spec:
  # Select namespaces with this label
  namespaceSelector:
    matchNames:
      - production
      - staging

  selector:
    matchLabels:
      app: my-app

  endpoints:
    - port: metrics
      interval: 30s
```

## Verifying ServiceMonitor Configuration

Check if Prometheus discovered your ServiceMonitor:

```bash
# List all ServiceMonitors
kubectl get servicemonitor -A

# Get details of a specific ServiceMonitor
kubectl describe servicemonitor web-app-monitor -n production
```

Verify that Prometheus is scraping the targets:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Check targets in the UI at http://localhost:9090/targets
# Or query the API
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "web-app-monitor")'
```

Check Prometheus logs for any errors:

```bash
# Get Prometheus pod name
PROM_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')

# Check logs for ServiceMonitor-related messages
kubectl logs -n monitoring $PROM_POD | grep -i servicemonitor
```

## Troubleshooting Common Issues

### ServiceMonitor Not Discovered

If your ServiceMonitor is not picked up by Prometheus:

1. Verify the ServiceMonitor has the correct label for Prometheus selector:

```bash
kubectl get servicemonitor web-app-monitor -n production -o jsonpath='{.metadata.labels}'
```

2. Check namespace selector configuration in Prometheus.

3. Ensure the ServiceMonitor and Service are in the expected namespace.

### No Targets Appearing

If the ServiceMonitor is discovered but no targets appear:

1. Verify the Service has matching labels:

```bash
kubectl get service web-app -n production -o jsonpath='{.metadata.labels}'
```

2. Ensure the Service has a named port matching the ServiceMonitor:

```bash
kubectl get service web-app -n production -o jsonpath='{.spec.ports[*].name}'
```

3. Check that pods are ready and have the metrics endpoint:

```bash
kubectl get endpoints web-app -n production
```

### Scrape Failures

If targets appear but scraping fails:

```bash
# Check Prometheus logs
kubectl logs -n monitoring $PROM_POD | grep -A 5 "scrape failed"

# Common issues:
# - Wrong metrics path
# - Authentication required but not configured
# - Network policies blocking access
# - Pod not exposing metrics on the expected port
```

Test the metrics endpoint directly:

```bash
# Port forward to a pod
kubectl port-forward -n production pod/web-app-xyz 8080:8080 &

# Test the metrics endpoint
curl http://localhost:8080/metrics
```

## Best Practices

1. Use consistent labeling across services and ServiceMonitors
2. Keep scrape intervals reasonable (30s-60s for most applications)
3. Apply metric relabeling to drop high-cardinality labels
4. Use namespace selectors to limit ServiceMonitor scope
5. Version control ServiceMonitors alongside application manifests
6. Document custom metrics in your application code
7. Test ServiceMonitors in non-production environments first
8. Monitor Prometheus resource usage as you add more targets

## Conclusion

ServiceMonitors provide a Kubernetes-native way to configure Prometheus scraping without managing complex configuration files. By leveraging label selectors and the Prometheus Operator, you can create scalable, maintainable monitoring configurations that adapt automatically as your services change. Master ServiceMonitors to build robust observability for your Kubernetes applications.
