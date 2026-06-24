# How to Set Up an Internal Registry for OpenTofu Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Internal Registry, Provider Distribution, Enterprise, Self-Hosted

Description: Learn how to set up an internal provider registry for OpenTofu that serves custom or mirrored providers to your organization using the Terraform Registry Protocol.

## Introduction

An internal OpenTofu provider registry is for distributing providers under your own hostname, such as internally-developed providers. If you need to mirror public providers for air-gapped environments, use a provider mirror rather than an origin registry. The provider registry protocol that OpenTofu uses defines the HTTP API that the registry must implement. This guide covers implementing a compliant registry and hosting custom providers.

## Registry Protocol Overview

```text
# Service discovery

GET /.well-known/terraform.json

# List provider versions
GET /v1/providers/<namespace>/<type>/versions

# Download metadata for a specific version/platform
GET /v1/providers/<namespace>/<type>/<version>/download/<os>/<arch>
```

## Implementing a Minimal Registry with nginx + Static Files

```bash
# Create registry structure
mkdir -p /var/www/registry/.well-known /var/www/registry/files /var/www/registry/v1/providers/mycompany/

# Create the service discovery file
cat > /var/www/registry/.well-known/terraform.json << 'EOF'
{
  "providers.v1": "/v1/providers/"
}
EOF
```

```bash
# Create provider version index
mkdir -p /var/www/registry/v1/providers/mycompany/myapp

cat > /var/www/registry/v1/providers/mycompany/myapp/versions << 'EOF'
{
  "versions": [
    {
      "version": "1.0.0",
      "protocols": ["5.0"],
      "platforms": [
        {"os": "darwin", "arch": "amd64"},
        {"os": "linux", "arch": "amd64"},
        {"os": "linux", "arch": "arm64"},
        {"os": "darwin", "arch": "arm64"},
        {"os": "windows", "arch": "amd64"},
        {"os": "windows", "arch": "arm64"}
      ]
    }
  ]
}
EOF
```

```bash
# Create download endpoint for each platform
mkdir -p /var/www/registry/v1/providers/mycompany/myapp/1.0.0/download/linux

cat > /var/www/registry/v1/providers/mycompany/myapp/1.0.0/download/linux/amd64 << 'EOF'
{
  "protocols": ["5.0"],
  "os": "linux",
  "arch": "amd64",
  "filename": "terraform-provider-myapp_1.0.0_linux_amd64.zip",
  "download_url": "https://registry.internal.company.com/files/terraform-provider-myapp_1.0.0_linux_amd64.zip",
  "shasums_url": "https://registry.internal.company.com/files/terraform-provider-myapp_1.0.0_SHA256SUMS",
  "shasums_signature_url": "https://registry.internal.company.com/files/terraform-provider-myapp_1.0.0_SHA256SUMS.sig",
  "shasum": "5f9c7aa76b7c34d722fc9123208e26b22d60440cb47150dd04733b9b94f4541a",
  "signing_keys": {
    "gpg_public_keys": [
      {
        "key_id": "MYCOMPANY_KEY_ID",
        "ascii_armor": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n..."
      }
    ]
  }
}
EOF
```

## nginx Configuration

```nginx
# /etc/nginx/sites-enabled/opentofu-registry
server {
    listen 443 ssl http2;
    server_name registry.internal.company.com;

    ssl_certificate     /etc/ssl/certs/registry.crt;
    ssl_certificate_key /etc/ssl/private/registry.key;

    root /var/www/registry;

    # Service discovery
    location = /.well-known/terraform.json {
        default_type application/json;
        try_files $uri =404;
    }

    # Provider API - serve static JSON files without extensions
    location ^~ /v1/providers/ {
        default_type application/json;
        try_files $uri =404;
    }

    # Provider package and checksum files
    location /files/ {
        root /var/www/registry;
        try_files $uri =404;
    }

    # CORS for tooling
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET";
}
```

