# How to Configure Provider Network Mirror in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Network Mirror, Registry, Infrastructure as Code, DevOps

Description: Learn how to configure and run a Terraform provider network mirror that serves provider packages over HTTPS for teams in private networks, corporate environments, and multi-region setups.

---

A Terraform provider network mirror is an HTTP(S) server that implements the Terraform Provider Network Mirror Protocol. When configured, Terraform fetches provider packages from your mirror instead of the public registry. This gives you control over which providers are available, reduces external network dependencies, and improves download performance for distributed teams.

This guide covers how to set up a network mirror, configure Terraform to use it, and maintain it over time.

## How the Network Mirror Protocol Works

The Terraform Provider Network Mirror Protocol is a simple HTTP API that serves provider metadata and package archives. When Terraform needs a provider, it makes these requests to the mirror:

1. `GET /{hostname}/{namespace}/{type}/index.json` - Lists available versions.
2. `GET /{hostname}/{namespace}/{type}/{version}.json` - Lists available platforms and download URLs for a specific version.
3. `GET /{download-path}` - Downloads the provider package zip file.

Example request flow for `hashicorp/aws` version 5.30.0:

```
GET /registry.terraform.io/hashicorp/aws/index.json
Response: {"versions": {"5.30.0": {}}}

GET /registry.terraform.io/hashicorp/aws/5.30.0.json
Response: {
  "archives": {
    "linux_amd64": {
      "url": "terraform-provider-aws_5.30.0_linux_amd64.zip",
      "hashes": ["zh:abc123..."]
    }
  }
}

GET /registry.terraform.io/hashicorp/aws/terraform-provider-aws_5.30.0_linux_amd64.zip
Response: (binary zip file)
```

## Setting Up a Network Mirror with Nginx

The simplest network mirror is a static file server. Generate the mirror content with `terraform providers mirror`, then serve it over HTTPS.

### Step 1: Generate Mirror Content

```bash
# On a machine with internet access
# Create a temporary Terraform project with all needed providers
mkdir /tmp/mirror-source && cd /tmp/mirror-source

cat > versions.tf <<'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
EOF

# Initialize to resolve versions
terraform init

# Mirror providers for target platforms
terraform providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_arm64 \
  /var/www/terraform-mirror
```

### Step 2: Configure Nginx

```nginx
# /etc/nginx/sites-available/terraform-mirror.conf
server {
    listen 443 ssl http2;
    server_name terraform-mirror.company.internal;

    ssl_certificate     /etc/ssl/certs/terraform-mirror.crt;
    ssl_certificate_key /etc/ssl/private/terraform-mirror.key;

    root /var/www/terraform-mirror;

    # Serve JSON with correct content type
    location ~ \.json$ {
        default_type application/json;
        add_header Cache-Control "public, max-age=3600";
    }

    # Serve zip files
    location ~ \.zip$ {
        default_type application/zip;
        add_header Cache-Control "public, max-age=86400";
    }

    # Enable directory listings for debugging
    autoindex on;
    autoindex_format json;

    # Access logging for audit
    access_log /var/log/nginx/terraform-mirror-access.log;

    # Health check
    location = /health {
        return 200 '{"status":"healthy"}\n';
        default_type application/json;
    }
}
```

```bash
# Enable the site and restart Nginx
sudo ln -s /etc/nginx/sites-available/terraform-mirror.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Configure Terraform Clients

```hcl
# ~/.terraformrc on each developer machine and CI/CD runner
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.company.internal/"
  }
}
```

## Running a Network Mirror in Docker

For a more portable setup, use Docker:

```dockerfile
# Dockerfile.mirror
FROM nginx:alpine

# Copy Nginx configuration
COPY nginx-mirror.conf /etc/nginx/conf.d/default.conf

# Copy mirrored providers
COPY mirror/ /usr/share/nginx/html/

# Health check
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -q -O /dev/null http://localhost/health || exit 1

EXPOSE 80
```

```nginx
# nginx-mirror.conf
server {
    listen 80;

    root /usr/share/nginx/html;

    location ~ \.json$ {
        default_type application/json;
    }

    location ~ \.zip$ {
        default_type application/zip;
    }

    autoindex on;

    location = /health {
        return 200 '{"status":"healthy"}\n';
        default_type application/json;
    }
}
```

```bash
# Build and run
docker build -t terraform-mirror -f Dockerfile.mirror .
docker run -d -p 8080:80 --name terraform-mirror terraform-mirror
```

For Kubernetes deployment:

```yaml
# k8s-mirror.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: terraform-mirror
  namespace: platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: terraform-mirror
  template:
    metadata:
      labels:
        app: terraform-mirror
    spec:
      containers:
        - name: nginx
          image: terraform-mirror:latest
          ports:
            - containerPort: 80
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 5
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: terraform-mirror
  namespace: platform
spec:
  selector:
    app: terraform-mirror
  ports:
    - port: 443
      targetPort: 80
  type: ClusterIP
