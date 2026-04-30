# How to Set Up an Internal Registry for OpenTofu Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module Registry, Internal Registry, Enterprise, Self-Hosted

Description: Learn how to set up an internal module registry for OpenTofu to publish and consume modules within your organization, enabling module sharing without public internet access.

## Introduction

An internal module registry lets teams publish reusable OpenTofu modules, enforce versioning, and consume them with the familiar `source = "registry.example.com/namespace/module/provider"` syntax. OpenTofu uses the same Module Registry Protocol as Terraform, so any compliant implementation works.

## Module Registry Protocol

```text
# Service discovery

GET /.well-known/terraform.json

# List available versions for a module
GET /v1/modules/<namespace>/<module>/<provider>/versions

# Get download URL for a specific version
GET /v1/modules/<namespace>/<module>/<provider>/<version>/download
```

## GitLab Module Registry (Easiest Option)

GitLab has built-in Terraform module registry support:

```bash
# Package a module
# Create the module archive
cd my-vpc-module/
tar -czf terraform-my-vpc-module.tgz .

# Upload to GitLab
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     --upload-file terraform-my-vpc-module.tgz \
     "https://gitlab.company.com/api/v4/projects/$PROJECT_ID/packages/terraform/modules/vpc/aws/1.0.0/file"
```

```hcl
# Reference from GitLab registry
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "vpc" {
  source  = "gitlab.company.com/infrastructure/vpc/aws"
  version = "~> 1.0"

  name = "production"
  cidr = "10.0.0.0/16"
}
```

```hcl
# ~/.tofurc - authenticate with GitLab
# Or set TF_TOKEN_gitlab_company_com instead:
credentials "gitlab.company.com" {
  token = "your-gitlab-personal-access-token"
}
```

## Self-Hosted Registry with nginx

```bash
# Service discovery
mkdir -p "/var/www/registry/.well-known"

cat > /var/www/registry/.well-known/terraform.json << 'EOF'
{
  "modules.v1": "/v1/modules/"
}
EOF

# Module versions endpoint
mkdir -p "/var/www/registry/v1/modules/mycompany/vpc/aws"

cat > "/var/www/registry/v1/modules/mycompany/vpc/aws/versions" << 'EOF'
{
  "modules": [
    {
      "source": "registry.internal.company.com/mycompany/vpc/aws",
      "versions": [
        {"version": "1.0.0"},
        {"version": "1.1.0"},
        {"version": "2.0.0"}
      ]
    }
  ]
}
EOF

# Download endpoint is handled by the backend in the nginx config below.
# It can return either HTTP 200 with {"location": "..."} or
# HTTP 204 with an X-Terraform-Get header.
```

```nginx
# /etc/nginx/sites-enabled/module-registry
server {
    listen 443 ssl;
    http2 on;
    server_name registry.internal.company.com;

    ssl_certificate     /etc/ssl/certs/registry.crt;
    ssl_certificate_key /etc/ssl/private/registry.key;

    # Service discovery
    location /.well-known/ {
        root /var/www/registry;
        default_type application/json;
        try_files $uri =404;
    }

    # Module versions - static JSON files
    location ~* ^/v1/modules/([^/]+)/([^/]+)/([^/]+)/versions$ {
        root /var/www/registry;
        default_type application/json;
        try_files $uri =404;
    }

    # Download redirect - handled by backend
    location ~* ^/v1/modules/([^/]+)/([^/]+)/([^/]+)/([^/]+)/download$ {
        proxy_pass http://localhost:8080;
        proxy_set_header X-Module-Namespace $1;
        proxy_set_header X-Module-Name $2;
        proxy_set_header X-Module-Provider $3;
        proxy_set_header X-Module-Version $4;
    }
}
```

## Simple Registry Backend

```python
#!/usr/bin/env python3
# registry_backend.py - Handles download redirects

from flask import Flask, Response
import os

app = Flask(__name__)

STORAGE_BASE = "https://storage.internal.company.com/opentofu-modules"

@app.route('/v1/modules/<namespace>/<module>/<provider>/<version>/download')
def download(namespace, module, provider, version):
    # Construct the download URL
    filename = f"{module}-{version}.tgz"
    download_url = f"{STORAGE_BASE}/{namespace}/{module}/{provider}/{version}/{filename}"

    # Return one valid protocol response: 204 with X-Terraform-Get header
    resp = Response(status=204)
    resp.headers['X-Terraform-Get'] = download_url
    return resp

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080)
```

## Publishing Modules to the Registry

```bash
#!/bin/bash
# scripts/publish-module.sh

set -euo pipefail

MODULE_NAME="${1}"
MODULE_VERSION="${2}"
NAMESPACE="mycompany"
PROVIDER="aws"
STORAGE_BUCKET="s3://company-opentofu-modules"
REGISTRY_DIR="/var/www/registry/v1/modules"

# Validate semantic version
if ! [[ "$MODULE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be X.Y.Z format"
  exit 1
fi

# Create module archive
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

tar -czf "$TMPDIR/${MODULE_NAME}-${MODULE_VERSION}.tgz" \
  --exclude='.terraform' \
  --exclude='*.tfstate' \
  .

# Upload to storage
aws s3 cp "$TMPDIR/${MODULE_NAME}-${MODULE_VERSION}.tgz" \
  "$STORAGE_BUCKET/${NAMESPACE}/${MODULE_NAME}/${PROVIDER}/${MODULE_VERSION}/"

# Update versions JSON
VERSIONS_FILE="$REGISTRY_DIR/$NAMESPACE/$MODULE_NAME/$PROVIDER/versions"
if [ -f "$VERSIONS_FILE" ]; then
  # Add new version using jq
  jq --arg ver "$MODULE_VERSION" \
    '.modules[0].versions += [{"version": $ver}]' \
    "$VERSIONS_FILE" > "${VERSIONS_FILE}.tmp" && \
    mv "${VERSIONS_FILE}.tmp" "$VERSIONS_FILE"
else
  mkdir -p "$(dirname "$VERSIONS_FILE")"
  cat > "$VERSIONS_FILE" << EOF
{
  "modules": [
    {
      "source": "registry.internal.company.com/$NAMESPACE/$MODULE_NAME/$PROVIDER",
      "versions": [{"version": "$MODULE_VERSION"}]
    }
  ]
}
EOF
fi

echo "Published $NAMESPACE/$MODULE_NAME/$PROVIDER v$MODULE_VERSION"
```

## CI/CD Pipeline for Module Publishing

```yaml
# .github/workflows/publish-module.yml
name: Publish Module

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Validate module
        run: |
          tofu init -backend=false
          tofu validate

      - name: Publish to registry
        run: |
          ./scripts/publish-module.sh ${{ github.event.repository.name }} ${{ steps.version.outputs.version }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Conclusion

For most organizations, GitLab's built-in Terraform module registry provides the simplest path to an internal module registry - upload a `.tgz` archive via the Packages API and it becomes available via the familiar registry source syntax. For organizations without GitLab, implementing the Module Registry Protocol requires a service discovery endpoint, a versions endpoint returning JSON, and a download endpoint that returns either JSON containing a `location` value or HTTP 204 with an `X-Terraform-Get` header pointing to the actual module archive URL.
