# How to Use the filesha256 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, filesha256 Function, File Systems, HCL, Infrastructure as Code, Hashing, SHA256, Security

Description: Learn how to use the filesha256 function in Terraform to compute hex-encoded SHA-256 hashes of files for integrity verification and secure change detection.

---

The `filesha256` function computes the SHA-256 hash of a file and returns it as a hexadecimal string. SHA-256 is part of the SHA-2 family and provides strong cryptographic hashing, making it suitable for integrity verification, secure content addressing, and scenarios where collision resistance matters.

## What Is the filesha256 Function?

The `filesha256` function reads a file's contents and returns a hex-encoded SHA-256 hash:

```hcl
# filesha256(path)
# Returns the hex-encoded SHA-256 hash of a file
filesha256("${path.module}/configs/app.yaml")
# Returns something like: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
```

The result is always a 64-character lowercase hexadecimal string (256 bits).

## filesha256 vs filebase64sha256

Terraform has two SHA-256 file hashing functions that return different encodings of the same hash:

```hcl
locals {
  path = "${path.module}/example.txt"

  # filesha256 - hex encoding (64 characters)
  hex_hash = filesha256(local.path)
  # Example: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

  # filebase64sha256 - base64 encoding (44 characters)
  b64_hash = filebase64sha256(local.path)
  # Example: "n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="
}

# Both compute the same SHA-256 hash, just encoded differently
# Use filesha256 when you need hex format
# Use filebase64sha256 when you need base64 format (e.g., Lambda source_code_hash)
```

## Integrity Verification for Downloaded Files

When you download files as part of your infrastructure setup, `filesha256` verifies they have not been tampered with:

```hcl
variable "expected_binary_hash" {
  type    = string
  default = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  description = "Expected SHA-256 hash of the monitoring agent binary"
}

locals {
  actual_hash = filesha256("${path.module}/binaries/monitoring-agent")
  hash_valid  = local.actual_hash == var.expected_binary_hash
}

# Fail early if the binary has been modified
resource "null_resource" "verify_binary" {
  count = local.hash_valid ? 0 : 1

  provisioner "local-exec" {
    command = "echo 'ERROR: Binary hash mismatch! Expected ${var.expected_binary_hash}, got ${local.actual_hash}' && exit 1"
  }
}

resource "aws_s3_object" "agent" {
  depends_on = [null_resource.verify_binary]

  bucket = aws_s3_bucket.binaries.id
  key    = "monitoring-agent"
  source = "${path.module}/binaries/monitoring-agent"
  etag   = filemd5("${path.module}/binaries/monitoring-agent")

  tags = {
    SHA256 = local.actual_hash
  }
}
```

## Secure Configuration Tracking

For compliance and audit purposes, SHA-256 provides strong assurance that files have not changed:

```hcl
locals {
  # Hash all security-relevant configuration files
  security_hashes = {
    iam_policy      = filesha256("${path.module}/policies/iam-policy.json")
    security_groups = filesha256("${path.module}/configs/security-groups.yaml")
    encryption_keys = filesha256("${path.module}/configs/kms-config.yaml")
    waf_rules       = filesha256("${path.module}/configs/waf-rules.json")
    network_acls    = filesha256("${path.module}/configs/nacl-rules.yaml")
  }

  # Create a manifest of all security config hashes
  security_manifest = jsonencode(local.security_hashes)
  manifest_hash     = sha256(local.security_manifest)
}

# Store the manifest for audit purposes
resource "aws_ssm_parameter" "security_manifest" {
  name  = "/audit/security-config-hashes"
  type  = "String"
  value = local.security_manifest

  tags = {
    ManifestHash = substr(local.manifest_hash, 0, 16)
    LastUpdated  = timestamp()
  }
}

output "security_audit" {
  value = {
    file_hashes     = local.security_hashes
    manifest_hash   = local.manifest_hash
  }
}
```

## Resource Naming with Cryptographic Hashes

Generate unique resource names that change only when content changes:

```hcl
locals {
  # Use SHA-256 for stronger uniqueness guarantees
  config_hash = filesha256("${path.module}/configs/app.yaml")
  short_hash  = substr(local.config_hash, 0, 8)
}

resource "aws_ecs_task_definition" "app" {
  family = "app-${local.short_hash}"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${var.ecr_repo}:${local.short_hash}"
      environment = [
        {
          name  = "CONFIG_SHA256"
          value = local.config_hash
        }
      ]
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])

  cpu                      = 256
  memory                   = 512
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
}
```

## Policy Document Verification

