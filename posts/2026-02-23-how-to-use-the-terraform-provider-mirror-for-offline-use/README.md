# How to Use the Terraform Provider Mirror for Offline Use

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Mirror, Offline, Air-Gapped, Infrastructure as Code, DevOps

Description: Learn how to set up and use Terraform provider mirrors for offline, air-gapped, and restricted network environments where direct access to the public registry is not available.

---

Not every environment has unrestricted internet access. Air-gapped data centers, regulated industries, corporate networks with strict egress rules, and disaster recovery scenarios all need Terraform to work without reaching the public registry at registry.terraform.io. Provider mirrors solve this by hosting provider binaries locally, on a private network, or on an internal server.

This guide covers both filesystem mirrors and network mirrors, with step-by-step instructions for setting up offline Terraform in various environments.

## Why You Need a Provider Mirror

Terraform downloads provider plugins from registry.terraform.io during `terraform init`. If that registry is unreachable, initialization fails and you cannot do anything. Common scenarios where this is a problem:

- **Air-gapped environments.** Production networks with no internet access for security compliance.
- **Corporate firewalls.** Egress rules that block access to external registries.
- **CI/CD runners in private networks.** Build agents that run in VPCs without NAT gateways.
- **Disaster recovery.** If the public registry goes down, your pipelines stop working.
- **Bandwidth optimization.** Downloading large providers (the AWS provider is over 300 MB) repeatedly wastes bandwidth.

## How Terraform Resolves Providers

By default, Terraform uses this resolution order:

1. Check the local filesystem cache in `.terraform/providers`.
2. Download from the configured mirror (if any).
3. Download from the public registry.

You can override this behavior with the Terraform CLI configuration to use only a mirror.

## Setting Up a Filesystem Mirror

A filesystem mirror is a directory that contains provider binaries organized in a specific directory structure. It is the simplest mirror type and works well for air-gapped environments.

### Step 1: Download Providers

On a machine with internet access, use `terraform providers mirror` to download all required providers:

```bash
# Download providers to a local directory
terraform providers mirror /path/to/mirror

# Download for specific platforms
terraform providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  /path/to/mirror
```

This creates a directory structure like:

```
/path/to/mirror/
  registry.terraform.io/
    hashicorp/
      aws/
        terraform-provider-aws_5.30.0_linux_amd64.zip
        terraform-provider-aws_5.30.0_linux_arm64.zip
        index.json
        5.30.0.json
      random/
        terraform-provider-random_3.6.0_linux_amd64.zip
        terraform-provider-random_3.6.0_linux_arm64.zip
        index.json
        3.6.0.json
```

### Step 2: Transfer to Air-Gapped Environment

Copy the mirror directory to your air-gapped environment:

```bash
# Create a tarball for transfer
tar -czf terraform-providers.tar.gz -C /path/to mirror/

# Transfer via approved method (USB, secure file transfer, etc.)
scp terraform-providers.tar.gz airgapped-host:/opt/terraform/

# Extract on the air-gapped host
ssh airgapped-host
tar -xzf /opt/terraform/terraform-providers.tar.gz -C /opt/terraform/providers/
```

### Step 3: Configure Terraform to Use the Mirror

Create or edit the CLI configuration file:

```hcl
# ~/.terraformrc (Linux/Mac) or %APPDATA%/terraform.rc (Windows)
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }

  # Optionally fall back to direct download for non-mirrored providers
  # Remove this block for fully air-gapped environments
  direct {
    exclude = ["registry.terraform.io/*/*"]
  }
}
```

For a fully air-gapped environment where no network access should be attempted:

```hcl
# ~/.terraformrc - Air-gapped configuration
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["*/*/*"]
  }

  # No direct block - Terraform will not try to download anything
}
```

### Step 4: Verify

```bash
# Initialize Terraform using the mirror
terraform init

# You should see providers being installed from the local mirror
# Initializing provider plugins...
# - Finding hashicorp/aws versions matching "~> 5.0"...
# - Installing hashicorp/aws v5.30.0...
# - Installed hashicorp/aws v5.30.0 (from filesystem mirror)
```

## Setting Up a Network Mirror

A network mirror serves providers over HTTP/HTTPS. This is better for environments where multiple machines need access to providers but cannot reach the public registry.

### Nginx-Based Network Mirror

Set up an Nginx server to serve the mirrored providers:

```bash
# Step 1: Download providers to the web server directory
terraform providers mirror /var/www/terraform-mirror

# Step 2: Configure Nginx
```

```nginx
# /etc/nginx/sites-available/terraform-mirror
server {
    listen 443 ssl;
    server_name terraform-mirror.internal.company.com;

    ssl_certificate     /etc/ssl/certs/terraform-mirror.crt;
    ssl_certificate_key /etc/ssl/private/terraform-mirror.key;

    root /var/www/terraform-mirror;

    # Serve provider packages and metadata
    location / {
        autoindex on;
        types {
            application/json json;
            application/zip  zip;
        }
    }

    # Health check endpoint
    location /health {
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

```hcl
# ~/.terraformrc - Network mirror configuration
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.internal.company.com/"
  }
}
```

### S3-Based Network Mirror

Use an S3 bucket as a network mirror with a CloudFront distribution:

```hcl
# mirror-infra.tf - S3 bucket for provider mirror
resource "aws_s3_bucket" "terraform_mirror" {
  bucket = "company-terraform-mirror"
}

