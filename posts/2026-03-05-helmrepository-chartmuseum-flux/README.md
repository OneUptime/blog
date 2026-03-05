# How to Use HelmRepository with ChartMuseum in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, ChartMuseum, Helm Charts

Description: Learn how to configure a Flux HelmRepository to pull Helm charts from a ChartMuseum server, including authentication, TLS, and multi-tenancy setups.

---

## Introduction

ChartMuseum is a popular open-source Helm chart repository server that provides a simple HTTP-based API for hosting and serving Helm charts. It supports multiple storage backends including local filesystem, Amazon S3, Google Cloud Storage, and Azure Blob Storage. Flux CD integrates with ChartMuseum through the standard HTTP HelmRepository resource, making it straightforward to deploy charts stored in ChartMuseum.

This guide covers setting up a Flux HelmRepository to pull charts from ChartMuseum, including authentication, TLS configuration, and multi-tenancy patterns.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- A running ChartMuseum instance (either standalone or in-cluster)
- The `flux` CLI, `kubectl`, and `helm` CLI installed
- At least one Helm chart uploaded to ChartMuseum

## Step 1: Deploy ChartMuseum (Optional)

If you do not already have a ChartMuseum instance, you can deploy one in your cluster.

```yaml
# chartmuseum-deployment.yaml
# Deploy ChartMuseum with local storage inside the cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chartmuseum
  namespace: chartmuseum
spec:
  replicas: 1
  selector:
    matchLabels:
      app: chartmuseum
  template:
    metadata:
      labels:
        app: chartmuseum
    spec:
      containers:
        - name: chartmuseum
          image: ghcr.io/helm/chartmuseum:v0.16.2
          ports:
            - containerPort: 8080
          env:
            - name: STORAGE
              value: "local"
            - name: STORAGE_LOCAL_ROOTDIR
              value: "/charts"
            - name: BASIC_AUTH_USER      # Enable basic auth
              value: "admin"
            - name: BASIC_AUTH_PASS
              valueFrom:
                secretKeyRef:
                  name: chartmuseum-auth
                  key: password
            - name: AUTH_ANONYMOUS_GET    # Allow anonymous chart pulls
              value: "false"
          volumeMounts:
            - name: chart-storage
              mountPath: /charts
      volumes:
        - name: chart-storage
          persistentVolumeClaim:
            claimName: chartmuseum-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: chartmuseum
  namespace: chartmuseum
spec:
  selector:
    app: chartmuseum
  ports:
    - port: 8080
      targetPort: 8080
```

```bash
# Create the namespace and deploy ChartMuseum
kubectl create namespace chartmuseum
kubectl create secret generic chartmuseum-auth \
  --namespace=chartmuseum \
  --from-literal=password=my-secret-password
kubectl apply -f chartmuseum-deployment.yaml
```

## Step 2: Upload a Chart to ChartMuseum

Upload a Helm chart to ChartMuseum using the API or the Helm CLI.

```bash
# Using curl to upload a chart package
helm package ./my-app-chart/
curl -u admin:my-secret-password \
  --data-binary "@my-app-1.0.0.tgz" \
  http://chartmuseum.chartmuseum.svc.cluster.local:8080/api/charts

# Verify the chart is available
curl -u admin:my-secret-password \
  http://chartmuseum.chartmuseum.svc.cluster.local:8080/api/charts | jq '.'
```

Alternatively, use the `helm-push` plugin.

```bash
# Install the helm-push plugin (if not already installed)
helm plugin install https://github.com/chartmuseum/helm-push

# Add the repo and push
helm repo add my-chartmuseum http://chartmuseum.chartmuseum.svc.cluster.local:8080 \
  --username admin --password my-secret-password
helm cm-push ./my-app-chart/ my-chartmuseum
```

## Step 3: Create Authentication Secret for Flux

Create a Kubernetes secret with ChartMuseum credentials for Flux to use.

```bash
# Create a basic-auth secret for ChartMuseum
kubectl create secret generic chartmuseum-creds \
  --namespace=flux-system \
  --from-literal=username=admin \
  --from-literal=password=my-secret-password
```

## Step 4: Create the HelmRepository

Configure the HelmRepository to point to your ChartMuseum instance.

### In-Cluster ChartMuseum

If ChartMuseum runs inside the same cluster, use the internal service DNS name.

