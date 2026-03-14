# How to Configure OCI Artifact Build and Push in CI for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, OCI, CI/CD, GitOps, OCIRepository, Kubernetes Manifests, Supply Chain Security

Description: Learn how to package and push OCI artifacts containing Kubernetes manifests in CI pipelines for Flux CD OCIRepository-based deployments.

---

## Introduction

Flux CD's OCIRepository source type allows you to store not just Helm charts, but any Kubernetes manifests, Kustomize directories, or raw YAML as OCI artifacts in a container registry. This lets you version, sign, and distribute your deployment manifests through the same registry infrastructure used for container images, creating a single source of truth for all deployment artifacts.

The `flux push artifact` command packages a local directory of manifests as an OCI artifact and pushes it to a registry. Your CI pipeline can call this command after running manifest validation and policy checks, effectively creating a promotion gate before Flux CD can apply the manifests to the cluster.

This guide walks through configuring CI to build and push OCI manifest artifacts, and configuring Flux CD to deploy from them.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- `flux` CLI version 0.41+ (for OCI artifact support)
- A container registry (GHCR, ECR, GCR, or ACR)
- CI system capable of running `flux` CLI (GitHub Actions examples used)
- Cosign installed for artifact signing (optional but recommended)

## Step 1: Understand the OCI Artifact Structure

An OCI artifact created by `flux push artifact` packages a directory as a tarball with OCI media types. Flux CD extracts it and treats the contents as a Kustomize directory or plain manifests.

```
manifests/
  myapp/
    namespace.yaml
    deployment.yaml
    service.yaml
    kustomization.yaml
```

## Step 2: Push OCI Artifacts with flux CLI in CI

```yaml
# .github/workflows/publish-manifests.yml
name: Publish Manifests as OCI Artifact

on:
  push:
    branches:
      - main
    tags:
      - 'v*'

env:
  REGISTRY: ghcr.io
  ARTIFACT_REPO: your-org/manifests/myapp

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write # For Cosign OIDC signing

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Flux CLI
        run: |
          curl -s https://fluxcd.io/install.sh | sudo bash

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate artifact tag
        id: tag
        run: |
          if [[ "$GITHUB_REF" == refs/tags/* ]]; then
            echo "tag=${GITHUB_REF_NAME}" >> $GITHUB_OUTPUT
          else
            echo "tag=$(date -u +'%Y%m%dT%H%M%SZ')" >> $GITHUB_OUTPUT
          fi

      - name: Run manifest validation
        run: |
          # Validate all YAML manifests
          kubectl apply --dry-run=client -k manifests/myapp/ --server-side=false || true

      - name: Push manifests as OCI artifact
        id: push
        run: |
          flux push artifact \
            oci://${{ env.REGISTRY }}/${{ env.ARTIFACT_REPO }}:${{ steps.tag.outputs.tag }} \
            --path=manifests/myapp/ \
            --source="$(git config --get remote.origin.url)" \
            --revision="$(git rev-parse --short HEAD)" \
            --annotations='org.opencontainers.image.description=myapp manifests'

      - name: Sign the OCI artifact with Cosign
        run: |
          cosign sign \
            --yes \
            ${{ env.REGISTRY }}/${{ env.ARTIFACT_REPO }}:${{ steps.tag.outputs.tag }}

      - name: Tag as latest for main branch
        if: github.ref == 'refs/heads/main'
        run: |
          flux tag artifact \
            oci://${{ env.REGISTRY }}/${{ env.ARTIFACT_REPO }}:${{ steps.tag.outputs.tag }} \
            --tag latest
```

## Step 3: Configure Flux OCIRepository Source

```yaml
# clusters/production/sources/myapp-manifests.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: myapp-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/your-org/manifests/myapp
  ref:
    # Track semver tags for production
    semver: ">=1.0.0"
  secretRef:
    name: ghcr-auth
  # Verify Cosign signature before applying
  verify:
    provider: cosign
    secretRef:
      name: cosign-public-key
```

## Step 4: Configure Flux Kustomization to Deploy from OCIRepository

```yaml
# clusters/production/apps/myapp.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  path: ./ # Path within the OCI artifact
  prune: true
  sourceRef:
    kind: OCIRepository
    name: myapp-manifests
  targetNamespace: myapp
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
```

## Step 5: Set Up Cosign Verification Key (Optional)

```bash
# Generate a Cosign key pair
cosign generate-key-pair

# Store the public key as a Kubernetes secret
kubectl create secret generic cosign-public-key \
  --from-file=cosign.pub=cosign.pub \
  --namespace=flux-system
```

## Step 6: Verify OCI Artifacts in Flux

```bash
# Check the OCIRepository source status
flux get sources oci myapp-manifests -n flux-system

# View artifact metadata
flux get artifact oci://ghcr.io/your-org/manifests/myapp:latest

# Check if Kustomization applied successfully
flux get kustomizations myapp -n flux-system

# View all events for the source
flux events --for OCIRepository/myapp-manifests -n flux-system
```

## Best Practices

- Include `--source` and `--revision` flags when pushing artifacts to maintain traceability from artifact to Git commit.
- Sign OCI artifacts with Cosign in CI and enable Flux CD's `verify` block to prevent unsigned artifacts from being deployed.
- Use SemVer tags for production OCIRepository refs and timestamp tags for staging to match your deployment cadence.
- Store different environment manifests in separate OCI artifacts to provide environment-level isolation.
- Use `flux tag artifact` to promote a tested artifact from staging to production rather than rebuilding.
- Implement OCI artifact pruning in your registry to avoid unbounded storage growth from automated CI pushes.

## Conclusion

OCI artifacts provide a principled way to version and distribute Kubernetes manifests alongside container images using the same registry infrastructure. Combined with Cosign signing and Flux CD's verification capability, this approach adds cryptographic supply chain security to your GitOps deployments.