resource "aws_s3_bucket_policy" "terraform_mirror" {
  bucket = aws_s3_bucket.terraform_mirror.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowInternalAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.terraform_mirror.arn}/*"
      }
    ]
  })
}

# Optional: CloudFront for better performance
resource "aws_cloudfront_distribution" "terraform_mirror" {
  origin {
    domain_name = aws_s3_bucket.terraform_mirror.bucket_regional_domain_name
    origin_id   = "S3Mirror"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.mirror.cloudfront_access_identity_path
    }
  }

  enabled = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Mirror"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
  }
}
```

## Automating Mirror Updates

Create a script that periodically updates the mirror with new provider versions:

```bash
#!/bin/bash
# update-mirror.sh - Update the provider mirror with latest versions

set -euo pipefail

MIRROR_DIR="/opt/terraform/providers"
PROJECTS_DIR="/opt/terraform/projects"
PLATFORMS="linux_amd64,linux_arm64,darwin_arm64"

echo "Updating Terraform provider mirror..."
echo "Mirror directory: $MIRROR_DIR"
echo "Timestamp: $(date)"

# Find all Terraform projects that define provider requirements
for project in $(find "$PROJECTS_DIR" -name "versions.tf" -exec dirname {} \;); do
  echo "Processing: $project"
  cd "$project"

  # Download providers for all platforms
  for platform in ${PLATFORMS//,/ }; do
    terraform providers mirror -platform="$platform" "$MIRROR_DIR"
  done

  cd -
done

# If using S3, sync the mirror
if [ -n "${S3_MIRROR_BUCKET:-}" ]; then
  echo "Syncing to S3..."
  aws s3 sync "$MIRROR_DIR" "s3://$S3_MIRROR_BUCKET/" \
    --delete \
    --no-progress
fi

echo "Mirror update complete"

# Report what is in the mirror
echo ""
echo "Mirror contents:"
find "$MIRROR_DIR" -name "*.zip" | while read -r file; do
  basename "$file"
done | sort
```

Schedule it with cron:

```bash
# Update mirror weekly
0 2 * * 0 /opt/terraform/scripts/update-mirror.sh >> /var/log/terraform-mirror.log 2>&1
```

## CI/CD Pipeline Configuration

Configure CI/CD runners to use the mirror:

```yaml
# .github/workflows/terraform.yml
jobs:
  plan:
    runs-on: self-hosted  # Assumes internal runner
    env:
      TF_CLI_CONFIG_FILE: /etc/terraform/terraformrc
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Init (using internal mirror)
        run: terraform init

      - name: Terraform Plan
        run: terraform plan
```

```hcl
# /etc/terraform/terraformrc on the CI/CD runner
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["*/*/*"]
  }
}
```

## Docker Image with Embedded Providers

For containerized CI/CD, bake providers into the Docker image:

```dockerfile
# Dockerfile - Terraform with embedded providers
FROM hashicorp/terraform:1.7.0 AS base

# Copy the mirror into the image
COPY providers/ /opt/terraform/providers/

# Configure Terraform to use the embedded mirror
RUN cat > /root/.terraformrc <<EOF
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["*/*/*"]
  }
}
EOF

WORKDIR /workspace
ENTRYPOINT ["terraform"]
```

Build and use:

```bash
# Build the image on a machine with internet access
mkdir providers
terraform providers mirror -platform=linux_amd64 providers/

docker build -t terraform-offline:1.7.0 .

# Use in air-gapped environment
docker run -v $(pwd):/workspace terraform-offline:1.7.0 init
docker run -v $(pwd):/workspace terraform-offline:1.7.0 plan
```

## Verifying Mirror Integrity

Ensure the mirror contains valid, untampered providers:

```bash
#!/bin/bash
# verify-mirror.sh - Verify the integrity of mirrored providers

set -euo pipefail

MIRROR_DIR="/opt/terraform/providers"

echo "Verifying mirror integrity..."

# Check that all zip files are valid
find "$MIRROR_DIR" -name "*.zip" | while read -r zipfile; do
  if ! unzip -t "$zipfile" > /dev/null 2>&1; then
    echo "CORRUPT: $zipfile"
  else
    echo "OK: $(basename "$zipfile")"
  fi
done

# Check that index.json files are valid JSON
find "$MIRROR_DIR" -name "index.json" -o -name "*.json" | while read -r jsonfile; do
  if ! jq empty "$jsonfile" 2>/dev/null; then
    echo "INVALID JSON: $jsonfile"
  fi
done

echo "Verification complete"
```

## Best Practices

1. **Use filesystem mirrors for air-gapped environments.** They require no network access at all.
2. **Use network mirrors for private network environments.** They serve multiple machines and are easier to update.
3. **Download providers for all target platforms** your team uses (dev machines and CI/CD runners).
4. **Automate mirror updates** with a scheduled job so new provider versions are available when needed.
5. **Verify mirror integrity** after transfer to air-gapped environments.
6. **Include the mirror setup in your disaster recovery plan.** If the public registry is down, your mirror keeps you running.
7. **Document the mirror location and configuration** so team members know how to set up their CLI config.
8. **Version your mirror contents** or keep a changelog so you know what providers are available.

Provider mirrors are essential infrastructure for any organization running Terraform in restricted network environments. Set them up early, automate the updates, and they will quietly keep your Terraform workflows running regardless of external dependencies.
