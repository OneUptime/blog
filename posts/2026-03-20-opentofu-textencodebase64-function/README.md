# How to Use textencodebase64() in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, Encoding

Description: Learn how to use the textencodebase64() function in OpenTofu to encode text in a specific character encoding and then Base64-encode it.

The `textencodebase64()` function encodes a string using a specified character encoding and then Base64-encodes the result. This is useful when you need to provide text in a specific character set (like UTF-16) encoded as Base64.

## Syntax

```hcl
textencodebase64(string, encoding)
```

## Basic Usage

```hcl
# Encode UTF-8 text as Base64 (same as base64encode for ASCII)

> textencodebase64("Hello, World!", "UTF-8")
"SGVsbG8sIFdvcmxkIQ=="

# Encode as UTF-16LE (little-endian)
> textencodebase64("Hello", "UTF-16LE")
"SABlAGwAbABvAA=="

# Encode as UTF-16BE (big-endian)  
> textencodebase64("Hello", "UTF-16BE")
"AEgAZQBsAGwAbw=="
```

## Practical Use Case: Windows PowerShell Commands

Azure and Windows-based resources often require Base64-encoded UTF-16LE for PowerShell commands:

```hcl
locals {
  # Azure custom script extension requires UTF-16LE Base64 for PowerShell
  powershell_script = <<-EOT
    Install-WindowsFeature -Name Web-Server
    Start-Service -Name W3SVC
    Set-Content -Path 'C:\inetpub\wwwroot\index.html' -Value 'Hello from OpenTofu!'
  EOT
  
  encoded_command = textencodebase64(local.powershell_script, "UTF-16LE")
}

resource "azurerm_virtual_machine_extension" "setup" {
  name                 = "setup-iis"
  virtual_machine_id   = azurerm_windows_virtual_machine.web.id
  publisher            = "Microsoft.Compute"
  type                 = "CustomScriptExtension"
  type_handler_version = "1.10"

  settings = jsonencode({
    commandToExecute = "powershell -EncodedCommand ${local.encoded_command}"
  })
}
```

## AWS Systems Manager with Encoding

```hcl
locals {
  # Some SSM automation requires specific encoding
  script = "echo 'Deployment complete'"
  
  utf8_encoded    = textencodebase64(local.script, "UTF-8")
  latin1_encoded  = textencodebase64(local.script, "ISO-8859-1")
}
```

## Supported Encodings

Common supported encoding names:

```hcl
# UTF-8 (most common)
textencodebase64(text, "UTF-8")

# UTF-16 Little Endian (Windows default, PowerShell)
textencodebase64(text, "UTF-16LE")

# UTF-16 Big Endian
textencodebase64(text, "UTF-16BE")

# Latin-1 / ISO-8859-1 (Western European)
textencodebase64(text, "ISO-8859-1")

# Windows-1252
textencodebase64(text, "windows-1252")
```

## Difference from base64encode()

```hcl
# base64encode() always uses UTF-8 internally
base64encode("Hello") == textencodebase64("Hello", "UTF-8")
# true for ASCII text

# For non-ASCII or specific encoding requirements, use textencodebase64
locals {
  emoji_text = "Hello 👋"
  
  # base64encode: encodes as UTF-8
  utf8_b64 = base64encode(local.emoji_text)
  
  # textencodebase64: explicitly specify encoding
  explicit_utf8_b64 = textencodebase64(local.emoji_text, "UTF-8")
  
  # Same result for UTF-8
  are_equal = utf8_b64 == explicit_utf8_b64  # true
}
```

## Conclusion

`textencodebase64()` is specialized for situations where you need text encoded in a specific character set before Base64-encoding. The most common real-world use case is PowerShell's `-EncodedCommand` parameter on Windows/Azure, which requires UTF-16LE encoding. For most other Base64 needs, `base64encode()` (which uses UTF-8) is sufficient.
