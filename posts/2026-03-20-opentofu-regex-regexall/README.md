# How to Use regex() and regexall() in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function

Description: Learn how to use the regex() and regexall() functions in OpenTofu to match and extract patterns from strings.

`regex()` returns the first match of a regular expression in a string (or errors if no match), while `regexall()` returns all matches as a list. They use RE2 syntax, which excludes lookaheads and backreferences but covers most common patterns.

## regex() Syntax

```hcl
regex(pattern, string)
```

Returns the matched string, or a list/map of captured groups:

```hcl
# Simple match - no capture groups, returns matched string

> regex("[0-9]+", "server-123-prod")
"123"

# Named capture groups - returns map
> regex("(?P<name>[a-z]+)-(?P<num>[0-9]+)", "server-123")
{"name" = "server", "num" = "123"}

# Unnamed capture groups - returns list
> regex("([a-z]+)-([0-9]+)", "server-123")
["server", "123"]
```

## regexall() Syntax

```hcl
regexall(pattern, string)
```

Returns a list of all matches:

```hcl
> regexall("[0-9]+", "port 8080 or 443 or 80")
["8080", "443", "80"]

> regexall("[a-z]+", "hello 123 world 456")
["hello", "world"]
```

## Practical Examples

### Extracting Parts from Resource ARNs

```hcl
locals {
  arn = "arn:aws:iam::123456789012:role/my-role"
  
  arn_parts = regex(
    "arn:aws:(?P<service>[^:]+):(?P<region>[^:]*):(?P<account>[0-9]*):(?P<resource>.+)",
    local.arn
  )
  
  service    = local.arn_parts.service    # "iam"
  account_id = local.arn_parts.account   # "123456789012"
  resource   = local.arn_parts.resource  # "role/my-role"
}
```

### Validating Input Formats

```hcl
variable "environment" {
  type = string
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "email" {
  type = string
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$", var.email))
    error_message = "Must be a valid email address."
  }
}

variable "ami_id" {
  type = string
  
  validation {
    condition     = can(regex("^ami-[0-9a-f]{8,17}$", var.ami_id))
    error_message = "AMI ID must match ami-XXXXXXXX format."
  }
}
```

### Extracting Version Numbers

```hcl
variable "image_tag" {
  type    = string
  default = "myapp:v2.1.3"
}

locals {
  version_parts = regex(
    "v(?P<major>[0-9]+)\\.(?P<minor>[0-9]+)\\.(?P<patch>[0-9]+)",
    var.image_tag
  )
  
  major_version = local.version_parts.major  # "2"
  minor_version = local.version_parts.minor  # "1"
  patch_version = local.version_parts.patch  # "3"
}
```

### Finding All Ports in a Policy

```hcl
locals {
  policy_string = "allow ports 80,443,8080,8443 from any"
  
  all_ports = regexall("[0-9]+", local.policy_string)
  # ["80", "443", "8080", "8443"]
  
  port_numbers = [for p in local.all_ports : tonumber(p)]
  # [80, 443, 8080, 8443]
}
```

### Counting Matches

```hcl
locals {
  log_text   = "ERROR: failed, ERROR: timeout, WARNING: slow, ERROR: null"
  
  errors     = regexall("ERROR", local.log_text)
  error_count = length(local.errors)  # 3
  
  has_errors  = length(regexall("ERROR", local.log_text)) > 0  # true
}
```

## RE2 Syntax Reference

```bash
.       Any character (except newline by default)
[abc]   Character class
[^abc]  Negated character class
\d      Digit [0-9]
\w      Word character [a-zA-Z0-9_]
\s      Whitespace
*       Zero or more
+       One or more
?       Zero or one
{n,m}   Between n and m times
^       Start of string
$       End of string
(?P<name>pattern)  Named capture group
```

## Conclusion

`regex()` and `regexall()` bring pattern matching to OpenTofu configurations. Use `regex()` with named capture groups for extracting structured data from strings like ARNs and image tags. Use `regexall()` when you need all occurrences. Always pair with `can()` in validation blocks since `regex()` throws an error when no match is found.