```

## Selective Mirroring

You can mirror only specific providers or route different providers to different mirrors:

```hcl
# ~/.terraformrc - Selective mirror configuration
provider_installation {
  # Use the internal mirror for approved providers
  network_mirror {
    url     = "https://terraform-mirror.company.internal/"
    include = [
      "registry.terraform.io/hashicorp/*",
      "registry.terraform.io/DataDog/*",
      "registry.terraform.io/cloudflare/*"
    ]
  }

  # Fall back to direct download for everything else
  direct {
    exclude = [
      "registry.terraform.io/hashicorp/*",
      "registry.terraform.io/DataDog/*",
      "registry.terraform.io/cloudflare/*"
    ]
  }
}
```

This is useful when you want to control versions of critical providers but allow developers to use community providers directly.

## Automated Mirror Synchronization

Keep the mirror up to date with a synchronization pipeline:

```bash
#!/bin/bash
# sync-mirror.sh - Synchronize the network mirror with latest provider versions

set -euo pipefail

MIRROR_DIR="/var/www/terraform-mirror"
MANIFEST_DIR="/opt/terraform/manifests"
LOG_FILE="/var/log/terraform-mirror-sync.log"
PLATFORMS=(linux_amd64 linux_arm64 darwin_arm64)

exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== Mirror sync started at $(date) ==="

# Process each manifest file (one per team/project)
for manifest in "$MANIFEST_DIR"/*.tf; do
  echo "Processing: $manifest"

  # Create temp directory with the manifest
  TMPDIR=$(mktemp -d)
  cp "$manifest" "$TMPDIR/versions.tf"
  cd "$TMPDIR"

  # Initialize to resolve versions
  terraform init -backend=false

  # Mirror for each platform
  for platform in "${PLATFORMS[@]}"; do
    echo "  Mirroring for $platform..."
    terraform providers mirror -platform="$platform" "$MIRROR_DIR"
  done

  # Clean up
  rm -rf "$TMPDIR"
done

# Report mirror size
echo "Mirror size: $(du -sh "$MIRROR_DIR" | cut -f1)"
echo "Provider count: $(find "$MIRROR_DIR" -name "index.json" | wc -l)"
echo "=== Mirror sync completed at $(date) ==="
```

```yaml
# .github/workflows/sync-mirror.yml
name: Sync Terraform Mirror

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Sync Mirror
        run: ./scripts/sync-mirror.sh

      - name: Verify Mirror
        run: |
          # Test that the mirror serves providers correctly
          curl -sf "https://terraform-mirror.company.internal/health"

          # Verify a known provider is accessible
          curl -sf "https://terraform-mirror.company.internal/registry.terraform.io/hashicorp/aws/index.json" | \
            jq '.versions | keys[]'
```

## Monitoring the Mirror

Track mirror health and usage:

```bash
#!/bin/bash
# monitor-mirror.sh - Check mirror health

# Test that the mirror is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://terraform-mirror.company.internal/health")

if [ "$HTTP_CODE" != "200" ]; then
  echo "ALERT: Terraform mirror is down (HTTP $HTTP_CODE)"
  exit 1
fi

# Check that key providers are available
PROVIDERS=(
  "registry.terraform.io/hashicorp/aws/index.json"
  "registry.terraform.io/hashicorp/google/index.json"
  "registry.terraform.io/hashicorp/azurerm/index.json"
)

for provider in "${PROVIDERS[@]}"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://terraform-mirror.company.internal/$provider")
  if [ "$HTTP_CODE" != "200" ]; then
    echo "ALERT: Provider not available: $provider (HTTP $HTTP_CODE)"
  fi
done

echo "Mirror health check passed"
```

## TLS Configuration

For internal mirrors, you need proper TLS setup:

```hcl
# If using a self-signed certificate or internal CA
# Add the CA certificate to the system trust store

# On Linux:
# sudo cp company-ca.crt /usr/local/share/ca-certificates/
# sudo update-ca-certificates

# On macOS:
# sudo security add-trusted-cert -d -r trustRoot \
#   -k /Library/Keychains/System.keychain company-ca.crt

# Or configure Terraform to use the CA bundle
# Environment variable:
# SSL_CERT_FILE=/path/to/company-ca-bundle.crt
```

## Best Practices

1. **Use HTTPS for network mirrors.** Provider binaries should be transferred securely.
2. **Set up automated synchronization.** Stale mirrors block teams that need newer provider versions.
3. **Monitor mirror availability.** A down mirror blocks all Terraform operations.
4. **Include health checks** in your mirror deployment for load balancers and monitoring.
5. **Mirror for all platforms** your team uses. Forgetting a platform blocks those users.
6. **Use selective mirroring** if you only need to control specific providers.
7. **Cache aggressively.** Provider binaries are immutable - once published, they never change.
8. **Run multiple replicas** of the mirror server for high availability.
9. **Log access** for auditing which teams use which providers.

A well-maintained network mirror is critical infrastructure for organizations running Terraform at scale. It gives you control over your supply chain, improves reliability, and ensures your teams can work regardless of external service availability.
