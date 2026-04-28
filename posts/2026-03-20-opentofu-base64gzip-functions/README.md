# How to Use the base64gzip and base64gunzip Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the base64gzip and base64gunzip functions in OpenTofu to compress and decompress large scripts and configuration data.

## Introduction

The `base64gzip` function in OpenTofu compresses a string using gzip and then Base64-encodes the result. The `base64gunzip` function reverses this - it decodes from Base64 and decompresses. These functions are useful for reducing the size of large user-data scripts and configuration payloads.

## Syntax

```hcl
base64gzip(string)
base64gunzip(string)
```

## Basic Examples

```hcl
output "compressed" {
  value = base64gzip("hello world hello world hello world")
  # Returns a compact Base64 string
}

output "decompressed" {
  value = base64gunzip(base64gzip("hello world"))  # Returns "hello world"
}
```

## Practical Use Cases

### Compressing Large User Data Scripts

EC2 user data has a 16KB limit. Large scripts can exceed this. `base64gzip` compresses before encoding.

```hcl
locals {
  large_setup_script = <<-SCRIPT
    #!/bin/bash
    set -e
    
    # Install dependencies
    apt-get update -y
    apt-get install -y nginx docker.io postgresql-client python3-pip
    
    # Configure nginx
    cat > /etc/nginx/sites-available/app << 'EOF'
    server {
        listen 80;
        location / {
            proxy_pass http://localhost:8080;
        }
    }
    EOF
    
    # More configuration...
    systemctl start nginx
    systemctl enable nginx
  SCRIPT

  # Compress for EC2 user_data (stays under 16KB limit)
  user_data = base64gzip(local.large_setup_script)
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  # Use user_data_base64 because base64gzip output is already Base64-encoded
  user_data_base64 = local.user_data

  tags = {
    Name = "app-server"
  }
}
```

### Storing Compressed Config in SSM

```hcl
variable "application_config" {
  type = object({
    log_level    = string
    max_retries  = number
    endpoints    = list(string)
  })
}

resource "aws_ssm_parameter" "config" {
  name  = "/app/compressed-config"
  type  = "String"
  # Compress the JSON config before storing
  value = base64gzip(jsonencode(var.application_config))
}
```

### Kubernetes ConfigMap with Compressed Data

```hcl
locals {
  large_config = file("${path.module}/configs/large-config.yaml")
}

resource "kubernetes_config_map" "app" {
  metadata {
    name = "app-config"
  }

  data = {
    "config.yaml.gz.b64" = base64gzip(local.large_config)
  }
}
```

## Step-by-Step Usage

1. Identify large string content that needs compression.
2. Apply `base64gzip(content)` to get a compressed, Base64-encoded string.
3. The receiving system must decompress (most Linux systems support `base64 -d | gunzip`).
4. Test in `tofu console`:

```bash
tofu console

> length(base64gzip("a very long string repeated many times"))
# Compare with base64encode for size difference

```

## Compression Benefit

```hcl
locals {
  test_string = join("", [for i in range(100) : "hello world "])

  uncompressed_size = length(base64encode(local.test_string))
  compressed_size   = length(base64gzip(local.test_string))
}

output "size_comparison" {
  value = {
    uncompressed = local.uncompressed_size
    compressed   = local.compressed_size
  }
}
```

## Conclusion

The `base64gzip` and `base64gunzip` functions are valuable for handling large configuration payloads in OpenTofu. Use `base64gzip` when your user data or config exceeds size limits, or when you want to reduce storage and transfer costs for configuration data.
