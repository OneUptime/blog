# How to Publish Kubewarden Policies to an OCI Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, OCI Registry, Policy Distribution, WebAssembly, Kubernetes, SUSE Rancher, Kwctl

Description: Learn how to annotate, sign, and publish Kubewarden WebAssembly policies to an OCI-compatible registry so they can be distributed and deployed across Kubernetes clusters.

---

Kubewarden policies are distributed as OCI artifacts - the same format used for container images. This allows you to use any OCI-compatible registry (ghcr.io, Docker Hub, Harbor, or a private registry) to host and version your policies.

---

## Step 1: Build the Policy WASM Binary

Before publishing, compile your policy:

```bash
# Rust policy

cargo build --target wasm32-wasip1 --release
cp target/wasm32-wasip1/release/my-policy.wasm .

# Go policy (TinyGo)
tinygo build -o my-policy.wasm -target wasi -no-debug .

# AssemblyScript
npm run build
cp build/release.wasm my-policy.wasm
```

---

## Step 2: Create the Policy Metadata File

Every published policy needs a `metadata.yaml` file describing it:

```yaml
# metadata.yaml
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations: ["CREATE", "UPDATE"]

mutating: false

contextAwareResources: []
executionMode: kubewarden-wapc

annotations:
  io.kubewarden.policy.title: "Disallow Latest Tag"
  io.kubewarden.policy.description: "Rejects pods using the :latest image tag"
  io.kubewarden.policy.author: "Platform Team <platform@example.com>"
  io.kubewarden.policy.url: "https://github.com/my-org/disallow-latest-tag"
  io.kubewarden.policy.source: "https://github.com/my-org/disallow-latest-tag"
  io.kubewarden.policy.license: "Apache-2.0"
  io.kubewarden.policy.version: "v0.1.0"
  io.kubewarden.policy.category: "container"
  io.kubewarden.policy.severity: "medium"
```

---

## Step 3: Annotate the WASM Binary

The `kwctl annotate` command embeds the metadata into the WASM binary:

```bash
# Annotate the policy
kwctl annotate my-policy.wasm \
  --metadata-path metadata.yaml \
  --output-path annotated-policy.wasm

# Inspect the annotated policy
kwctl inspect annotated-policy.wasm
```

---

## Step 4: Log In to the Registry

```bash
# Log in to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Log in to Docker Hub
docker login

# Log in to a private Harbor registry
docker login registry.example.com
```

---

## Step 5: Push the Policy to the Registry

```bash
# Push to GitHub Container Registry
kwctl push annotated-policy.wasm \
  ghcr.io/my-org/disallow-latest-tag:v0.1.0

# Push with additional tags
kwctl push annotated-policy.wasm \
  ghcr.io/my-org/disallow-latest-tag:v0.1.0

kwctl push annotated-policy.wasm \
  ghcr.io/my-org/disallow-latest-tag:latest

# Push to a private registry
kwctl push annotated-policy.wasm \
  registry.example.com/policies/disallow-latest-tag:v0.1.0
```

---

## Step 6: Sign the Policy with Sigstore

Signing policies ensures clusters only run verified, trusted policies:

```bash
# Install cosign
curl -Lo cosign https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
chmod +x cosign && sudo mv cosign /usr/local/bin/

# Generate a signing key pair
cosign generate-key-pair

# Sign the policy image
cosign sign --key cosign.key \
  ghcr.io/my-org/disallow-latest-tag:v0.1.0

# Verify the signature
cosign verify --key cosign.pub \
  ghcr.io/my-org/disallow-latest-tag:v0.1.0
```

---

## Step 7: Verify Before Deploying

```bash
# Pull the published policy locally
kwctl pull registry://ghcr.io/my-org/disallow-latest-tag:v0.1.0

# Verify the policy signature (if signed)
kwctl verify \
  --verification-key cosign.pub \
  registry://ghcr.io/my-org/disallow-latest-tag:v0.1.0

# Run a quick test against the pulled policy
kwctl run \
  registry://ghcr.io/my-org/disallow-latest-tag:v0.1.0 \
  --request-path test.json
```

---

## Step 8: Deploy to a Cluster

```yaml
# cluster-admission-policy.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: disallow-latest-tag
spec:
  module: ghcr.io/my-org/disallow-latest-tag:v0.1.0
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
```

```bash
kubectl apply -f cluster-admission-policy.yaml
```

---

## CI/CD Automation

```yaml
# .github/workflows/publish-policy.yml
- name: Annotate and publish policy
  run: |
    kwctl annotate my-policy.wasm \
      --metadata-path metadata.yaml \
      --output-path annotated-policy.wasm

    kwctl push annotated-policy.wasm \
      ghcr.io/${{ github.repository_owner }}/my-policy:${{ github.ref_name }}

    cosign sign --key env://COSIGN_PRIVATE_KEY \
      ghcr.io/${{ github.repository_owner }}/my-policy:${{ github.ref_name }}
  env:
    COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
    COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
```

---

## Best Practices

- Always sign policies before deploying to production clusters - Kubewarden supports signature verification natively.
- Use semantic versioning tags (v0.1.0) alongside `latest` so policy deployments are reproducible.
- Store `metadata.yaml` alongside the policy source code in version control so metadata and logic stay in sync.
