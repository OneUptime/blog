# How to Use the filesha1 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, filesha1 Function, File Systems, HCL, Infrastructure as Code, Hashing, SHA1

Description: Learn how to use the filesha1 function in Terraform to compute SHA-1 hashes of local files for content addressing, versioning, and change detection in infrastructure configurations.

---

The `filesha1` function computes the SHA-1 hash of a file's contents and returns it as a hexadecimal string. SHA-1 produces a 40-character hex string (160-bit hash) that is widely used for content addressing, versioning, and change detection. If you have worked with Git, you are already familiar with SHA-1 - it is the algorithm Git uses for commit and object hashes.

## What Is the filesha1 Function?

The `filesha1` function reads a file and returns its SHA-1 hash:

```hcl
# filesha1(path)
# Returns the hex-encoded SHA-1 hash of a file
filesha1("${path.module}/scripts/deploy.sh")
# Returns something like: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"
```

The result is always a 40-character lowercase hexadecimal string.

## When to Use filesha1

SHA-1 sits between MD5 and SHA-256 in terms of both hash length and computational cost. Here is how they compare in practical terms:

```hcl
locals {
  path = "${path.module}/example.txt"

  # MD5 - 32 hex chars, fastest, used by S3 ETags
  md5    = filemd5(local.path)

  # SHA-1 - 40 hex chars, middle ground
  sha1   = filesha1(local.path)

  # SHA-256 - 64 hex chars, strongest, used by Lambda
  sha256 = filesha256(local.path)
}
```

Use `filesha1` when you need a stronger hash than MD5 but do not need the full strength of SHA-256, or when interfacing with systems that specifically use SHA-1 (like some Git-based workflows).

## Content Versioning

SHA-1 makes an excellent version identifier for configuration files:

```hcl
locals {
  config_version = filesha1("${path.module}/configs/app.yaml")
}

resource "aws_ssm_parameter" "app_config" {
  name  = "/app/config"
  type  = "String"
  value = file("${path.module}/configs/app.yaml")

  tags = {
    Version     = substr(local.config_version, 0, 8)
    FullVersion = local.config_version
  }
}

output "config_version" {
  value = "Config version: ${substr(local.config_version, 0, 8)}"
  # Output: "Config version: a94a8fe5"
}
```

Using `substr` to take the first 8 characters gives you a short version string similar to Git's abbreviated commit hashes.

## Change Detection for Deployment Scripts

Track when deployment scripts change to trigger redeployment:

```hcl
locals {
  # Hash all deployment-related scripts
  script_hashes = {
    deploy   = filesha1("${path.module}/scripts/deploy.sh")
    rollback = filesha1("${path.module}/scripts/rollback.sh")
    health   = filesha1("${path.module}/scripts/health-check.sh")
  }

  # Combined hash to detect any script change
  scripts_version = sha1(join(",", values(local.script_hashes)))
}

resource "aws_codedeploy_deployment_group" "app" {
  app_name              = aws_codedeploy_app.app.name
  deployment_group_name = "production"
  service_role_arn      = aws_iam_role.codedeploy.arn

  # Tag with script version for tracking
  ec2_tag_set {
    ec2_tag_filter {
      key   = "ScriptVersion"
      type  = "KEY_AND_VALUE"
      value = substr(local.scripts_version, 0, 12)
    }
  }
}
```

## Git-Like Content Addressing

Since Git uses SHA-1, you can create a similar content-addressing scheme:

```hcl
locals {
  templates = fileset("${path.module}/templates", "**/*.tftpl")

  # Create a content-addressed map of templates
  template_catalog = {
    for t in local.templates : t => {
      path    = "${path.module}/templates/${t}"
      sha1    = filesha1("${path.module}/templates/${t}")
      version = substr(filesha1("${path.module}/templates/${t}"), 0, 7)
    }
  }
}

output "template_versions" {
  value = {
    for name, info in local.template_catalog :
    name => info.version
  }
  # Output: { "nginx.conf.tftpl" = "a3b8f2c", "app.yaml.tftpl" = "d9e1c4a" }
}
```

## Tracking Configuration Drift

Compare current file hashes against known-good hashes to detect drift:

```hcl
variable "expected_hashes" {
  type = map(string)
  default = {
    "main.tf"      = "abc123def456789012345678901234567890abcd"
    "variables.tf" = "def456789012345678901234567890abcdabc123"
  }
  description = "Known-good SHA-1 hashes of configuration files"
}

locals {
  current_hashes = {
    for name, expected in var.expected_hashes :
    name => {
      expected = expected
      actual   = filesha1("${path.module}/${name}")
      matches  = expected == filesha1("${path.module}/${name}")
    }
  }

  drifted_files = [
    for name, hash_info in local.current_hashes :
    name if !hash_info.matches
  ]
}

output "drift_status" {
  value = length(local.drifted_files) == 0 ? (
    "No drift detected"
  ) : (
    "Drift detected in: ${join(", ", local.drifted_files)}"
  )
}
```

