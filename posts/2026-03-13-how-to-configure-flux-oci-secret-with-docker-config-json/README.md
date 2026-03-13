# How to Configure Flux OCI Secret with Docker Config JSON

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, OCI, Docker, Container Registry, OCIRepository

Description: How to configure Flux CD to pull OCI artifacts from private container registries using Docker config JSON credentials.

---

## Introduction

Flux CD can manage OCI (Open Container Initiative) artifacts such as Helm charts and Kubernetes manifests stored in container registries. When these registries are private, Flux needs credentials to pull the artifacts. The most common way to provide these credentials is through a Docker config JSON Secret, which is the same format used by Kubernetes to pull container images.

This guide explains how to create a Docker config JSON Secret and configure Flux's `OCIRepository` or `HelmRepository` (OCI type) to use it.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- A private container registry (Docker Hub, GitHub Container Registry, Harbor, etc.)
- Credentials for the container registry

## Step 1: Create Docker Config JSON Credentials

### Using kubectl (Recommended)

The simplest way to create a Docker config JSON Secret is with `kubectl`:

```bash
kubectl create secret docker-registry oci-registry-credentials \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email@example.com
```

### For Multiple Registries

If you need credentials for multiple registries, create the config manually:

```bash
cat <<EOF > dockerconfig.json
{
  "auths": {
    "ghcr.io": {
      "username": "your-username",
      "password": "your-ghcr-token",
      "auth": "$(echo -n 'your-username:your-ghcr-token' | base64)"
    },
    "registry.example.com": {
      "username": "admin",
      "password": "registry-password",
      "auth": "$(echo -n 'admin:registry-password' | base64)"
    }
  }
}
EOF

kubectl create secret generic oci-registry-credentials \
  --namespace=flux-system \
  --from-file=.dockerconfigjson=dockerconfig.json \
  --type=kubernetes.io/dockerconfigjson
```

### As a YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: oci-registry-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "ghcr.io": {
          "username": "your-username",
          "password": "your-password",
          "auth": "eW91ci11c2VybmFtZTp5b3VyLXBhc3N3b3Jk"
        }
      }
    }
```

Apply the manifest:

```bash
kubectl apply -f oci-secret.yaml
```

## Step 2: Configure an OCIRepository Resource

If you are storing Kubernetes manifests or Kustomize overlays as OCI artifacts:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/your-org/my-app-manifests
  ref:
    tag: latest
  secretRef:
    name: oci-registry-credentials
```

Apply the resource:

```bash
kubectl apply -f ocirepository.yaml
```

## Step 3: Configure a HelmRepository with OCI (Alternative)

If you are storing Helm charts in an OCI registry, use a `HelmRepository` with `type: oci`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-oci-charts
  namespace: flux-system
spec:
  interval: 10m
  url: oci://ghcr.io/your-org/charts
  type: oci
  secretRef:
    name: oci-registry-credentials
```

Then reference it in a `HelmRelease`:

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
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-oci-charts
        namespace: flux-system
```

## Step 4: Push an OCI Artifact (For Reference)

To push Kubernetes manifests as an OCI artifact using the Flux CLI:

```bash
flux push artifact oci://ghcr.io/your-org/my-app-manifests:latest \
  --path=./manifests \
  --source="https://github.com/your-org/my-app" \
  --revision="main@sha1:abc123"
```

To push a Helm chart as an OCI artifact:

```bash
helm package ./my-chart
helm push my-chart-1.0.0.tgz oci://ghcr.io/your-org/charts
```

## Verification

Check the `OCIRepository` status:

```bash
flux get sources oci my-app-manifests
```

Or for a `HelmRepository`:

```bash
flux get sources helm my-oci-charts
```

Detailed status:

```bash
kubectl describe ocirepository my-app-manifests -n flux-system
```

Verify the Secret exists and has the correct type:

```bash
kubectl get secret oci-registry-credentials -n flux-system -o jsonpath='{.type}'
```

This should output `kubernetes.io/dockerconfigjson`.

## Troubleshooting

### Authentication Failed (401)

1. Verify your credentials work with Docker or the registry CLI:

```bash
docker login ghcr.io -u your-username -p your-password
```

2. Check the Secret contains valid JSON:

```bash
kubectl get secret oci-registry-credentials -n flux-system \
  -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .
```

3. Ensure the registry URL in the Secret matches the URL in the OCI resource.

### Wrong Secret Type

The Secret must be of type `kubernetes.io/dockerconfigjson`. If you created it as `Opaque`:

```bash
kubectl get secret oci-registry-credentials -n flux-system -o jsonpath='{.type}'
```

If the type is wrong, recreate the Secret using `kubectl create secret docker-registry`.

### Image Not Found (404)

1. Verify the artifact exists in the registry:

```bash
crane ls ghcr.io/your-org/my-app-manifests
```

2. Check the URL format. OCI URLs should not include the tag in the URL. Use the `ref` field instead:

```yaml
spec:
  url: oci://ghcr.io/your-org/my-app-manifests  # No tag here
  ref:
    tag: latest  # Tag goes here
```

### Registry-Specific Notes

**Docker Hub**: Use `https://index.docker.io/v1/` as the server in the Secret.

**GitHub Container Registry**: Use `ghcr.io` as the server and a personal access token with `read:packages` scope.

**Harbor**: Use your Harbor domain (e.g., `harbor.example.com`) as the server.

## Summary

Docker config JSON Secrets are the standard way to authenticate Flux with private OCI registries. The same Secret format used for pulling container images works seamlessly with Flux's `OCIRepository` and OCI-based `HelmRepository` resources. This makes it straightforward to store and deploy Kubernetes manifests, Kustomize overlays, and Helm charts from private container registries.
