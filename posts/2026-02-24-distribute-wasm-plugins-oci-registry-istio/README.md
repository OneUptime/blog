# How to Distribute Wasm Plugins via OCI Registry in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, OCI Registry, Container Registry, Distribution

Description: How to package, distribute, and manage WebAssembly plugins for Istio using OCI-compatible container registries.

---

The recommended way to distribute Wasm plugins for Istio is through OCI (Open Container Initiative) registries. This lets you use the same container registries you already use for Docker images to store and version your Wasm binaries. You get versioning, access control, replication, and scanning for free. This post covers the full workflow from packaging to deployment.

## Why OCI Registries

OCI registries solve several distribution problems:

- **Versioning**: Tag Wasm binaries with semantic versions just like container images
- **Authentication**: Use existing registry credentials and RBAC
- **Caching**: Istio caches downloaded Wasm binaries, and the OCI protocol supports content-addressable storage
- **Replication**: Multi-region registries ensure plugins are available close to your clusters
- **Scanning**: Some registries can scan OCI artifacts for vulnerabilities

## Installing ORAS

ORAS (OCI Registry as Storage) is the standard tool for pushing non-container OCI artifacts to registries:

```bash
# macOS
brew install oras

# Linux (amd64)
curl -LO https://github.com/oras-project/oras/releases/download/v1.2.0/oras_1.2.0_linux_amd64.tar.gz
tar -zxf oras_1.2.0_linux_amd64.tar.gz
sudo mv oras /usr/local/bin/

# Verify installation
oras version
```

## Pushing a Wasm Plugin to a Registry

After building your Wasm binary, push it to your registry:

```bash
# Build the plugin
cargo build --target wasm32-wasi --release

# Optimize (optional)
wasm-opt -O3 target/wasm32-wasi/release/my_plugin.wasm -o my_plugin.wasm

# Login to registry
oras login registry.example.com

# Push with a version tag
oras push registry.example.com/istio-plugins/my-plugin:v1.0.0 \
  my_plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm

# Also tag as latest
oras push registry.example.com/istio-plugins/my-plugin:latest \
  my_plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

The media type `application/vnd.module.wasm.content.layer.v1+wasm` is the standard media type for Wasm modules in OCI registries.

## Supported Registries

Most major container registries support OCI artifacts:

**Docker Hub:**
```bash
oras login docker.io
oras push docker.io/myorg/istio-plugins/auth:v1.0 \
  auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

**GitHub Container Registry:**
```bash
oras login ghcr.io -u USERNAME -p GITHUB_TOKEN
oras push ghcr.io/myorg/istio-plugins/auth:v1.0 \
  auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

**Google Artifact Registry:**
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
oras push us-central1-docker.pkg.dev/my-project/istio-plugins/auth:v1.0 \
  auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

**AWS ECR:**
```bash
aws ecr get-login-password --region us-east-1 | oras login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
oras push 123456789.dkr.ecr.us-east-1.amazonaws.com/istio-plugins/auth:v1.0 \
  auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

**Azure Container Registry:**
```bash
az acr login --name myregistry
oras push myregistry.azurecr.io/istio-plugins/auth:v1.0 \
  auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

## Referencing OCI Artifacts in Istio

In the WasmPlugin resource, use the `oci://` URL scheme:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/istio-plugins/auth:v1.0.0
  imagePullPolicy: IfNotPresent
```

## Configuring Image Pull Secrets

For private registries, create a Kubernetes docker-registry secret and reference it:

```bash
# Create the secret
kubectl create secret docker-registry wasm-registry-creds \
  -n my-app \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myemail@example.com
```

Reference it in the WasmPlugin:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: auth-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/istio-plugins/auth:v1.0.0
  imagePullPolicy: IfNotPresent
  imagePullSecret: wasm-registry-creds
```

## Version Management Strategy

Use semantic versioning for your Wasm plugins:

```bash
# Major version - breaking config changes
oras push registry.example.com/plugins/auth:v2.0.0 auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm

# Minor version - new features, backward compatible
oras push registry.example.com/plugins/auth:v1.1.0 auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm

# Patch version - bug fixes
oras push registry.example.com/plugins/auth:v1.0.1 auth.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

For production, always use specific version tags, not `latest`:

```yaml
# Good - predictable, reproducible
url: oci://registry.example.com/plugins/auth:v1.2.3

# Bad - unpredictable, could change without your knowledge
url: oci://registry.example.com/plugins/auth:latest
```

## CI/CD Pipeline for Wasm Plugins

Automate the build and push process in your CI/CD pipeline:

```yaml
# .github/workflows/wasm-plugin.yml
name: Build and Push Wasm Plugin

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install Rust
      uses: dtolnay/rust-toolchain@stable
      with:
        targets: wasm32-wasi

    - name: Build
      run: cargo build --target wasm32-wasi --release

    - name: Install wasm-opt
      run: |
        sudo apt-get update && sudo apt-get install -y binaryen

    - name: Optimize
      run: wasm-opt -O3 target/wasm32-wasi/release/my_plugin.wasm -o my_plugin.wasm

    - name: Install ORAS
      run: |
        curl -LO https://github.com/oras-project/oras/releases/download/v1.2.0/oras_1.2.0_linux_amd64.tar.gz
        tar -zxf oras_1.2.0_linux_amd64.tar.gz
        sudo mv oras /usr/local/bin/

    - name: Login to Registry
      run: oras login ghcr.io -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }}

    - name: Push to Registry
      run: |
        VERSION=${GITHUB_REF#refs/tags/}
        oras push ghcr.io/${{ github.repository }}/my-plugin:${VERSION} \
          my_plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

## Verifying Artifacts

After pushing, verify the artifact is in the registry:

```bash
# List tags
oras repo tags registry.example.com/istio-plugins/auth

# Fetch manifest
oras manifest fetch registry.example.com/istio-plugins/auth:v1.0.0

# Pull and verify the binary
oras pull registry.example.com/istio-plugins/auth:v1.0.0 -o /tmp/verify/
file /tmp/verify/auth.wasm
```

## Caching Behavior

Istio caches Wasm binaries to avoid downloading them repeatedly. The caching behavior depends on the `imagePullPolicy`:

- **IfNotPresent**: Download once and cache. Subsequent proxy starts use the cached version.
- **Always**: Check the registry for updates on every proxy start. Downloads only if the digest has changed.

You can force a re-pull by restarting the proxy pods:

```bash
kubectl rollout restart deployment my-service -n my-app
```

Or by changing the tag in the WasmPlugin resource:

```yaml
# Change from v1.0.0 to v1.0.1 to trigger a re-pull
url: oci://registry.example.com/plugins/auth:v1.0.1
```

## Organizing Plugins in a Registry

For organizations with multiple plugins, use a consistent naming convention:

```
registry.example.com/istio-plugins/
  auth/
    v1.0.0
    v1.1.0
    v2.0.0
  rate-limiter/
    v1.0.0
    v1.0.1
  logger/
    v1.0.0
  request-transform/
    v1.0.0
```

## Summary

Distributing Wasm plugins via OCI registries gives you versioning, authentication, caching, and integration with existing container infrastructure. Use ORAS to push Wasm binaries to any OCI-compatible registry, reference them in WasmPlugin resources with the `oci://` scheme, and configure image pull secrets for private registries. Set up CI/CD pipelines to automate the build-optimize-push workflow, and always use specific version tags in production.
