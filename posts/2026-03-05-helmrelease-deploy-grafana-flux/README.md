# How to Use HelmRelease for Deploying Grafana with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Grafana, Dashboards, Observability

Description: Learn how to deploy Grafana on Kubernetes using a Flux HelmRelease for centralized metrics visualization and dashboard management.

---

Grafana is the leading open-source platform for monitoring and observability dashboards. While it is bundled with the kube-prometheus-stack, deploying Grafana as a standalone HelmRelease gives you more control over its configuration, version, and lifecycle. This guide covers deploying Grafana independently with Flux CD, including persistent storage, data source configuration, and dashboard provisioning.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- A Prometheus instance (or other data source) running in your cluster

## Creating the HelmRepository

Grafana publishes its official Helm charts through the Grafana community repository.

```yaml
# helmrepository-grafana.yaml - Official Grafana Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

## Deploying Grafana with HelmRelease

The following HelmRelease deploys Grafana with persistent storage, a Prometheus data source, and pre-provisioned dashboards.

```yaml
# helmrelease-grafana.yaml - Standalone Grafana deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: grafana
      version: "8.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Number of Grafana replicas
    replicas: 1

    # Admin credentials (use a Secret in production)
    adminUser: admin
    adminPassword: "changeme-use-secret-in-production"

    # Persistent storage for Grafana databases and plugins
    persistence:
      enabled: true
      type: pvc
      size: 10Gi
      accessModes:
        - ReadWriteOnce

    # Resource requests and limits
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Grafana server configuration
    grafana.ini:
      server:
        root_url: "https://grafana.example.com"
      auth:
        # Disable anonymous access
        disable_login_form: false
      security:
        # Allow embedding Grafana dashboards in iframes
        allow_embedding: true
      users:
        # Allow users to sign up
        allow_sign_up: false

    # Data source provisioning
    datasources:
      datasources.yaml:
        apiVersion: 1
        datasources:
          # Prometheus data source
          - name: Prometheus
            type: prometheus
            url: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090
            access: proxy
            isDefault: true
            jsonData:
              timeInterval: "30s"
          # Loki data source for logs
          - name: Loki
            type: loki
            url: http://loki.monitoring.svc.cluster.local:3100
            access: proxy

    # Dashboard provisioning from ConfigMaps
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: default
            orgId: 1
            folder: ""
            type: file
            disableDeletion: false
            editable: true
            options:
              path: /var/lib/grafana/dashboards/default

    # Pre-built dashboards from grafana.com
    dashboards:
      default:
        # Kubernetes cluster overview dashboard
        kubernetes-cluster:
          gnetId: 7249
          revision: 1
          datasource: Prometheus
        # Node exporter dashboard
        node-exporter:
          gnetId: 1860
          revision: 37
          datasource: Prometheus
        # NGINX Ingress dashboard
        nginx-ingress:
          gnetId: 9614
          revision: 1
          datasource: Prometheus

    # Ingress configuration for external access
    ingress:
      enabled: true
      ingressClassName: nginx
      annotations:
        cert-manager.io/cluster-issuer: "letsencrypt-production"
      hosts:
        - grafana.example.com
      tls:
        - secretName: grafana-tls
          hosts:
            - grafana.example.com

    # Service configuration
    service:
      type: ClusterIP
      port: 80

    # Install common plugins
    plugins:
      - grafana-clock-panel
      - grafana-piechart-panel
```

## Using a Secret for Admin Credentials

In production, avoid storing the admin password in the HelmRelease values. Instead, reference a Kubernetes Secret.

```yaml
# grafana-admin-secret.yaml - Secret for Grafana admin credentials
apiVersion: v1
kind: Secret
metadata:
  name: grafana-admin-credentials
  namespace: monitoring
type: Opaque
stringData:
  admin-user: admin
  admin-password: "your-secure-password-here"
```

Then reference it in the HelmRelease using `valuesFrom`:

```yaml
# Snippet: Reference admin credentials from a Secret
spec:
  valuesFrom:
    - kind: Secret
      name: grafana-admin-credentials
      valuesKey: admin-user
      targetPath: adminUser
    - kind: Secret
      name: grafana-admin-credentials
      valuesKey: admin-password
      targetPath: adminPassword
```

## Adding Custom Dashboards via ConfigMap

You can provision custom dashboards by creating ConfigMaps with dashboard JSON and labeling them for Grafana's sidecar to pick up.

```yaml
# dashboard-configmap.yaml - Custom dashboard stored in a ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-app-dashboard
  namespace: monitoring
  labels:
    # This label tells the Grafana sidecar to load this dashboard
    grafana_dashboard: "1"
data:
  custom-app.json: |
    {
      "dashboard": {
        "title": "Custom App Metrics",
        "panels": []
      }
    }
```

Enable the sidecar in the HelmRelease values to auto-discover dashboard ConfigMaps:

```yaml
# Snippet: Enable sidecar for dashboard auto-discovery
sidecar:
  dashboards:
    enabled: true
    label: grafana_dashboard
    searchNamespace: ALL
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease grafana -n monitoring

# Verify Grafana pod is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana

# Access Grafana via port-forward
kubectl port-forward -n monitoring svc/grafana 3000:80

# Check that data sources are configured
curl -u admin:changeme http://localhost:3000/api/datasources
```

## Summary

Deploying Grafana as a standalone HelmRelease from `https://grafana.github.io/helm-charts` through Flux CD gives you full control over your visualization layer. With declarative data source configuration, dashboard provisioning from grafana.com or ConfigMaps, and persistent storage, your entire Grafana setup becomes reproducible and version-controlled in your GitOps repository.
