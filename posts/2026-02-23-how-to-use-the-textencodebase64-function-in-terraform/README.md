# How to Use the textencodebase64 Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Encoding, Base64, Character Encoding, Infrastructure as Code

Description: Learn how to use Terraform's textencodebase64 function to encode text with specific character encodings into base64 for cross-platform infrastructure configurations.

---

Most base64 encoding in Terraform assumes UTF-8 text, and for the majority of cases, that is perfectly fine. But what happens when you need to produce base64-encoded text in a different character encoding, like UTF-16 for Windows configurations or ISO-8859-1 for legacy systems? That is where `textencodebase64` comes in.

## What Does textencodebase64 Do?

The `textencodebase64` function encodes a given string using a specified character encoding, then returns the result as a base64-encoded string. This is different from `base64encode`, which always uses UTF-8.

```hcl
# Encode text as UTF-16LE and then base64 encode it
output "encoded" {
  value = textencodebase64("Hello, World!", "UTF-16LE")
}
```

## Syntax

```hcl
textencodebase64(string, encoding_name)
```

- `string` - The text to encode
- `encoding_name` - The target character encoding (e.g., "UTF-16LE", "UTF-8", "ISO-8859-1")

The function returns a base64-encoded string.

## Supported Encodings

Terraform supports a range of character encodings, including:

- UTF-8
- UTF-16LE (little-endian)
- UTF-16BE (big-endian)
- ISO-8859-1 (Latin-1)
- Windows-1252

The exact list depends on the Go standard library's encoding support, which covers most common character encodings.

## Why You Need This

### Windows PowerShell Scripts

Windows PowerShell's `-EncodedCommand` parameter expects commands in UTF-16LE encoding, base64 encoded. This is the most common use case for `textencodebase64` in Terraform.

### Legacy System Integration

Older systems may expect text in specific encodings like ISO-8859-1 or Windows-1252. When you need to pass configuration data to these systems as base64, you need the right encoding.

### Cross-Platform Compatibility

Different operating systems use different default character encodings. `textencodebase64` lets you produce the exact byte sequence that the target system expects.

## Practical Examples

### Windows EC2 User Data with PowerShell

The most common real-world use case is encoding PowerShell scripts for Windows instances:

```hcl
locals {
  # The PowerShell script to run on the Windows instance
  powershell_script = <<-PS
    # Install IIS
    Install-WindowsFeature -Name Web-Server -IncludeManagementTools

    # Configure the default website
    Set-Content -Path "C:\\inetpub\\wwwroot\\index.html" -Value "<h1>Hello from Terraform</h1>"

    # Enable remote management
    Enable-PSRemoting -Force

    # Set the hostname
    Rename-Computer -NewName "${var.hostname}" -Force -Restart
  PS
}

resource "aws_instance" "windows" {
  ami           = var.windows_ami
  instance_type = "t3.medium"

  # Windows user data must be base64 encoded
  # PowerShell scripts in user data work with UTF-8 base64
  user_data_base64 = base64encode(local.powershell_script)

  tags = {
    Name = var.hostname
  }
}
```

For PowerShell's `-EncodedCommand`, you need UTF-16LE:

```hcl
locals {
  # A command to run via PowerShell's encoded command parameter
  ps_command = "Get-Service | Where-Object {$_.Status -eq 'Running'}"

  # Encode as UTF-16LE then base64 - this is what PowerShell -EncodedCommand expects
  encoded_command = textencodebase64(local.ps_command, "UTF-16LE")
}

resource "null_resource" "run_powershell" {
  provisioner "remote-exec" {
    inline = [
      "powershell -EncodedCommand ${local.encoded_command}"
    ]

    connection {
      type     = "winrm"
      host     = aws_instance.windows.public_ip
      user     = "Administrator"
      password = var.admin_password
    }
  }
}
```

### Azure Custom Script Extensions

Azure VMs use custom script extensions that sometimes need specific encodings:

