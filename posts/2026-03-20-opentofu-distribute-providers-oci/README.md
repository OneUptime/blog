# How to Distribute Providers via OCI Registries in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Provider, OCI

Description: Learn how to distribute custom OpenTofu providers using OCI registries as an alternative to the public registry for internal or private provider distribution.

## Introduction

OpenTofu supports distributing providers via OCI (Open Container Initiative) registries. This is an OpenTofu-specific feature that lets organizations use existing container registry infrastructure - Amazon ECR, Google Artifact Registry, Azure Container Registry, or any OCI-compliant registry - to distribute private providers without operating a separate provider registry.

## Building the Provider Binary

OpenTofu expects providers to be packaged as `.zip` archives matching the official naming convention `terraform-provider-{TYPE}_{VERSION}_{OS}_{ARCH}.zip`:

```bash
# Build and package for multiple platforms

GOOS=linux  GOARCH=amd64 go build -o terraform-provider-internal
zip terraform-provider-internal_1.0.0_linux_amd64.zip terraform-provider-internal

GOOS=linux  GOARCH=arm64 go build -o terraform-provider-internal
zip terraform-provider-internal_1.0.0_linux_arm64.zip terraform-provider-internal

GOOS=darwin GOARCH=arm64 go build -o terraform-provider-internal
zip terraform-provider-internal_1.0.0_darwin_arm64.zip terraform-provider-internal
```

## Packaging as an OCI Artifact

Use the `oras` CLI to assemble per-platform manifests and an index manifest in a local OCI layout, then copy to the remote registry:

```bash
# Install oras
brew install oras

# Push each platform-specific package into a local OCI layout
oras push --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout tmp-layout:linux_amd64 \
  terraform-provider-internal_1.0.0_linux_amd64.zip:archive/zip

oras push --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/arm64 \
  --oci-layout tmp-layout:linux_arm64 \
  terraform-provider-internal_1.0.0_linux_arm64.zip:archive/zip

oras push --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform darwin/arm64 \
  --oci-layout tmp-layout:darwin_arm64 \
  terraform-provider-internal_1.0.0_darwin_arm64.zip:archive/zip

# Create an index manifest combining all platforms, tagged with the version
oras manifest index create \
  --artifact-type application/vnd.opentofu.provider \
  --oci-layout tmp-layout:1.0.0 \
  linux_amd64 linux_arm64 darwin_arm64

# Copy the version index to the remote registry
oras cp --from-oci-layout tmp-layout:1.0.0 \
  registry.acme-corp.com/terraform-providers/internal:1.0.0
```

## Configuring OpenTofu to Use an OCI Provider Registry

The `oci_mirror` block uses a `repository_template` that maps provider source addresses into OCI repository addresses. Include and exclude patterns must use fully-qualified provider source addresses (with hostname):

```hcl
# ~/.tofurc
provider_installation {
  oci_mirror {
    repository_template = "registry.acme-corp.com/terraform-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/acme-corp/internal"]
  }
  direct {
    exclude = ["registry.opentofu.org/acme-corp/internal"]
  }
}
```

## Declaring the Provider in Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    internal = {
      source  = "acme-corp/internal"
      version = "~> 1.0"
    }
  }
}
```

## Authentication

OCI provider mirrors use the same authentication as container registries:

```bash
# Authenticate with your OCI registry
docker login registry.acme-corp.com

# For Amazon ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com
```

## Using Amazon ECR for Provider Distribution

```hcl
# ~/.tofurc
provider_installation {
  oci_mirror {
    repository_template = "123456789012.dkr.ecr.us-east-1.amazonaws.com/terraform-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/acme-corp/*"]
  }
  direct {
    exclude = ["registry.opentofu.org/acme-corp/*"]
  }
}
```

## Version Management

Push new versions with semantic version tags. Repeat the per-platform `oras push`, `oras manifest index create`, and `oras cp` workflow with the new version tag:

```bash
# Release 1.1.0 - copy the new version index to the remote registry
oras cp --from-oci-layout tmp-layout:1.1.0 \
  registry.acme-corp.com/terraform-providers/internal:1.1.0

# Update the provider version constraint in your configurations
# version = "~> 1.1"
```

## Benefits Over Public Registry

- No need for a public GitHub repository
- Access controlled via registry IAM/RBAC
- Works with existing container registry infrastructure
- Supports air-gapped environments
- Immutable artifacts via digest pinning

## Conclusion

OCI registry distribution for providers is a powerful OpenTofu-exclusive feature for organizations with private providers. It reuses existing container registry infrastructure and access control, eliminating the need to operate a separate provider registry. Use it for internal providers that should not be published to the public registry.
