# Distributing OpenTofu Providers via OCI Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, OCI, Registry

Description: Learn how OpenTofu supports OCI (Open Container Initiative) registries for distributing providers and modules.

OpenTofu introduces support for OCI (Open Container Initiative) registries as an alternative distribution channel for providers and modules. This allows organizations to use existing container registry infrastructure (Docker Hub, ECR, GCR, Harbor) to distribute OpenTofu content.

## What Is OCI Distribution?

OCI is the standard format used by container images. OpenTofu can use OCI registries to:
- Distribute providers to air-gapped environments
- Use existing registry infrastructure
- Leverage fine-grained access control from container registries
- Integrate with standard CI/CD container workflows

## Configuring OCI Provider Sources

OpenTofu currently supports OCI registries as a *mirror* for providers - not as a primary source. You keep the standard provider source address in your configuration and configure OpenTofu to fetch the plugin from an OCI registry via the `oci_mirror` installation method.

```hcl
terraform {
  required_providers {
    # Standard provider source address - OpenTofu resolves it via the OCI mirror
    mycustom = {
      source  = "registry.example.com/myorg/mycustom"
      version = "~> 1.0"
    }
  }
}
```

```hcl
# ~/.tofurc

provider_installation {
  oci_mirror {
    repository_template = "registry.example.com/terraform-providers/${namespace}/${type}"
    include             = ["registry.example.com/myorg/*"]
  }

  direct {
    exclude = ["registry.example.com/myorg/*"]
  }
}
```

The `repository_template` supports the `${hostname}`, `${namespace}`, and `${type}` interpolations, mapping a provider source address into an OCI repository address.

## OCI Registry Authentication

```bash
# Authenticate with the OCI registry (uses standard Docker/ORAS credentials)
docker login registry.example.com
# or
echo "$REGISTRY_PASSWORD" | docker login registry.example.com -u "$REGISTRY_USERNAME" --password-stdin

# OpenTofu searches the following Docker-style config files (in order):
#   $XDG_RUNTIME_DIR/containers/auth.json
#   $HOME/.config/containers/auth.json
#   $XDG_CONFIG_HOME/containers/auth.json
#   $HOME/.docker/config.json
#   $HOME/.dockercfg
```

You can also configure credentials explicitly in the CLI config:

```hcl
# ~/.tofurc
oci_credentials "registry.example.com" {
  username = "ci-user"
  password = "s3cret"
}
```

## Pushing a Provider to an OCI Registry

OpenTofu expects a multi-platform layout: one manifest per OS/arch with `artifactType` `application/vnd.opentofu.provider-target`, combined into an index manifest with `artifactType` `application/vnd.opentofu.provider`. The provider `.zip` is attached as a layer with media type `archive/zip`.

```bash
# After building your custom provider binary
# Package it as an OCI artifact

# Install oras (OCI Registry AS Storage)
brew install oras  # macOS
# or download from https://oras.land

# Build a per-platform manifest for each OS/arch in a local OCI layout
oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout tmp-layout:linux_amd64 \
  terraform-provider-myprovider_1.0.0_linux_amd64.zip:archive/zip

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform darwin/arm64 \
  --oci-layout tmp-layout:darwin_arm64 \
  terraform-provider-myprovider_1.0.0_darwin_arm64.zip:archive/zip

# Combine the per-platform manifests into a single index manifest
oras manifest index create \
  --artifact-type application/vnd.opentofu.provider \
  --oci-layout tmp-layout:1.0.0 \
  linux_amd64 darwin_arm64

# Copy the local layout to the remote registry
oras cp \
  --from-oci-layout tmp-layout:1.0.0 \
  registry.example.com/terraform-providers/myorg/myprovider:1.0.0
```

## Using OCI Modules

OpenTofu selects the module version using a `tag` or `digest` query parameter on the source URL - not a `:tag` suffix.

```hcl
# Reference a module stored in an OCI registry
module "vpc" {
  source  = "oci://registry.example.com/terraform-modules/vpc?tag=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}
```

