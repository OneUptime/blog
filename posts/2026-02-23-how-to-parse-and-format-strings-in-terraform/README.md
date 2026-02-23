# How to Parse and Format Strings in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, String Parsing, String Formatting, HCL, Infrastructure as Code

Description: A practical guide to parsing and formatting strings in Terraform using built-in functions like format, split, join, regex, replace, and trimming functions.

---

Strings are everywhere in Terraform configurations. Resource names, tags, connection strings, ARNs, file paths, and error messages all require some level of string manipulation. Terraform provides a solid set of built-in functions for parsing strings apart and formatting them back together. This post covers the most useful patterns you will reach for in day-to-day work.

## The format Function

The `format` function works like `printf` in most programming languages. It takes a format string and a list of values, then produces a formatted string:

```hcl
locals {
  # Basic string formatting
  greeting = format("Hello, %s!", "World")
  # Result: "Hello, World!"

  # Padding with zeros
  instance_id = format("instance-%04d", 7)
  # Result: "instance-0007"

  # Multiple values
  resource_tag = format("%s-%s-%s", var.project, var.environment, var.region)
  # Result (example): "myapp-production-us-east-1"

  # Floating point formatting
  cost_display = format("Monthly cost: $%.2f", 142.7)
  # Result: "Monthly cost: $142.70"
}
```

Common format verbs:
- `%s` - string
- `%d` - integer
- `%f` - floating point
- `%t` - boolean
- `%v` - default format for any value
- `%q` - quoted string

## Splitting Strings

The `split` function breaks a string into a list based on a separator:

```hcl
locals {
  # Split a comma-separated string into a list
  csv_input = "web,api,worker,scheduler"
  services  = split(",", local.csv_input)
  # Result: ["web", "api", "worker", "scheduler"]

  # Split a path into components
  file_path  = "/var/log/myapp/error.log"
  path_parts = split("/", local.file_path)
  # Result: ["", "var", "log", "myapp", "error.log"]

  # Get the filename from a path
  filename = element(split("/", local.file_path), length(split("/", local.file_path)) - 1)
  # Result: "error.log"

  # Split an AWS ARN to extract components
  arn        = "arn:aws:s3:::my-bucket/my-key"
  arn_parts  = split(":", local.arn)
  service    = local.arn_parts[2]   # "s3"
  account_id = local.arn_parts[4]   # "" (empty for S3)
  resource   = local.arn_parts[5]   # "my-bucket/my-key"
}
```

## Joining Strings

The `join` function is the inverse of `split`. It takes a separator and a list, then concatenates them:

```hcl
locals {
  # Join a list into a comma-separated string
  tags_list  = ["terraform", "aws", "production"]
  tags_string = join(", ", local.tags_list)
  # Result: "terraform, aws, production"

  # Build a path from segments
  path_segments = ["var", "log", "myapp"]
  log_path      = join("/", concat([""], local.path_segments))
  # Result: "/var/log/myapp"

  # Create a DNS name from parts
  dns_parts = [var.hostname, var.domain, var.tld]
  fqdn      = join(".", local.dns_parts)
  # Result (example): "api.example.com"
}
```

## Trimming Whitespace and Characters

Terraform offers several trimming functions for cleaning up strings:

```hcl
locals {
  # Remove leading and trailing whitespace
  messy_input = "  hello world  "
  clean       = trimspace(local.messy_input)
  # Result: "hello world"

  # Remove a specific prefix
  s3_arn     = "arn:aws:s3:::my-bucket"
  bucket     = trimprefix(local.s3_arn, "arn:aws:s3:::")
  # Result: "my-bucket"

  # Remove a specific suffix
  hostname_with_dot = "api.example.com."
  hostname_clean    = trimsuffix(local.hostname_with_dot, ".")
  # Result: "api.example.com"

  # Remove specific characters from both ends
  quoted_value = "\"hello\""
  unquoted     = trim(local.quoted_value, "\"")
  # Result: "hello"
}
```

## String Replacement

The `replace` function handles both literal and regex-based replacements:

```hcl
locals {
  # Literal replacement
  original = "Hello World"
  replaced = replace(local.original, " ", "-")
  # Result: "Hello-World"

  # Regex replacement - wrap pattern in forward slashes
  messy_name  = "My  App   Name"
  clean_name  = replace(local.messy_name, "/\\s+/", "-")
  # Result: "My-App-Name"

  # Remove all non-alphanumeric characters
  raw_input    = "my-app_name (v2.1)"
  alphanumeric = replace(local.raw_input, "/[^a-zA-Z0-9]/", "")
  # Result: "myappnamev21"

  # Replace file extension
  config_file  = "settings.yaml"
  backup_file  = replace(local.config_file, ".yaml", ".yaml.bak")
  # Result: "settings.yaml.bak"
}
```

## Extracting Substrings

Terraform has `substr` for extracting portions of a string by position:

