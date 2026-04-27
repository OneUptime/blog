# Using tofu providers mirror in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Mirror

Description: Learn how to use the tofu providers mirror command to download providers for offline use and air-gapped deployments.

The `tofu providers mirror` command downloads provider packages from the registry and saves them in a local directory, creating a filesystem mirror. This mirror can then be used for offline installations or shared across your organization.

## Basic Usage

```bash
# Download providers for the current configuration to a directory

tofu providers mirror /path/to/mirror

# Example
tofu providers mirror /opt/terraform-providers

# This reads required_providers from your configuration
# and downloads all required provider packages
```

## Output Structure

After running `tofu providers mirror /opt/tf-mirror`:

```text
/opt/tf-mirror/
└── registry.opentofu.org/
    └── hashicorp/
        └── aws/
            ├── index.json            # Lists available versions
            ├── 5.38.0.json           # Version metadata
            └── terraform-provider-aws_5.38.0_linux_amd64.zip
```

The JSON file contains checksums:

```json
{
  "archives": {
    "linux_amd64": {
      "url": "terraform-provider-aws_5.38.0_linux_amd64.zip",
      "hashes": [
        "zh:abc123...",
        "h1:def456..."
      ]
    }
  }
}
```

## Downloading for Multiple Platforms

```bash
# Download for specific platforms
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_arm64 \
  /opt/terraform-providers

# The mirror will contain packages for all specified platforms
```

## Common Use Cases

### Air-Gapped Environment Setup

```bash
# Step 1: On a machine with internet access
tofu providers mirror \
  -platform=linux_amd64 \
  /tmp/provider-packages

# Step 2: Transfer to air-gapped environment
tar -czf provider-packages.tar.gz /tmp/provider-packages
# Copy via USB, secure file transfer, etc.

# Step 3: Extract on air-gapped machine
tar -xzf provider-packages.tar.gz -C /opt/
mv /opt/tmp/provider-packages /opt/terraform-providers

# Step 4: Configure OpenTofu to use the mirror
cat > ~/.tofurc << 'EOF'
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform-providers"
    include = ["registry.opentofu.org/*/*"]
  }
}
EOF

# Step 5: Initialize normally
tofu init
```

### Creating a CI/CD Provider Bundle

```bash
#!/bin/bash
# create-provider-bundle.sh

MIRROR_DIR="./providers-bundle"
PLATFORMS="linux_amd64 linux_arm64"

mkdir -p "$MIRROR_DIR"

for platform in $PLATFORMS; do
  tofu providers mirror \
    -platform="$platform" \
    "$MIRROR_DIR"
done

# Bundle for distribution
tar -czf providers-bundle.tar.gz "$MIRROR_DIR"
echo "Bundle created: providers-bundle.tar.gz"
echo "Size: $(du -sh providers-bundle.tar.gz | cut -f1)"
```

### Updating an Existing Mirror

```bash
# Add a new provider version to existing mirror
cd /tmp/update-workspace

cat > versions.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.40.0"  # New version to add
    }
  }
}
EOF

# Mirror downloads only what's missing
tofu providers mirror \
  -platform=linux_amd64 \
  /opt/terraform-providers

# The mirror now has both 5.38.0 and 5.40.0
```

## Combining with providers lock

```bash
# After creating a mirror, update the lock file to use it
tofu providers lock \
  -fs-mirror=/opt/terraform-providers \
  -platform=linux_amd64 \
  -platform=darwin_arm64
```

## Docker Image with Bundled Providers

```dockerfile
# Build stage: download providers
FROM ubuntu:22.04 AS provider-downloader

RUN apt-get update && apt-get install -y wget && \
    wget -O tofu.deb https://github.com/opentofu/opentofu/releases/download/v1.7.0/tofu_1.7.0_amd64.deb && \
    dpkg -i tofu.deb

WORKDIR /workspace
COPY versions.tf .
RUN tofu providers mirror -platform=linux_amd64 /providers

# Final stage: runtime with cached providers
FROM ubuntu:22.04

COPY --from=provider-downloader /providers /opt/terraform-providers
COPY --from=provider-downloader /usr/bin/tofu /usr/bin/tofu

RUN echo 'provider_installation { filesystem_mirror { path = "/opt/terraform-providers" } }' > /root/.tofurc
```

## Verifying a Mirror

```bash
# Check what's in the mirror
find /opt/terraform-providers -name "*.zip" | sort

# Verify structure (should have JSON index files)
find /opt/terraform-providers -name "*.json" | sort

# Test initialization
export TF_CLI_CONFIG_FILE=/tmp/test-tofurc
cat > "$TF_CLI_CONFIG_FILE" << 'EOF'
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform-providers"
    include = ["registry.opentofu.org/*/*"]
  }
}
EOF

cd /my-project
tofu init
```

## Conclusion

`tofu providers mirror` is the foundation for air-gapped OpenTofu deployments. Use it to bundle providers for offline environments, create organization-wide provider caches, or build Docker images with pre-bundled providers. Combine it with `tofu providers lock` to ensure checksum verification works with your mirror.
