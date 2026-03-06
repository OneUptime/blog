# How to Deploy Grafana Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, grafana, grafana operator, kubernetes, gitops, dashboards, observability

Description: A practical guide to deploying Grafana Operator on Kubernetes using Flux CD for GitOps-managed dashboards and data sources.

---

## Introduction

Grafana Operator allows you to manage Grafana instances, dashboards, and data sources as Kubernetes custom resources. When paired with Flux CD, your entire Grafana configuration becomes version-controlled and automatically reconciled, making it easy to manage dashboards as code.

This guide covers deploying the Grafana Operator using Flux CD, configuring data sources, and managing dashboards through Git.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- A running Prometheus instance (for data source configuration)

## Setting Up the Helm Repository

Add the Grafana Operator Helm repository as a Flux source.

```yaml
# clusters/my-cluster/grafana/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana-operator
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Creating the Grafana Namespace

```yaml
# clusters/my-cluster/grafana/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: grafana
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying the Grafana Operator

Create a HelmRelease for the Grafana Operator.

```yaml
# clusters/my-cluster/grafana/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: grafana-operator
  namespace: grafana
spec:
  interval: 30m
  chart:
    spec:
      chart: grafana-operator
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: grafana-operator
        namespace: flux-system
      interval: 12h
  maxHistory: 5
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Operator resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Watch all namespaces for Grafana resources
    watchNamespaces: []
    # Enable leader election for HA
    leaderElect: true
```

## Creating a Grafana Instance

Define a Grafana instance using the custom resource.

```yaml
# clusters/my-cluster/grafana/instance.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: Grafana
metadata:
  name: grafana
  namespace: grafana
  labels:
    dashboards: grafana
spec:
  config:
    # Server configuration
    server:
      root_url: "https://grafana.example.com"
    # Authentication configuration
    auth:
      disable_login_form: "false"
    auth.anonymous:
      enabled: "false"
    # Security settings
    security:
      admin_user: admin
      admin_password: "${ADMIN_PASSWORD}"
    # Log settings
    log:
      mode: console
      level: info
    # Database configuration for HA
    database:
      type: postgres
      host: "postgres-service.grafana.svc:5432"
      name: grafana
      user: grafana
      password: "${DB_PASSWORD}"
  deployment:
    spec:
      replicas: 2
      template:
        spec:
          containers:
            - name: grafana
              resources:
                requests:
                  cpu: 250m
                  memory: 512Mi
                limits:
                  cpu: 1000m
                  memory: 1Gi
              # Mount secrets as environment variables
              envFrom:
                - secretRef:
                    name: grafana-credentials
  service:
    spec:
      type: ClusterIP
      ports:
        - name: grafana
          port: 3000
          protocol: TCP
          targetPort: 3000
```

## Setting Up Grafana Credentials

Store sensitive Grafana credentials in a Kubernetes Secret.

```yaml
# clusters/my-cluster/grafana/credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-credentials
  namespace: grafana
type: Opaque
stringData:
  ADMIN_PASSWORD: "your-secure-password"
  DB_PASSWORD: "your-db-password"
```

Encrypt before committing:

```bash
# Encrypt with SOPS
sops --encrypt \
  --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --encrypted-regex '^(data|stringData)$' \
  --in-place clusters/my-cluster/grafana/credentials.yaml
```

## Configuring Data Sources

Define Prometheus as a data source using the GrafanaDatasource custom resource.

```yaml
# clusters/my-cluster/grafana/datasources/prometheus.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: prometheus
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  datasource:
    name: Prometheus
    type: prometheus
    access: proxy
    # URL of the Prometheus service
    url: http://kube-prometheus-stack-prometheus.monitoring.svc:9090
    isDefault: true
    jsonData:
      # Time interval for step alignment
      timeInterval: 30s
      # HTTP method for queries
      httpMethod: POST
    editable: false
```

Add Loki as a log data source.

