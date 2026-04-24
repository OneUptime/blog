# OpenTofu Provider Network Mirror Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider, Network Mirror, Air-Gapped, Infrastructure as Code

Description: Learn how to set up and use the OpenTofu provider network mirror protocol to cache providers locally, enable air-gapped deployments, and speed up CI/CD pipelines.

## What is the Provider Network Mirror?

The OpenTofu provider network mirror protocol allows you to serve provider plugins from a local HTTPS server or filesystem mirror instead of fetching them directly from their origin registries. This is useful for:

- **Air-gapped environments** with no internet access
- **Faster CI/CD** by avoiding repeated downloads
- **Consistency** - ensuring all environments use the same provider binaries
- **Corporate policy compliance** - controlling which providers are used

## Mirror Types

This guide focuses on two mirror types:

| Type | Description |
|---|---|
| **Filesystem mirror** | Local directory with a specific structure |
| **Network mirror** | HTTPS server serving providers via the mirror protocol |

## Setting Up a Filesystem Mirror

Create a directory structure following the OpenTofu mirror format:

```text
/opt/tofu-mirror/
└── registry.opentofu.org/
    └── hashicorp/
        └── aws/
            └── terraform-provider-aws_5.40.0_linux_amd64.zip
```

Download providers using `tofu providers mirror`:

```bash
# Create the mirror directory

mkdir -p /opt/tofu-mirror

# Download providers to the mirror
tofu providers mirror /opt/tofu-mirror
```

This downloads all providers required by the current configuration.

## Configuring OpenTofu to Use the Mirror

Create or edit `~/.tofurc` (or legacy `~/.terraformrc`):

```hcl
provider_installation {
  filesystem_mirror {
    path    = "/opt/tofu-mirror"
    include = ["registry.opentofu.org/*/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

The `include`/`exclude` pattern controls which providers use the mirror vs direct downloads from their origin registries.

## Filesystem Mirror Only (Air-Gapped)

For fully air-gapped environments, exclude all direct downloads:

```hcl
provider_installation {
  filesystem_mirror {
    path    = "/opt/tofu-mirror"
    include = ["*/*/*"]
  }
}
```

## Setting Up a Network Mirror

The network mirror protocol is an HTTPS API that serves provider metadata. You can implement it with any HTTPS server. The required JSON endpoints are:

```text
GET /<hostname>/<namespace>/<type>/index.json
GET /<hostname>/<namespace>/<type>/<version>.json
```

The version-specific JSON response returns the download URLs for the provider zip files. The easiest way to build these files is with `tofu providers mirror` and then serve the resulting directory over HTTPS.

Example with a simple nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name mirror.internal.example.com;

    root /opt/tofu-mirror;

    location / {
        try_files $uri =404;
    }

    location ~ \.json$ {
        default_type application/json;
        try_files $uri =404;
    }
}
```

## Configuring a Network Mirror

```hcl
provider_installation {
  network_mirror {
    url     = "https://mirror.internal.example.com/"
    include = ["registry.opentofu.org/hashicorp/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/hashicorp/*"]
  }
}
```

## Syncing the Mirror

Create a script to keep the mirror updated:

```bash
#!/bin/bash
# sync-mirror.sh

MIRROR_DIR=/opt/tofu-mirror
CONFIGS=(
  /path/to/production
  /path/to/staging
  /path/to/development
)

for config in "${CONFIGS[@]}"; do
  echo "Syncing providers from $config..."
  tofu -chdir="$config" providers mirror "$MIRROR_DIR"
done

echo "Mirror sync complete."
```

## CI/CD Usage

In a CI/CD pipeline with a pre-populated mirror:

```yaml
- name: Configure provider mirror
  run: |
    cat > ~/.tofurc << 'EOF'
    provider_installation {
      filesystem_mirror {
        path    = "/ci/tofu-mirror"
        include = ["*/*/*"]
      }
    }
    EOF

- name: Initialize
  run: tofu init
```

## Verifying Mirror Usage

After `tofu init`, verify providers are coming from the mirror:

```text
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.40.0...
- Installed hashicorp/aws v5.40.0 (verified checksum)
```

With a packed filesystem mirror created by `tofu providers mirror`, output like `(verified checksum)` is expected. If direct downloads are excluded and `tofu init` succeeds, the mirror is being used.

## Best Practices

1. **Automate mirror syncing** via a scheduled job to keep it current
2. **Use `tofu providers lock`** to record official checksums, especially if the mirror will be used across multiple platforms
3. **Version-lock the mirror** - only include provider versions you have approved
4. **Use a network mirror** for shared CI/CD infrastructure to avoid disk space issues per runner
5. **Document your mirror configuration** so team members can set it up consistently

## Conclusion

The OpenTofu provider network mirror protocol is a powerful tool for controlling provider distribution in enterprise and air-gapped environments. Whether you use a filesystem mirror or a network mirror server, you gain consistency, speed, and compliance control over your provider installations.
