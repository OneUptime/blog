# How to Use the md5 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Hashing, Security, Infrastructure as Code

Description: Learn how to use Terraform's md5 function to generate MD5 hashes for content verification, change detection, and resource naming in your configurations.

---

Hashing is a common requirement in infrastructure management. Whether you need to detect when file contents change, generate unique identifiers, or create ETags for cloud resources, Terraform's `md5` function provides a quick way to compute MD5 hashes of strings directly in your configuration.

## What Does the md5 Function Do?

The `md5` function computes the MD5 hash of a given string and returns the hash as a hexadecimal string. MD5 produces a 128-bit hash value, represented as a 32-character hex string.

```hcl
# Compute the MD5 hash of a simple string
output "hash" {
  value = md5("hello world")
  # Result: "5eb63bbbe01eeed093cb22bb8f5acdc3"
}
```

## Syntax

```hcl
md5(string)
```

The function takes a single string argument and returns a 32-character lowercase hexadecimal string.

## Important Security Note

MD5 is cryptographically broken and should not be used for security purposes. It is vulnerable to collision attacks, meaning two different inputs can produce the same hash. Do not use `md5` for:

- Password hashing (use [bcrypt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-bcrypt-function-in-terraform/view) instead)
- Verifying file integrity against tampering
- Digital signatures or authentication tokens

MD5 is still fine for non-security use cases like change detection, cache keys, and generating unique identifiers from known inputs.

## Practical Examples

### Detecting Configuration Changes

One of the most common uses of `md5` in Terraform is detecting when content changes to trigger resource updates:

```hcl
# Trigger a redeployment when the configuration changes
resource "null_resource" "deploy" {
  triggers = {
    # Rerun the provisioner when the config file content changes
    config_hash = md5(file("${path.module}/config/app.json"))
  }

  provisioner "local-exec" {
    command = "bash ${path.module}/scripts/deploy.sh"
  }
}
```

### S3 Object ETags

AWS S3 uses ETags to track object versions, and for objects uploaded directly (not multipart), the ETag is the MD5 hash of the content:

```hcl
locals {
  # The content we want to upload
  index_html = file("${path.module}/static/index.html")
}

resource "aws_s3_object" "website" {
  bucket       = aws_s3_bucket.site.id
  key          = "index.html"
  content      = local.index_html
  content_type = "text/html"

  # Use MD5 to detect when the content changes
  # This forces Terraform to update the object when the file changes
  etag = md5(local.index_html)
}
```

### Generating Unique Resource Names

When you need unique but deterministic names based on input parameters:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "region" {
  type    = string
  default = "us-west-2"
}

locals {
  # Generate a short unique suffix from the environment and region
  # Take only the first 8 characters of the hash for brevity
  unique_suffix = substr(md5("${var.environment}-${var.region}"), 0, 8)
}

resource "aws_s3_bucket" "data" {
  # Produces a name like "app-data-a1b2c3d4"
  bucket = "app-data-${local.unique_suffix}"

  tags = {
    Environment = var.environment
    Region      = var.region
  }
}
```

### Tracking Multiple File Changes

When you need to detect changes across multiple files:

```hcl
locals {
  # Read all configuration files
  config_files = {
    app    = file("${path.module}/configs/app.yaml")
    db     = file("${path.module}/configs/database.yaml")
    cache  = file("${path.module}/configs/cache.yaml")
  }

  # Create a combined hash of all config files
  # If any file changes, this hash changes too
  combined_hash = md5(join("", values(local.config_files)))
}

resource "null_resource" "apply_configs" {
  triggers = {
    configs_hash = local.combined_hash
  }

  provisioner "local-exec" {
    command = "ansible-playbook apply-configs.yml"
  }
}
```

### Templated Content Hashing

Hash the rendered output of templates to detect when the effective configuration changes:

```hcl
locals {
  # Render the template with current variables
  rendered_config = templatefile("${path.module}/templates/nginx.conf.tpl", {
    server_name = var.domain
    upstream    = var.backend_servers
    ssl_enabled = var.enable_ssl
  })

  # Hash the rendered output
  config_hash = md5(local.rendered_config)
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  # Store the hash in the user data to force instance replacement
  # when the nginx config changes significantly
  user_data = <<-EOF
    #!/bin/bash
    # Config version: ${local.config_hash}
    echo '${local.rendered_config}' > /etc/nginx/nginx.conf
    systemctl restart nginx
  EOF

  tags = {
    ConfigHash = local.config_hash
  }
}
```

### Cache Busting for Static Assets

When deploying web applications, you might need cache-busted filenames:

```hcl
locals {
  # Read the CSS file content
  css_content = file("${path.module}/static/styles.css")

  # Generate a short hash for cache busting
  css_hash = substr(md5(local.css_content), 0, 8)

  # Create the cache-busted filename
  css_filename = "styles-${local.css_hash}.css"
}

resource "aws_s3_object" "css" {
  bucket       = aws_s3_bucket.site.id
  key          = local.css_filename
  content      = local.css_content
  content_type = "text/css"

  # Set long cache headers since the filename includes a hash
  cache_control = "public, max-age=31536000, immutable"
}

output "css_url" {
  value = "https://${aws_s3_bucket.site.bucket_regional_domain_name}/${local.css_filename}"
}
```

## Comparing md5 with Other Hash Functions

Terraform provides several hash functions. Here is when to use each:

```hcl
locals {
  input = "example content"

  # MD5 - fast, 32 chars, good for change detection and ETags
  md5_hash    = md5(local.input)

  # SHA1 - 40 chars, used by Git for commit hashes
  sha1_hash   = sha1(local.input)

  # SHA256 - 64 chars, the standard choice for integrity verification
  sha256_hash = sha256(local.input)

  # SHA512 - 128 chars, highest security among these options
  sha512_hash = sha512(local.input)
}
```

For most non-security Terraform use cases (ETags, triggers, naming), `md5` is perfectly adequate and produces the shortest output.

## Working with filemd5

Terraform also provides a `filemd5` function that reads a file and computes its MD5 hash in one step:

```hcl
# These two approaches produce the same result
output "approach_1" {
  value = md5(file("${path.module}/data.txt"))
}

output "approach_2" {
  value = filemd5("${path.module}/data.txt")
}
```

The `filemd5` function is more efficient because it does not need to load the entire file content into a Terraform string first.

## Summary

The `md5` function is a workhorse for change detection and content-based naming in Terraform. While it should never be used for security-sensitive hashing, it remains the go-to choice for S3 ETags, resource triggers, cache busting, and generating deterministic identifiers. For security use cases, consider [sha256](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sha256-function-in-terraform/view) or [bcrypt](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-bcrypt-function-in-terraform/view) instead.
