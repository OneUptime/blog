# How to Use the base64sha512 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Hashing, Base64, SHA512, Security, Infrastructure as Code

Description: Learn how to use Terraform's base64sha512 function for generating base64-encoded SHA-512 hashes for high-security content verification and integrity checks.

---

The `base64sha512` function in Terraform computes a SHA-512 hash and returns it in base64 encoding. While `base64sha256` is more commonly used (especially for AWS Lambda), `base64sha512` provides stronger hashing for scenarios that require maximum security or when a downstream system specifically expects SHA-512 in base64 format.

## What Does base64sha512 Do?

The function computes the SHA-512 hash of a given string and returns the result encoded in base64, rather than hexadecimal.

```hcl
# Compare the formats
output "hex_format" {
  value = sha512("hello world")
  # 128-character hex string
}

output "base64_format" {
  value = base64sha512("hello world")
  # 88-character base64 string (more compact)
}
```

## Syntax

```hcl
base64sha512(string)
```

Takes a string, returns a base64-encoded SHA-512 hash (88 characters).

## Why Base64-Encoded SHA-512?

The base64 encoding makes the hash more compact:

| Format | SHA-256 Length | SHA-512 Length |
|--------|---------------|----------------|
| Hex    | 64 chars      | 128 chars      |
| Base64 | 44 chars      | 88 chars       |

This compactness is useful when you need to store or transmit hashes in space-constrained contexts like HTTP headers, database fields with length limits, or API payloads.

## Practical Examples

### High-Security Content Verification

When you need the strongest available hash for verifying deployment artifacts:

```hcl
locals {
  # Read the deployment package
  deploy_package = file("${path.module}/artifacts/release.tar.gz")

  # Generate a base64-encoded SHA-512 hash
  package_hash = base64sha512(local.deploy_package)
}

resource "null_resource" "deploy" {
  triggers = {
    package_hash = local.package_hash
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Deploy with integrity verification
      echo "Deploying package with hash: ${local.package_hash}"
      ./scripts/deploy.sh --verify-hash "${local.package_hash}"
    EOT
  }
}
```

### Generating Strong Content Signatures

For systems that need base64-encoded signatures for content verification:

```hcl
variable "documents" {
  description = "Map of document names to their content"
  type        = map(string)
  default = {
    policy     = "security-policy-v2.json"
    compliance = "compliance-rules.json"
    runbook    = "incident-runbook.json"
  }
}

locals {
  # Generate base64 SHA-512 signatures for each document
  document_signatures = {
    for name, filename in var.documents :
    name => {
      file = filename
      hash = filebase64sha512("${path.module}/documents/${filename}")
    }
  }
}

# Store signatures in Parameter Store for verification
resource "aws_ssm_parameter" "doc_signatures" {
  for_each = local.document_signatures

  name  = "/${var.environment}/document-signatures/${each.key}"
  type  = "String"
  value = each.value.hash

  tags = {
    Document = each.value.file
    HashAlgo = "sha512-base64"
  }
}
```

### API Payload Signing

Some APIs require request signing with base64-encoded hashes:

```hcl
locals {
  # Construct the API payload
  api_payload = jsonencode({
    action      = "deploy"
    environment = var.environment
    version     = var.app_version
    timestamp   = timestamp()
  })

  # Sign the payload with base64 SHA-512
  payload_signature = base64sha512(local.api_payload)
}

# Store the signed payload for the deployment system to pick up
resource "aws_s3_object" "deployment_manifest" {
  bucket  = aws_s3_bucket.deployments.id
  key     = "manifests/${var.environment}/latest.json"
  content = local.api_payload

  metadata = {
    # Include the signature in the object metadata
    signature      = local.payload_signature
    signature_algo = "sha512-base64"
  }
}
```

### Infrastructure Fingerprinting

Create a strong fingerprint of your entire infrastructure configuration:

