# How the OpenTofu Module Registry Protocol Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module Registry, Protocol, Internal, Infrastructure as Code

Description: Learn how the OpenTofu module registry protocol works - how modules are discovered, downloaded, and versioned, and how to run your own private module registry.

## Introduction

When you specify `source = "terraform-aws-modules/vpc/aws"`, OpenTofu performs a series of HTTP requests to the registry to discover and download the module. Understanding this protocol helps you set up private registries, debug download failures, and optimize module caching.

## Module Source Address Format

```text
[<HOSTNAME>/]<NAMESPACE>/<MODULE_NAME>/<PROVIDER>

Examples:
  terraform-aws-modules/vpc/aws                    # From registry.opentofu.org
  registry.opentofu.org/terraform-aws-modules/vpc/aws  # Explicit registry
  app.terraform.io/my-org/vpc/aws                  # Private registry
  git::https://github.com/my-org/vpc.git           # Git (not registry protocol)
  ./modules/vpc                                    # Local (not registry protocol)
```

## Registry Discovery (Service Discovery)

Before downloading modules, OpenTofu discovers the registry's API endpoints:

```bash
# Step 1: Fetch .well-known/terraform.json from the registry host

curl -s https://registry.opentofu.org/.well-known/terraform.json | jq .

# Response:
{
  "modules.v1": "/v1/modules/",
  "providers.v1": "/v1/providers/"
}
```

## Module Versions API

```bash
# List available versions for a module
curl -s "https://registry.opentofu.org/v1/modules/terraform-aws-modules/vpc/aws/versions" | jq '.modules[0].versions[-5:]'

# Response: list of available versions
[
  {"version": "5.5.1"},
  {"version": "5.5.2"},
  {"version": "5.5.3"},
  {"version": "5.6.0"},
  {"version": "5.7.0"}
]
```

## Module Download API

```bash
# Get download URL for a specific version
curl -s "https://registry.opentofu.org/v1/modules/terraform-aws-modules/vpc/aws/5.7.0/download"

# Response header: X-Terraform-Get contains the download URL
# The URL is typically a GitHub archive URL or similar
```

## How tofu init Downloads Modules

```bash
# Run with verbose logging to see registry requests
TF_LOG=DEBUG tofu init 2>&1 | grep -E "registry|module|download"

# You'll see:
# DEBUG Fetching module from registry.opentofu.org
# DEBUG Module "terraform-aws-modules/vpc/aws" version 5.7.0 resolved
# DEBUG Downloading module from https://github.com/...
```

## Setting Up a Private Registry

Option 1: Simple static file server (read-only):

```python
#!/usr/bin/env python3
# private-registry/server.py - minimal module registry

import json
from http.server import HTTPServer, BaseHTTPRequestHandler

MODULES = {
    "my-org/vpc/aws": {
        "versions": [{"version": "1.0.0"}, {"version": "1.1.0"}]
    }
}

DOWNLOAD_URLS = {
    "my-org/vpc/aws/1.1.0": "https://github.com/my-org/terraform-aws-vpc/archive/refs/tags/v1.1.0.tar.gz"
}

class RegistryHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/.well-known/terraform.json":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"modules.v1": "/v1/modules/"}).encode())

        elif "/versions" in self.path:
            # /v1/modules/my-org/vpc/aws/versions
            parts = self.path.split("/")
            key = "/".join(parts[3:6])
            data = MODULES.get(key, {"versions": []})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"modules": [data]}).encode())

        elif "/download" in self.path:
            parts = self.path.split("/")
            key = "/".join(parts[3:7])  # my-org/vpc/aws/1.1.0
            url = DOWNLOAD_URLS.get(key, "")
            self.send_response(204)
            self.send_header("X-Terraform-Get", url)
            self.end_headers()

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), RegistryHandler).serve_forever()
```

Option 2: Use GitLab (supports the Terraform Module Registry API):

```bash
# GitLab has a built-in Terraform module registry per project.
# Upload a module package to a project's registry:
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --upload-file vpc-module.tar.gz \
  "https://gitlab.example.com/api/v4/projects/<project_id>/packages/terraform/modules/vpc/aws/1.0.0/file"
```

## Using Private Registry in Configuration

```hcl
# terraform.rc or .terraform.rc
credentials "my-private-registry.example.com" {
  token = "REGISTRY_TOKEN"
}
```

```hcl
# main.tf
terraform {
  required_providers { /* ... */ }
}

module "vpc" {
  source  = "my-private-registry.example.com/my-org/vpc/aws"
  version = "~> 1.0"

  # Module arguments
  name = "prod-vpc"
  cidr = "10.0.0.0/16"
}
```

## Conclusion

The OpenTofu module registry protocol is a simple HTTP API: service discovery via `.well-known/terraform.json`, version listing via `/v1/modules/{namespace}/{name}/{provider}/versions`, and download via the `X-Terraform-Get` header redirect (or a `location` field in the JSON body). You can implement a minimal private registry with any HTTP server or use platforms like GitLab that implement the protocol natively. Understanding the protocol helps debug module download failures and set up air-gapped module distribution.
