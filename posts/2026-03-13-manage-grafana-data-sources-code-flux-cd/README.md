# Manage Grafana Data Sources as Code with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: grafana, flux-cd, gitops, kubernetes, data-sources, observability, prometheus

Description: Learn how to manage Grafana data sources as code using Kubernetes Secrets and ConfigMaps with Flux CD, ensuring consistent and auditable data source configuration across environments.

---

## Introduction

Grafana data sources configured through the UI are difficult to reproduce across environments and are vulnerable to accidental modification. Managing data sources as code in Git ensures that every Grafana instance in every environment points to the correct backend, with credentials stored safely in Kubernetes Secrets.

Grafana's provisioning system supports loading data source configurations from files. By combining this with Flux CD, you can declare data source configurations in Git and have Flux automatically apply them whenever they change. Secrets for credentials are managed separately using sealed-secrets or an external secrets operator.

This guide covers defining Grafana data source provisioning configurations, managing credentials with Kubernetes Secrets, and reconciling everything with Flux CD.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Grafana deployed via Helm with provisioning enabled
- `kubectl` and `flux` CLIs installed
- Prometheus or other data source running in the cluster

## Step 1: Deploy Grafana with Data Source Sidecar Enabled

Enable the Grafana sidecar that watches for ConfigMaps containing data source provisioning YAML.

```yaml
# grafana/helm-release.yaml - Grafana HelmRelease with datasource sidecar enabled
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 10m
  chart:
    spec:
      chart: grafana
      version: "7.*"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: monitoring
  values:
    # Enable the sidecar that loads data sources from ConfigMaps
    sidecar:
      datasources:
        enabled: true
        label: grafana_datasource
        labelValue: "1"
        searchNamespace: ALL
```

## Step 2: Define Prometheus as a Data Source

Create a ConfigMap containing the Grafana data source provisioning YAML. Label it so the sidecar picks it up automatically.

```yaml
# grafana/datasources/prometheus.yaml - Prometheus data source provisioning ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-prometheus
  namespace: monitoring
  labels:
    # Label required for the Grafana sidecar to load this data source
    grafana_datasource: "1"
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        # Use the cluster-internal service URL for low-latency queries
        url: http://prometheus-server.monitoring.svc.cluster.local:9090
        access: proxy
        isDefault: true
        jsonData:
          timeInterval: "30s"
          queryTimeout: "60s"
          httpMethod: POST
```

## Step 3: Add an Authenticated Data Source with Secrets

For data sources requiring authentication, inject credentials from a Kubernetes Secret using Grafana's environment variable substitution.

```yaml
# grafana/datasources/loki-secret.yaml - Secret holding Loki credentials (use sealed-secrets in production)
apiVersion: v1
kind: Secret
metadata:
  name: grafana-loki-credentials
  namespace: monitoring
type: Opaque
stringData:
  username: "grafana-reader"
  password: "changeme"  # Replace with sealed-secrets or external-secrets in production
---
# grafana/datasources/loki.yaml - Loki data source using environment variable substitution
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-loki
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  loki.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        url: http://loki-gateway.monitoring.svc.cluster.local:80
        access: proxy
        basicAuth: true
        # Reference environment variables injected from the Secret
        basicAuthUser: ${LOKI_USERNAME}
        secureJsonData:
          basicAuthPassword: ${LOKI_PASSWORD}
```

## Step 4: Mount the Secret into Grafana via HelmRelease

Update the HelmRelease to mount the credentials Secret as environment variables so Grafana can substitute them.

```yaml
# Patch the Grafana HelmRelease to inject Loki credentials as environment variables
# Add this to the values section of your grafana/helm-release.yaml
extraEnvFrom:
  - secretRef:
      name: grafana-loki-credentials
      # Map secret keys to the expected environment variable names
envValueFrom:
  LOKI_USERNAME:
    secretKeyRef:
      name: grafana-loki-credentials
      key: username
  LOKI_PASSWORD:
    secretKeyRef:
      name: grafana-loki-credentials
      key: password
```

## Step 5: Create a Flux Kustomization for Data Sources

Reconcile all data source ConfigMaps from Git using a dedicated Flux Kustomization.

```yaml
# clusters/my-cluster/grafana-datasources.yaml - Flux Kustomization for Grafana data sources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: grafana-datasources
  namespace: flux-system
spec:
  interval: 5m
  path: ./grafana/datasources
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: grafana
```

## Best Practices

- Never commit plaintext credentials; use Sealed Secrets or External Secrets Operator for Secret management
- Use `access: proxy` so Grafana queries data sources server-side, avoiding CORS issues
- Set `isDefault: true` on only one data source per type to avoid dashboard confusion
- Test data source connectivity after each change using Grafana's `Test` button or the API
- Use environment overlays (dev/staging/prod) with different ConfigMap values to point to the right backends per environment
- Enable `prune: true` to remove data source ConfigMaps when they are removed from Git

## Conclusion

Managing Grafana data sources as code with Flux CD provides the same GitOps benefits for your observability stack as for your application workloads. Data source configurations are reviewed, versioned, and automatically reconciled—making your monitoring infrastructure reproducible, auditable, and consistent across all environments.
