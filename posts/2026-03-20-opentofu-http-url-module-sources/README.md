# How to Use HTTP URL Module Sources in OpenTofu - Url

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module

Description: Learn how to use HTTP and HTTPS URLs as module sources in OpenTofu to download modules from web servers and artifact repositories.

## What are HTTP Module Sources?

HTTP/HTTPS module sources allow OpenTofu to download a module from any URL that serves a ZIP or tar.gz archive. This is useful for serving modules from internal HTTP servers, artifact repositories like JFrog Artifactory, or any custom distribution system.

## Syntax

```hcl
module "name" {
  source = "https://example.com/modules/vpc.zip"
}
```

The URL must point to an archive file (`.zip`, `.tar.gz`, `.tar.bz2`, or `.tar.xz`). OpenTofu will download and extract it.

## Basic HTTPS Source

```hcl
# Download a module from an HTTPS URL

module "vpc" {
  source = "https://artifacts.acme-corp.com/terraform-modules/vpc-v2.1.0.zip"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}
```

## Pointing to a Subdirectory Within the Archive

Use the `//` separator to specify a subdirectory inside the archive:

```hcl
module "vpc" {
  source = "https://artifacts.acme-corp.com/modules/terraform-aws-modules-v3.zip//vpc"

  name = "production"
}
```

## Adding Authentication with Headers

Some artifact repositories require authentication. Configure credentials in `.terraformrc` / `.tofurc`:

```hcl
# ~/.tofurc
credentials "artifacts.acme-corp.com" {
  token = "your-token-here"
}
```

## Using with JFrog Artifactory

```hcl
# Download from Artifactory using a versioned URL
module "security_groups" {
  source = "https://artifactory.acme-corp.com/terraform-modules/aws-security-groups/v1.3.0.zip"

  vpc_id      = var.vpc_id
  environment = var.environment
}
```

## Verifying Download Integrity

OpenTofu does not automatically verify checksums for HTTP sources. For security, either:
1. Use HTTPS to prevent man-in-the-middle attacks
2. Host your own artifact server and verify via your internal PKI

```hcl
# HTTPS is always preferred for HTTP module sources
module "network" {
  source = "https://secure-artifacts.acme-corp.com/modules/network-v1.0.0.zip"
  # The HTTPS certificate ensures authenticity
}
```

## HTTP vs Other Module Sources

| Source Type | Authentication | Version Pinning | Use Case |
|---|---|---|---|
| HTTP/HTTPS | HTTP headers | URL-embedded version | Internal artifact servers |
| Git | SSH/token | `?ref=tag` | Source code repositories |
| Registry | Token | `version` attribute | Public/private registries |

## When to Use HTTP Sources

HTTP sources are best for:
- Internal artifact servers (Artifactory, Nexus, S3 over HTTP)
- Pre-packaged modules distributed as ZIP files
- Air-gapped environments where Git is not available
- Custom module distribution infrastructure

## Important Notes

- The URL must serve an archive file. Plain directories served over HTTP are not supported.
- OpenTofu re-downloads the archive on every `tofu init`. For stability, embed the version in the URL path.
- HTTPS is strongly recommended over plain HTTP to prevent tampering.
- If the archive contains multiple modules, use `//subdirectory` to point to the correct one.

## Conclusion

HTTP/HTTPS module sources provide flexibility for teams with internal artifact management systems. They work with JFrog Artifactory, Sonatype Nexus, AWS S3 with HTTP endpoints, and any server that can serve archive files. Embed the version number in the URL to ensure reproducibility across deployments.
