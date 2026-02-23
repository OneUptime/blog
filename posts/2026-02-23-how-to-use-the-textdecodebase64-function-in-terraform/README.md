# How to Use the textdecodebase64 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Encoding, Base64, Character Encoding, Infrastructure as Code

Description: Learn how to use Terraform's textdecodebase64 function to decode base64 content with specific character encodings for cross-platform compatibility.

---

When working with base64-encoded data from external systems, the content is not always UTF-8 encoded. Windows systems often use UTF-16LE, legacy databases might use ISO-8859-1, and various APIs produce base64 content in different character encodings. Terraform's `textdecodebase64` function handles this by decoding base64 content with a specified character encoding, converting it to a UTF-8 Terraform string.

## What Does textdecodebase64 Do?

The `textdecodebase64` function takes a base64-encoded string and a character encoding name, decodes the base64 to get the raw bytes, then interprets those bytes using the specified encoding to produce a UTF-8 string that Terraform can work with.

```hcl
# Decode a base64 string that was encoded in UTF-16LE
output "decoded" {
  value = textdecodebase64("SABlAGwAbABvAA==", "UTF-16LE")
  # Result: "Hello"
}
```

## Syntax

```hcl
textdecodebase64(source, encoding)
```

- `source` - A base64-encoded string
- `encoding` - The character encoding of the underlying text (e.g., "UTF-16LE", "ISO-8859-1")

The function returns a UTF-8 string.

## How It Differs from base64decode

The standard `base64decode` function assumes the underlying content is UTF-8. If the content is in a different encoding, `base64decode` will produce garbled text or an error:

```hcl
locals {
  # A base64 string containing UTF-16LE encoded text
  utf16le_base64 = textencodebase64("Hello, World!", "UTF-16LE")

  # Wrong: base64decode assumes UTF-8, so the result will be garbled
  wrong = base64decode(local.utf16le_base64)

  # Correct: textdecodebase64 handles the encoding properly
  correct = textdecodebase64(local.utf16le_base64, "UTF-16LE")
}
```

## Practical Examples

### Reading Windows-Encoded Configuration

When a Windows system stores configuration as base64-encoded UTF-16LE:

```hcl
# Suppose an external data source returns Windows-encoded base64 data
data "aws_ssm_parameter" "windows_config" {
  name = "/windows/encoded-config"
}

locals {
  # The parameter contains base64-encoded UTF-16LE text
  # Decode it properly to get a usable Terraform string
  windows_config = textdecodebase64(
    data.aws_ssm_parameter.windows_config.value,
    "UTF-16LE"
  )

  # Now parse it (assuming it is JSON or another format)
  parsed_config = jsondecode(local.windows_config)
}

output "server_name" {
  value = local.parsed_config.server_name
}
```

### Processing Output from Windows Commands

When a provisioner captures Windows command output in base64:

```hcl
# Imagine a workflow where a Windows script outputs base64-encoded results
data "external" "windows_info" {
  program = ["powershell", "-Command", <<-PS
    $info = @{
      hostname = $env:COMPUTERNAME
      os       = (Get-WmiObject Win32_OperatingSystem).Caption
    }
    $json = $info | ConvertTo-Json
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $encoded = [Convert]::ToBase64String($bytes)
    Write-Output "{`"result`": `"$encoded`"}"
  PS
  ]
}

locals {
  # Decode the base64 result (UTF-8 in this case)
  system_info = jsondecode(
    textdecodebase64(data.external.windows_info.result.result, "UTF-8")
  )
}
```

### Decoding Legacy System Data

When integrating with legacy systems that use older character encodings:

```hcl
variable "legacy_data_base64" {
  description = "Base64-encoded data from the legacy system (ISO-8859-1)"
  type        = string
}

locals {
  # Decode the legacy data from ISO-8859-1 to a usable UTF-8 string
  legacy_data = textdecodebase64(var.legacy_data_base64, "ISO-8859-1")
}

