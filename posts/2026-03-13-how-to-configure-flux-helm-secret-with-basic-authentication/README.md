# How to Configure Flux Helm Secret with Basic Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, Helm, HelmRepository, Basic Auth

Description: Step-by-step guide to configuring Flux CD to authenticate with private Helm chart repositories using basic authentication.

---

## Introduction

Helm charts are a popular way to package and deploy Kubernetes applications. Many organizations host their Helm charts in private repositories that require authentication. Flux CD's Source Controller supports pulling Helm charts from authenticated repositories using basic authentication (username and password).

This guide shows you how to configure a Kubernetes Secret with basic auth credentials and reference it in a Flux `HelmRepository` resource.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- A private Helm chart repository with basic auth enabled
- Credentials (username and password) for the Helm repository

## Step 1: Identify Your Helm Repository Details

Determine the URL and credentials for your Helm repository. Common private Helm repository solutions include:

- **ChartMuseum**: `https://charts.example.com`
- **Harbor**: `https://harbor.example.com/chartrepo/my-project`
- **Artifactory**: `https://artifactory.example.com/helm-local`
- **Nexus**: `https://nexus.example.com/repository/helm-hosted/`
- **AWS CodeArtifact**: Requires token-based auth (see provider docs)

## Step 2: Create the Kubernetes Secret

Create a Secret with your Helm repository credentials:

```bash
kubectl create secret generic helm-repo-credentials \
  --namespace=flux-system \
  --from-literal=username=your-username \
  --from-literal=password=your-password
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: your-username
  password: your-password
```

Apply the manifest:

```bash
kubectl apply -f helm-repo-secret.yaml
```

## Step 3: Configure the HelmRepository Resource

Create a `HelmRepository` resource that references the Secret:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-private-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com
  secretRef:
    name: helm-repo-credentials
```

Apply the resource:

```bash
kubectl apply -f helmrepository.yaml
```

## Step 4: Create a HelmRelease That Uses the Repository

Once the `HelmRepository` is configured, you can create a `HelmRelease` to deploy a chart from it:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-private-charts
        namespace: flux-system
  values:
    replicaCount: 2
    image:
      repository: my-registry.example.com/my-app
      tag: latest
```

Apply the resource:

```bash
kubectl apply -f helmrelease.yaml
```

## Step 5: Self-Signed Certificates (Optional)

If your Helm repository uses a self-signed TLS certificate, add the CA certificate to the Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: your-username
  password: your-password
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    <your-ca-certificate-content>
    -----END CERTIFICATE-----
```

## Verification

Check the `HelmRepository` status:

```bash
flux get sources helm my-private-charts
```

Verify the chart index was fetched successfully:

```bash
kubectl describe helmrepository my-private-charts -n flux-system
```

Check the `HelmRelease` status:

```bash
flux get helmreleases -n flux-system
```

## Troubleshooting

### 401 Unauthorized

If the `HelmRepository` shows authentication errors:

1. Verify the credentials are correct:

```bash
curl -u your-username:your-password https://charts.example.com/index.yaml
```

2. Update the Secret if credentials have changed:

```bash
kubectl create secret generic helm-repo-credentials \
  --namespace=flux-system \
  --from-literal=username=your-username \
  --from-literal=password=new-password \
  --dry-run=client -o yaml | kubectl apply -f -
```

3. Force reconciliation:

```bash
flux reconcile source helm my-private-charts
```

### Chart Not Found

If the `HelmRelease` cannot find the chart:

1. Verify the chart name matches exactly what is in the repository.
2. Check the repository index:

```bash
curl -u your-username:your-password https://charts.example.com/index.yaml | grep "name:"
```

3. Ensure the specified chart version exists in the repository.

### TLS Errors

If you see certificate verification errors:

1. Add the CA certificate to the Secret as shown in Step 5.
2. Verify the certificate is in PEM format.
3. Check that the certificate chain is complete.

### HelmRepository Stuck in Not Ready State

1. Check the events for detailed error messages:

```bash
kubectl events -n flux-system --for helmrepository/my-private-charts
```

2. Verify network connectivity from the cluster to the Helm repository.
3. Check if any network policies are blocking outbound HTTPS traffic.

## Provider-Specific Examples

### Harbor

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://harbor.example.com/chartrepo/my-project
  secretRef:
    name: harbor-credentials
```

### Artifactory

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: artifactory-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://artifactory.example.com/helm-local
  secretRef:
    name: artifactory-credentials
```

## Summary

Basic authentication is the most straightforward way to connect Flux to private Helm chart repositories. By creating a Kubernetes Secret with username and password fields and referencing it from a `HelmRepository` resource, Flux can automatically fetch chart indexes and pull charts during reconciliation. This works with all major Helm repository solutions including ChartMuseum, Harbor, Artifactory, and Nexus.
