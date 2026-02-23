# How to Convert Between Types in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Types, Functions

Description: Learn how to convert between types in Terraform using built-in conversion functions, understand automatic type coercion, and handle common type mismatch scenarios.

---

Type conversions in Terraform come up more often than you might expect. You get a number from a module output but need a string for a resource argument. A JSON decode gives you a map but you need a list. A variable comes in as a string but needs to be a bool.

Terraform handles some conversions automatically, but others require explicit function calls. This post covers all the conversion scenarios you are likely to encounter.

## Automatic Type Conversions

Terraform performs implicit conversions in a few well-defined situations:

### Number to String

Wherever a string is expected, Terraform silently converts numbers:

```hcl
variable "port" {
  type    = number
  default = 8080
}

locals {
  # Number automatically converts to string in interpolation
  url = "http://localhost:${var.port}/api"
  # Result: "http://localhost:8080/api"
}

# Number converts to string when assigned to a string argument
resource "aws_ssm_parameter" "port" {
  name  = "/app/port"
  type  = "String"
  value = var.port  # 8080 becomes "8080"
}
```

### Bool to String

```hcl
variable "debug" {
  type    = bool
  default = true
}

locals {
  debug_label = "Debug: ${var.debug}"
  # Result: "Debug: true"
}
```

### String to Number (when unambiguous)

```hcl
variable "port_string" {
  type    = string
  default = "8080"
}

# When a number is expected, valid numeric strings convert automatically
resource "aws_security_group_rule" "app" {
  type              = "ingress"
  from_port         = var.port_string  # "8080" becomes 8080
  to_port           = var.port_string
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
}
```

### String to Bool

```hcl
# Only "true" and "false" strings convert to bool
variable "enabled" {
  type = bool
}

# Passing enabled = "true" works - converts to true
# Passing enabled = "false" works - converts to false
# Passing enabled = "yes" fails - not a valid bool string
```

## Explicit Conversion Functions

When automatic conversion is not available or you want to be explicit, use these functions:

### tostring()

```hcl
locals {
  # Convert number to string
  port_str = tostring(8080)     # "8080"

  # Convert bool to string
  flag_str = tostring(true)     # "true"

  # Convert null to string - this returns null, not "null"
  null_str = tostring(null)     # null
}
```

### tonumber()

```hcl
locals {
  # Convert string to number
  port = tonumber("8080")       # 8080

  # Convert string with decimals
  ratio = tonumber("3.14")      # 3.14

  # These fail at plan time:
  # tonumber("abc")             # Error: not a valid number
  # tonumber("12abc")           # Error: not a valid number
  # tonumber(true)              # Error: cannot convert bool to number
}
```

### tobool()

```hcl
locals {
  # Convert string to bool
  yes = tobool("true")          # true
  no  = tobool("false")         # false

  # These fail:
  # tobool("yes")               # Error: not a valid bool
  # tobool("1")                 # Error: not a valid bool
  # tobool(1)                   # Error: cannot convert number to bool
}
```

## Collection Type Conversions

### tolist()

Converts a set to a list (adds ordering):

```hcl
variable "zones" {
  type    = set(string)
  default = ["us-east-1c", "us-east-1a", "us-east-1b"]
}

locals {
  # Set to list - elements are sorted
  zone_list = tolist(var.zones)
  # Result: ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Now you can access by index
  first_zone = local.zone_list[0]  # "us-east-1a"
}
```

### toset()

Converts a list to a set (removes duplicates, removes ordering):

```hcl
locals {
  # List with duplicates
  tags = ["web", "api", "web", "frontend", "api"]

  # Convert to set - removes duplicates
  unique_tags = toset(local.tags)
  # Result: set("api", "frontend", "web")

  # Useful for for_each which requires a set or map
}

resource "aws_iam_user" "users" {
  for_each = toset(var.user_names)
  name     = each.value
}
```

### tomap()

Converts an object to a map (all values must be convertible to a common type):

```hcl
locals {
  # Object with mixed types
  config = {
    name    = "web"
    port    = 8080
    debug   = true
  }

  # Convert to map(string) - all values become strings
  config_map = tomap(local.config)
  # Result: { "name" = "web", "port" = "8080", "debug" = "true" }
}
```

## Converting Between Collection Types

### List of Objects to Map

This is one of the most common conversions:

```hcl
variable "servers" {
  type = list(object({
    name = string
    ip   = string
    role = string
  }))
  default = [
    { name = "web-01", ip = "10.0.1.10", role = "web" },
    { name = "web-02", ip = "10.0.1.11", role = "web" },
    { name = "db-01",  ip = "10.0.2.10", role = "db" },
  ]
}

locals {
  # Convert list to map keyed by name
  server_map = { for s in var.servers : s.name => s }
  # Result: {
  #   "web-01" = { name = "web-01", ip = "10.0.1.10", role = "web" }
  #   "web-02" = { name = "web-02", ip = "10.0.1.11", role = "web" }
  #   "db-01"  = { name = "db-01",  ip = "10.0.2.10", role = "db" }
  # }

  # Use with for_each
}

resource "aws_instance" "servers" {
  for_each = local.server_map

  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name = each.key
    Role = each.value.role
  }
}
```

