# How to Use HTTP URL Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Module

Description: Learn how to use HTTP and HTTPS URL module sources in OpenTofu to download modules from ZIP archives hosted on web servers.

## Introduction

OpenTofu can download modules from HTTP and HTTPS URLs that serve ZIP archives. This source type is useful for modules hosted on internal artifact servers, Nexus, Artifactory, or any web server that serves module archives.

## Syntax

```hcl
module "example" {
  # HTTPS URL to a ZIP archive
  source = "https://example.com/modules/vpc-module.zip"
  
  # With subdirectory inside the ZIP
  source = "https://example.com/modules/all-modules.zip//vpc"
}
```

- The URL must point to a `.zip`, `.tar.gz`, `.tar.bz2`, or `.tar.xz` archive
- OpenTofu downloads and extracts the archive
- Use `//` to specify a subdirectory within the archive

## Examples

### Downloading from an Artifact Server

```hcl
module "vpc" {
  source = "https://artifacts.mycompany.com/terraform-modules/vpc-v2.1.0.zip"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

### Using Subdirectory in ZIP Archive

```hcl
module "security_groups" {
  source = "https://artifacts.mycompany.com/modules/infra-modules-v1.5.0.zip//security-groups"

  vpc_id      = aws_vpc.main.id
  environment = var.environment
}
```

### GitHub Release Asset

```hcl
module "vpc" {
  # Download from a GitHub release asset
  source = "https://github.com/myorg/terraform-modules/archive/refs/tags/v1.0.0.zip//terraform-modules-1.0.0/modules/vpc"
}
```

### Nexus Repository

```hcl
module "internal_module" {
  source = "https://nexus.mycompany.com/repository/terraform-modules/my-module-1.2.0.zip"

  name        = "my-resource"
  environment = var.environment
}
```

## Authentication

### Basic Auth via URL

```hcl
# Embed credentials in URL (not recommended for sensitive passwords)

module "secure_module" {
  source = "https://user:token@artifacts.mycompany.com/modules/private-module.zip"
}
```

### .netrc File

The OpenTofu documentation recommends using a `.netrc` file to provide credentials for HTTP/HTTPS module sources. OpenTofu searches for `.netrc` in your home directory by default, and the location can be overridden with the `NETRC` environment variable.

```text
machine artifacts.mycompany.com
  login myuser
  password mytoken
```

### Environment Variables

OpenTofu honors the standard HTTP proxy environment variables when fetching module sources:

```bash
export HTTP_PROXY="http://proxy.internal:3128"
export HTTPS_PROXY="https://proxy.internal:3128"
```

### TLS Certificate Verification

```hcl
# In provider config, not module source - for custom CA:
provider "aws" {
  # ...
}
```

## Step-by-Step Usage

1. Package your module as a ZIP archive.
2. Upload to your artifact server.
3. Reference the URL in your module source.
4. Run `tofu init` to download.

```bash
# Package module
zip -r my-module-v1.0.0.zip my-module/

# Upload to server (example with curl)
curl -u user:pass -T my-module-v1.0.0.zip https://artifacts.mycompany.com/modules/

# Reference in OpenTofu
# source = "https://artifacts.mycompany.com/modules/my-module-v1.0.0.zip"
```

## Advantages and Limitations

| | HTTP Sources | Git Sources |
|-|-------------|-------------|
| Works offline after download | Yes (cached) | Yes (cached) |
| Version pinning | Via filename | Via `?ref=` |
| Authentication | URL-based | SSH/HTTPS |
| Artifact storage control | Full | Git server |

## Conclusion

HTTP URL module sources in OpenTofu enable downloading modules from corporate artifact repositories and web servers. This is valuable for air-gapped environments and organizations using artifact managers like Nexus or Artifactory. Package your modules as ZIP archives and serve them from your internal server for a self-contained module distribution mechanism.