## Artifact Versioning in CI/CD

When your CI/CD pipeline produces artifacts, use SHA-1 to version them:

```hcl
locals {
  artifact_path = "${path.module}/dist/app.tar.gz"
  artifact_sha1 = filesha1(local.artifact_path)
}

resource "aws_s3_object" "artifact" {
  bucket = aws_s3_bucket.artifacts.id
  key    = "releases/${local.artifact_sha1}/app.tar.gz"
  source = local.artifact_path
  etag   = filemd5(local.artifact_path)

  tags = {
    SHA1    = local.artifact_sha1
    Version = substr(local.artifact_sha1, 0, 8)
  }
}

resource "aws_ssm_parameter" "latest_artifact" {
  name  = "/app/latest-artifact"
  type  = "String"
  value = "s3://${aws_s3_bucket.artifacts.id}/releases/${local.artifact_sha1}/app.tar.gz"
}
```

## Generating Unique Resource Names

Use SHA-1 to generate unique but deterministic resource names:

```hcl
variable "project" {
  type    = string
  default = "myapp"
}

variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Generate a unique suffix based on the configuration files
  config_hash = filesha1("${path.module}/configs/${var.environment}.yaml")
  name_suffix = substr(local.config_hash, 0, 6)
}

resource "aws_sqs_queue" "work" {
  # Include the hash suffix so the queue name changes when config changes
  name = "${var.project}-${var.environment}-work-${local.name_suffix}"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400

  tags = {
    ConfigVersion = local.name_suffix
  }
}
```

## Comparing File Contents Across Environments

Check if configuration files are consistent across environments:

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "production"]
}

locals {
  # Compute hashes for each environment's config
  env_hashes = {
    for env in var.environments :
    env => filesha1("${path.module}/configs/${env}/database.yaml")
  }

  # Find environments with matching configs
  unique_configs = distinct(values(local.env_hashes))
  all_match      = length(local.unique_configs) == 1
}

output "config_consistency" {
  value = {
    hashes    = local.env_hashes
    all_match = local.all_match
    unique    = length(local.unique_configs)
  }
}
```

## Tagging Resources with File Versions

Add version tags to resources based on the files that configure them:

```hcl
locals {
  # Create version tags from important config files
  version_tags = {
    AppConfigVersion = substr(filesha1("${path.module}/configs/app.yaml"), 0, 8)
    InfraVersion     = substr(filesha1("${path.module}/main.tf"), 0, 8)
    PolicyVersion    = substr(filesha1("${path.module}/policies/iam.json"), 0, 8)
  }

  # Merge with standard tags
  all_tags = merge(var.default_tags, local.version_tags)
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  tags          = local.all_tags
}
```

## ECS Service Versioning

Track which configuration version is running in ECS:

```hcl
locals {
  task_def_hash = filesha1("${path.module}/task-definitions/app.json")
}

resource "aws_ecs_task_definition" "app" {
  family                = "app"
  container_definitions = file("${path.module}/task-definitions/app.json")

  tags = {
    DefinitionHash = local.task_def_hash
    ShortHash      = substr(local.task_def_hash, 0, 8)
  }
}
```

## Important Notes

```hcl
# SHA-1 has known collision vulnerabilities
# Do NOT use it for security-sensitive operations
# For security, use filesha256 or filesha512

# SHA-1 is fine for:
# - Content versioning
# - Change detection
# - Cache invalidation
# - Unique name generation

# filesha1 reads the file at plan time
# The file must exist when terraform plan runs

# filesha1 handles binary files correctly
# No need to worry about encoding issues

# The result is always 40 lowercase hex characters
```

## Summary

The `filesha1` function computes the SHA-1 hash of a local file, returning a 40-character hex string. It fills a useful middle ground between the shorter MD5 hash (used for S3 ETags) and the longer SHA-256 hash (used for Lambda deployments). SHA-1 is a natural choice for content versioning, Git-like content addressing, and generating unique but deterministic identifiers from file contents. While it should not be used for security-critical hashing, it is reliable for change detection and configuration tracking.

For related hashing functions, see our posts on the [filemd5 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filemd5-function-in-terraform/view) and the [filesha256 function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-filesha256-function-in-terraform/view).
