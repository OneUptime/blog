# How to Use the base64gzip Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, base64gzip, Compression, Cloud Init, Lambda, Infrastructure as Code

Description: Learn how to use Terraform's base64gzip function to compress and encode strings for user data, Lambda functions, and cloud-init configs to stay within size limits.

---

The `base64gzip` function in Terraform compresses a string using gzip and then encodes the result as base64. This is a two-step operation in one function call: gzip compression followed by base64 encoding. You need this when you are hitting size limits on user data scripts, cloud-init configurations, or any other context where the data needs to be both compact and safely encoded as a text string.

## Function Syntax

```hcl
# base64gzip(string)
base64gzip("Hello, World!")
# Result: a base64 string representing the gzipped data
```

The function takes a UTF-8 string, compresses it with gzip, and returns the base64-encoded representation of the compressed data. The output is always a string.

## Why Compression Matters

Several cloud services have strict size limits on configuration data:

- AWS EC2 user data: 16 KB limit
- AWS Lambda environment variables: 4 KB total
- Cloud-init configs: varies by provider
- Azure custom data: 64 KB

When your scripts or configs approach these limits, `base64gzip` helps you fit more data into less space.

## Basic Usage

```hcl
locals {
  # A long script that might exceed size limits
  large_script = <<-EOF
    #!/bin/bash
    set -euo pipefail

    # Install packages
    apt-get update -y
    apt-get install -y nginx docker.io docker-compose awscli jq curl wget htop

    # Configure Nginx
    cat > /etc/nginx/sites-available/default <<'NGINX'
    server {
        listen 80;
        server_name _;
        location / {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
    NGINX

    # Start services
    systemctl restart nginx
    systemctl start docker

    echo "Setup complete"
  EOF

  # Compress and encode the script
  compressed_script = base64gzip(local.large_script)
}

output "size_comparison" {
  value = {
    original_length   = length(local.large_script)
    compressed_length = length(local.compressed_script)
    savings_percent   = format("%.1f%%",
      (1 - length(local.compressed_script) / length(local.large_script)) * 100
    )
  }
}
```

## User Data with Gzip Compression

AWS and most cloud providers support gzip-compressed user data. The instance's cloud-init will automatically detect and decompress gzip content:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  # cloud-init automatically decompresses gzip content
  user_data_base64 = base64gzip(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment = var.environment
    db_host     = aws_db_instance.main.address
    db_port     = aws_db_instance.main.port
    packages    = join(" ", var.packages)
  }))

  tags = {
    Name = "web-${var.environment}"
  }
}
```

Note the use of `user_data_base64` instead of `user_data`. The `user_data_base64` attribute accepts pre-encoded data, while `user_data` expects a plain string that the provider will encode.

## Cloud-Init Multipart with Compression

For complex cloud-init configurations that combine multiple parts:

```hcl
locals {
  # Part 1: Cloud config
  cloud_config = <<-EOF
    #cloud-config
    package_update: true
    packages:
      - nginx
      - docker.io
      - awscli
    runcmd:
      - systemctl start docker
      - systemctl enable docker
  EOF

  # Part 2: Shell script
  setup_script = <<-EOF
    #!/bin/bash
    echo "Running custom setup..."
    mkdir -p /opt/app
    aws s3 cp s3://${var.config_bucket}/config.json /opt/app/config.json
    docker pull ${var.docker_image}:${var.docker_tag}
    docker run -d --name app -p 8080:8080 ${var.docker_image}:${var.docker_tag}
  EOF

  # Combine and compress
  combined_user_data = <<-EOF
    Content-Type: multipart/mixed; boundary="==BOUNDARY=="
    MIME-Version: 1.0

    --==BOUNDARY==
    Content-Type: text/cloud-config; charset="us-ascii"

    ${local.cloud_config}
    --==BOUNDARY==
    Content-Type: text/x-shellscript; charset="us-ascii"

    ${local.setup_script}
    --==BOUNDARY==--
  EOF
}

resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  # Compressed multipart user data
  user_data = base64gzip(local.combined_user_data)
}
```

## Lambda Function Configuration

When you need to pass large configuration to Lambda functions through environment variables (which have a 4 KB total limit):

```hcl
locals {
  lambda_config = jsonencode({
    database = {
      host     = aws_db_instance.main.address
      port     = aws_db_instance.main.port
      name     = var.db_name
      ssl_mode = "require"
    }
    cache = {
      host = aws_elasticache_cluster.main.cache_nodes[0].address
      port = 6379
    }
    feature_flags = var.feature_flags
    allowed_origins = var.cors_origins
    log_level = var.log_level
  })
}

resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  environment {
    variables = {
      # Compressed config takes less space in the 4KB env var limit
      CONFIG_GZIP_B64 = base64gzip(local.lambda_config)
      ENVIRONMENT     = var.environment
    }
  }
}
```

The Lambda function then decompresses the config at runtime:

```javascript
// In the Lambda handler (Node.js)
const zlib = require('zlib');
const config = JSON.parse(
  zlib.gunzipSync(Buffer.from(process.env.CONFIG_GZIP_B64, 'base64')).toString()
);
```

## Comparing base64encode vs base64gzip

```hcl
locals {
  sample_text = <<-EOF
    This is a sample text that contains many repeated words.
    Repeated words compress well because gzip uses dictionary-based
    compression. The more repetition in your text, the better the
    compression ratio will be. Configuration files, scripts, and
    JSON documents typically have high repetition and compress very well.
  EOF

  # Regular base64 encoding (no compression)
  encoded = base64encode(local.sample_text)

  # Base64 with gzip compression
  compressed = base64gzip(local.sample_text)
}

output "comparison" {
  value = {
    original_bytes  = length(local.sample_text)
    base64_bytes    = length(local.encoded)
    base64gzip_bytes = length(local.compressed)
  }
  # base64 is always ~33% larger than the original
  # base64gzip is typically 50-80% smaller for text content
}
```

## Using with Azure Custom Data

Azure VMs also support compressed custom data:

```hcl
resource "azurerm_linux_virtual_machine" "app" {
  name                = "app-vm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_B2s"

  admin_username = var.admin_username

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  # Custom data accepts base64-encoded content (max 64 KB)
  custom_data = base64gzip(templatefile("${path.module}/templates/cloud_init.yaml.tpl", {
    environment = var.environment
    packages    = var.packages
  }))

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  network_interface_ids = [azurerm_network_interface.main.id]
}
```

## Compressing Kubernetes ConfigMap Data

When ConfigMap data is large:

```hcl
locals {
  # A large configuration file
  app_config = templatefile("${path.module}/templates/large_config.json.tpl", {
    database_host = var.db_host
    cache_host    = var.cache_host
    # ... many more variables
  })
}

resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = var.namespace
  }

  # Store compressed config - application decompresses at startup
  binary_data = {
    "config.json.gz" = base64gzip(local.app_config)
  }

  # Keep smaller configs uncompressed for easy inspection
  data = {
    "environment" = var.environment
    "version"     = var.app_version
  }
}
```

## Error Handling

The function will fail if given invalid UTF-8 input. For binary data, you would need a different approach:

```hcl
# This works - valid UTF-8 string
locals {
  compressed = base64gzip("valid utf-8 string")
}

# For binary file content, use filebase64 instead
# base64gzip only works with strings, not binary data
```

## When Not to Use base64gzip

Compression adds complexity to your workflow. Skip it when:

1. Your data is already small (under a few KB). The gzip overhead can actually make small strings larger.
2. The receiving system does not support gzip decompression. Not all systems handle compressed input automatically.
3. You need the data to be human-readable in the state file or plan output.
4. You are working with binary data that is already compressed (images, archives).

## Summary

The `base64gzip` function is a single-call solution for compressing and encoding string data. Use it when you are approaching size limits on user data scripts, Lambda environment variables, or any configuration that is transmitted as a text string. It pairs well with `templatefile` for compressing dynamic templates, and with `jsonencode` for compressing JSON configuration. The receiving system needs to know the data is gzip-compressed, but cloud-init and most cloud services handle this automatically.