output "legacy_content" {
  value = local.legacy_data
}
```

### Round-Trip Encoding and Decoding

A complete example showing the encode/decode cycle:

```hcl
locals {
  original_text = "Configuration data with special characters"

  # Encode to UTF-16LE base64
  encoded = textencodebase64(local.original_text, "UTF-16LE")

  # Decode back to verify round-trip works
  decoded = textdecodebase64(local.encoded, "UTF-16LE")

  # These should be identical
  round_trip_matches = local.original_text == local.decoded
}

output "verification" {
  value = {
    original   = local.original_text
    encoded    = local.encoded
    decoded    = local.decoded
    matches    = local.round_trip_matches
  }
}
```

### Processing Multi-Encoding Data Sources

When you receive data from multiple sources with different encodings:

```hcl
variable "data_sources" {
  description = "Map of data sources with their encodings"
  type = map(object({
    data     = string  # base64-encoded content
    encoding = string  # character encoding
  }))
  default = {
    windows_config = {
      data     = "SABlAGwAbABvAA=="
      encoding = "UTF-16LE"
    }
    legacy_report = {
      data     = "SGVsbG8="
      encoding = "ISO-8859-1"
    }
    modern_api = {
      data     = "SGVsbG8="
      encoding = "UTF-8"
    }
  }
}

locals {
  # Decode each data source with its correct encoding
  decoded_data = {
    for name, source in var.data_sources :
    name => textdecodebase64(source.data, source.encoding)
  }
}

output "all_decoded" {
  value = local.decoded_data
}
```

### Working with AWS Lambda Environment Variables

Lambda environment variables have size limits. Some teams encode larger config blocks:

```hcl
data "aws_lambda_function" "processor" {
  function_name = "data-processor"
}

locals {
  # If the Lambda function stores encoded config in an env var
  encoded_config = try(
    data.aws_lambda_function.processor.environment[0].variables["ENCODED_CONFIG"],
    ""
  )

  # Decode it (assuming UTF-8 encoding)
  lambda_config = local.encoded_config != "" ? jsondecode(
    textdecodebase64(local.encoded_config, "UTF-8")
  ) : {}
}
```

### Handling International Text

When working with text that contains characters from different languages:

```hcl
locals {
  # Japanese text encoded in UTF-16LE base64
  japanese_base64 = textencodebase64("Terraform is great", "UTF-16LE")

  # Decode it back
  japanese_text = textdecodebase64(local.japanese_base64, "UTF-16LE")
}
```

## Error Handling

If the base64 content cannot be decoded with the specified encoding, Terraform will raise an error. Use `try()` for graceful handling:

```hcl
locals {
  # Safely attempt to decode, with a fallback
  decoded_safely = try(
    textdecodebase64(var.encoded_input, "UTF-16LE"),
    "Failed to decode input"
  )
}
```

## Supported Encodings

The function supports the same encodings as `textencodebase64`:

- UTF-8
- UTF-16LE
- UTF-16BE
- ISO-8859-1
- Windows-1252

And others supported by Go's `encoding` package.

## When to Use textdecodebase64 vs base64decode

Use `base64decode` when:
- The content is UTF-8 encoded (the most common case)
- You are working with standard web APIs that use UTF-8

Use `textdecodebase64` when:
- The content is in a non-UTF-8 encoding
- You are processing Windows-generated base64 content
- You are integrating with legacy systems
- You need explicit control over the character encoding

## Summary

The `textdecodebase64` function is the complement to `textencodebase64`. It handles the decoding side of the equation when working with base64 content in non-UTF-8 character encodings. While `base64decode` covers the common case of UTF-8 content, `textdecodebase64` is essential for Windows integration, legacy system compatibility, and any scenario where the character encoding is not UTF-8. For the encoding side, see our [textencodebase64 guide](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-textencodebase64-function-in-terraform/view).
