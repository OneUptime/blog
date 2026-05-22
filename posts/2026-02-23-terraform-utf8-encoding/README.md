# How to Use UTF-8 Encoding and Character Sets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, UTF-8, Encoding, Infrastructure as Code

Description: Learn how Terraform handles UTF-8 encoding, character sets, and Unicode in configuration files, string values, identifiers, and template files.

---

Terraform configuration files use UTF-8 encoding exclusively. This means you can use international characters, special symbols, and emoji in string values. But there are rules about where Unicode characters are allowed and how Terraform processes them. Understanding these rules prevents encoding-related bugs that can be surprisingly hard to diagnose.

## Terraform Files Must Be UTF-8

Every `.tf` and `.tf.json` file must be UTF-8 encoded. Terraform will reject files that contain non-UTF-8 byte sequences, such as non-ASCII text saved as Latin-1, Windows-1252, or UTF-16.

If you create a file in an editor that uses a different encoding, Terraform may throw parse errors or produce garbled output. Most modern editors default to UTF-8, but it is worth checking.

```bash
# Check a file's encoding on Linux/Mac

file -bi main.tf
# Expected output: text/plain; charset=utf-8

# Convert a file to UTF-8 if needed
iconv -f WINDOWS-1252 -t UTF-8 main.tf > main_utf8.tf
```

## UTF-8 in String Values

String values in Terraform fully support UTF-8 characters:

```hcl
# UTF-8 strings are fully supported in values
resource "aws_ssm_parameter" "greeting" {
  name  = "/app/greeting"
  type  = "String"
  value = "Bonjour le monde"
}

resource "aws_ssm_parameter" "japanese" {
  name  = "/app/greeting-ja"
  type  = "String"
  value = "こんにちは世界"
}

# Tags can contain UTF-8 characters
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Description = "Serveur principal de production"
    Team        = "Engineering"
  }
}
```

However, keep in mind that while Terraform handles these characters fine, your cloud provider might have restrictions on what characters are allowed in specific fields. AWS resource names, for instance, often only accept ASCII characters.

## Identifiers Can Use Unicode

String values support full UTF-8, and Terraform identifiers - argument names, resource names, variable names, local names, and so on - also accept Unicode letters. Terraform implements the Unicode identifier syntax and extends it to allow the ASCII hyphen character:

```hcl
# Valid identifiers
variable "instance_type" {
  type = string
}

variable "tipo_de_instancia" {
  type = string
}

resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type
}

# Hyphens are also allowed in identifiers
variable "instance-type" {
  type = string
}

# This would NOT work as an identifier:
# resource "aws_instance" "web server" {}  # spaces are NOT allowed
```

The rules for identifiers are:
- The first character must not be a digit
- Can contain Unicode letters, digits, underscores, and hyphens
- Cannot contain spaces

## Unicode Escape Sequences

Terraform supports Unicode escape sequences in strings for characters that are hard to type directly:

```hcl
locals {
  # Unicode escape: \uNNNN for basic multilingual plane
  copyright = "\u00A9 2026 My Company"  # the copyright symbol

  # Unicode escape: \UNNNNNNNN for supplementary planes
  extended = "\U0001F600"  # a grinning face emoji

  # You can also just type UTF-8 characters directly
  direct_copyright = "© 2026 My Company"
}

output "copyright_notice" {
  value = local.copyright
}
```

The escape sequences are:
- `\uNNNN` - Unicode code point in the Basic Multilingual Plane (4 hex digits)
- `\UNNNNNNNN` - Any Unicode code point (8 hex digits)

## Heredoc Strings and UTF-8

Heredoc strings (multi-line strings) also support UTF-8:

```hcl
resource "aws_ssm_parameter" "config" {
  name  = "/app/config"
  type  = "String"

  value = <<-EOT
    # Application Configuration
    # Derniere mise a jour: 2026-02-23
    greeting_en = Hello World
    greeting_fr = Bonjour le monde
    greeting_de = Hallo Welt
    greeting_es = Hola Mundo
  EOT
}
```

## Template Files and Encoding

When you use `templatefile()` or `file()`, the loaded file must also be UTF-8:

