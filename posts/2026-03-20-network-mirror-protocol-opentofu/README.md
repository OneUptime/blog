# How OpenTofu's Network Mirror Protocol Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Network Mirror, Provider Cache, Air-Gap, Infrastructure as Code, Security

Description: Learn how to set up and use OpenTofu's network mirror protocol - serving provider binaries from an internal server for air-gapped environments, faster CI downloads, and supply chain security.

## Introduction

OpenTofu's network mirror protocol allows you to serve provider binaries from an internal HTTP server. This is essential for air-gapped environments (no internet access), required for supply chain control (only pre-approved providers), and useful for performance (avoid re-downloading from internet in CI).

## How Network Mirrors Work

```hcl
Normal provider installation:
  tofu init → registry.opentofu.org → HashiCorp releases.hashicorp.com

With network mirror:
  tofu init → your-mirror.example.com (internal) → providers served locally
```

## Mirror URL Structure

The network mirror must serve files at these paths:

```text
/{hostname}/{namespace}/{type}/index.json     - list versions
/{hostname}/{namespace}/{type}/{version}.json - per-version metadata
/{hostname}/{namespace}/{type}/{filename}     - provider binary (URL is relative to the version JSON)
```

Example for `registry.opentofu.org/hashicorp/aws`:

```text
/registry.opentofu.org/hashicorp/aws/index.json
/registry.opentofu.org/hashicorp/aws/5.31.0.json
/registry.opentofu.org/hashicorp/aws/terraform-provider-aws_5.31.0_linux_amd64.zip
```

## index.json Format

```json
{
  "versions": {
    "5.29.0": {},
    "5.30.0": {},
    "5.31.0": {}
  }
}
```

## {version}.json Format

```json
{
  "archives": {
    "linux_amd64": {
      "url": "terraform-provider-aws_5.31.0_linux_amd64.zip",
      "hashes": [
        "h1:abc123def456...",
        "zh:789012ghi345..."
      ]
    },
    "linux_arm64": {
      "url": "terraform-provider-aws_5.31.0_linux_arm64.zip",
      "hashes": ["h1:...", "zh:..."]
    },
    "darwin_arm64": {
      "url": "terraform-provider-aws_5.31.0_darwin_arm64.zip",
      "hashes": ["h1:...", "zh:..."]
    }
  }
}
```

## Populating the Mirror with tofu providers mirror

```bash
# Download all required providers to a local directory

cd your-tofu-project/

tofu init  # First, initialize to resolve provider versions

# Populate mirror for specific platforms
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_arm64 \
  /opt/tofu-provider-mirror

# The directory is now ready to be served as a network mirror
ls /opt/tofu-provider-mirror/registry.opentofu.org/hashicorp/aws/
# index.json  5.31.0.json  terraform-provider-aws_5.31.0_linux_amd64.zip  terraform-provider-aws_5.31.0_linux_arm64.zip  terraform-provider-aws_5.31.0_darwin_arm64.zip
```

## Serving the Mirror with nginx

```nginx
# /etc/nginx/conf.d/tofu-mirror.conf
server {
    listen 443 ssl;
    server_name mirror.mycompany.internal;

    ssl_certificate     /etc/ssl/certs/mirror.crt;
    ssl_certificate_key /etc/ssl/private/mirror.key;

    root /opt/tofu-provider-mirror;

    # Serve JSON metadata
    location ~ \.json$ {
        add_header Content-Type application/json;
        try_files $uri =404;
    }

    # Serve provider binaries
    location ~ \.zip$ {
        add_header Content-Type application/zip;
        try_files $uri =404;
    }
}
```

## Configuring OpenTofu to Use the Mirror

```hcl
# ~/.terraformrc
provider_installation {
  network_mirror {
    url     = "https://mirror.mycompany.internal/"
    include = ["registry.opentofu.org/*/*", "registry.terraform.io/*/*"]
  }

  # Fallback to direct download for unlisted providers
  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

## Exclusive Mirror (Air-Gapped)

```hcl
# ~/.terraformrc - no internet access, mirror only
provider_installation {
  network_mirror {
    url     = "https://mirror.mycompany.internal/"
    include = ["*/*/*"]  # All providers must come from mirror
  }
  # No 'direct' block - fail if not in mirror
}
```

## GitHub Actions: Cache Providers

Using a network mirror in CI for faster builds:

```yaml
- name: Configure OpenTofu provider mirror
  run: |
    cat > ~/.terraformrc << 'EOF'
    provider_installation {
      network_mirror {
        url     = "https://provider-cache.mycompany.com/"
        include = ["registry.opentofu.org/hashicorp/*"]
      }
      direct {
        exclude = ["registry.opentofu.org/hashicorp/*"]
      }
    }
    EOF

- name: OpenTofu Init
  run: tofu init
  # Providers served from internal mirror - fast, no internet needed
```

## Updating the Mirror

```bash
#!/bin/bash
# scripts/update-mirror.sh - sync latest provider versions to mirror

PROVIDERS=(
  "registry.opentofu.org/hashicorp/aws"
  "registry.opentofu.org/hashicorp/azurerm"
  "registry.opentofu.org/hashicorp/google"
)

for provider in "${PROVIDERS[@]}"; do
  echo "Updating $provider..."
  cd /tmp/mirror-update/
  tofu providers mirror \
    -platform=linux_amd64 \
    -platform=linux_arm64 \
    /opt/tofu-provider-mirror
done

echo "Mirror update complete"
```

## Conclusion

OpenTofu's network mirror protocol is a simple HTTP API that serves provider binaries from an internal server. Use `tofu providers mirror` to populate a filesystem mirror, serve it with nginx or any static file server, and configure `~/.terraformrc` to use it. For air-gapped environments, use an exclusive mirror config with no `direct` fallback. For CI acceleration, use the mirror to serve frequently-used providers from an internal cache, dramatically reducing `tofu init` times.
