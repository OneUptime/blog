# How to Pull Providers from OCI Registries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OCI Registry, Provider Installation, Container, Infrastructure

Description: Learn how to configure OpenTofu to pull provider plugins directly from OCI-compatible registries, enabling offline workflows and centralized provider distribution.

## Introduction

OpenTofu 1.10+ can install providers from OCI registries using the `oci_mirror` provider installation method. OCI registries are a secondary installation source for providers, so you still declare normal provider source addresses and use CLI configuration to route matching providers to an OCI registry mirror. This enables teams to distribute providers through existing container registry infrastructure (ECR, ACR, GCR, GHCR, or any OCI-compatible registry that supports OCI Distribution v1.1.0) without running a separate provider registry server.

## Configuring OCI Provider Installation

```hcl
# ~/.tofurc, ~/.terraformrc (compatibility), or set via TF_CLI_CONFIG_FILE

provider_installation {
  # Pull matching providers from OCI repositories
  oci_mirror {
    repository_template = "registry.internal.company.com/opentofu-providers/${namespace}/${type}"

    # Which providers to pull from OCI (pattern matching)
    include = [
      "registry.opentofu.org/hashicorp/*",
      "registry.opentofu.org/mycompany/*"
    ]
  }

  # Fallback for providers not in OCI registry
  direct {
    exclude = [
      "registry.opentofu.org/hashicorp/*",
      "registry.opentofu.org/mycompany/*"
    ]
  }
}
```

## Authentication Configuration

```hcl
# ~/.tofurc - add credentials for the OCI registry

oci_credentials "registry.internal.company.com" {
  username = "your-registry-username"
  password = "your-registry-password"
}

# Or log in with another OCI client and let OpenTofu discover the auth file:

# docker login registry.internal.company.com
# oras login registry.internal.company.com
```

```bash
# For ECR: authenticate and write Docker-style registry credentials
REGISTRY="123456789.dkr.ecr.us-east-1.amazonaws.com"

aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin "$REGISTRY"

# OpenTofu discovers Docker-style auth files automatically when pulling from OCI
```

## Pulling Providers from GitHub Container Registry

```hcl
# ~/.tofurc
oci_credentials "ghcr.io" {
  username = "YOUR_GITHUB_USERNAME"
  password = "ghp_yourGitHubPersonalAccessToken"
}

provider_installation {
  oci_mirror {
    repository_template = "ghcr.io/myorg/opentofu-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/mycompany/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/mycompany/*"]
  }
}
```

```hcl
# OpenTofu configuration using a mirrored provider
terraform {
  required_providers {
    myprovider = {
      source  = "registry.opentofu.org/mycompany/myprovider"
      version = "~> 1.0"
    }
  }
}
```

## Pulling Mirrored Public Providers from OCI