```yaml
# clusters/my-cluster/grafana/datasources/loki.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: loki
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  datasource:
    name: Loki
    type: loki
    access: proxy
    url: http://loki-gateway.logging.svc:80
    jsonData:
      maxLines: 1000
    editable: false
```

Add Tempo as a tracing data source.

```yaml
# clusters/my-cluster/grafana/datasources/tempo.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDatasource
metadata:
  name: tempo
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  datasource:
    name: Tempo
    type: tempo
    access: proxy
    url: http://tempo-query-frontend.tracing.svc:3100
    jsonData:
      # Link traces to logs in Loki
      tracesToLogsV2:
        datasourceUid: loki
        spanStartTimeShift: "-1h"
        spanEndTimeShift: "1h"
        filterByTraceID: true
        filterBySpanID: true
      # Link traces to metrics in Prometheus
      tracesToMetrics:
        datasourceUid: prometheus
        spanStartTimeShift: "-1h"
        spanEndTimeShift: "1h"
    editable: false
```

## Managing Dashboards as Code

Create dashboards using the GrafanaDashboard custom resource.

```yaml
# clusters/my-cluster/grafana/dashboards/kubernetes-overview.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: kubernetes-overview
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  # Resync dashboard every 10 minutes
  resyncPeriod: 10m
  json: |
    {
      "title": "Kubernetes Overview",
      "uid": "k8s-overview",
      "timezone": "browser",
      "refresh": "30s",
      "time": {
        "from": "now-1h",
        "to": "now"
      },
      "panels": [
        {
          "title": "CPU Usage by Namespace",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
          "targets": [
            {
              "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])) by (namespace)",
              "legendFormat": "{{ namespace }}"
            }
          ]
        },
        {
          "title": "Memory Usage by Namespace",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
          "targets": [
            {
              "expr": "sum(container_memory_working_set_bytes{container!=\"\"}) by (namespace)",
              "legendFormat": "{{ namespace }}"
            }
          ]
        }
      ]
    }
```

You can also reference dashboards from Grafana.com by ID.

```yaml
# clusters/my-cluster/grafana/dashboards/node-exporter.yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: node-exporter-full
  namespace: grafana
spec:
  instanceSelector:
    matchLabels:
      dashboards: grafana
  # Import dashboard from Grafana.com by ID
  grafanaCom:
    id: 1860
    revision: 33
  datasources:
    - inputName: "DS_PROMETHEUS"
      datasourceName: "Prometheus"
```

## Flux Kustomization for Grafana

```yaml
# clusters/my-cluster/grafana/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: grafana-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: grafana
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/grafana
  prune: true
  wait: true
  timeout: 10m
  # Ensure monitoring stack is deployed first
  dependsOn:
    - name: monitoring-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: grafana-operator-controller-manager
      namespace: grafana
```

## Exposing Grafana with an Ingress

```yaml
# clusters/my-cluster/grafana/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  namespace: grafana
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - grafana.example.com
      secretName: grafana-tls
  rules:
    - host: grafana.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: grafana-service
                port:
                  number: 3000
```

## Verifying the Deployment

```bash
# Check the HelmRelease status
flux get helmreleases -n grafana

# Verify operator pods
kubectl get pods -n grafana

# Check Grafana instance status
kubectl get grafana -n grafana

# List all managed dashboards
kubectl get grafanadashboards -n grafana

# List all managed data sources
kubectl get grafanadatasources -n grafana

# Access Grafana via port-forward
kubectl port-forward -n grafana svc/grafana-service 3000:3000
```

## Conclusion

With Grafana Operator managed by Flux CD, your dashboards, data sources, and Grafana configuration are all stored in Git and automatically reconciled. This approach ensures that dashboard changes are reviewed through pull requests, data source configurations are consistent across environments, and Grafana instances can be replicated easily across clusters. Any manual changes made through the Grafana UI will be reverted to match the desired state in Git.
