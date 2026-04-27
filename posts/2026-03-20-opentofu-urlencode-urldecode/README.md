# How to Use the urlencode and urldecode Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the urlencode and urldecode functions in OpenTofu to encode and decode URL-safe strings for API endpoints and webhook configurations.

## Introduction

The `urlencode` and `urldecode` functions in OpenTofu handle URL percent-encoding. `urlencode` converts a string so it is safe to include in a URL query string or path, while `urldecode` reverses this process. These are essential when constructing API endpoints, webhook URLs, and configuration values containing special characters.

## Syntax

```hcl
urlencode(string)
urldecode(string)
```

- `urlencode` replaces special characters with `%XX` sequences
- `urldecode` converts `%XX` sequences back to their original characters
- Both handle Unicode via UTF-8 encoding

## Basic Examples

```hcl
output "encode_spaces" {
  value = urlencode("hello world")       # Returns "hello+world"
}

output "encode_special" {
  value = urlencode("a=1&b=2")          # Returns "a%3D1%26b%3D2"
}

output "decode_example" {
  value = urldecode("hello%20world")     # Returns "hello world"
}

output "roundtrip" {
  value = urldecode(urlencode("my value!@#"))  # Returns "my value!@#"
}
```

## Practical Use Cases

### Constructing API Webhook URLs

```hcl
variable "alert_message" {
  type    = string
  default = "CPU usage > 90% in us-east-1"
}

variable "slack_webhook_base" {
  type    = string
  default = "https://hooks.slack.com/services/T00000/B00000/XXXXXXXX"
}

locals {
  # Encode the message for safe URL inclusion
  encoded_message = urlencode(var.alert_message)
  webhook_url     = "${var.slack_webhook_base}?message=${local.encoded_message}"
}
```

### Building Query String Parameters

```hcl
variable "filter_tag" {
  type    = string
  default = "environment=production&team=platform"
}

locals {
  encoded_filter = urlencode(var.filter_tag)
}

output "api_url" {
  value = "https://api.example.com/resources?filter=${local.encoded_filter}"
}
```

### CloudWatch Dashboard Links

```hcl
variable "log_group" {
  type    = string
  default = "/aws/lambda/my-function"
}

locals {
  encoded_log_group = urlencode(var.log_group)
}

output "cloudwatch_url" {
  value = "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/${local.encoded_log_group}"
}
```

### Encoding SNS Message Parameters

```hcl
variable "notification_text" {
  type    = string
  default = "Deployment complete: service=api version=1.2.3 status=success"
}

resource "aws_sns_topic_subscription" "webhook" {
  topic_arn             = aws_sns_topic.alerts.arn
  protocol              = "https"
  endpoint              = "https://hooks.example.com/notify?msg=${urlencode(var.notification_text)}"
  endpoint_auto_confirms = true
}
```

### Processing URL-Encoded Input

```hcl
variable "encoded_config" {
  type        = string
  description = "URL-encoded JSON configuration"
  default     = "%7B%22env%22%3A%22prod%22%7D"
}

locals {
  # Decode the URL-encoded JSON and parse it
  decoded_config = jsondecode(urldecode(var.encoded_config))
}

output "environment" {
  value = local.decoded_config["env"]  # Returns "prod"
}
```

## Step-by-Step Usage

1. Identify strings that contain special characters needing URL encoding.
2. Apply `urlencode()` before including in URLs.
3. Apply `urldecode()` when processing encoded values received from external sources.
4. Test in `tofu console`:

```bash
tofu console

> urlencode("hello world!")
"hello+world%21"
> urldecode("a%3D1%26b%3D2")
"a=1&b=2"
```

## Characters Encoded by urlencode

Characters that are not URL-safe are encoded:
- Spaces → `+` (query-string style encoding)
- `=` → `%3D`
- `&` → `%26`
- `+` → `%2B`
- `#` → `%23`
- `/` → `%2F` (when encoding path segments or query values)

## urlencode vs base64encode

| Function | Use Case |
|----------|----------|
| `urlencode` | Encoding strings for inclusion in URLs |
| `base64encode` | Encoding binary data or complex strings for transmission |

## Conclusion

The `urlencode` and `urldecode` functions in OpenTofu are essential for working with URLs, API endpoints, and webhook configurations that contain special characters. Use `urlencode` when constructing URLs with dynamic values, and `urldecode` when parsing URL-encoded inputs from external sources. These functions ensure your URLs are properly formatted and free from encoding errors.
