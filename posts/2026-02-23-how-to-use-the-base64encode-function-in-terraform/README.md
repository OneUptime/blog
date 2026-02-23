# How to Use the base64encode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, base64encode, Encoding, User Data, Infrastructure as Code

Description: Learn how to use Terraform's base64encode function to encode strings for user data scripts, API payloads, cloud-init configs, and Kubernetes secrets.

---

Base64 encoding is a way to represent binary or text data as ASCII characters. In infrastructure as code, you need it more often than you might think. Cloud provider APIs expect user data in base64, Kubernetes secrets must be base64-encoded, and various configuration systems use base64 for safe transport of structured data. Terraform's `base64encode` function handles this conversion for you.

## Function Syntax

The function takes a string and returns its base64-encoded representation:

```hcl
# base64encode(string)
base64encode("Hello, World!")
# Result: "SGVsbG8sIFdvcmxkIQ=="

base64encode("terraform")
# Result: "dGVycmFmb3Jt"
```

The input must be a UTF-8 string. The output is a standard base64 string that can contain letters (A-Z, a-z), digits (0-9), plus (+), slash (/), and equals (=) for padding.

## Encoding User Data for EC2

AWS launch templates require user data to be base64-encoded:

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = "t3.micro"

  # Launch templates need base64-encoded user data
  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    echo "Hello from ${var.environment}" > /var/www/html/index.html
    systemctl start nginx
    systemctl enable nginx
  EOF
  )
}
```

Note that `aws_instance` resources handle the encoding automatically, but `aws_launch_template` does not. Knowing when to encode manually is important.

## Encoding with templatefile

Combine `base64encode` with `templatefile` for dynamic user data:

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment = var.environment
    db_host     = aws_db_instance.main.address
    db_port     = aws_db_instance.main.port
    app_version = var.app_version
  }))
}
```

## Kubernetes Secrets

Kubernetes secrets require values to be base64-encoded in raw manifests:

```hcl
resource "kubernetes_secret" "app" {
  metadata {
    name      = "app-secrets"
    namespace = var.namespace
  }

  # The Kubernetes provider handles encoding for you with 'data'
  data = {
    username = var.db_username
    password = var.db_password
  }
}

# But if you are using kubernetes_manifest or kubectl_manifest,
# you need to encode manually
resource "kubectl_manifest" "secret" {
  yaml_body = <<-EOF
    apiVersion: v1
    kind: Secret
    metadata:
      name: app-secrets
      namespace: ${var.namespace}
    type: Opaque
    data:
      username: ${base64encode(var.db_username)}
      password: ${base64encode(var.db_password)}
      connection-string: ${base64encode("postgresql://${var.db_username}:${var.db_password}@${var.db_host}:5432/${var.db_name}")}
  EOF
}
```

## Encoding JSON Payloads

When you need to pass JSON data through a base64-encoded field:

```hcl
locals {
  config = {
    database = {
      host = aws_db_instance.main.address
      port = aws_db_instance.main.port
      name = var.db_name
    }
    cache = {
      host = aws_elasticache_cluster.main.cache_nodes[0].address
      port = 6379
    }
    log_level = var.log_level
  }

  # Encode the JSON config as base64
  config_base64 = base64encode(jsonencode(local.config))
}

# Pass it as an environment variable
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda.arn

  filename = "lambda.zip"

  environment {
    variables = {
      # Base64-encoded config - the Lambda decodes it at runtime
      APP_CONFIG_B64 = local.config_base64
    }
  }
}
```

## Cloud-Init User Data

Cloud-init configurations sometimes include base64-encoded file contents:

```hcl
locals {
  # Encode a certificate for cloud-init
  tls_cert_b64 = base64encode(tls_self_signed_cert.server.cert_pem)
  tls_key_b64  = base64encode(tls_private_key.server.private_key_pem)

  cloud_init = <<-EOF
    #cloud-config
    write_files:
      - path: /etc/ssl/certs/server.crt
        encoding: b64
        content: ${local.tls_cert_b64}
        permissions: '0644'
      - path: /etc/ssl/private/server.key
        encoding: b64
        content: ${local.tls_key_b64}
        permissions: '0600'
  EOF
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = local.cloud_init
}
```

