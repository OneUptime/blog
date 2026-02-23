# How to Use the base64decode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, base64decode, Decoding, Data Processing, Infrastructure as Code

Description: Learn how to use Terraform's base64decode function to decode base64-encoded strings from external sources, data lookups, and cross-system configuration sharing.

---

The `base64decode` function in Terraform converts a base64-encoded string back to its original UTF-8 representation. You need this when working with data that arrives encoded from external sources - secrets managers, API responses, data source lookups, or configuration files that store values in base64. This post covers how to decode effectively and where you will encounter base64-encoded data in infrastructure workflows.

## Function Syntax

```hcl
# base64decode(string)
base64decode("SGVsbG8sIFdvcmxkIQ==")
# Result: "Hello, World!"

base64decode("dGVycmFmb3Jt")
# Result: "terraform"
```

The input must be a valid base64-encoded string. If it is not valid base64, Terraform will throw an error during planning.

## Decoding Data from External Sources

The most common use case is decoding values that come from external systems:

```hcl
# AWS Secrets Manager returns base64-encoded secrets
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "prod/database/credentials"
}

locals {
  # The secret value is a JSON string (not base64 in this case,
  # but some secrets are stored as base64)
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

# If the secret IS base64-encoded
locals {
  raw_secret      = data.aws_secretsmanager_secret_version.db_creds.secret_string
  decoded_secret  = base64decode(local.raw_secret)
  parsed_secret   = jsondecode(local.decoded_secret)
}
```

## Decoding Kubernetes Secret Values

When reading Kubernetes secrets through data sources, values come base64-encoded:

```hcl
data "kubernetes_secret" "app" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }
}

locals {
  # Kubernetes secrets are base64-encoded in the API
  # Note: the Terraform Kubernetes provider usually decodes for you,
  # but if using kubectl_manifest or external data, you may need manual decoding
  db_password = data.kubernetes_secret.app.data["password"]
}
```

## Processing Base64 Data from APIs

When using `external` data sources or HTTP data sources that return base64:

```hcl
data "http" "config" {
  url = "https://config.example.com/api/v1/settings"

  request_headers = {
    Accept = "application/json"
  }
}

locals {
  # Assume the API returns JSON with a base64-encoded config field
  api_response = jsondecode(data.http.config.response_body)

  # Decode the base64-encoded configuration
  config_raw    = base64decode(local.api_response.config_base64)
  config_parsed = jsondecode(local.config_raw)
}
```

## Decoding Cloud-Init Output

Some cloud providers return instance metadata in base64:

```hcl
data "aws_instance" "web" {
  instance_id = var.instance_id
}

# If you retrieve user data from an existing instance, it may be base64-encoded
locals {
  # Decode the user data to inspect it
  user_data_decoded = base64decode(data.aws_instance.web.user_data_base64)
}

output "current_user_data" {
  value = local.user_data_decoded
}
```

## Roundtrip Encoding and Decoding

A common pattern is encoding data in one configuration and decoding it in another:

```hcl
# Module A - encodes and stores
locals {
  config = jsonencode({
    database_host = aws_db_instance.main.address
    database_port = aws_db_instance.main.port
    cache_host    = aws_elasticache_cluster.main.cache_nodes[0].address
  })
  config_encoded = base64encode(local.config)
}

resource "aws_ssm_parameter" "config" {
  name  = "/app/${var.environment}/config"
  type  = "String"
  value = local.config_encoded
}

# Module B - reads and decodes
data "aws_ssm_parameter" "config" {
  name = "/app/${var.environment}/config"
}

locals {
  config_decoded = jsondecode(base64decode(data.aws_ssm_parameter.config.value))
  db_host        = local.config_decoded.database_host
  db_port        = local.config_decoded.database_port
  cache_host     = local.config_decoded.cache_host
}
```

## Decoding Certificate Data

Certificates and keys are often stored or transmitted in base64:

