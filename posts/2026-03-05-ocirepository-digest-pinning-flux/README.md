# How to Configure OCIRepository Digest Pinning in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Digest Pinning, Immutability

Description: Learn how to pin OCI artifacts by digest in Flux CD's OCIRepository for immutable, tamper-proof deployments.

---

## Introduction

Tags in container registries are mutable -- they can be overwritten to point to a different artifact at any time. This creates a risk where an attacker or an accidental push could change what a tag resolves to, leading to unexpected deployments. Digest pinning solves this by referencing an OCI artifact by its content-addressable SHA256 digest, which is immutable and unique to the exact artifact contents.

Flux CD's OCIRepository supports digest-based references, giving you the strongest guarantee that the exact artifact you approved is what gets deployed to your cluster.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v0.35 or later)
- The `flux` CLI installed
- An OCI-compatible container registry
- `kubectl` configured to access your cluster

## Understanding Digests vs. Tags

Every OCI artifact has a digest -- a SHA256 hash of its manifest. Unlike tags, digests cannot be reassigned.

| Property | Tag | Digest |
|----------|-----|--------|
| Format | `1.0.0`, `latest` | `sha256:a1b2c3d4...` |
| Mutable | Yes (can be overwritten) | No (content-addressable) |
| Human readable | Yes | No |
| Guarantees | Points to latest push with that tag | Always points to exact same content |

## Step 1: Push an Artifact and Get Its Digest

Push an OCI artifact and capture the digest from the output.

```bash
# Push an artifact and note the digest in the output
flux push artifact oci://registry.example.com/manifests/app:v1.0.0 \
  --path=./deploy \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:$(git rev-parse HEAD)"
```

The output will include a line like:

```
digest: sha256:3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4
```

You can also retrieve the digest of an existing artifact.

```bash
# List artifacts with their digests
flux list artifacts oci://registry.example.com/manifests/app
```

Or use `crane` or `oras` to inspect the digest.

```bash
# Get the digest for a specific tag using crane
crane digest registry.example.com/manifests/app:v1.0.0
```

## Step 2: Configure OCIRepository with Digest Pinning

Create an OCIRepository that references the artifact by digest.

```yaml
# ocirepository-digest.yaml -- OCIRepository pinned to a specific digest
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    # Pin to an exact artifact by digest -- immutable and tamper-proof
    digest: sha256:3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4
  secretRef:
    name: registry-auth
```

Apply the resource.

```bash
# Apply the digest-pinned OCIRepository
kubectl apply -f ocirepository-digest.yaml
```

## Step 3: Verify the Pinned Artifact

Confirm that Flux resolved the correct artifact.

```bash
# Check the OCIRepository status
flux get sources oci

# Verify the artifact revision matches the expected digest
kubectl get ocirepository app-manifests -n flux-system \
  -o jsonpath='{.status.artifact.revision}{"\n"}'
```

The revision should match the digest you specified.

## Step 4: Wire Up the Kustomization

Create a Kustomization to deploy the pinned artifact.

```yaml
# kustomization-pinned.yaml -- Deploy from digest-pinned OCI artifact
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: app-manifests
  path: ./
  prune: true
  wait: true
```

```bash
# Apply the Kustomization
kubectl apply -f kustomization-pinned.yaml
```

## Updating a Digest-Pinned Deployment

Since digests are immutable, updating the deployment requires changing the digest in the OCIRepository spec. This can be done manually or automated through CI.

### Manual Update

```bash
# Push a new version
flux push artifact oci://registry.example.com/manifests/app:v1.1.0 \
  --path=./deploy-v1.1.0 \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:$(git rev-parse HEAD)"

# Get the new digest from the output, then update the OCIRepository
kubectl patch ocirepository app-manifests -n flux-system \
  --type=merge \
  -p '{"spec":{"ref":{"digest":"sha256:NEW_DIGEST_HERE"}}}'
```

### Automated Update via CI

Here is a CI pipeline that pushes a new artifact and updates the digest in the cluster.

```yaml
# .github/workflows/deploy-with-digest.yaml
name: Deploy with Digest Pinning
on:
  push:
    branches: [main]
    paths: ["deploy/**"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Push artifact and capture digest
        id: push
        run: |
          OUTPUT=$(flux push artifact \
            oci://registry.example.com/manifests/app:${{ github.sha }} \
            --path=./deploy \
            --source="${{ github.repositoryUrl }}" \
            --revision="main@sha1:${{ github.sha }}" \
            --creds=user:${{ secrets.REGISTRY_PASSWORD }} 2>&1)
          DIGEST=$(echo "$OUTPUT" | grep "digest:" | awk '{print $2}')
          echo "digest=$DIGEST" >> $GITHUB_OUTPUT

      - name: Update OCIRepository digest
        run: |
          # Update the digest in the OCIRepository manifest
          sed -i "s|digest: sha256:.*|digest: ${{ steps.push.outputs.digest }}|" \
            clusters/production/ocirepository.yaml

          # Commit and push the updated manifest
          git config user.name "CI Bot"
          git config user.email "ci@example.com"
          git add clusters/production/ocirepository.yaml
          git commit -m "Update app digest to ${{ steps.push.outputs.digest }}"
          git push
```

## Combining Digest Pinning with Cosign Verification

For maximum security, combine digest pinning with Cosign signature verification.

```yaml
# ocirepository-digest-verified.yaml -- Digest pinning + Cosign verification
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests-secure
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/manifests/app
  ref:
    # Exact digest ensures immutability
    digest: sha256:3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4
  verify:
    # Cosign verification ensures authenticity
    provider: cosign
    secretRef:
      name: cosign-pub-key
  secretRef:
    name: registry-auth
```

This gives you two layers of protection:

- **Digest pinning**: Guarantees the exact content you expect
- **Cosign verification**: Guarantees the artifact was signed by a trusted party

## When to Use Digest Pinning

Digest pinning is recommended for:

- **Production environments**: Where you need absolute certainty about what is deployed
- **Regulated industries**: Where audit trails require proof of exact artifact versions
- **Security-critical workloads**: Where tag mutation could lead to supply chain attacks
- **Rollback scenarios**: Where you need to deploy a known-good artifact by its exact digest

Digest pinning is less practical for:

- **Development environments**: Where frequent updates make manual digest management burdensome
- **Environments using SemVer automation**: Where automatic version selection is preferred

For development, consider using SemVer filtering (covered in a separate guide) and reserve digest pinning for production deployments.

## Troubleshooting

- **digest not found**: Verify the digest is correct and the artifact exists in the registry. Use `crane manifest registry.example.com/manifests/app@sha256:...` to verify.
- **reconciliation not updating**: Digest-pinned artifacts do not update automatically. You must change the digest value in the spec to deploy a new version.
- **mismatch after registry migration**: If you migrate registries, digests may change. Always verify digests after any registry migration or replication.

## Conclusion

Digest pinning in Flux's OCIRepository provides the strongest deployment immutability guarantee available. By referencing artifacts by their content-addressable SHA256 digest rather than mutable tags, you ensure that the exact artifact you tested and approved is what runs in production. While it requires more operational effort to update digests, the security and auditability benefits make it essential for production and regulated environments. Combined with Cosign verification, digest pinning forms a robust supply chain security posture for your GitOps deployments.
