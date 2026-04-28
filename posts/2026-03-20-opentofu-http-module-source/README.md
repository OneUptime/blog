# Using HTTP URLs as Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, HTTP

Description: Learn how to use HTTP and HTTPS URLs as module sources in OpenTofu to download modules from web servers.

OpenTofu can download module packages from HTTP and HTTPS URLs. The URL must point to a zip, tar.gz, tar.bz2, or tar.xz archive.

## Basic HTTPS URL

```hcl
module "vpc" {
  source = "https://example.com/modules/vpc.zip"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}
```

## Pinning to a Specific Version

For reproducible builds, pin to a specific versioned archive URL rather than a "latest" path:

```hcl
module "vpc" {
  source = "https://releases.mycompany.com/modules/vpc-2.1.0.tar.gz"
}
```

## Using Archive Files from S3 Pre-signed URLs

```hcl
# Generate pre-signed URL in advance

# aws s3 presign s3://my-modules/vpc-2.1.0.zip --expires-in 3600

module "vpc" {
  source = "https://my-modules.s3.amazonaws.com/vpc-2.1.0.zip?X-Amz-Algorithm=..."
}
```

## Self-Hosted Module Server

```hcl
# Internal HTTP server serving module archives
module "database" {
  source = "https://modules.internal.example.com/database/v1.5.0.tar.gz"

  engine    = "postgres"
  version   = "14"
  vpc_id    = var.vpc_id
  subnet_ids = var.subnet_ids
}
```

## Authenticating with HTTP Sources

If an HTTP/HTTPS URL requires authentication, OpenTofu reads credentials from a `.netrc` file in your home directory. You can override the default location with the `NETRC` environment variable.

```bash
# Configure credentials via netrc
echo "machine modules.example.com login myuser password mypassword" >> ~/.netrc
chmod 600 ~/.netrc

# Optional: point OpenTofu at a non-default netrc file
export NETRC=/path/to/custom/.netrc
```

## Practical: CI/CD with Pre-built Module Archives

```bash
# CI pipeline: build and publish module archive
tar -czf vpc-module-v${VERSION}.tar.gz ./modules/vpc/
aws s3 cp vpc-module-v${VERSION}.tar.gz s3://my-modules/
```

```hcl
# OpenTofu configuration
variable "vpc_module_version" {
  default = "1.5.0"
}

module "vpc" {
  source = "https://my-modules.s3.amazonaws.com/vpc-module-v${var.vpc_module_version}.tar.gz"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

## Conclusion

HTTP URL sources are flexible for organizations with existing artifact repositories or web servers. They work with any HTTP server that can serve files. For production use, always pin to specific versioned archives and use HTTPS so transport is encrypted and the server's identity is verified.