```hcl
variable "tls_cert_b64" {
  type        = string
  description = "Base64-encoded TLS certificate"
  sensitive   = true
}

variable "tls_key_b64" {
  type        = string
  description = "Base64-encoded TLS private key"
  sensitive   = true
}

locals {
  tls_cert = base64decode(var.tls_cert_b64)
  tls_key  = base64decode(var.tls_key_b64)
}

resource "aws_iam_server_certificate" "app" {
  name             = "app-cert-${var.environment}"
  certificate_body = local.tls_cert
  private_key      = local.tls_key
}
```

## Validating Base64 Input

Use the `can` function to check if a string is valid base64 before decoding:

```hcl
variable "encoded_config" {
  type        = string
  description = "Base64-encoded configuration string"

  validation {
    condition     = can(base64decode(var.encoded_config))
    error_message = "The encoded_config must be a valid base64-encoded string."
  }
}
```

## Decoding and Parsing in One Step

Chain `base64decode` with parsing functions for structured data:

```hcl
locals {
  # Base64-encoded JSON
  json_b64 = "eyJuYW1lIjoibXlhcHAiLCJ2ZXJzaW9uIjoiMS4wLjAifQ=="
  json_decoded = jsondecode(base64decode(local.json_b64))
  # Result: { name = "myapp", version = "1.0.0" }

  # Base64-encoded YAML-like key=value pairs
  config_b64 = base64encode("host=db.example.com\nport=5432\ndbname=mydb")
  config_decoded = base64decode(local.config_b64)
  # Result: "host=db.example.com\nport=5432\ndbname=mydb"

  # Parse the decoded config into a map
  config_map = {
    for line in compact(split("\n", local.config_decoded)) :
    split("=", line)[0] => split("=", line)[1]
  }
  # Result: { host = "db.example.com", port = "5432", dbname = "mydb" }
}
```

## Working with Terraform State Sharing

When sharing data between Terraform workspaces through state, base64 encoding helps with complex strings:

```hcl
# Workspace A - producer
output "config_b64" {
  value = base64encode(jsonencode({
    vpc_id         = aws_vpc.main.id
    subnet_ids     = aws_subnet.private[*].id
    security_group = aws_security_group.app.id
  }))
}

# Workspace B - consumer
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  network_config = jsondecode(base64decode(
    data.terraform_remote_state.network.outputs.config_b64
  ))
  vpc_id         = local.network_config.vpc_id
  subnet_ids     = local.network_config.subnet_ids
  security_group = local.network_config.security_group
}
```

## Debugging Encoded Values

When troubleshooting, decode values in outputs to see what they contain:

```hcl
output "debug_decoded" {
  value     = base64decode(var.mystery_encoded_value)
  sensitive = true  # Mark as sensitive in case it contains secrets
}
```

## Error Handling

If the input is not valid base64, Terraform will error at plan time:

```hcl
# This will cause an error
# base64decode("not-valid-base64!!!")

# To handle potentially invalid input, use try()
locals {
  maybe_encoded = var.possibly_encoded_value

  decoded_value = try(
    base64decode(local.maybe_encoded),
    local.maybe_encoded  # Fall back to the raw value if decoding fails
  )
}
```

## Important Notes

1. `base64decode` only works with UTF-8 strings. If the base64 data represents binary content (like an image or a zip file), decoding it into a string will give you garbage. Use `base64decode` only when you know the underlying data is text.

2. Base64 decoding is not decryption. The data is not protected in any way. Anyone can decode a base64 string.

3. Padding characters (`=`) at the end of the base64 string are expected. Some systems omit padding, which may cause issues. Terraform handles standard base64 with padding.

4. Whitespace in the input is not automatically handled. If the base64 string contains newlines or spaces (common in PEM certificates), you may need to strip them first with `replace`.

## Summary

The `base64decode` function converts base64-encoded strings back to their original UTF-8 form. You will use it when processing data from secrets managers, Kubernetes secrets, API responses, and cross-workspace state sharing. It pairs naturally with `jsondecode` for processing encoded JSON, with `try` for handling potentially invalid input, and with `base64encode` for roundtrip encoding. The function is straightforward - the key is knowing which data sources and APIs deliver base64-encoded content so you know when to decode.
