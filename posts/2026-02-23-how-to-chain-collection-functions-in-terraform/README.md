# How to Chain Collection Functions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collections, Best Practices

Description: Learn how to chain collection functions in Terraform to build powerful data transformation pipelines that process lists, maps, and sets efficiently.

---

Individual Terraform functions are useful on their own, but the real power comes from combining them. By chaining collection functions together, you can transform, filter, aggregate, and reshape data in ways that make complex infrastructure configurations surprisingly clean. This post walks through practical patterns for function chaining.

## The Basics of Function Chaining

In Terraform, you chain functions by nesting them - the output of one function becomes the input of another:

```hcl
# Single function
sort(["c", "a", "b"])
# Result: ["a", "b", "c"]

# Chained functions - sort, then take first 2
slice(sort(["c", "a", "b"]), 0, 2)
# Result: ["a", "b"]

# Three levels deep - deduplicate, sort, take first 2
slice(sort(distinct(["c", "a", "b", "a"])), 0, 2)
# Result: ["a", "b"]
```

The key is reading from the inside out: the innermost function executes first.

## Pattern 1: Deduplicate, Sort, and Limit

A very common chain for cleaning up lists:

```hcl
variable "raw_regions" {
  type = list(string)
  default = [
    "us-west-2", "us-east-1", "us-west-2",
    "eu-west-1", "us-east-1", "ap-southeast-1"
  ]
}

locals {
  # Chain: distinct -> sort -> slice
  # 1. Remove duplicates
  # 2. Sort alphabetically
  # 3. Take only the first 3
  selected_regions = slice(
    sort(distinct(var.raw_regions)),
    0,
    min(3, length(distinct(var.raw_regions)))
  )
  # Result: ["ap-southeast-1", "eu-west-1", "us-east-1"]
}
```

## Pattern 2: Extract, Transform, Collect

Pull values from a complex structure, transform them, and collect the results:

```hcl
variable "instances" {
  type = map(object({
    type   = string
    zone   = string
    tags   = map(string)
  }))
  default = {
    web-1 = { type = "t3.medium", zone = "us-east-1a", tags = { Role = "web" } }
    web-2 = { type = "t3.medium", zone = "us-east-1b", tags = { Role = "web" } }
    api-1 = { type = "t3.large",  zone = "us-east-1a", tags = { Role = "api" } }
    db-1  = { type = "r5.xlarge", zone = "us-east-1c", tags = { Role = "database" } }
  }
}

locals {
  # Chain: values -> for (extract) -> distinct -> sort
  unique_zones = sort(distinct([
    for inst in values(var.instances) : inst.zone
  ]))
  # Result: ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Chain: values -> for (filter + extract) -> sort
  web_instance_names = sort([
    for name, inst in var.instances : name
    if inst.tags["Role"] == "web"
  ])
  # Result: ["web-1", "web-2"]

  # Chain: values -> for (extract) -> toset (deduplicate)
  unique_instance_types = toset([
    for inst in values(var.instances) : inst.type
  ])
  # Result: toset(["r5.xlarge", "t3.large", "t3.medium"])
}
```

## Pattern 3: Merge, Override, Filter

Combine maps and then filter or transform the result:

```hcl
variable "default_tags" {
  type = map(string)
  default = {
    ManagedBy   = "terraform"
    Environment = "development"
    Team        = "platform"
  }
}

variable "custom_tags" {
  type = map(string)
  default = {
    Environment = "production"
    Project     = "myapp"
  }
}

locals {
  # Chain: merge (combine with overrides) -> for (transform keys)
  final_tags = {
    for key, value in merge(var.default_tags, var.custom_tags) :
    key => value
  }
  # Result: custom_tags override default_tags
  # {
  #   "Environment" = "production"
  #   "ManagedBy"   = "terraform"
  #   "Project"     = "myapp"
  #   "Team"        = "platform"
  # }

  # Chain: merge -> keys -> sort
  sorted_tag_keys = sort(keys(merge(var.default_tags, var.custom_tags)))
  # Result: ["Environment", "ManagedBy", "Project", "Team"]
}
```

## Pattern 4: Flatten, Map, and Aggregate

Process nested structures by flattening them first:

```hcl
variable "teams" {
  type = map(list(string))
  default = {
    frontend = ["alice", "bob"]
    backend  = ["carol", "dave", "eve"]
    devops   = ["frank"]
  }
}

locals {
  # Chain: values -> flatten -> toset (deduplicate) -> tolist -> length
  total_unique_members = length(tolist(toset(flatten(values(var.teams)))))
  # Result: 6

  # Chain: values -> flatten -> sort
  all_members_sorted = sort(flatten(values(var.teams)))
  # Result: ["alice", "bob", "carol", "dave", "eve", "frank"]

  # Chain: for (with flatten) to create a flat list of team-member pairs
  team_member_pairs = flatten([
    for team, members in var.teams : [
      for member in members : {
        team   = team
        member = member
      }
    ]
  ])
  # Result: list of { team = "...", member = "..." } objects
}
```

## Pattern 5: Set Operations Pipeline

Combine set functions for complex membership logic:

