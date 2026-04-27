# How to Use the textencodebase64 and textdecodebase64 Functions in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Function, Encoding

Description: Learn how to use textencodebase64 and textdecodebase64 in OpenTofu to encode and decode strings with specific character encodings like UTF-16.

## Overview

OpenTofu provides two functions for text encoding with explicit character set support:

- `textencodebase64(string, encoding)` - encodes a string using the specified character encoding, then Base64-encodes the result
- `textdecodebase64(string, encoding)` - Base64-decodes a string and then interprets the bytes using the specified character encoding

Unlike `base64encode` (which always uses UTF-8), these functions let you specify the character encoding. This is important when working with Windows-centric tools or services that require UTF-16 or other encodings.

## textencodebase64

Use `textencodebase64` when a target service requires a specific character encoding.

```hcl
locals {
  # Encode a PowerShell script for tools that expect a
  # Base64-encoded UTF-16LE string (for example, PowerShell's
  # -EncodedCommand parameter)
  powershell_script = <<-EOT
    Write-Host "Configuring server..."
    Install-WindowsFeature -Name Web-Server
    Start-Service W3SVC
  EOT

  # Encode as UTF-16LE and then Base64-encode
  encoded_script = textencodebase64(local.powershell_script, "UTF-16LE")
}

output "encoded_powershell_script" {
  value = local.encoded_script
}
```

## textdecodebase64

Use `textdecodebase64` to decode Base64 data that uses a non-UTF-8 encoding.

```hcl
# Example: decode a UTF-16LE encoded secret stored in a parameter

data "aws_ssm_parameter" "windows_config" {
  name = "/windows/config"
}

locals {
  # The parameter value is Base64-encoded UTF-16LE - decode it correctly
  decoded_config = textdecodebase64(
    data.aws_ssm_parameter.windows_config.value,
    "UTF-16LE"
  )
}
```

## Supported Encodings

OpenTofu uses the IANA character set names. Common supported encodings include:

```hcl
locals {
  # UTF-8 (equivalent to base64encode)
  utf8_encoded = textencodebase64("Hello, World!", "UTF-8")

  # UTF-16LE (Windows default, required for PowerShell -EncodedCommand)
  utf16le_encoded = textencodebase64("Hello, World!", "UTF-16LE")

  # UTF-16BE
  utf16be_encoded = textencodebase64("Hello, World!", "UTF-16BE")

  # Windows-1252 (Western European Windows encoding)
  cp1252_encoded = textencodebase64("Hello, World!", "windows-1252")
}
```

## Practical Example: PowerShell Encoded Command

AWS Systems Manager Run Command and some CI systems require PowerShell scripts as a Base64-encoded UTF-16LE string.

```hcl
variable "script_content" {
  type    = string
  default = "Get-Service | Where-Object {$_.Status -eq 'Running'}"
}

locals {
  # PowerShell -EncodedCommand requires UTF-16LE Base64
  ps_encoded = textencodebase64(var.script_content, "UTF-16LE")
}

resource "aws_ssm_document" "run_script" {
  name          = "RunPowerShellScript"
  document_type = "Command"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Run encoded PowerShell"
    mainSteps = [{
      action = "aws:runPowerShellScript"
      name   = "runScript"
      inputs = {
        runCommand = ["powershell -EncodedCommand ${local.ps_encoded}"]
      }
    }]
  })
}
```

## Important Notes

- For UTF-8 encoding, `textencodebase64(str, "UTF-8")` produces the same result as `base64encode(str)`.
- The encoding name must be a valid IANA character set name; invalid names will produce an error.
- These functions are primarily needed for Windows-based workloads and legacy systems that do not use UTF-8.

## Conclusion

The `textencodebase64` and `textdecodebase64` functions fill a specific gap for Windows and legacy system automation. When working with PowerShell scripts or services that require non-UTF-8 encodings, these functions ensure your data is correctly encoded.