```bash
# Script to mirror public providers to OCI registry
#!/bin/bash

set -euo pipefail

REGISTRY="123456789.dkr.ecr.us-east-1.amazonaws.com"
MIRROR_PATH="opentofu-providers"
TMPDIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

# Providers to mirror
declare -A PROVIDERS=(
  ["hashicorp/aws"]="5.20.1"
  ["hashicorp/kubernetes"]="2.23.0"
  ["hashicorp/helm"]="2.11.0"
)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin "$REGISTRY"

for PROVIDER_PATH in "${!PROVIDERS[@]}"; do
  VERSION="${PROVIDERS[$PROVIDER_PATH]}"
  NAMESPACE="${PROVIDER_PATH%/*}"
  TYPE="${PROVIDER_PATH#*/}"

  CONFIG_DIR="$TMPDIR/mirror-config"
  PROVIDER_MIRROR_DIR="$TMPDIR/provider-mirror"
  OCI_LAYOUT_DIR="$TMPDIR/oci-layout"

  rm -rf "$CONFIG_DIR" "$PROVIDER_MIRROR_DIR" "$OCI_LAYOUT_DIR"
  mkdir -p "$CONFIG_DIR" "$PROVIDER_MIRROR_DIR" "$OCI_LAYOUT_DIR"

  echo "Mirroring $PROVIDER_PATH@$VERSION..."

  # Download from the provider registry into a local filesystem mirror
  cat > "$CONFIG_DIR/main.tf" << EOF
terraform {
  required_providers {
    ${TYPE} = {
      source  = "$PROVIDER_PATH"
      version = "= $VERSION"
    }
  }
}
EOF
  tofu -chdir="$CONFIG_DIR" init -backend=false
  tofu -chdir="$CONFIG_DIR" providers mirror \
    -platform=linux_amd64 \
    -platform=linux_arm64 \
    "$PROVIDER_MIRROR_DIR"

  PROVIDER_DIR="$PROVIDER_MIRROR_DIR/registry.opentofu.org/$NAMESPACE/$TYPE"

  # Convert each platform package into a provider-target artifact
  for PLATFORM in linux_amd64 linux_arm64; do
    FILE="terraform-provider-${TYPE}_${VERSION}_${PLATFORM}.zip"
    ORAS_PLATFORM="${PLATFORM/_//}"

    oras push \
      --artifact-type application/vnd.opentofu.provider-target \
      --artifact-platform "$ORAS_PLATFORM" \
      --oci-layout "$OCI_LAYOUT_DIR:${PLATFORM}" \
      "$PROVIDER_DIR/$FILE:archive/zip"
  done

  # Create the multi-platform provider index tagged with the version
  oras manifest index create \
    --artifact-type application/vnd.opentofu.provider \
    --oci-layout "$OCI_LAYOUT_DIR:${VERSION}" \
    linux_amd64 \
    linux_arm64

  # Copy the completed OCI layout into the target registry repository
  oras cp \
    --from-oci-layout "$OCI_LAYOUT_DIR:${VERSION}" \
    "${REGISTRY}/${MIRROR_PATH}/${NAMESPACE}/${TYPE}:${VERSION}"

  echo "  Pushed: ${REGISTRY}/${MIRROR_PATH}/${NAMESPACE}/${TYPE}:${VERSION}"
done

echo "All providers mirrored to OCI registry"
```

## Verifying OCI Provider Pull

```bash
# Check that the mirrored version exists at the expected repository path
oras repo tags 123456789.dkr.ecr.us-east-1.amazonaws.com/opentofu-providers/hashicorp/aws

# Fetch the top-level manifest for a specific provider version
oras manifest fetch 123456789.dkr.ecr.us-east-1.amazonaws.com/opentofu-providers/hashicorp/aws:5.20.1

# Then run OpenTofu with debug logging and look for the OCI repository path
TF_LOG=DEBUG tofu init 2>&1 | \
  grep -F "123456789.dkr.ecr.us-east-1.amazonaws.com/opentofu-providers/hashicorp/aws"
```

## Fully Offline OCI Configuration

```hcl
# ~/.tofurc - Completely offline, all providers from OCI

provider_installation {
  oci_mirror {
    repository_template = "registry.internal.company.com/opentofu-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/*/*"]
  }

  # No direct fallback - fully offline
}
```

```bash
# Test offline init
export TF_CLI_CONFIG_FILE=/etc/opentofu/offline.tfrc
# Disconnect from the public internet or block direct access to provider registries

tofu init  # Should succeed using only the OCI registry for provider installation
```

## CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Log in to GHCR
  run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u "${{ github.actor }}" --password-stdin

- name: Configure OpenTofu OCI mirror
  run: |
    OWNER_LOWER=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
    cat > "$RUNNER_TEMP/opentofu.tfrc" <<EOF
    provider_installation {
      oci_mirror {
        repository_template = "ghcr.io/${OWNER_LOWER}/opentofu-providers/\${namespace}/\${type}"
        include             = ["registry.opentofu.org/hashicorp/*"]
      }
      direct {
        exclude = ["registry.opentofu.org/hashicorp/*"]
      }
    }
    EOF
    echo "TF_CLI_CONFIG_FILE=$RUNNER_TEMP/opentofu.tfrc" >> "$GITHUB_ENV"

- name: OpenTofu Init
  run: tofu init
```

## Conclusion

Pulling providers from OCI registries requires two things: the `oci_mirror` block in your CLI configuration must map provider source addresses to OCI repositories using `repository_template`, and each repository tag must point to an OCI image index with the artifact types and `archive/zip` layer format OpenTofu expects. OpenTofu can discover OCI credentials from Docker-style auth files or explicit `oci_credentials` blocks, so registries that implement OCI Distribution v1.1.0 can be used for centralized provider distribution. This approach is ideal for air-gapped environments already running container registry infrastructure, eliminating the need for a separate provider mirror server.
