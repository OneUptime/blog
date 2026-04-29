# How to Create a Local Provider Mirror for Offline OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider Mirror, Offline, Air-Gapped, Infrastructure

Description: Learn how to create and maintain a local provider mirror for OpenTofu to enable offline provider installation and consistent provider versions across your team.

## Introduction

A local provider mirror is a directory (or web server) that contains provider plugin archives in the format OpenTofu expects. It lets teams install providers without internet access, control which provider versions are available, and reduce download times in CI/CD pipelines.

## Creating a Mirror with tofu providers mirror

```bash
# Create a configuration that lists all needed providers

mkdir -p /tmp/mirror-setup
cat > /tmp/mirror-setup/main.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}
EOF

cd /tmp/mirror-setup
tofu init

# Mirror to local directory
tofu providers mirror /opt/provider-mirror/

# Output shows what was downloaded:
# - registry.opentofu.org/hashicorp/aws 5.20.1
# - registry.opentofu.org/hashicorp/kubernetes 2.23.0
# ...
```

## Mirror Directory Structure

```text
/opt/provider-mirror/
└── registry.opentofu.org/
    └── hashicorp/
        ├── aws/
        │   ├── index.json           # Versions available for a network mirror
        │   ├── 5.20.1.json          # Per-version metadata for a network mirror
        │   └── terraform-provider-aws_5.20.1_linux_amd64.zip
        ├── kubernetes/
        │   ├── index.json
        │   ├── 2.23.0.json
        │   └── terraform-provider-kubernetes_2.23.0_linux_amd64.zip
        └── random/
            ├── index.json
            ├── 3.5.1.json
            └── terraform-provider-random_3.5.1_linux_amd64.zip
```

```bash
# Check what's in the mirror
find /opt/provider-mirror -name "*.json" | head -20
find /opt/provider-mirror -name "*.zip" | wc -l
```

## Configuring OpenTofu to Use the Mirror

```hcl
# ~/.tofurc (or set TF_CLI_CONFIG_FILE to this file's path)

provider_installation {
  filesystem_mirror {
    path    = "/opt/provider-mirror"
    include = ["registry.opentofu.org/*/*"]
  }

  # Fallback to direct for providers not in mirror
  # Remove this block for fully offline environments
  direct {
    exclude = [
      "registry.opentofu.org/hashicorp/aws",
      "registry.opentofu.org/hashicorp/kubernetes",
      "registry.opentofu.org/hashicorp/helm",
      "registry.opentofu.org/hashicorp/random"
    ]
  }
}
```

```bash
# Test the mirror configuration
export TF_CLI_CONFIG_FILE=/etc/opentofu/provider-mirror.tfrc
tofu init  # With only the providers listed above, no internet access is needed
```

## Multiple Platform Support

```bash
# Mirror providers for multiple operating systems
# Useful when your team uses both macOS and Linux

tofu providers mirror \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64 \
  /opt/provider-mirror/

# All platforms in one directory is fine - OpenTofu selects the right zip
```

## Maintaining the Mirror

```bash
#!/bin/bash
# update-mirror.sh - Script to update the provider mirror

set -euo pipefail

MIRROR_DIR="/opt/provider-mirror"
PROVIDERS_CONFIG="/opt/mirror-config/providers.tf"

echo "Updating provider mirror at $MIRROR_DIR"

# Initialize to resolve latest compatible versions
cd "$(dirname "$PROVIDERS_CONFIG")"
tofu init -upgrade

# Update the mirror with new versions
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64 \
  "$MIRROR_DIR"

echo "Mirror update complete"
ls -la "$MIRROR_DIR/registry.opentofu.org/hashicorp/"
```

```bash
# Run update on a schedule (cron)
0 2 * * 1 /opt/scripts/update-mirror.sh >> /var/log/mirror-update.log 2>&1
```

## Sharing the Mirror via HTTP

```nginx
# /etc/nginx/sites-enabled/provider-mirror
server {
    listen 443 ssl;
    http2 on;
    server_name provider-mirror.internal.company.com;

    ssl_certificate     /etc/ssl/certs/mirror.crt;
    ssl_certificate_key /etc/ssl/private/mirror.key;

    root /opt/provider-mirror;

    # Required: serve JSON metadata with the correct content type
    location ~* \.json$ {
        types { application/json json; }
        add_header Cache-Control "max-age=3600";
    }

    # Provider zip files
    location ~* \.zip$ {
        types { application/zip zip; }
    }

    location / {
        try_files $uri $uri/ =404;
    }

    # Access log for auditing
    access_log /var/log/nginx/provider-mirror.log;
}
```

```hcl
# Use network mirror in .tofurc
provider_installation {
  network_mirror {
    url     = "https://provider-mirror.internal.company.com/"
    include = ["registry.opentofu.org/*/*"]
  }
}
```

## Version Locking in the Mirror

```bash
# Use exact version constraints when you want a reproducible mirror
mkdir -p /tmp/mirror-locked
cat > /tmp/mirror-locked/main.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.20.1"  # Exact version for reproducible mirrors
    }
  }
}
EOF
```

## Mirror for Third-Party Providers

```bash
# Third-party providers follow the same pattern
# Example: DataDog provider

mkdir -p /tmp/mirror-third-party
cat > /tmp/mirror-third-party/main.tf << 'EOF'
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "= 3.30.0"
    }
  }
}
EOF

cd /tmp/mirror-third-party
tofu init
tofu providers mirror /opt/provider-mirror/
# Creates the same registry/namespace/type structure under /opt/provider-mirror/
```

## Conclusion

The `tofu providers mirror` command downloads providers into the exact directory structure OpenTofu expects. The `filesystem_mirror` configuration in `.tofurc` redirects all provider downloads to that local directory. For teams, host the mirror directory via nginx to give everyone access without copying files manually. Update the mirror periodically by re-running `tofu providers mirror` against a configuration file that lists all needed provider versions.