```hcl
# The template file must be UTF-8 encoded
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # This script file must be UTF-8
  user_data = file("${path.module}/scripts/bootstrap.sh")
}

# Template files with UTF-8 content
locals {
  config = templatefile("${path.module}/templates/app.conf.tpl", {
    app_name    = var.app_name
    description = var.description  # can contain UTF-8
    region_name = var.region_name
  })
}
```

If a template file is not UTF-8, the `file()` and `templatefile()` functions will either error or produce garbled output.

## String Functions and UTF-8

Terraform's string functions are UTF-8 aware. They operate on Unicode characters, not raw bytes:

```hcl
locals {
  text = "Hello"

  # length counts user-perceived characters, not bytes
  char_count = length(local.text)  # this counts characters

  # substr works on characters, not bytes
  first_five = substr(local.text, 0, 5)

  # upper and lower use Unicode case rules
  upper_text = upper("hello world")  # "HELLO WORLD"
  lower_text = lower("HELLO WORLD")  # "hello world"

  # Unicode normalization can affect exact byte representation
  # when strings are encoded for external systems
}
```

A subtle gotcha: Unicode has multiple ways to represent some characters. For example, the character "e with accent" can be a single code point (U+00E9) or two code points (e + combining accent). Terraform applies Unicode normalization to strings, so be careful if an external system depends on an exact byte representation.

## JSON Encoding and UTF-8

The `jsonencode()` function handles UTF-8 strings correctly:

```hcl
locals {
  config = {
    name        = "Mon Application"
    description = "Application de production"
    version     = "1.0.0"
  }

  # jsonencode preserves UTF-8 characters
  config_json = jsonencode(local.config)
}

output "config" {
  value = local.config_json
  # Output: {"description":"Application de production","name":"Mon Application","version":"1.0.0"}
}
```

## Base64 Encoding for Binary Data

If you need to handle non-UTF-8 binary data, use base64 encoding:

```hcl
# Encode text as base64
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Use user_data_base64 when passing base64-encoded user data
  user_data_base64 = base64encode(templatefile("${path.module}/scripts/init.sh", {
    app_name = var.app_name
  }))
}

# Read raw file bytes as base64, without interpreting the file as UTF-8
locals {
  archive_base64 = filebase64("${path.module}/files/archive.zip")
}

# Decode base64 data
locals {
  decoded = base64decode("SGVsbG8gV29ybGQ=")  # "Hello World"
}
```

## BOM (Byte Order Mark) Handling

UTF-8 files sometimes start with a BOM (Byte Order Mark) - the bytes `EF BB BF`. Some Windows editors add this automatically. UTF-8 does not require a BOM, and Terraform state files must not include one, so it is best practice to save Terraform-related files without a BOM.

```bash
# Check for BOM
hexdump -C main.tf | head -1
# If it starts with "ef bb bf", the file has a BOM

# Remove BOM on Linux/Mac
sed -i '1s/^\xEF\xBB\xBF//' main.tf
```

## Editor Configuration

Configure your editor to use UTF-8 without BOM for Terraform files:

```ini
# .editorconfig
[*.tf]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.tf.json]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

## Line Endings

Terraform accepts both Unix (LF) and Windows (CRLF) line endings, but LF is recommended. Mixing line endings in the same file can cause issues with heredoc strings and the `file()` function.

```bash
# Convert CRLF to LF
dos2unix main.tf

# Or with sed
sed -i 's/\r$//' main.tf
```

## Wrapping Up

Terraform uses UTF-8 encoding for all configuration files. String values support the full Unicode range, and identifiers can use Unicode identifier characters. When working with template files, make sure they are also UTF-8 encoded. Be aware of Unicode normalization issues when passing strings to systems that care about exact byte representation, and use `.editorconfig` to keep your team's files consistently encoded. For binary data, use base64 encoding functions such as `filebase64()`.

For more on Terraform file handling, see [How to Understand Terraform File Loading Order](https://oneuptime.com/blog/post/2026-02-23-terraform-file-loading-order/view) and [How to Use .tf.json Files for Machine-Generated Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-tf-json-files/view).