```hcl
variable "required_permissions" {
  type    = set(string)
  default = ["read", "write", "execute"]
}

variable "user_permissions" {
  type    = set(string)
  default = ["read", "write", "admin"]
}

variable "restricted_permissions" {
  type    = set(string)
  default = ["admin", "delete"]
}

locals {
  # Chain: setunion -> setsubtract (add all, then remove restricted)
  effective_permissions = setsubtract(
    setunion(var.required_permissions, var.user_permissions),
    var.restricted_permissions
  )
  # Result: toset(["execute", "read", "write"])

  # Chain: setintersection -> tolist -> length (count shared permissions)
  shared_count = length(tolist(
    setintersection(var.required_permissions, var.user_permissions)
  ))
  # Result: 2 (read, write)

  # Check if user has all required permissions
  # Chain: setintersection -> length comparison
  has_all_required = length(
    setintersection(var.required_permissions, var.user_permissions)
  ) == length(var.required_permissions)
  # Result: false (missing "execute")
}
```

## Pattern 6: Transform and Rekey

Reshape a data structure by changing its keys:

```hcl
variable "servers" {
  type = list(object({
    hostname = string
    ip       = string
    role     = string
  }))
  default = [
    { hostname = "web-1", ip = "10.0.1.10", role = "web" },
    { hostname = "web-2", ip = "10.0.1.11", role = "web" },
    { hostname = "api-1", ip = "10.0.2.10", role = "api" },
    { hostname = "db-1",  ip = "10.0.3.10", role = "db" },
  ]
}

locals {
  # Chain: for (rekey by hostname) -> use for lookups
  server_by_hostname = {
    for server in var.servers : server.hostname => server
  }

  # Chain: for (group by role) -> for (extract IPs)
  ips_by_role = {
    for role in distinct([for s in var.servers : s.role]) :
    role => [for s in var.servers : s.ip if s.role == role]
  }
  # Result: { "api" = ["10.0.2.10"], "db" = ["10.0.3.10"], "web" = ["10.0.1.10", "10.0.1.11"] }

  # Chain: for (filter) -> for (extract) -> join
  web_ips_string = join(", ", sort([
    for s in var.servers : s.ip if s.role == "web"
  ]))
  # Result: "10.0.1.10, 10.0.1.11"
}
```

## Pattern 7: Zipmap Pipelines

Build maps from parallel data:

```hcl
variable "service_names" {
  type    = list(string)
  default = ["web", "api", "worker", "scheduler"]
}

locals {
  # Chain: for (transform) -> zipmap (combine)
  service_urls = zipmap(
    var.service_names,
    [for name in var.service_names : "https://${name}.example.com"]
  )
  # Result: { "api" = "https://api.example.com", ... }

  # Chain: zipmap -> merge (add extra entries)
  all_urls = merge(
    local.service_urls,
    { "docs" = "https://docs.example.com" }
  )
}
```

## Readability Tips

When chains get long, break them into named locals for clarity:

```hcl
# Hard to read
locals {
  result = join(", ", sort(distinct(flatten([for team, members in var.teams : members]))))
}

# Better - break into steps
locals {
  all_members     = flatten([for team, members in var.teams : members])
  unique_members  = distinct(local.all_members)
  sorted_members  = sort(local.unique_members)
  member_string   = join(", ", local.sorted_members)
}
```

Each local serves as a named intermediate result, making the transformation pipeline much easier to understand and debug.

## Real-World Example: Building Target Group Attachments

```hcl
variable "service_config" {
  type = map(object({
    instances = list(string)
    port      = number
    health_path = string
  }))
  default = {
    web = {
      instances   = ["i-001", "i-002", "i-003"]
      port        = 80
      health_path = "/health"
    }
    api = {
      instances   = ["i-004", "i-005"]
      port        = 8080
      health_path = "/api/health"
    }
  }
}

locals {
  # Chain: flatten -> for_each-ready map
  # Step 1: Create flat list of service-instance pairs
  attachments = flatten([
    for svc_name, svc in var.service_config : [
      for instance_id in svc.instances : {
        key         = "${svc_name}-${instance_id}"
        service     = svc_name
        instance_id = instance_id
        port        = svc.port
      }
    ]
  ])

  # Step 2: Convert to a map keyed by unique identifier
  attachment_map = { for att in local.attachments : att.key => att }
}

resource "aws_lb_target_group_attachment" "main" {
  for_each = local.attachment_map

  target_group_arn = aws_lb_target_group.services[each.value.service].arn
  target_id        = each.value.instance_id
  port             = each.value.port
}
```

## Summary

Chaining collection functions is how you turn raw data into the exact shape your Terraform resources need. The key patterns are: deduplicate-sort-limit for cleaning lists, extract-transform-collect for pulling data from complex structures, merge-override-filter for combining configurations, and flatten-map-aggregate for working with nested data. When chains get complex, break them into named locals for readability. For specific function details, see our posts on [flatten](https://oneuptime.com/blog/post/2026-02-23-how-to-use-flatten-for-nested-data-structures-in-terraform/view), [zipmap](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-zipmap-function-in-terraform/view), and [data transformation pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-use-collection-functions-for-data-transformation-pipelines/view).