## Building a Custom Provider for Internal Registry

```go
// main.go - Minimal provider structure
package main

import (
    "github.com/hashicorp/terraform-plugin-sdk/v2/plugin"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

func main() {
    plugin.Serve(&plugin.ServeOpts{
        ProviderFunc: Provider,
    })
}

func Provider() *schema.Provider {
    return &schema.Provider{
        Schema: map[string]*schema.Schema{
            "api_url": {
                Type:     schema.TypeString,
                Required: true,
            },
        },
        ResourcesMap: map[string]*schema.Resource{},
    }
}
```

```makefile
# Makefile for building and publishing provider

VERSION ?= 1.0.0
BINARY = terraform-provider-myapp

build-all:
	mkdir -p dist
	for OS in linux darwin windows; do \
		for ARCH in amd64 arm64; do \
			OUTPUT="$(BINARY)_v$(VERSION)"; \
			if [ "$$OS" = "windows" ]; then OUTPUT="$$OUTPUT.exe"; fi; \
			GOOS=$$OS GOARCH=$$ARCH go build -o dist/$$OUTPUT .; \
			cd dist && zip $(BINARY)_$(VERSION)_$${OS}_$${ARCH}.zip $$OUTPUT; \
			cd ..; \
		done; \
	done

publish: build-all
	# Generate SHA256SUMS
	cd dist && shasum -a 256 *.zip > $(BINARY)_$(VERSION)_SHA256SUMS
	# Sign the checksums
	cd dist && gpg --detach-sign $(BINARY)_$(VERSION)_SHA256SUMS
	# Copy to registry files directory
	mkdir -p /var/www/registry/files/
	cp dist/*.zip dist/*.SHA256SUMS dist/*.sig /var/www/registry/files/
	# Update version metadata (automated in production)
	./scripts/update-registry-metadata.sh $(VERSION)
```

## Using GitLab's OCI Registry as a Provider Mirror

```yaml
# GitLab 18.4+ can publish OpenTofu providers to its OCI registry
build:provider:
  stage: build
  script:
    - make build-all
  artifacts:
    paths:
      - dist/*.zip

include:
  - component: $CI_SERVER_FQDN/components/opentofu/provider-release@<VERSION>
    inputs:
      provider_namespace: mycompany
      provider_name: terraform-provider-myapp
      provider_version: 1.0.0
      provider_artifacts_dir: dist/
```

```hcl
# ~/.tofurc or a custom *.tfrc file referenced via TF_CLI_CONFIG_FILE
provider_installation {
  oci_mirror {
    repository_template = "registry.gitlab.company.com/<path-to-project>/terraform-provider-myapp"
    include             = ["opentofu-providers.gitlab.company.com/mycompany/myapp"]
  }

  direct {
    exclude = ["opentofu-providers.gitlab.company.com/mycompany/myapp"]
  }
}
```

```hcl
# In your OpenTofu configuration
terraform {
  required_providers {
    myapp = {
      source  = "opentofu-providers.gitlab.company.com/mycompany/myapp"
      version = "~> 1.0"
    }
  }
}
```

## Using the Internal Registry

```hcl
# In your OpenTofu configuration
terraform {
  required_providers {
    myapp = {
      source  = "registry.internal.company.com/mycompany/myapp"
      version = "~> 1.0"
    }
  }
}

provider "myapp" {
  api_url = "https://app.internal.company.com/api"
}
```

```hcl
# ~/.tofurc - Configure the registry
credentials "registry.internal.company.com" {
  token = "your-registry-token"
}
```

## Conclusion

An internal OpenTofu provider registry requires implementing the provider registry protocol's HTTP API: a service discovery endpoint and version/download endpoints for each provider. The simplest implementation uses nginx serving static JSON files, updated by scripts when new provider versions are published. For mirrored upstream providers, prefer OpenTofu's mirror installation methods such as network or OCI mirrors; GitLab's OCI registry is a managed alternative for that workflow.
