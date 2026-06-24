# How to Set Up Fleet with OCI Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, OCI

Description: Learn how to configure Fleet to deploy applications from OCI (Open Container Initiative) registries, enabling GitOps workflows based on container registries instead of Git.

## Introduction

Fleet can work with OCI registries in two supported ways. You can deploy Helm charts stored in OCI registries by creating a `HelmOp` resource, and you can use an OCI registry as the storage backend for bundle content when a `GitRepo` would otherwise store large payloads in etcd. Raw Kubernetes YAML, Kustomize overlays, and `fleet.yaml` bundles still come from Git repositories.

## Prerequisites

- Fleet installed in Rancher with HelmOps support available
- An OCI-compatible container registry reachable from the targeted downstream clusters
- `kubectl` access to the Fleet manager cluster
- `helm` CLI

## Understanding OCI Support in Fleet

Fleet's `GitRepo` resource still points to a Git repository URL. For OCI-hosted Helm charts, Fleet uses the `HelmOp` custom resource instead. If you want to keep Git as the source of truth but offload large bundle contents from etcd, configure `ociRegistrySecret` on the `GitRepo`.

OCI registries can therefore be used in Fleet for:
- Helm charts deployed through `HelmOp`
- Bundle content storage for `GitRepo` resources via `ociRegistrySecret`

## Packaging Helm Charts as OCI Artifacts

### Using Helm to Package and Push

```bash
# Package a Helm chart as an OCI artifact
helm package ./my-chart

# Log in to the OCI registry (example: Docker Hub)
echo "$HELM_REGISTRY_PASSWORD" | helm registry login registry-1.docker.io \
  --username my-username \
  --password-stdin

# Push the chart to the OCI registry
helm push my-chart-1.0.0.tgz \
  oci://registry-1.docker.io/my-org

# Push to Amazon ECR (after aws ecr get-login-password)
helm push my-chart-1.0.0.tgz \
  oci://123456789.dkr.ecr.us-east-1.amazonaws.com/charts
```

### Using OCI Storage for Bundle Content

If your bundle resources are large, configure OCI storage instead of pushing raw manifests with `oras`. After you create the secret, Fleet handles uploading bundle content to the registry for the affected `GitRepo`.

```bash
# Create an OCI storage secret for Fleet bundle content
# The reference must not use an oci:// prefix
kubectl -n fleet-default create secret generic ocistorage \
  --type=fleet.cattle.io/bundle-oci-storage/v1alpha1 \
  --from-literal=reference=registry.example.com/fleet-content \
  --from-literal=username=myuser \
  --from-literal=password=mytoken
```

## Creating a GitRepo Using OCI Storage

```yaml
# gitrepo-oci-storage.yaml - Store GitRepo bundle content in an OCI registry
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-git
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-fleet-configs
  branch: main
  paths:
    - ./clusters/production

  # Reference the OCI storage secret created earlier
  ociRegistrySecret: ocistorage

  targets:
    - clusterSelector: {}
```

## Setting Up OCI Registry Authentication

For private OCI-hosted Helm charts, create a secret with `username` and `password` keys in the same namespace as the `HelmOp`, then reference it with `spec.helmSecretName`.

### For Docker Hub

```bash
kubectl create secret generic oci-helm-auth \
  --from-literal=username=my-username \
  --from-literal=password=my-access-token \
  -n fleet-default
```

### For Amazon ECR

```bash
# Get ECR login token (valid for 12 hours)
AWS_TOKEN=$(aws ecr get-login-password --region us-east-1)

# Create secret
kubectl create secret generic ecr-helm-auth \
  --from-literal=username=AWS \
  --from-literal=password="${AWS_TOKEN}" \
  -n fleet-default
```

### For Harbor

```bash
kubectl create secret generic harbor-helm-auth \
  --from-literal=username=robot\$my-robot-account \
  --from-literal=password=my-robot-token \
  -n fleet-default
```

## HelmOp Using OCI with Helm Charts

```yaml
# helmop-oci.yaml - Deploy Helm chart from OCI registry
apiVersion: fleet.cattle.io/v1alpha1
kind: HelmOp
metadata:
  name: my-helm-app-oci
  namespace: fleet-default
spec:
  helm:
    releaseName: my-app
    repo: oci://registry.example.com/charts/my-app
    version: "2.x.x"
    values:
      replicaCount: 3

  # Poll for newer matching tags in the OCI registry
  pollingInterval: 5m

  # Kubernetes namespace where the chart will be installed
  namespace: production

  helmSecretName: harbor-helm-auth
```

## Automating OCI Updates in CI/CD

If your `HelmOp` uses a semantic version constraint and a non-zero `pollingInterval`, Fleet can detect newly published matching OCI tags without patching the resource.

```yaml
# .github/workflows/deploy-oci.yml
name: Package and Push Helm Chart

on:
  push:
    branches: [main]
    paths: ['charts/my-app/**']

jobs:
  package-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        run: |
          curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4
          chmod 700 get_helm.sh
          ./get_helm.sh

      - name: Log in to OCI registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | helm registry login \
            ${{ secrets.REGISTRY_HOST }} \
            --username "${{ secrets.REGISTRY_USERNAME }}" \
            --password-stdin

      - name: Package chart
        run: helm package ./charts/my-app --destination ./dist

      - name: Push chart to OCI registry
        run: |
          CHART_PACKAGE=$(ls ./dist/my-app-*.tgz)
          helm push "${CHART_PACKAGE}" \
            oci://${{ secrets.REGISTRY_HOST }}/${{ secrets.REGISTRY_NAMESPACE }}
```

## Monitoring OCI-Based Deployments

```bash
# Check HelmOp status for OCI-hosted chart
kubectl get helmops -n fleet-default

# View the resolved chart version
kubectl get helmop my-helm-app-oci -n fleet-default \
  -o jsonpath='{.status.version}'

# Check GitRepo status when using OCI storage
kubectl get gitrepo my-app-git -n fleet-default -o wide

# Check bundle deployment status
kubectl get bundles -n fleet-default
```

## Conclusion

Fleet can integrate with OCI registries for Helm-based deployments and for bundle content storage, but those workflows use different resources. Use `HelmOp` when the source of truth is an OCI-hosted Helm chart, and keep using `GitRepo` for raw YAML, Kustomize, or mixed-content repositories. When Git-based bundles grow large, `ociRegistrySecret` lets Fleet store that content in an OCI registry instead of etcd while preserving the existing Git-driven workflow.