### Map to List

```hcl
variable "ports" {
  type = map(number)
  default = {
    http  = 80
    https = 443
    api   = 8080
  }
}

locals {
  # Get keys as a list
  port_names = keys(var.ports)
  # Result: ["api", "http", "https"]

  # Get values as a list
  port_numbers = values(var.ports)
  # Result: [8080, 80, 443]

  # Convert to list of objects
  port_list = [for name, port in var.ports : {
    name = name
    port = port
  }]
  # Result: [
  #   { name = "api",   port = 8080 },
  #   { name = "http",  port = 80 },
  #   { name = "https", port = 443 },
  # ]
}
```

## JSON and YAML Conversions

### JSON to Terraform Types

```hcl
locals {
  # Parse JSON string to Terraform value
  config = jsondecode(<<-JSON
    {
      "name": "web-app",
      "port": 8080,
      "features": ["auth", "logging"],
      "database": {
        "host": "db.example.com",
        "port": 5432
      }
    }
  JSON
  )

  # Access the parsed values
  app_name = local.config.name              # "web-app"
  app_port = local.config.port              # 8080
  features = local.config.features          # ["auth", "logging"]
  db_host  = local.config.database.host     # "db.example.com"
}
```

### Terraform Types to JSON

```hcl
locals {
  config_object = {
    name     = "web-app"
    port     = 8080
    features = ["auth", "logging"]
  }

  # Convert to JSON string
  config_json = jsonencode(local.config_object)
  # Result: '{"features":["auth","logging"],"name":"web-app","port":8080}'
}
```

### YAML Conversions

```hcl
locals {
  # Parse YAML
  config = yamldecode(<<-YAML
    name: web-app
    port: 8080
    features:
      - auth
      - logging
  YAML
  )

  # Convert to YAML
  output_yaml = yamlencode({
    name     = "web-app"
    port     = 8080
    features = ["auth", "logging"]
  })
}
```

## Safe Type Conversion with try() and can()

When a conversion might fail, use `try()` for a fallback or `can()` to check first:

```hcl
locals {
  # try() returns the first expression that succeeds
  port = try(tonumber(var.port_input), 8080)
  # If var.port_input is "abc", returns 8080 instead of erroring

  # can() returns true if the expression would succeed
  is_numeric = can(tonumber(var.input))

  # Practical pattern: parse JSON with fallback
  config = try(jsondecode(var.config_json), {
    name = "default"
    port = 8080
  })
}
```

### Validation with can()

```hcl
variable "port" {
  type = string

  validation {
    condition     = can(tonumber(var.port))
    error_message = "Port must be a numeric string."
  }

  validation {
    condition     = can(tonumber(var.port)) && tonumber(var.port) >= 1 && tonumber(var.port) <= 65535
    error_message = "Port must be between 1 and 65535."
  }
}
```

## Flattening Nested Structures

The `flatten` function is essential when converting nested lists:

```hcl
variable "vpcs" {
  type = map(object({
    cidr    = string
    subnets = list(string)
  }))
  default = {
    prod = {
      cidr    = "10.0.0.0/16"
      subnets = ["10.0.1.0/24", "10.0.2.0/24"]
    }
    dev = {
      cidr    = "10.1.0.0/16"
      subnets = ["10.1.1.0/24"]
    }
  }
}

locals {
  # Create a flat list of all subnet objects
  all_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for subnet_cidr in vpc.subnets : {
        vpc_name    = vpc_name
        vpc_cidr    = vpc.cidr
        subnet_cidr = subnet_cidr
      }
    ]
  ])
  # Result: [
  #   { vpc_name = "prod", vpc_cidr = "10.0.0.0/16", subnet_cidr = "10.0.1.0/24" },
  #   { vpc_name = "prod", vpc_cidr = "10.0.0.0/16", subnet_cidr = "10.0.2.0/24" },
  #   { vpc_name = "dev",  vpc_cidr = "10.1.0.0/16", subnet_cidr = "10.1.1.0/24" },
  # ]

  # Convert to a map for for_each
  subnet_map = { for s in local.all_subnets : "${s.vpc_name}-${s.subnet_cidr}" => s }
}
```

## Summary

Terraform handles many type conversions automatically - numbers and bools to strings, numeric strings to numbers, and "true"/"false" strings to bools. For everything else, use the explicit conversion functions: `tostring()`, `tonumber()`, `tobool()`, `tolist()`, `toset()`, `tomap()`. For JSON and YAML, use `jsondecode`/`jsonencode` and `yamldecode`/`yamlencode`. When conversions might fail, wrap them in `try()` for fallbacks or `can()` for validation. The most common real-world conversion is turning a list of objects into a map with a for expression, which you will use constantly with `for_each`.
