# How to Use Hash and Crypto Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, Crypto

Description: Learn how to use md5, sha1, sha256, sha512, and bcrypt functions in OpenTofu for hashing and cryptographic operations.

OpenTofu provides several hashing functions for generating checksums, unique identifiers, and verifying data integrity. These are commonly used for creating unique resource names, generating configuration fingerprints, and managing secrets.

## md5()

Computes the MD5 hash of a string, returning a hexadecimal string:

```hcl
> md5("hello world")
"5eb63bbbe01eeed093cb22bb8f5acdc3"
```

Common use: unique suffixes for resource names:

```hcl
locals {
  # Create unique bucket name based on account and project
  bucket_suffix = substr(md5("${data.aws_caller_identity.current.account_id}-${var.project}"), 0, 8)
  bucket_name   = "myapp-${bucket_suffix}"
}
```

## sha1()

Computes the SHA-1 hash (40-character hex string):

```hcl
> sha1("hello world")
"2aae6c35c94fcfb415dbe95f408b9ce91ee846ed"
```

## sha256()

Computes the SHA-256 hash (64-character hex string):

```hcl
> sha256("hello world")
"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
```

Useful for creating content-based fingerprints:

```hcl
locals {
  # Force resource replacement when config content changes
  config_hash = sha256(jsonencode({
    env    = var.environment
    region = var.region
    config = var.app_config
  }))
}

resource "aws_lambda_function" "app" {
  function_name = "my-app"
  
  # Trigger redeployment when config hash changes
  environment {
    variables = {
      CONFIG_HASH = local.config_hash
    }
  }
}
```

## sha512()

Computes the SHA-512 hash (128-character hex string):

```hcl
> sha512("hello world")
"309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
```

## bcrypt()

Computes a BCrypt password hash. The cost argument (default 10) controls computational expense:

```hcl
> bcrypt("mysecretpassword")
"$2a$10$..."  # bcrypt hash (different each call due to random salt)

> bcrypt("mysecretpassword", 12)  # Higher cost
"$2a$12$..."
```

```hcl
# Useful for setting initial passwords in user accounts

resource "aws_iam_user_login_profile" "admin" {
  user                    = aws_iam_user.admin.name
  pgp_key                 = var.pgp_public_key
  password_reset_required = true
}
```

## filemd5(), filesha1(), filesha256(), filesha512()

Hash the contents of a file:

```hcl
# Detect when a file changes
resource "aws_s3_object" "config" {
  bucket = aws_s3_bucket.config.id
  key    = "app-config.json"
  source = "config/app-config.json"
  etag   = filemd5("config/app-config.json")
  # Triggers re-upload when file changes
}

# Use SHA-256 for security-sensitive verification
locals {
  script_hash = filesha256("scripts/bootstrap.sh")
}
```

## Practical: Generating Unique Names

```hcl
data "aws_caller_identity" "current" {}

locals {
  # Globally unique but deterministic bucket name
  unique_id   = substr(md5("${data.aws_caller_identity.current.account_id}${var.environment}"), 0, 12)
  bucket_name = "terraform-state-${local.unique_id}"
}

resource "aws_s3_bucket" "state" {
  bucket = local.bucket_name
}
```

## Conclusion

Hash functions in OpenTofu serve multiple purposes: detecting file and configuration changes (triggering resource updates), generating unique deterministic identifiers, and creating fingerprints for content-addressed storage. Use `sha256()` or `filesha256()` for security-sensitive applications, and `md5()` for generating short unique suffixes for resource names.
