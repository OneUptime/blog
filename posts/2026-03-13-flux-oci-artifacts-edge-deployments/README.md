# How to Use OCI Artifacts for Edge Deployments with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Oci artifacts, Bandwidth

Description: Use OCI artifacts to minimize bandwidth for edge deployments with Flux, replacing Git cloning with efficient artifact-based manifest delivery.

---

## Introduction

OCI (Open Container Initiative) artifacts are a powerful but underused feature of Flux CD. Originally designed for container images, the OCI registry format can store any type of artifact - including Kubernetes manifests, Helm charts, and Kustomize directories. Flux's OCIRepository source type can pull these artifacts from any OCI-compatible registry.

For edge deployments, OCI artifacts offer two major advantages over traditional Git-based sources. First, an OCI artifact containing your manifests is typically 1-10MB, compared to a full Git repository clone that may be 50-500MB - a dramatic bandwidth reduction. Second, OCI registry infrastructure is designed for high-throughput, geographically distributed deployments and typically handles pull caching better than Git hosting platforms.

This guide covers the complete workflow: packaging manifests as OCI artifacts in CI/CD, configuring Flux to consume them at edge clusters, and setting up a pull-through cache for bandwidth efficiency.

## Prerequisites

- Flux CD with OCIRepository support (Flux >= 0.32)
- An OCI-compatible registry (Harbor, ECR, GCR, Docker Hub, or GHCR)
- CI/CD pipeline with `flux` CLI available
- Edge clusters with Flux bootstrapped and network access to the registry

## Step 1: Understand OCI Artifact Structure for Flux

Flux OCI artifacts follow a specific layer structure:

```plaintext
OCI Artifact (my-registry/fleet/edge-apps:v1.2.3)
├── Layer 1: Manifest metadata (annotations)
│   ├── source URL
│   ├── revision/commit SHA
│   └── author
└── Layer 2: Compressed manifest bundle
    ├── apps/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── configmap.yaml
    └── kustomization.yaml
```

```bash
# Inspect an existing Flux OCI artifact
flux pull artifact oci://my-registry.example.com/fleet/edge-apps:latest \
  --output=/tmp/inspect

# Show artifact metadata
crane manifest my-registry.example.com/fleet/edge-apps:latest | \
  jq '.annotations'
```

## Step 2: Publish Manifests as OCI Artifacts in CI/CD

```yaml
# .github/workflows/publish-edge-artifacts.yml
name: Publish Edge OCI Artifacts

on:
  push:
    branches: [main]
    paths:
      - 'apps/overlays/edge/**'
      - 'infrastructure/edge/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main
        with:
          version: latest

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Publish edge-apps artifact
        run: |
          flux push artifact \
            "oci://ghcr.io/${{ github.repository_owner }}/fleet/edge-apps:latest" \
            --path=./apps/overlays/edge \
            --source="${{ github.server_url }}/${{ github.repository }}" \
            --revision="${{ github.ref_name }}@sha1:${{ github.sha }}"

          # Tag with the SHA for immutable reference
          flux tag artifact \
            "oci://ghcr.io/${{ github.repository_owner }}/fleet/edge-apps:latest" \
            --tag="${{ github.sha }}"

      - name: Publish infrastructure artifact
        run: |
          flux push artifact \
            "oci://ghcr.io/${{ github.repository_owner }}/fleet/edge-infrastructure:latest" \
            --path=./infrastructure/edge \
            --source="${{ github.server_url }}/${{ github.repository }}" \
            --revision="${{ github.ref_name }}@sha1:${{ github.sha }}"
```

## Step 3: Configure OCIRepository Sources on Edge Clusters

```yaml
# clusters/edge-site-001/flux-system/oci-sources.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-edge-apps
  namespace: flux-system
spec:
  interval: 30m
  url: oci://ghcr.io/my-org/fleet/edge-apps
  ref:
    # Use semver to auto-update within a release channel
    semver: ">=1.0.0 <2.0.0"
    # Or pin to latest:
    # tag: latest
    # Or pin to a specific SHA for maximum stability:
    # digest: sha256:abc123...
  secretRef:
    name: ghcr-credentials
  verify:
    # Verify artifact signature for security
    provider: cosign
    secretRef:
      name: cosign-public-key
```

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-edge-infrastructure
  namespace: flux-system
spec:
  interval: 6h  # Infrastructure changes infrequently
  url: oci://ghcr.io/my-org/fleet/edge-infrastructure
  ref:
    tag: latest
  secretRef:
    name: ghcr-credentials
```

## Step 4: Create Kustomizations Using OCI Sources

```yaml
# clusters/edge-site-001/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: edge-apps
  namespace: flux-system
spec:
  interval: 15m
  path: ./            # Root of the OCI artifact
  prune: true
  sourceRef:
    kind: OCIRepository      # Reference OCI source, not GitRepository
    name: fleet-edge-apps
  postBuild:
    substitute:
      CLUSTER_ID: "edge-site-001"
      CLUSTER_REGION: "us-east"
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: edge-app
      namespace: production
```

## Step 5: Sign and Verify OCI Artifacts

For security, sign artifacts in CI and verify signatures on edge clusters.

```bash
# In CI: Sign the artifact with cosign
cosign sign \
  --key cosign.key \
  "ghcr.io/my-org/fleet/edge-apps:latest"

# Generate cosign key pair (do once)
cosign generate-key-pair --kms gcpkms://projects/my-project/locations/us/keyRings/flux/cryptoKeys/cosign
```

```bash
# On edge cluster: Store the public key for verification
kubectl create secret generic cosign-public-key \
  -n flux-system \
  --from-file=cosign.pub=cosign.pub
```

## Step 6: Set Up a Pull-Through Cache for Edge Bandwidth

```yaml
# Deploy a local OCI cache using registry:2
# infrastructure/edge/registry-cache/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-cache
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry-cache
  template:
    metadata:
      labels:
        app: registry-cache
    spec:
      containers:
        - name: registry
          image: registry:2
          env:
            - name: REGISTRY_PROXY_REMOTEURL
              value: https://ghcr.io
            - name: REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY
              value: /var/lib/registry
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: registry-cache-data
              mountPath: /var/lib/registry
      volumes:
        - name: registry-cache-data
          persistentVolumeClaim:
            claimName: registry-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: registry-cache
  namespace: flux-system
spec:
  selector:
    app: registry-cache
  ports:
    - port: 5000
      targetPort: 5000
```

Update the OCIRepository to use the local cache first:

```yaml
# Point OCIRepository at local cache proxy
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-edge-apps
  namespace: flux-system
spec:
  interval: 30m
  # Local cache proxy pulls from ghcr.io and caches locally
  url: oci://registry-cache.flux-system.svc.cluster.local:5000/my-org/fleet/edge-apps
  ref:
    tag: latest
  insecure: true  # Local registry without TLS
```

## Best Practices

- Tag every OCI artifact with both `latest` and the Git commit SHA for traceability.
- Use artifact signing with cosign to prevent unauthorized manifest injection.
- Split infrastructure and application manifests into separate artifacts with different update frequencies.
- Pin edge clusters to a `semver` range rather than `latest` for controlled rollouts.
- Monitor artifact pull success rates - a failed pull does not break the cluster but delays updates.
- Use a local pull-through cache for sites with very limited internet bandwidth.

## Conclusion

OCI artifacts fundamentally change the economics of GitOps at the edge. By replacing Git repository cloning with purpose-built artifact delivery, bandwidth requirements drop by an order of magnitude while security improves through built-in signing and verification. For teams managing edge clusters on constrained networks, adopting Flux's OCIRepository source type is one of the highest-leverage changes available.