Verify that IAM policies have not been accidentally modified:

```hcl
variable "approved_policy_hashes" {
  type = map(string)
  default = {
    "admin-policy.json" = "abc123..."
    "read-only.json"    = "def456..."
    "deploy-policy.json" = "789abc..."
  }
  description = "SHA-256 hashes of approved policy documents"
}

locals {
  policy_files = fileset("${path.module}/policies", "*.json")

  policy_verification = {
    for f in local.policy_files : f => {
      current_hash  = filesha256("${path.module}/policies/${f}")
      approved_hash = lookup(var.approved_policy_hashes, f, "")
      is_approved   = (
        lookup(var.approved_policy_hashes, f, "") == filesha256("${path.module}/policies/${f}")
      )
    }
  }

  unapproved_policies = [
    for name, status in local.policy_verification :
    name if !status.is_approved
  ]
}

output "policy_status" {
  value = {
    verification     = local.policy_verification
    unapproved_count = length(local.unapproved_policies)
    unapproved_files = local.unapproved_policies
  }
}
```

## Immutable Deployments

Create immutable deployment artifacts where the hash becomes part of the identifier:

```hcl
locals {
  source_hash = filesha256("${path.module}/dist/app.zip")
  version_id  = substr(local.source_hash, 0, 12)
}

resource "aws_s3_object" "deployment" {
  bucket = aws_s3_bucket.deployments.id
  key    = "versions/${local.version_id}/app.zip"
  source = "${path.module}/dist/app.zip"
  etag   = filemd5("${path.module}/dist/app.zip")

  tags = {
    SHA256  = local.source_hash
    Version = local.version_id
  }
}

resource "aws_ssm_parameter" "current_version" {
  name  = "/app/current-version"
  type  = "String"
  value = local.version_id
}

resource "aws_ssm_parameter" "version_artifact" {
  name  = "/app/versions/${local.version_id}/artifact"
  type  = "String"
  value = "s3://${aws_s3_bucket.deployments.id}/versions/${local.version_id}/app.zip"
}
```

## Multi-File Hash for Change Detection

When you need to detect changes across a set of files:

```hcl
locals {
  source_files = fileset("${path.module}/src", "**/*.py")

  # Hash each source file
  file_hashes = {
    for f in local.source_files :
    f => filesha256("${path.module}/src/${f}")
  }

  # Create a combined hash of all files
  # Sort the hashes for deterministic ordering
  combined_hash = sha256(
    join("\n", [
      for f in sort(tolist(local.source_files)) :
      "${f}:${local.file_hashes[f]}"
    ])
  )
}

output "source_version" {
  value = {
    file_count    = length(local.source_files)
    combined_hash = substr(local.combined_hash, 0, 12)
    full_hash     = local.combined_hash
  }
}
```

## Comparing Artifacts Across Stages

Verify that the same artifact moves through your deployment pipeline:

```hcl
locals {
  dev_artifact_hash  = filesha256("${path.module}/artifacts/dev/app.zip")
  prod_artifact_hash = filesha256("${path.module}/artifacts/prod/app.zip")
  artifacts_match    = local.dev_artifact_hash == local.prod_artifact_hash
}

output "artifact_comparison" {
  value = {
    dev_hash      = local.dev_artifact_hash
    prod_hash     = local.prod_artifact_hash
    match         = local.artifacts_match
    status        = local.artifacts_match ? "PASS - artifacts are identical" : "FAIL - artifacts differ"
  }
}
```

## Important Notes

```hcl
# SHA-256 is currently considered cryptographically secure
# Suitable for integrity verification and security-sensitive operations

# filesha256 reads the file at plan time
# The file must exist when terraform plan runs

# filesha256 handles binary files correctly

# The hex output is always 64 lowercase characters

# For Lambda source_code_hash, use filebase64sha256 instead
# Lambda requires base64 encoding, not hex

# SHA-256 computation is slightly slower than MD5 or SHA-1
# but the difference is negligible for typical file sizes
```

## Summary

The `filesha256` function computes a hex-encoded SHA-256 hash of a file, providing strong cryptographic integrity verification. Use it for security-sensitive scenarios like verifying binary integrity, tracking policy document changes for compliance, and creating immutable deployment identifiers. The hex encoding makes it human-readable and easy to compare visually. For AWS Lambda's `source_code_hash`, use `filebase64sha256` instead since Lambda expects base64 encoding.

For related functions, see our posts on the [filebase64sha256 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filebase64sha256-function-in-terraform/view) and the [filesha512 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filesha512-function-in-terraform/view).
