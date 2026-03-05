# How to Configure HelmRepository with OCI Protocol in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, OCI, Container Registry

Description: Learn how to configure Flux CD HelmRepository sources using the OCI protocol to pull Helm charts from OCI-compliant container registries.

---

## Introduction

Helm 3 introduced support for storing and distributing charts through OCI (Open Container Initiative) registries. Instead of using the traditional Helm chart repository index format, OCI-based repositories store each chart as an OCI artifact in a container registry. Flux CD supports OCI-based HelmRepository sources, allowing you to pull charts from any OCI-compliant registry such as Docker Hub, GitHub Container Registry (GHCR), AWS ECR, Azure ACR, and Google Artifact Registry.

This guide explains how to configure OCI-based HelmRepository resources in Flux CD, covering public and authenticated access to various registry providers.

## Prerequisites

- A running Kubernetes cluster with Flux CD v2.x installed
- kubectl and the Flux CLI configured
- Helm charts published to an OCI-compliant container registry

## How OCI HelmRepository Differs from Traditional

The key difference between a traditional HelmRepository and an OCI-based one is the `spec.type` field and the URL scheme.

| Feature | Traditional | OCI |
|---------|-------------|-----|
| Type field | `default` (or omitted) | `oci` |
| URL scheme | `https://` | `oci://` |
| Index file | Uses `index.yaml` | No index file; charts are stored as OCI artifacts |
| Chart discovery | Fetches full index | References individual chart paths |

## Creating an OCI HelmRepository

To create an OCI-based HelmRepository, set `spec.type` to `oci` and use the `oci://` URL prefix.

Here is an example pointing to a public OCI registry.

```yaml
# helmrepository-oci-public.yaml
# OCI-based HelmRepository pointing to a public container registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo-oci
  namespace: flux-system
spec:
  # Set type to oci to use the OCI protocol
  type: oci
  # Use the oci:// scheme for the registry URL
  # Note: The URL points to the registry and path, NOT including the chart name
  url: oci://ghcr.io/stefanprodan/charts
  interval: 30m
```

Apply it to your cluster.

```bash
# Apply the OCI HelmRepository
kubectl apply -f helmrepository-oci-public.yaml
```

## OCI HelmRepository with GitHub Container Registry

GHCR is a popular choice for hosting Helm charts as OCI artifacts. For public repositories, no authentication is needed. For private ones, create a secret with a personal access token.

```bash
# Create a secret for GHCR authentication
# The password should be a GitHub personal access token with read:packages scope
kubectl create secret generic ghcr-creds \
  --namespace flux-system \
  --from-literal=username=flux-bot \
  --from-literal=password=ghp_your_personal_access_token
```

```yaml
# helmrepository-ghcr.yaml
# OCI HelmRepository pointing to a private GitHub Container Registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-org-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://ghcr.io/my-org/charts
  interval: 30m
  # Reference the GHCR authentication secret
  secretRef:
    name: ghcr-creds
```

## OCI HelmRepository with Docker Hub

Docker Hub supports OCI artifacts and can host Helm charts. The URL follows the standard Docker Hub namespace format.

```yaml
# helmrepository-dockerhub.yaml
# OCI HelmRepository pointing to Docker Hub
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: dockerhub-charts
  namespace: flux-system
spec:
  type: oci
  # Docker Hub OCI URL uses the registry-1.docker.io host
  url: oci://registry-1.docker.io/myorg
  interval: 30m
  secretRef:
    name: dockerhub-creds
```

Create the Docker Hub credentials secret using a dockerconfigjson format or basic auth.

```bash
# Create a Docker Hub credentials secret
kubectl create secret generic dockerhub-creds \
  --namespace flux-system \
  --from-literal=username=myuser \
  --from-literal=password=my-access-token
```

## OCI HelmRepository with AWS ECR

For AWS Elastic Container Registry, Flux supports automatic credential management using the AWS provider.

```yaml
# helmrepository-ecr.yaml
# OCI HelmRepository with AWS ECR using provider-based authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ecr-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com
  interval: 30m
  # Use the aws provider for automatic IAM role-based authentication
  # Requires IRSA (IAM Roles for Service Accounts) configured on the cluster
  provider: aws
```

For IRSA to work, the Flux source controller service account needs an IAM role annotation.

```bash
# Annotate the source-controller service account with the IAM role
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/flux-ecr-reader
```

## OCI HelmRepository with Azure ACR

Azure Container Registry integrates with Flux using workload identity.

```yaml
# helmrepository-acr.yaml
# OCI HelmRepository with Azure ACR using provider-based authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: acr-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://myregistry.azurecr.io/helm
  interval: 30m
  # Use the azure provider for workload identity authentication
  provider: azure
```

## OCI HelmRepository with Google Artifact Registry

Google Artifact Registry supports OCI Helm charts with workload identity federation.

```yaml
# helmrepository-gar.yaml
# OCI HelmRepository with Google Artifact Registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gar-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://us-central1-docker.pkg.dev/my-gcp-project/helm-charts
  interval: 30m
  # Use the gcp provider for workload identity federation
  provider: gcp
```

## Using OCI HelmRepository with a HelmRelease

Once you have an OCI HelmRepository defined, reference it from a HelmRelease. The chart name in the HelmRelease corresponds to the artifact name in the OCI registry.

```yaml
# helmrelease-from-oci.yaml
# HelmRelease that pulls a chart from an OCI-based HelmRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      # The chart name corresponds to the OCI artifact name in the registry
      chart: my-app
      version: "1.2.x"
      sourceRef:
        kind: HelmRepository
        name: my-org-charts
        namespace: flux-system
```

## Verifying OCI HelmRepository Status

Check that the OCI HelmRepository is working correctly.

```bash
# List all Helm sources and their status
flux get sources helm

# Describe the specific OCI HelmRepository for detailed status
kubectl describe helmrepository -n flux-system my-org-charts
```

For OCI repositories, the status will not show a stored artifact for the repository itself since there is no index file. The artifact is fetched when a HelmChart references a specific chart from the repository.

## Troubleshooting OCI-Specific Issues

Common issues with OCI HelmRepository sources:

**URL format errors** -- The URL must use the `oci://` prefix and should not include the chart name or tag. The chart name is specified in the HelmChart or HelmRelease resource.

```yaml
# CORRECT - URL points to the registry path
url: oci://ghcr.io/my-org/charts

# INCORRECT - Do not include the chart name in the URL
# url: oci://ghcr.io/my-org/charts/my-app
```

**Authentication errors** -- Ensure the secret uses the correct key names (`username` and `password`) and that the token has the necessary read permissions for the registry.

**Missing type field** -- If you omit `spec.type: oci`, Flux will treat the repository as a traditional Helm repository and fail to fetch from OCI URLs.

## Summary

OCI-based HelmRepository sources in Flux CD provide a modern way to distribute and consume Helm charts through standard container registries. Set `spec.type` to `oci`, use the `oci://` URL scheme, and leverage cloud provider authentication where available. This approach eliminates the need for a separate chart repository server and integrates Helm chart management with your existing container registry infrastructure.