## Encoding for API Gateway

API Gateway integrations sometimes need base64-encoded request or response templates:

```hcl
resource "aws_api_gateway_integration_response" "mock" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health.http_method
  status_code = "200"

  response_templates = {
    "application/json" = jsonencode({
      status  = "healthy"
      version = var.app_version
    })
  }
}
```

## Working with Multi-Line Content

Base64 encoding works with multi-line strings:

```hcl
locals {
  # Encode a multi-line script
  init_script = base64encode(<<-EOF
    #!/bin/bash
    set -euo pipefail

    echo "Starting initialization..."

    # Install dependencies
    apt-get update -y
    apt-get install -y \
      docker.io \
      docker-compose \
      awscli

    # Configure Docker
    systemctl start docker
    systemctl enable docker

    # Pull and run the application
    docker pull ${var.docker_image}:${var.docker_tag}
    docker run -d \
      --name app \
      -p 80:8080 \
      -e ENVIRONMENT=${var.environment} \
      ${var.docker_image}:${var.docker_tag}

    echo "Initialization complete"
  EOF
  )
}
```

## Encoding Binary-Like Content

While `base64encode` works with strings, you can encode file contents read with the `file()` function:

```hcl
locals {
  # Encode the contents of a local file
  script_b64 = base64encode(file("${path.module}/scripts/bootstrap.sh"))
  config_b64 = base64encode(file("${path.module}/configs/app.json"))
}
```

For actual binary files, use `filebase64()` instead:

```hcl
locals {
  # Read a binary file and encode it as base64
  binary_b64 = filebase64("${path.module}/files/archive.zip")
}
```

## Encoding for Azure Resources

Azure resources frequently need base64-encoded values:

```hcl
resource "azurerm_virtual_machine_extension" "custom_script" {
  name                 = "custom-script"
  virtual_machine_id   = azurerm_linux_virtual_machine.main.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.0"

  settings = jsonencode({
    script = base64encode(<<-EOF
      #!/bin/bash
      apt-get update -y
      apt-get install -y nginx
      echo "Hello from Azure" > /var/www/html/index.html
    EOF
    )
  })
}
```

## Roundtrip: Encoding and Decoding

You can verify your encoding with `base64decode`:

```hcl
locals {
  original = "Hello, Terraform!"
  encoded  = base64encode(local.original)
  decoded  = base64decode(local.encoded)

  # decoded == original
  roundtrip_works = local.decoded == local.original  # true
}

output "encoding_demo" {
  value = {
    original = local.original       # "Hello, Terraform!"
    encoded  = local.encoded        # "SGVsbG8sIFRlcnJhZm9ybSE="
    decoded  = local.decoded        # "Hello, Terraform!"
    matches  = local.roundtrip_works # true
  }
}
```

## Common Mistakes

1. Double encoding. If a resource already base64-encodes its input, calling `base64encode` yourself results in double encoding. Check the provider documentation to see if encoding is automatic.

2. Encoding sensitive values. The encoded string is not encrypted - it is trivially decodable. Do not treat base64 as a security measure.

3. Line length limits. Some systems have line length limits for base64 strings. Terraform's `base64encode` does not insert line breaks, which is usually what you want but may cause issues with older systems.

4. Character encoding. The input must be valid UTF-8. If you are encoding file contents that are not UTF-8, use `filebase64` instead.

## Summary

The `base64encode` function converts strings to base64 format, which is needed for user data in launch templates, Kubernetes secrets, cloud-init encoded files, and various API payloads. It pairs naturally with `templatefile`, `jsonencode`, and `file` for encoding dynamic or file-based content. Remember to check whether your target resource handles encoding automatically before adding it yourself, and always use `filebase64` for binary files.
