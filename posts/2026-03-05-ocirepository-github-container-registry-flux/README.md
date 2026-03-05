# How to Configure OCIRepository with GitHub Container Registry in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, GitHub Container Registry, GHCR

Description: Learn how to configure Flux CD's OCIRepository source to pull OCI artifacts from GitHub Container Registry (GHCR) for your GitOps workflows.

---

## Introduction

Flux CD supports pulling Kubernetes manifests and configurations packaged as OCI artifacts from container registries. GitHub Container Registry (GHCR) is a natural choice for teams already using GitHub for source control. By combining GHCR with Flux's OCIRepository source, you can store your deployment manifests alongside your container images and manage everything through a unified registry workflow.

This guide walks you through setting up authentication, pushing OCI artifacts to GHCR, and configuring Flux to pull from GHCR automatically.

## Prerequisites

Before you begin, make sure you have the following:

- A Kubernetes cluster with Flux CD installed (v0.35 or later)
- The `flux` CLI installed
- A GitHub account with a personal access token (PAT) that has `read:packages` and `write:packages` scopes
- `kubectl` configured to access your cluster

## Step 1: Create a GitHub Personal Access Token

Navigate to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic) and create a new token with the following scopes:

- `read:packages` -- required for pulling OCI artifacts
- `write:packages` -- required for pushing OCI artifacts
- `delete:packages` -- optional, for cleanup

Save the token securely. You will use it in the next steps.

## Step 2: Push an OCI Artifact to GHCR

First, authenticate the Flux CLI with GHCR.

```bash
# Log in to GHCR using your GitHub username and personal access token
echo $GITHUB_TOKEN | flux push artifact oci://ghcr.io/YOUR_ORG/manifests/app:latest \
  --path=./deploy \
  --source="$(git config --get remote.origin.url)" \
  --revision="$(git branch --show-current)@sha1:$(git rev-parse HEAD)" \
  --creds=YOUR_USERNAME:$GITHUB_TOKEN
```

This command packages the contents of the `./deploy` directory into an OCI artifact and pushes it to GHCR under your organization's namespace. The `--source` and `--revision` flags attach Git metadata to the artifact for traceability.

You can verify the artifact was pushed successfully by listing tags.

```bash
# List available tags for the artifact in GHCR
flux list artifacts oci://ghcr.io/YOUR_ORG/manifests/app --creds=YOUR_USERNAME:$GITHUB_TOKEN
```

## Step 3: Create a Kubernetes Secret for GHCR Authentication

Flux needs credentials to pull artifacts from private GHCR repositories. Create a Kubernetes secret in the flux-system namespace.

```bash
# Create a docker-registry secret for GHCR authentication
kubectl create secret docker-registry ghcr-auth \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=$GITHUB_TOKEN
```

For public repositories, you can skip this step and omit the `secretRef` in the OCIRepository configuration.

## Step 4: Configure the OCIRepository Resource

Create the OCIRepository resource that tells Flux where and how to pull the OCI artifact.

```yaml
# ocirepository-ghcr.yaml -- Flux OCIRepository pointing to GHCR
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/YOUR_ORG/manifests/app
  ref:
    # Pull the latest semver tag, or use 'tag: latest' for a fixed tag
    tag: latest
  secretRef:
    # Reference the GHCR auth secret created in Step 3
    name: ghcr-auth
```

Apply the resource to your cluster.

```bash
# Apply the OCIRepository resource
kubectl apply -f ocirepository-ghcr.yaml
```

## Step 5: Create a Kustomization to Deploy the Artifact

Now create a Flux Kustomization that reconciles the manifests pulled from GHCR.

```yaml
# kustomization-app.yaml -- Deploy manifests from the OCI artifact
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: default
  sourceRef:
    kind: OCIRepository
    name: app-manifests
  path: ./
  prune: true
  wait: true
  timeout: 2m
```

Apply it to start the deployment.

```bash
# Apply the Kustomization resource
kubectl apply -f kustomization-app.yaml
```

## Step 6: Verify the Setup

Check that Flux successfully pulls the artifact and reconciles the resources.

```bash
# Check the OCIRepository status
flux get sources oci

# Check the Kustomization status
flux get kustomizations
```

You should see the OCIRepository reporting a successful fetch with the artifact digest, and the Kustomization showing a successful reconciliation.

For more detail, inspect the OCIRepository resource directly.

```bash
# Inspect the full OCIRepository status
kubectl describe ocirepository app-manifests -n flux-system
```

## Using GitHub Actions for Automated Pushes

You can automate artifact pushes using GitHub Actions. Here is a workflow snippet that pushes an OCI artifact on every push to the main branch.

```yaml
# .github/workflows/push-oci.yaml -- Push OCI artifacts on main branch updates
name: Push OCI Artifact
on:
  push:
    branches: [main]
    paths: ["deploy/**"]

jobs:
  push:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Push artifact to GHCR
        run: |
          flux push artifact \
            oci://ghcr.io/${{ github.repository }}/manifests:${{ github.sha }} \
            --path=./deploy \
            --source="${{ github.repositoryUrl }}" \
            --revision="${{ github.ref_name }}@sha1:${{ github.sha }}" \
            --creds=flux:${{ secrets.GITHUB_TOKEN }}

      - name: Tag as latest
        run: |
          flux tag artifact \
            oci://ghcr.io/${{ github.repository }}/manifests:${{ github.sha }} \
            --tag=latest \
            --creds=flux:${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

If the OCIRepository fails to pull, check the following:

- Ensure the GHCR repository visibility matches your authentication setup (public repos do not need secrets)
- Verify the secret exists in the same namespace as the OCIRepository
- Check that the PAT has not expired and has the correct scopes
- Inspect events with `kubectl events -n flux-system --for ocirepository/app-manifests`

## Conclusion

Configuring Flux CD with GitHub Container Registry gives you a streamlined OCI-based GitOps pipeline. By pushing deployment manifests as OCI artifacts to GHCR and configuring an OCIRepository source in Flux, you eliminate the need for Git-based source fetching and leverage the same registry infrastructure used for container images. Combined with GitHub Actions, this approach provides a fully automated deployment pipeline from code push to cluster reconciliation.
