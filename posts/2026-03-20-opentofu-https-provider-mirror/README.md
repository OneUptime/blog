# Setting Up an HTTPS Provider Mirror in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Mirror, HTTPS

Description: Learn how to set up a network provider mirror served over HTTPS for centralized provider distribution across your organization.

An HTTPS network mirror serves provider packages over HTTPS, allowing all workstations and CI/CD systems in your organization to install providers from a central location. This is ideal for large teams, controlled environments, and organizations with strict security requirements.

## HTTPS Mirror vs Filesystem Mirror

| Feature | Filesystem Mirror | HTTPS Mirror |
|---------|-------------------|--------------|
| Location | Local disk | Remote server |
| Access | Single machine | All machines |
| Updates | Manual copy | Centralized |
| Use case | Air-gap, single dev | Organization-wide |
| Protocol | File paths | HTTP/HTTPS |

## HTTPS Mirror Protocol

The mirror must serve a specific JSON-based protocol. The URL structure is:

```text
https://mirror.example.com/{hostname}/{namespace}/{type}/index.json
https://mirror.example.com/{hostname}/{namespace}/{type}/{version}.json
https://mirror.example.com/{hostname}/{namespace}/{type}/{filename}
```

## Configuring OpenTofu to Use an HTTPS Mirror

```hcl
# ~/.tofurc

provider_installation {
  network_mirror {
    url     = "https://mirror.example.com/providers/"
    include = ["registry.opentofu.org/hashicorp/*"]
  }

  # Fall through to direct for other providers
  direct {
    exclude = ["registry.opentofu.org/hashicorp/*"]
  }
}
```

## Setting Up an HTTPS Mirror with Nginx

```nginx
# /etc/nginx/sites-available/terraform-mirror
server {
  listen 443 ssl;
  server_name mirror.example.com;

  ssl_certificate     /etc/ssl/certs/mirror.crt;
  ssl_certificate_key /etc/ssl/private/mirror.key;

  root /opt/terraform-mirror;
  
  location / {
    autoindex on;
    try_files $uri $uri/ =404;
    
    # Required: serve JSON with correct content type
    types {
      application/json json;
      application/zip  zip;
    }
    
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=86400";
  }
}
```

## Populating an HTTPS Mirror

```bash
# Create the mirror on your server
mkdir -p /opt/terraform-mirror

# Use a machine with internet access to populate it
tofu providers mirror /opt/terraform-mirror

# For multiple providers and versions
cat > /tmp/mirror-setup/versions.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30, < 5.40"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}
EOF

cd /tmp/mirror-setup
tofu init
tofu providers mirror /opt/terraform-mirror
```

## Mirror with Bearer Token Authentication

```hcl
# ~/.tofurc
credentials "mirror.example.com" {
  token = "your-mirror-api-token"
}

provider_installation {
  network_mirror {
    url     = "https://mirror.example.com/providers/"
    include = ["registry.opentofu.org/*/*"]
  }
}
```

## Using S3 as a Provider Mirror Backend

```bash
# Sync local mirror to S3
aws s3 sync /opt/terraform-mirror s3://my-company-terraform-mirror/providers/

# Set up CloudFront in front of S3 for HTTPS distribution
# Then point OpenTofu to the CloudFront URL
```

```hcl
# ~/.tofurc - using CloudFront-served S3 mirror
provider_installation {
  network_mirror {
    url = "https://d1234abcd.cloudfront.net/providers/"
  }
}
```

## Automating Mirror Updates

```bash
#!/bin/bash
# update-mirror.sh - run periodically to update providers

set -euo pipefail

MIRROR_DIR="/opt/terraform-mirror"
WORKSPACE="/tmp/mirror-workspace"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

# Create versions.tf with all providers to mirror
cat > versions.tf << 'TOFU_EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
TOFU_EOF

tofu init -upgrade
tofu providers mirror "$MIRROR_DIR"

echo "Mirror updated at $(date)"
# Optionally sync to remote storage
# aws s3 sync "$MIRROR_DIR" s3://terraform-providers/
```

## Verifying Mirror Access

```bash
# Test that the mirror is accessible
curl https://mirror.example.com/providers/registry.opentofu.org/hashicorp/aws/index.json

# Expected response:
{
  "versions": {
    "5.38.0": {},
    "5.37.0": {}
  }
}

# Test tofu init uses the mirror
tofu init
# Should show: Using network mirror at https://mirror.example.com/providers/
```

## Conclusion

An HTTPS network mirror provides centralized provider distribution for your entire organization. It reduces external internet dependencies, enables fine-grained control over available provider versions, and can dramatically speed up `tofu init` in CI/CD environments. Use it in conjunction with lock files for maximum reproducibility and security.