## Pushing a Module to OCI

OpenTofu module packages must be ZIP files. The artifact must use `artifactType` `application/vnd.opentofu.modulepkg` and a single layer with media type `archive/zip`.

```bash
# Package your module as a zip
( cd ./modules/vpc && zip -r ../../vpc-module.zip . )

# Push to OCI registry
oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  registry.example.com/terraform-modules/vpc:v2.1.0 \
  vpc-module.zip:archive/zip

# Tag as latest
oras tag registry.example.com/terraform-modules/vpc:v2.1.0 \
  registry.example.com/terraform-modules/vpc:latest
```

## Corporate Registry Setup (Harbor)

```yaml
# harbor-values.yaml (Helm)
expose:
  type: ingress
  ingress:
    hosts:
      core: registry.example.com

externalURL: https://registry.example.com

# Create projects for Terraform content
# Project: terraform-providers
# Project: terraform-modules
```

```hcl
# ~/.tofurc - configure the OCI mirror for the corporate registry
provider_installation {
  oci_mirror {
    repository_template = "registry.example.com/terraform-providers/${namespace}/${type}"
    include             = ["registry.example.com/*/*"]
  }

  direct {
    exclude = ["registry.example.com/*/*"]
  }
}
```

```hcl
terraform {
  required_providers {
    internal = {
      source  = "registry.example.com/myorg/internal"
      version = "~> 2.0"
    }
  }
}
```

## Private Provider Distribution Workflow

```bash
#!/bin/bash
# ci-publish-provider.sh

VERSION=$1
REGISTRY="registry.example.com/terraform-providers/myorg"
PROVIDER="myprovider"
LAYOUT="tmp-layout"

# Build for multiple platforms
GOOS=linux GOARCH=amd64 go build -o "terraform-provider-${PROVIDER}_linux_amd64"
GOOS=darwin GOARCH=arm64 go build -o "terraform-provider-${PROVIDER}_darwin_arm64"

# Zip binaries
zip "terraform-provider-${PROVIDER}_${VERSION}_linux_amd64.zip" \
  "terraform-provider-${PROVIDER}_linux_amd64"
zip "terraform-provider-${PROVIDER}_${VERSION}_darwin_arm64.zip" \
  "terraform-provider-${PROVIDER}_darwin_arm64"

# Build per-platform manifests in a local OCI layout
oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout "${LAYOUT}:linux_amd64" \
  "terraform-provider-${PROVIDER}_${VERSION}_linux_amd64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform darwin/arm64 \
  --oci-layout "${LAYOUT}:darwin_arm64" \
  "terraform-provider-${PROVIDER}_${VERSION}_darwin_arm64.zip:archive/zip"

# Combine into an index manifest tagged with the version
oras manifest index create \
  --artifact-type application/vnd.opentofu.provider \
  --oci-layout "${LAYOUT}:${VERSION}" \
  linux_amd64 darwin_arm64

# Push the index (and its referenced manifests) to the remote registry
oras cp \
  --from-oci-layout "${LAYOUT}:${VERSION}" \
  "${REGISTRY}/${PROVIDER}:${VERSION}"

echo "Published ${PROVIDER} v${VERSION} to OCI registry"
```

## Advantages Over Traditional Distribution

```bash
Traditional (registry.opentofu.org):
- Public only (or requires Terraform Cloud for private)
- Must match specific naming conventions
- Registry-specific workflow

OCI Distribution:
- Works with any OCI-compatible registry
- Use existing Docker infrastructure
- Fine-grained access control (same as container images)
- Works in air-gapped environments
- Standard tooling (docker, oras, skopeo)
- Integrates with existing CI/CD for containers
```

## Conclusion

OCI distribution brings the flexibility of container registries to OpenTofu provider and module distribution. For organizations already using container registries like Harbor, ECR, or GCR, this provides a natural way to distribute private providers without needing a separate Terraform registry. It's particularly valuable for air-gapped environments and organizations with strict provenance requirements.