```hcl
locals {
  # substr(string, offset, length)
  full_string = "Hello, World!"

  # Get first 5 characters
  first_five = substr(local.full_string, 0, 5)
  # Result: "Hello"

  # Get characters starting from position 7
  from_seven = substr(local.full_string, 7, -1)
  # Result: "World!"

  # Extract a region code from an availability zone
  az      = "us-east-1a"
  region  = substr(local.az, 0, length(local.az) - 1)
  # Result: "us-east-1"
}
```

## Using regex for Pattern Matching

The `regex` function extracts content matching a pattern:

```hcl
locals {
  # Extract a version number from a string
  version_string = "myapp-v2.3.1-linux-amd64"
  version        = regex("v(\\d+\\.\\d+\\.\\d+)", local.version_string)[0]
  # Result: "2.3.1"

  # Extract key-value pairs from a connection string
  conn = "host=db.example.com port=5432 dbname=mydb"
  host = regex("host=([^\\s]+)", local.conn)[0]
  port = regex("port=([^\\s]+)", local.conn)[0]
  # Result: host = "db.example.com", port = "5432"

  # Validate and extract parts of an email
  email    = "admin@example.com"
  username = regex("^([^@]+)@", local.email)[0]
  domain   = regex("@(.+)$", local.email)[0]
  # Result: username = "admin", domain = "example.com"
}
```

## Case Conversion

Terraform provides `upper`, `lower`, and `title` for case changes:

```hcl
locals {
  input = "hello world"

  upper_case = upper(local.input)
  # Result: "HELLO WORLD"

  lower_case = lower("HELLO WORLD")
  # Result: "hello world"

  title_case = title(local.input)
  # Result: "Hello World"
}
```

These are particularly useful for resource naming conventions:

```hcl
locals {
  project_name = "my-web-app"
  environment  = "production"

  # AWS tags often use title case
  tag_name = title(replace(local.project_name, "-", " "))
  # Result: "My Web App"

  # S3 bucket names must be lowercase
  bucket_name = lower("${local.project_name}-${local.environment}-assets")
  # Result: "my-web-app-production-assets"

  # Environment variables are typically uppercase
  env_prefix = upper(replace(local.project_name, "-", "_"))
  # Result: "MY_WEB_APP"
}
```

## Checking String Content

Use `can` with `regex` to check if a string matches a pattern, or use `startswith` and `endswith`:

```hcl
locals {
  input = "https://api.example.com"

  # Check if string starts with https
  is_https = startswith(local.input, "https://")
  # Result: true

  # Check if string ends with a specific domain
  is_example = endswith(local.input, "example.com")
  # Result: true

  # Check if string matches a pattern
  is_valid_url = can(regex("^https?://", local.input))
  # Result: true

  # Check string contains a substring
  contains_api = length(regexall("api", local.input)) > 0
  # Result: true
}
```

## Combining Functions for Real-World Parsing

Here is a practical example that parses an RDS endpoint into its components and builds a connection string:

```hcl
locals {
  # RDS endpoints come as "hostname:port"
  rds_endpoint = "mydb.abc123.us-east-1.rds.amazonaws.com:5432"

  # Parse the endpoint
  db_host = split(":", local.rds_endpoint)[0]
  db_port = split(":", local.rds_endpoint)[1]

  # Build a JDBC connection string
  jdbc_url = format(
    "jdbc:postgresql://%s:%s/%s?ssl=true&sslmode=require",
    local.db_host,
    local.db_port,
    var.db_name
  )

  # Build a Python-style connection string
  python_url = format(
    "postgresql://%s:%s@%s:%s/%s",
    var.db_username,
    var.db_password,
    local.db_host,
    local.db_port,
    var.db_name
  )
}
```

## Building Dynamic Resource Names

Combining parsing and formatting for consistent resource naming:

```hcl
locals {
  raw_project_name = "My Cool Project!"
  environment      = "prod"
  region           = "us-east-1"

  # Sanitize the project name
  safe_name = lower(replace(replace(local.raw_project_name, "/[^a-zA-Z0-9]/", ""), "/\\s+/", "-"))

  # Build resource names with consistent formatting
  resource_prefix = format("%s-%s-%s", local.safe_name, local.environment, local.region)

  # Specific resource names
  vpc_name     = format("%s-vpc", local.resource_prefix)
  subnet_name  = format("%s-subnet-%02d", local.resource_prefix, 1)
  sg_name      = format("%s-sg", local.resource_prefix)
}
```

## Summary

String parsing and formatting in Terraform is about combining simple functions to handle real-world patterns. The core toolkit is `format` for building strings with placeholders, `split` and `join` for breaking apart and reassembling strings, `replace` for pattern-based transformations, `trim`/`trimprefix`/`trimsuffix` for cleanup, and `regex` for extraction. Once you get comfortable with these functions, you can handle any string manipulation task that comes up in your infrastructure code.
