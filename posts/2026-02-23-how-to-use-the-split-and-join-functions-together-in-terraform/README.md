# How to Use the split and join Functions Together in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Split Function, Join Function, String Manipulation, HCL, Infrastructure as Code

Description: Learn how to combine Terraform's split and join functions for string transformations including delimiter changes, filtering, reordering, and data restructuring.

---

The `split` and `join` functions are two of the most frequently used string functions in Terraform. On their own, each does something simple: `split` breaks a string into a list, and `join` concatenates a list into a string. But when you combine them, possibly with other list operations in between, you unlock a powerful pattern for transforming strings in ways that would otherwise require complex regex or external scripts.

## Quick Review of Each Function

Before combining them, let's make sure the basics are clear:

```hcl
# split(separator, string) -> list
split(",", "a,b,c,d")
# Result: ["a", "b", "c", "d"]

# join(separator, list) -> string
join("-", ["a", "b", "c", "d"])
# Result: "a-b-c-d"
```

Both are straightforward. The real power comes from what you do between split and join.

## Changing Delimiters

The simplest combined use case is changing the delimiter in a string:

```hcl
locals {
  # Convert comma-separated to space-separated
  csv_string   = "nginx,redis,postgresql,memcached"
  space_string = join(" ", split(",", local.csv_string))
  # Result: "nginx redis postgresql memcached"

  # Convert dot-separated to slash-separated (namespace to path)
  namespace   = "com.example.myapp.config"
  path        = join("/", split(".", local.namespace))
  # Result: "com/example/myapp/config"

  # Convert underscores to hyphens in a resource name
  snake_case = "my_resource_name"
  kebab_case = join("-", split("_", local.snake_case))
  # Result: "my-resource-name"
}
```

## Filtering Elements Between Split and Join

Split a string, filter the list, then join it back. This is useful for removing empty elements or specific values:

```hcl
locals {
  # A path with double slashes
  messy_path = "/var//log///myapp//error.log"

  # Split on "/" and filter out empty strings, then rejoin
  clean_path = join("/", [
    for part in split("/", local.messy_path) : part
    if part != ""
  ])
  # Result: "var/log/myapp/error.log"

  # Re-add the leading slash
  absolute_path = "/${local.clean_path}"
  # Result: "/var/log/myapp/error.log"
}
```

Another filtering example - removing specific items from a delimited string:

```hcl
locals {
  # Remove "staging" from a list of environments
  all_envs     = "dev,staging,production,qa"
  non_staging  = join(",", [
    for env in split(",", local.all_envs) : env
    if env != "staging"
  ])
  # Result: "dev,production,qa"
}
```

## Transforming Elements Between Split and Join

You can apply transformations to each element:

```hcl
locals {
  # Convert a kebab-case name to camelCase
  kebab_name = "my-awesome-resource"
  parts      = split("-", local.kebab_name)
  camel_name = join("", [
    for i, part in local.parts :
    i == 0 ? part : title(part)
  ])
  # Result: "myAwesomeResource"

  # Add a prefix to each element
  tags_string = "web,api,worker"
  prefixed    = join(",", [
    for tag in split(",", local.tags_string) :
    "app-${tag}"
  ])
  # Result: "app-web,app-api,app-worker"

  # Uppercase each path segment
  path_input = "usr/local/bin"
  upper_path = join("/", [
    for segment in split("/", local.path_input) :
    upper(segment)
  ])
  # Result: "USR/LOCAL/BIN"
}
```

## Reversing String Parts

Need to reverse the order of components? Split, reverse, join:

```hcl
locals {
  # Reverse domain components (useful for Java package naming)
  domain         = "example.com"
  reversed_parts = reverse(split(".", local.domain))
  java_package   = join(".", local.reversed_parts)
  # Result: "com.example"

  # Reverse a full domain
  fqdn           = "api.us-east.staging.example.com"
  reversed_domain = join(".", reverse(split(".", local.fqdn)))
  # Result: "com.example.staging.us-east.api"
}
```

## Extracting Portions of Delimited Strings

Use `split` with `slice` to grab specific parts, then `join` them back:

```hcl
locals {
  # Extract the root domain from a FQDN
  full_domain  = "api.us-east.staging.example.com"
  domain_parts = split(".", local.full_domain)
  root_domain  = join(".", slice(
    local.domain_parts,
    length(local.domain_parts) - 2,
    length(local.domain_parts)
  ))
  # Result: "example.com"

  # Get the subdomain portion
  subdomain = join(".", slice(
    local.domain_parts,
    0,
    length(local.domain_parts) - 2
  ))
  # Result: "api.us-east.staging"
}
```

