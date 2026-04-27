# How to Use the textencodebase64 and textdecodebase64 Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the textencodebase64 and textdecodebase64 functions in OpenTofu to encode and decode strings with specific character encodings like UTF-16.

## Introduction

The `textencodebase64` and `textdecodebase64` functions in OpenTofu encode and decode strings with a specified character encoding (like UTF-16, UTF-32, or others) and then Base64-encode/decode the result. This is useful when interfacing with systems that require specific character encoding formats, such as Windows-based systems that expect UTF-16 encoded data.

## Syntax

```hcl
textencodebase64(string, encoding)
textdecodebase64(string, encoding)
```

- **string** - the input string (or Base64 string for decode)
- **encoding** - the character encoding (e.g., `"UTF-8"`, `"UTF-16LE"`, `"UTF-32"`)

## Basic Examples

```hcl
output "utf16_encoded" {
  value = textencodebase64("hello", "UTF-16LE")
  # Encodes "hello" as UTF-16LE then Base64-encodes
}

output "utf8_encoded" {
  value = textencodebase64("hello", "UTF-8")
  # Same as base64encode for ASCII content
}

output "roundtrip" {
  value = textdecodebase64(textencodebase64("hello", "UTF-16LE"), "UTF-16LE")
  # Returns "hello"
}
```

## Practical Use Cases

### Windows Azure AD Password (UTF-16LE)

Azure AD requires passwords to be UTF-16LE encoded for certain APIs:

```hcl
variable "admin_password" {
  type      = string
  sensitive = true
}

locals {
  # Azure AD requires UTF-16LE encoded password wrapped in quotes
  encoded_password = textencodebase64("\"${var.admin_password}\"", "UTF-16LE")
}

resource "azurerm_windows_virtual_machine" "main" {
  name                = "windows-vm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_DS1_v2"
  admin_username      = "adminuser"
  admin_password      = var.admin_password

  # Used in WinRM or ARM template contexts
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "MicrosoftWindowsServer"
    offer     = "WindowsServer"
    sku       = "2019-Datacenter"
    version   = "latest"
  }
}

output "encoded_for_api" {
  sensitive = true
  value     = local.encoded_password
}
```

### UTF-16 Encoded Kubernetes Secrets

```hcl
variable "windows_password" {
  type      = string
  sensitive = true
}

resource "kubernetes_secret" "windows_creds" {
  metadata {
    name = "windows-credentials"
  }

  binary_data = {
    # Store as UTF-16LE for Windows compatibility.
    # Use binary_data because the value is already base64-encoded.
    password = textencodebase64(var.windows_password, "UTF-16LE")
  }
}
```

### Decoding Externally Provided UTF-16 Data

```hcl
variable "utf16_config_b64" {
  type        = string
  description = "Base64-encoded UTF-16LE configuration"
}

locals {
  decoded_config = textdecodebase64(var.utf16_config_b64, "UTF-16LE")
}

output "config_text" {
  value = local.decoded_config
}
```

## Step-by-Step Usage

1. Identify if the target system requires a specific character encoding.
2. Use `textencodebase64(string, "UTF-16LE")` for Windows/Azure contexts.
3. Use `textdecodebase64(b64_string, encoding)` to decode incoming encoded data.
4. Test in `tofu console`:

```bash
tofu console

> textencodebase64("hello", "UTF-8")
"aGVsbG8="
> textdecodebase64("aGVsbG8=", "UTF-8")
"hello"
```

## Supported Encodings

Common encodings include:
- `UTF-8` (default, same as `base64encode`)
- `UTF-16LE` (Windows-native, used by Azure AD)
- `UTF-16BE`
- `UTF-32`
- `ISO-8859-1`

## When to Use

Use `textencodebase64` when:
- Interfacing with Windows-specific APIs (Azure AD, WinRM)
- A system explicitly requires a non-UTF-8 encoding
- Decoding text received from Windows systems

For standard UTF-8 encoding, use `base64encode` directly.

## Conclusion

The `textencodebase64` and `textdecodebase64` functions handle the specialized case of character-encoding-aware Base64 operations in OpenTofu. They are primarily used when working with Azure, Windows Active Directory, and other systems that require UTF-16LE encoded data. For standard UTF-8 use cases, `base64encode` and `base64decode` are sufficient.