```yaml
# helmrepository-chartmuseum.yaml
# HelmRepository pointing to an in-cluster ChartMuseum instance
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chartmuseum
  namespace: flux-system
spec:
  interval: 10m
  url: http://chartmuseum.chartmuseum.svc.cluster.local:8080
  secretRef:
    name: chartmuseum-creds    # Basic auth credentials
```

### External ChartMuseum

For a ChartMuseum instance running outside the cluster, use the external URL.

```yaml
# helmrepository-chartmuseum-external.yaml
# HelmRepository pointing to an external ChartMuseum instance
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chartmuseum-external
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com
  secretRef:
    name: chartmuseum-creds
```

Apply the resource.

```bash
# Apply the HelmRepository
kubectl apply -f helmrepository-chartmuseum.yaml

# Verify it reconciles successfully
flux get sources helm -n flux-system
```

## Step 5: Create a HelmRelease

Deploy a chart from ChartMuseum using a HelmRelease.

```yaml
# helmrelease-my-app.yaml
# HelmRelease that deploys a chart from ChartMuseum
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app                  # Chart name in ChartMuseum
      version: "1.0.x"              # Semver constraint
      sourceRef:
        kind: HelmRepository
        name: chartmuseum            # References the ChartMuseum HelmRepository
        namespace: flux-system
      interval: 5m
  values:
    replicaCount: 2
    service:
      type: ClusterIP
```

```bash
# Apply the HelmRelease
kubectl apply -f helmrelease-my-app.yaml

# Check the status
flux get helmreleases -A
```

## Configuring TLS for ChartMuseum

If ChartMuseum is served over HTTPS with a custom CA or self-signed certificate, configure the certificate trust.

```bash
# Create a secret with the CA certificate
kubectl create secret generic chartmuseum-ca \
  --namespace=flux-system \
  --from-file=ca.crt=/path/to/chartmuseum-ca.crt
```

```yaml
# HelmRepository with TLS certificate trust
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chartmuseum-tls
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com
  secretRef:
    name: chartmuseum-creds
  certSecretRef:
    name: chartmuseum-ca          # CA certificate for TLS verification
```

## Multi-Tenancy with ChartMuseum

ChartMuseum supports multi-tenancy through depth-based routing. When configured with `--depth=1`, each top-level directory acts as a separate repository.

```yaml
# HelmRepository for a specific tenant in a multi-tenant ChartMuseum
# ChartMuseum is configured with --depth=1
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chartmuseum-team-a
  namespace: team-a
spec:
  interval: 10m
  url: http://chartmuseum.chartmuseum.svc.cluster.local:8080/team-a
  secretRef:
    name: team-a-chartmuseum-creds
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: chartmuseum-team-b
  namespace: team-b
spec:
  interval: 10m
  url: http://chartmuseum.chartmuseum.svc.cluster.local:8080/team-b
  secretRef:
    name: team-b-chartmuseum-creds
```

## Troubleshooting

### Verify Repository Index

ChartMuseum serves an index at the root URL. You can test this directly.

```bash
# Fetch the repository index to verify connectivity and authentication
kubectl run curl-test --rm -it --restart=Never --image=curlimages/curl -- \
  curl -u admin:my-secret-password \
  http://chartmuseum.chartmuseum.svc.cluster.local:8080/index.yaml
```

### Check Source Controller Logs

```bash
# View source controller logs for ChartMuseum-related errors
kubectl logs -n flux-system deploy/source-controller --since=10m | grep -i "chartmuseum\|error\|failed"
```

### Common Issues

1. **Index fetch timeout**: If ChartMuseum has a large number of charts, increase the HelmRepository timeout or interval.
2. **Chart not found after push**: ChartMuseum may cache the index. Use the `POST /api/charts` endpoint or wait for the cache to refresh.
3. **Anonymous access denied**: Ensure `AUTH_ANONYMOUS_GET` is set correctly if you want unauthenticated reads, or always provide a `secretRef`.

## Conclusion

ChartMuseum is a lightweight and flexible solution for hosting Helm charts, and Flux CD integrates with it seamlessly through the standard HTTP HelmRepository. By configuring authentication secrets, TLS trust, and appropriate reconciliation intervals, you can build a reliable chart delivery pipeline. For new deployments, consider using OCI-based registries as the Helm ecosystem is moving toward OCI as the standard distribution format.