```hcl
locals {
  setup_script = <<-SCRIPT
    # Configure the application
    $config = @{
      DatabaseServer = "${var.db_host}"
      DatabaseName   = "${var.db_name}"
      AppPort        = ${var.app_port}
    }
    $config | ConvertTo-Json | Set-Content "C:\app\config.json"

    # Start the application service
    Start-Service -Name "MyApp"
  SCRIPT

  # UTF-16LE encoding for PowerShell compatibility
  encoded_script = textencodebase64(local.setup_script, "UTF-16LE")
}

resource "azurerm_virtual_machine_extension" "setup" {
  name                 = "app-setup"
  virtual_machine_id   = azurerm_windows_virtual_machine.app.id
  publisher            = "Microsoft.Compute"
  type                 = "CustomScriptExtension"
  type_handler_version = "1.10"

  settings = jsonencode({
    commandToExecute = "powershell -EncodedCommand ${local.encoded_script}"
  })
}
```

### Generating Configuration Files with Specific Encodings

When a target system expects a configuration file in a specific encoding:

```hcl
variable "legacy_config" {
  description = "Configuration for the legacy system"
  type = object({
    server_name = string
    database    = string
    charset     = string
  })
  default = {
    server_name = "app-server"
    database    = "main_db"
    charset     = "latin1"
  }
}

locals {
  # Build the configuration content
  config_content = <<-EOT
    [server]
    name=${var.legacy_config.server_name}
    database=${var.legacy_config.database}
    charset=${var.legacy_config.charset}
  EOT

  # Encode in ISO-8859-1 (Latin-1) for the legacy system
  encoded_config = textencodebase64(local.config_content, "ISO-8859-1")
}

# Store the encoded configuration for deployment
resource "aws_ssm_parameter" "legacy_config" {
  name  = "/${var.environment}/legacy-config-encoded"
  type  = "String"
  value = local.encoded_config

  tags = {
    Encoding = "ISO-8859-1"
    Format   = "base64"
  }
}
```

### Handling Byte Order Marks (BOM)

Some Windows applications expect a UTF-16LE Byte Order Mark at the start of the content. You can handle this by prepending the BOM character:

```hcl
locals {
  # The actual content
  content = "Hello from Terraform"

  # UTF-16LE with BOM - some Windows tools expect this
  # The BOM for UTF-16LE is the character U+FEFF
  content_with_bom = "\uFEFF${local.content}"
  encoded_with_bom = textencodebase64(local.content_with_bom, "UTF-16LE")
}
```

## Comparison with base64encode

The key difference is character encoding:

```hcl
locals {
  text = "Hello"

  # base64encode always uses UTF-8
  utf8_base64 = base64encode(local.text)

  # textencodebase64 lets you choose the encoding
  utf8_explicit  = textencodebase64(local.text, "UTF-8")      # Same as base64encode
  utf16le_base64 = textencodebase64(local.text, "UTF-16LE")   # Different bytes!
}

# utf8_base64 and utf8_explicit produce the same result
# utf16le_base64 produces a different (longer) result because
# UTF-16 uses 2 bytes per ASCII character instead of 1
```

## Decoding the Reverse

To decode base64 content with a specific character encoding, use `textdecodebase64`:

```hcl
locals {
  # Encode
  encoded = textencodebase64("Hello", "UTF-16LE")

  # Decode
  decoded = textdecodebase64(local.encoded, "UTF-16LE")
  # Result: "Hello"
}
```

See our post on [textdecodebase64](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-textdecodebase64-function-in-terraform/view) for more details.

## Summary

The `textencodebase64` function fills a niche but important role in Terraform: encoding text in character encodings other than UTF-8 before base64 encoding. Its primary use case is Windows PowerShell's `-EncodedCommand` parameter, which requires UTF-16LE encoding. Beyond that, it is useful for legacy system integration and any scenario where the target system does not expect UTF-8. For most base64 encoding needs, `base64encode` (which uses UTF-8) is sufficient, but when you need control over the character encoding, `textencodebase64` is the right tool.
