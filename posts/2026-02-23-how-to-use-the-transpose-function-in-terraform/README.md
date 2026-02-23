# How to Use the transpose Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collections

Description: Learn how to use the transpose function in Terraform to swap keys and values in maps of lists for flexible resource lookups and tag management.

---

The `transpose` function is one of those Terraform functions that seems confusing at first, but once you understand what it does, you will find yourself reaching for it in specific situations where nothing else works as cleanly. It takes a map of lists and flips it so that the values become keys and the keys become values.

## What Does transpose Do?

The `transpose` function takes a map where each value is a list of strings, and it inverts the relationship. Every value in those lists becomes a key in the output, and the original keys become the values.

```hcl
# Input: map of string to list of strings
# Output: inverted map where values become keys
> transpose({
  "group1" = ["alice", "bob"]
  "group2" = ["bob", "carol"]
})
{
  "alice" = ["group1"]
  "bob"   = ["group1", "group2"]
  "carol" = ["group2"]
}
```

In this example, `"bob"` appeared in both `"group1"` and `"group2"`, so in the transposed result, `"bob"` maps to both groups.

## The Syntax

```hcl
transpose(map_of_lists)
```

The input must be a map where every value is a list of strings. The output is also a map where every value is a list of strings.

## Practical Example: User Group Membership

One of the clearest use cases is reversing a group-to-members mapping into a member-to-groups mapping:

```hcl
variable "group_members" {
  type = map(list(string))
  default = {
    admins     = ["alice", "bob"]
    developers = ["bob", "carol", "dave"]
    readonly   = ["carol", "eve"]
  }
}

locals {
  # Transpose to get: which groups does each user belong to?
  user_groups = transpose(var.group_members)
  # Result:
  # {
  #   "alice" = ["admins"]
  #   "bob"   = ["admins", "developers"]
  #   "carol" = ["developers", "readonly"]
  #   "dave"  = ["developers"]
  #   "eve"   = ["readonly"]
  # }
}

# Now you can look up a specific user's groups
output "bob_groups" {
  value = local.user_groups["bob"]
  # Result: ["admins", "developers"]
}
```

## Real-World Use Case: Tag-Based Resource Lookup

Suppose you tag your resources by purpose and need to look up which purposes a specific tag serves:

```hcl
variable "tag_assignments" {
  description = "Which tags apply to which resource types"
  type        = map(list(string))
  default = {
    web_servers = ["Environment:production", "Tier:frontend", "Backup:daily"]
    api_servers = ["Environment:production", "Tier:backend", "Backup:hourly"]
    db_servers  = ["Environment:production", "Tier:data", "Backup:hourly"]
  }
}

locals {
  # Find which resource types share each tag
  tag_to_resources = transpose(var.tag_assignments)
  # Result:
  # {
  #   "Backup:daily"            = ["web_servers"]
  #   "Backup:hourly"           = ["api_servers", "db_servers"]
  #   "Environment:production"  = ["api_servers", "db_servers", "web_servers"]
  #   "Tier:backend"            = ["api_servers"]
  #   "Tier:data"               = ["db_servers"]
  #   "Tier:frontend"           = ["web_servers"]
  # }

  # Which resources need hourly backups?
  hourly_backup_resources = local.tag_to_resources["Backup:hourly"]
  # Result: ["api_servers", "db_servers"]
}
```

## Mapping Availability Zones to Subnets (and Back)

A practical infrastructure example is working with AZ-to-subnet mappings:

```hcl
variable "az_subnets" {
  description = "Subnets in each availability zone"
  type        = map(list(string))
  default = {
    "us-east-1a" = ["subnet-pub-1a", "subnet-priv-1a"]
    "us-east-1b" = ["subnet-pub-1b", "subnet-priv-1b"]
    "us-east-1c" = ["subnet-pub-1c", "subnet-priv-1c"]
  }
}

locals {
  # Reverse: for each subnet, which AZ is it in?
  subnet_to_az = transpose(var.az_subnets)
  # Result:
  # {
  #   "subnet-priv-1a" = ["us-east-1a"]
  #   "subnet-priv-1b" = ["us-east-1b"]
  #   "subnet-priv-1c" = ["us-east-1c"]
  #   "subnet-pub-1a"  = ["us-east-1a"]
  #   "subnet-pub-1b"  = ["us-east-1b"]
  #   "subnet-pub-1c"  = ["us-east-1c"]
  # }
}

# Look up the AZ for a specific subnet
output "subnet_1a_az" {
  value = local.subnet_to_az["subnet-pub-1a"][0]
  # Result: "us-east-1a"
}
```

## Service-to-Port Mapping

