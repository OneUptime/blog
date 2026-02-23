# How to Use UTF-8 Encoding and Character Sets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, UTF-8, Encoding, Infrastructure as Code

Description: Learn how Terraform handles UTF-8 encoding, character sets, and Unicode in configuration files, string values, identifiers, and template files.

---

Terraform configuration files use UTF-8 encoding exclusively. This means you can use international characters, special symbols, and emoji in string values. But there are rules about where Unicode characters are allowed and how Terraform processes them. Understanding these rules prevents encoding-related bugs that can be surprisingly hard to diagnose.

## Terraform Files Must Be UTF-8

Every `.tf` and `.tf.json` file must be UTF-8 encoded. Terraform will reject files that use other encodings like Latin-1, Windows-1252, or UTF-16.

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
  value = "Hello World"
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

## Identifiers Must Be ASCII

While string values support full UTF-8, Terraform identifiers - resource names, variable names, local names, and so on - are restricted to ASCII letters, digits, underscores, and hyphens:

```hcl
# Valid identifiers - ASCII only
variable "instance_type" {
  type = string
}

resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type
}

# These would NOT work as identifiers:
# variable "tipo_de_instancia" {}   # actually fine - ASCII accented chars are not used here
# variable "instance-type" {}        # hyphens ARE allowed in variable names - this works
# resource "aws_instance" "web server" {}  # spaces are NOT allowed
```

The rules for identifiers are:
- Must start with a letter or underscore
- Can contain letters, digits, underscores, and hyphens
- Letters must be ASCII (a-z, A-Z)

## Unicode Escape Sequences

Terraform supports Unicode escape sequences in strings for characters that are hard to type directly:

```hcl
locals {
  # Unicode escape: \uNNNN for basic multilingual plane
  copyright = "\u00A9 2026 My Company"  # the copyright symbol

  # Unicode escape: \UNNNNNNNN for supplementary planes
  extended = "\U0001F600"  # a grinning face emoji

  # You can also just type UTF-8 characters directly
  direct_copyright = "2026 My Company"
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

Terraform's string functions are UTF-8 aware. They operate on Unicode code points, not raw bytes:

```hcl
locals {
  text = "Hello"

  # length counts Unicode characters, not bytes
  char_count = length(local.text)  # this counts characters

  # substr works on characters, not bytes
  first_five = substr(local.text, 0, 5)

  # upper and lower work with ASCII letters
  upper_text = upper("hello world")  # "HELLO WORLD"
  lower_text = lower("HELLO WORLD")  # "hello world"

  # String comparison is byte-level
  # Two strings with the same Unicode characters but different
  # byte representations (e.g., composed vs decomposed) may not match
}
```

A subtle gotcha: Unicode has multiple ways to represent some characters. For example, the character "e with accent" can be a single code point (U+00E9) or two code points (e + combining accent). Terraform compares strings at the byte level, so these would not be equal.

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
# Encode binary or non-UTF-8 data as base64
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # user_data is base64 encoded automatically by the provider
  user_data = base64encode(templatefile("${path.module}/scripts/init.sh", {
    app_name = var.app_name
  }))
}

# Decode base64 data
locals {
  decoded = base64decode("SGVsbG8gV29ybGQ=")  # "Hello World"
}
```

## BOM (Byte Order Mark) Handling

UTF-8 files sometimes start with a BOM (Byte Order Mark) - the bytes `EF BB BF`. Some Windows editors add this automatically. Terraform handles UTF-8 BOM gracefully in most cases, but it is best practice to save files without a BOM.

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

Terraform uses UTF-8 encoding for all configuration files. String values support the full Unicode range, but identifiers are restricted to ASCII. When working with template files, make sure they are also UTF-8 encoded. Be aware of Unicode normalization issues when comparing strings, and use `.editorconfig` to keep your team's files consistently encoded. For binary data, use base64 encoding functions.

For more on Terraform file handling, see [How to Understand Terraform File Loading Order](https://oneuptime.com/blog/post/2026-02-23-terraform-file-loading-order/view) and [How to Use .tf.json Files for Machine-Generated Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-tf-json-files/view).
