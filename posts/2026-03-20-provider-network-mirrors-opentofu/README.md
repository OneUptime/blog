# How to Use Provider Network Mirrors in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Network Mirror, Provider Distribution, Enterprise, Infrastructure

Description: Learn how to set up and use provider network mirrors in OpenTofu to serve provider downloads from an internal HTTP server, enabling centralized provider management across your organization.

## Introduction

A network mirror is an HTTPS server that serves provider plugin archives in the format OpenTofu expects. Unlike a filesystem mirror (a local directory), a network mirror can be shared across an entire organization - every developer and CI/CD system downloads providers from the same internal server without needing internet access or local copies.

## Network Mirror Protocol

OpenTofu expects a network mirror to serve specific JSON responses and binary files at predictable URLs relative to the mirror base URL:

```text
# Available versions index

GET /<hostname>/<namespace>/<type>/index.json

# Version metadata
GET /<hostname>/<namespace>/<type>/<version>.json

# Provider zip file (URL returned in the version metadata)
GET /<hostname>/<namespace>/<type>/terraform-provider-<type>_<version>_<os>_<arch>.zip
```

## Setting Up nginx as a Network Mirror

```bash
# Step 1: Create the mirror directory
sudo mkdir -p /var/www/opentofu-mirror

# Step 2: From a directory containing the providers you want to mirror, populate the mirror
tofu providers mirror /var/www/opentofu-mirror/

# Step 3: Configure nginx
```

```nginx
# /etc/nginx/sites-enabled/opentofu-mirror
server {
    listen 443 ssl http2;
    server_name tofu-mirror.internal.company.com;

    ssl_certificate     /etc/ssl/certs/mirror.crt;
    ssl_certificate_key /etc/ssl/private/mirror.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    root /var/www/opentofu-mirror;

    # CORS headers for browser-based tools
    add_header Access-Control-Allow-Origin "*";

    # JSON metadata files
    location ~* \.json$ {
        add_header Content-Type "application/json; charset=utf-8";
        add_header Cache-Control "public, max-age=3600";
        try_files $uri =404;
    }

    # Provider zip files - large files, cache aggressively
    location ~* \.zip$ {
        add_header Content-Type "application/zip";
        add_header Cache-Control "public, max-age=86400";
        try_files $uri =404;
    }

    # Access log for auditing provider downloads
    access_log /var/log/nginx/opentofu-mirror.log combined;
}
```

## Configuring OpenTofu to Use the Network Mirror

```hcl
# ~/.tofurc, ~/.terraformrc (compatibility), or a custom *.tfrc file

provider_installation {
  network_mirror {
    url = "https://tofu-mirror.internal.company.com/"
    # Include pattern controls which providers use this mirror
    include = ["registry.opentofu.org/*/*"]
  }

  # Fallback for providers not in the mirror (optional)
  # direct {
  #   exclude = ["registry.opentofu.org/hashicorp/*"]
  # }
}
```

```bash
# Test the configuration
export TF_CLI_CONFIG_FILE=/etc/opentofu/mirror.tfrc
tofu init  # Should download from internal mirror
```

## Automating Mirror Updates

```bash
#!/bin/bash
# update-network-mirror.sh

set -euo pipefail

MIRROR_DIR="/var/www/opentofu-mirror"
LOCK_FILE="/var/run/opentofu-mirror-update.lock"
LOG_FILE="/var/log/opentofu-mirror-update.log"

# Prevent concurrent updates
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Mirror update already running" | tee -a "$LOG_FILE"
  exit 1
fi

echo "$(date): Starting mirror update" | tee -a "$LOG_FILE"

WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Your provider requirements
cat > "$WORK_DIR/versions.tf" << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.10"
    }
    vault = {
      source  = "hashicorp/vault"
      version = ">= 3.20"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}
EOF

cd "$WORK_DIR"
tofu init -backend=false 2>&1 | tee -a "$LOG_FILE"

# Update mirror for all supported platforms
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64 \
  "$MIRROR_DIR/" 2>&1 | tee -a "$LOG_FILE"

echo "$(date): Mirror update complete" | tee -a "$LOG_FILE"

# Reload nginx to clear any caches
nginx -s reload 2>/dev/null || true
```

```bash
# Schedule weekly updates
echo "0 3 * * 0 /opt/scripts/update-network-mirror.sh" | sudo crontab -u opentofu -
```

## Provider Download Audit Logging

```nginx
# Extended log format for security auditing
log_format provider_audit '$remote_addr - $remote_user [$time_local] '
                          '"$request" $status $body_bytes_sent '
                          '"$http_referer" "$http_user_agent" '
                          '$request_time';

server {
    # ...
    access_log /var/log/nginx/provider-audit.log provider_audit;
}
```

```bash
# Analyze which providers are being downloaded
awk '{print $7}' /var/log/nginx/opentofu-mirror.log | \
  grep '\.zip$' | \
  sort | uniq -c | sort -rn | head -20
```

## Mirror with Authentication

```nginx
# Restrict mirror access to internal networks only
server {
    # ...
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;
}
```

```hcl
# If the mirror requires authentication for metadata requests
credentials "tofu-mirror.internal.company.com" {
  token = "replace-with-your-token"
}

provider_installation {
  network_mirror {
    url = "https://tofu-mirror.internal.company.com/"
  }
}

# Note: OpenTofu sends credentials to mirror metadata endpoints,
# but not to archive URLs returned by the mirror
```

## Monitoring Mirror Health

```bash
# Health check script
#!/bin/bash
MIRROR_URL="https://tofu-mirror.internal.company.com"

# Check AWS provider index
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${MIRROR_URL}/registry.opentofu.org/hashicorp/aws/index.json")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Mirror is healthy (AWS provider index: $HTTP_STATUS)"
else
  echo "Mirror health check FAILED (status: $HTTP_STATUS)"
  exit 1
fi
```

## Conclusion

A network mirror is the recommended approach for enterprise OpenTofu deployments. It centralizes provider distribution on an internal nginx server populated by `tofu providers mirror`, requires no per-machine configuration beyond the OpenTofu CLI configuration file, and provides a single point for audit logging and version control. Update the mirror on a schedule to keep providers current, and use IP-based access controls to restrict access to internal networks.