Another useful pattern is inverting service-port relationships:

```hcl
variable "service_ports" {
  description = "Ports used by each service"
  type        = map(list(string))
  default = {
    nginx   = ["80", "443"]
    app     = ["8080", "8443"]
    metrics = ["9090", "9091"]
    shared  = ["80", "8080"]
  }
}

locals {
  # Which services use each port?
  port_services = transpose(var.service_ports)
  # Result:
  # {
  #   "80"   = ["nginx", "shared"]
  #   "443"  = ["nginx"]
  #   "8080" = ["app", "shared"]
  #   "8443" = ["app"]
  #   "9090" = ["metrics"]
  #   "9091" = ["metrics"]
  # }
}

# Find port conflicts - ports used by more than one service
output "shared_ports" {
  value = {
    for port, services in local.port_services : port => services
    if length(services) > 1
  }
  # Result: { "80" = ["nginx", "shared"], "8080" = ["app", "shared"] }
}
```

## Using transpose with IAM Policies

Map policies to roles, then transpose to see which policies a given role has:

```hcl
variable "policy_roles" {
  description = "Which roles each policy is attached to"
  type        = map(list(string))
  default = {
    "arn:aws:iam::policy/ReadOnly"  = ["viewer", "auditor"]
    "arn:aws:iam::policy/S3Full"    = ["deployer", "admin"]
    "arn:aws:iam::policy/AdminFull" = ["admin"]
  }
}

locals {
  # Transpose: for each role, which policies are attached?
  role_policies = transpose(var.policy_roles)
  # Result:
  # {
  #   "admin"    = ["arn:aws:iam::policy/AdminFull", "arn:aws:iam::policy/S3Full"]
  #   "auditor"  = ["arn:aws:iam::policy/ReadOnly"]
  #   "deployer" = ["arn:aws:iam::policy/S3Full"]
  #   "viewer"   = ["arn:aws:iam::policy/ReadOnly"]
  # }
}

# Create IAM role policy attachments dynamically
resource "aws_iam_role_policy_attachment" "attachments" {
  for_each = {
    for pair in flatten([
      for role, policies in local.role_policies : [
        for policy in policies : {
          key    = "${role}-${policy}"
          role   = role
          policy = policy
        }
      ]
    ]) : pair.key => pair
  }

  role       = each.value.role
  policy_arn = each.value.policy
}
```

## Constraints and Limitations

There are some important things to know about `transpose`:

**Values must be lists of strings:**
```hcl
# This works - map of string lists
transpose({ "a" = ["1", "2"], "b" = ["2", "3"] })

# This would NOT work - values must be lists, not single strings
# transpose({ "a" = "1", "b" = "2" })  # Error!
```

**The output values are always lists:**
Even if a value only appeared as a key once, the transposed result wraps it in a list:

```hcl
> transpose({ "only_group" = ["alice"] })
{
  "alice" = ["only_group"]
}
# "alice" maps to a list with one element, not a bare string
```

**All input list elements must be strings:**
```hcl
# Numbers in lists will not work directly
# transpose({ "group" = [1, 2] })  # Error!

# Convert to strings first if needed
```

## Combining transpose with for Expressions

You can use `for` expressions to transform the transposed result:

```hcl
locals {
  team_projects = {
    frontend = ["website", "mobile-app"]
    backend  = ["api", "website"]
    devops   = ["infrastructure", "ci-cd"]
  }

  # Get project-to-teams mapping with a formatted string
  project_owners = {
    for project, teams in transpose(local.team_projects) :
    project => join(", ", sort(teams))
  }
  # Result:
  # {
  #   "api"            = "backend"
  #   "ci-cd"          = "devops"
  #   "infrastructure" = "devops"
  #   "mobile-app"     = "frontend"
  #   "website"        = "backend, frontend"
  # }
}
```

## When to Use transpose vs Other Approaches

Use `transpose` when you have a many-to-many relationship stored one way and need to query it from the other direction. If you just need to swap single keys and values (not lists), use a `for` expression instead:

```hcl
# For simple key-value swaps (not lists), use a for expression
locals {
  original = { "a" = "1", "b" = "2" }
  swapped  = { for k, v in local.original : v => k }
  # Result: { "1" = "a", "2" = "b" }
}
```

## Summary

The `transpose` function is specialized but extremely useful when you need to invert many-to-many relationships in Terraform. It is perfect for going from "which members are in each group" to "which groups is each member in", or from "which tags apply to each resource" to "which resources have each tag". The key requirement is that your input must be a map of string lists. For related collection manipulation, take a look at the [values function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-values-function-in-terraform/view) and [zipmap function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-zipmap-function-in-terraform/view).