## Parsing and Rebuilding ARNs

AWS ARNs are colon-delimited strings with a well-known structure. Split and join let you manipulate them:

```hcl
locals {
  # Original ARN
  source_arn = "arn:aws:s3:::my-source-bucket/path/to/object"

  # Parse the ARN
  arn_parts = split(":", local.source_arn)
  # ["arn", "aws", "s3", "", "", "my-source-bucket/path/to/object"]

  # Extract the service
  service = local.arn_parts[2]
  # "s3"

  # Change the resource part while keeping everything else
  new_arn = join(":", concat(
    slice(local.arn_parts, 0, 5),
    ["my-destination-bucket/*"]
  ))
  # Result: "arn:aws:s3:::my-destination-bucket/*"

  # Build an ARN for a different account
  cross_account_arn = join(":", [
    local.arn_parts[0],  # "arn"
    local.arn_parts[1],  # "aws"
    local.arn_parts[2],  # service
    local.arn_parts[3],  # region
    "999888777666",      # different account ID
    local.arn_parts[5],  # resource
  ])
}
```

## Converting Between List and String Formats

Many Terraform resources accept either a list or a comma-separated string. Split and join help you convert between them:

```hcl
variable "allowed_cidrs" {
  type        = string
  description = "Comma-separated list of CIDRs"
  default     = "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16"
}

locals {
  # Convert the comma-separated string to a clean list
  cidr_list = [
    for cidr in split(",", var.allowed_cidrs) :
    trimspace(cidr)
  ]
  # Result: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

resource "aws_security_group_rule" "allow_cidrs" {
  count             = length(local.cidr_list)
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [local.cidr_list[count.index]]
  security_group_id = aws_security_group.main.id
}
```

## Building Tag Strings from Lists

Some resources want tags as a single string rather than a map:

```hcl
locals {
  tag_list = ["environment:production", "team:platform", "service:api"]

  # Join for Docker-style labels
  docker_labels = join(",", local.tag_list)
  # Result: "environment:production,team:platform,service:api"

  # Convert to a map by splitting each tag on ":"
  tag_map = {
    for tag in local.tag_list :
    split(":", tag)[0] => split(":", tag)[1]
  }
  # Result: { environment = "production", team = "platform", service = "api" }
}
```

## Handling Multi-Level Delimiters

Sometimes data uses nested delimiters, like a semicolon-separated list of comma-separated values:

```hcl
locals {
  # Input: groups of items separated by semicolons, items by commas
  input = "web,api;worker,scheduler;monitoring,logging"

  # Parse into a list of lists
  groups = [
    for group in split(";", local.input) :
    split(",", group)
  ]
  # Result: [["web", "api"], ["worker", "scheduler"], ["monitoring", "logging"]]

  # Flatten all items into a single comma-separated string
  all_items = join(",", flatten(local.groups))
  # Result: "web,api,worker,scheduler,monitoring,logging"

  # Get just the first item from each group
  first_items = join(",", [
    for group in split(";", local.input) :
    split(",", group)[0]
  ])
  # Result: "web,worker,monitoring"
}
```

## Constructing Search Paths

When building search paths or classpath-style strings:

```hcl
locals {
  base_dirs = ["/usr/local/lib", "/opt/app/lib", "/home/app/plugins"]

  # Build a colon-separated search path (Unix style)
  search_path = join(":", local.base_dirs)
  # Result: "/usr/local/lib:/opt/app/lib:/home/app/plugins"

  # Add a new directory to an existing path
  existing_path = "/usr/bin:/usr/local/bin:/usr/sbin"
  updated_path  = join(":", concat(
    split(":", local.existing_path),
    ["/opt/myapp/bin"]
  ))
  # Result: "/usr/bin:/usr/local/bin:/usr/sbin:/opt/myapp/bin"
}
```

## Deduplicating Delimited Strings

Remove duplicates from a delimited string using `distinct`:

```hcl
locals {
  tags_with_dupes = "web,api,web,monitoring,api,logging"

  unique_tags = join(",", distinct(split(",", local.tags_with_dupes)))
  # Result: "web,api,monitoring,logging"
}
```

## Summary

The split-transform-join pattern is one of the most versatile string manipulation techniques in Terraform. By breaking a string into parts, applying list operations like filtering, mapping, slicing, reversing, or deduplicating, and then reassembling, you can handle virtually any string transformation. The key insight is that `split` and `join` are not just about delimiters - they are the bridge between string operations and the much richer set of list operations that Terraform provides.