```hcl
locals {
  # Collect all configuration parameters
  infra_params = jsonencode({
    vpc_cidr       = var.vpc_cidr
    subnets        = var.subnet_cidrs
    instance_types = var.instance_types
    db_config      = var.database_config
    cache_config   = var.cache_config
    dns_config     = var.dns_config
  })

  # Generate a strong fingerprint
  infra_fingerprint = base64sha512(local.infra_params)
}

# Tag all resources with the infrastructure fingerprint
locals {
  common_tags = {
    Environment       = var.environment
    InfraFingerprint = substr(local.infra_fingerprint, 0, 24)
    ManagedBy        = "terraform"
  }
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags       = merge(local.common_tags, { Name = "main-vpc" })
}
```

### Multi-Layer Hash Verification

Combine hashes of different components for a comprehensive deployment verification:

```hcl
locals {
  # Hash individual components
  components = {
    app_code   = filebase64sha512("${path.module}/artifacts/app.zip")
    config     = base64sha512(file("${path.module}/configs/production.yaml"))
    migrations = base64sha512(file("${path.module}/migrations/latest.sql"))
    schema     = base64sha512(file("${path.module}/schemas/api.graphql"))
  }

  # Create a composite hash of all components
  deployment_signature = base64sha512(
    join("|", values(local.components))
  )
}

output "component_hashes" {
  value = local.components
}

output "deployment_signature" {
  value = local.deployment_signature
}
```

### Webhook Signature Verification

When setting up webhooks that require SHA-512 signatures:

```hcl
variable "webhook_secret" {
  description = "Secret key for webhook signature verification"
  type        = string
  sensitive   = true
}

locals {
  # Create a verification hash from the webhook URL and secret
  webhook_verification = base64sha512(
    "${var.webhook_url}:${var.webhook_secret}"
  )
}

resource "aws_ssm_parameter" "webhook_config" {
  name = "/${var.environment}/webhook-config"
  type = "SecureString"
  value = jsonencode({
    url               = var.webhook_url
    verification_hash = local.webhook_verification
    hash_algorithm    = "sha512"
    encoding          = "base64"
  })
}
```

## filebase64sha512 for Files

Like other hash functions, Terraform provides a file-specific variant:

```hcl
# Preferred for file hashing - more efficient
output "file_hash" {
  value = filebase64sha512("${path.module}/large-artifact.zip")
}

# Equivalent but less efficient
output "file_hash_alt" {
  value = base64sha512(file("${path.module}/large-artifact.zip"))
}
```

Always prefer `filebase64sha512` when hashing files. It reads the file and computes the hash in a streaming fashion, avoiding loading the entire file content into a Terraform string.

## base64sha512 vs base64encode(sha512())

Just like with `base64sha256`, these two approaches produce different results:

```hcl
# Correct: encodes the raw 64-byte hash to base64
output "correct" {
  value = base64sha512("test")
  # 88 characters
}

# Wrong: encodes the 128-character hex string to base64
output "wrong" {
  value = base64encode(sha512("test"))
  # 172 characters - totally different!
}
```

The `base64sha512` function encodes the raw binary hash (64 bytes) to base64. The chained approach encodes the hexadecimal string representation (128 characters) to base64. These produce completely different outputs, so always use the dedicated function.

## Choosing Between base64sha256 and base64sha512

For most Terraform use cases, `base64sha256` is sufficient:

- AWS Lambda uses base64sha256 for source code hashing
- Most APIs that accept base64 hashes expect SHA-256
- SHA-256 is the current industry standard

Use `base64sha512` when:

- A specific API or service requires SHA-512
- You are in a high-security environment that mandates SHA-512
- You want the strongest available hash for audit and compliance purposes

## Summary

The `base64sha512` function provides the strongest hash available in Terraform in a compact base64 format. While less commonly needed than `base64sha256`, it is the right tool when maximum hash strength is required or when a downstream system specifically expects SHA-512 in base64 encoding. For the more commonly used variant, see [base64sha256](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-base64sha256-function-in-terraform/view), and for the hex-encoded version, see [sha512](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha512-function-in-terraform/view).
