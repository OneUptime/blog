# How to Use the merge Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Merge, Map Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the merge function in OpenTofu to combine multiple maps into one, with later maps overriding keys from earlier ones.

---

`merge()` takes an arbitrary number of maps or objects and returns a single map or object containing all key-value pairs. If the same key appears in multiple arguments, the value from the last one wins.

---

## Syntax

```hcl
merge(map_or_object1, map_or_object2, ...)
```

---

## Basic Examples

```hcl
locals {
  defaults = { color = "blue", size = "medium", enabled = true }
  overrides = { color = "red", weight = "heavy" }

  merged = merge(local.defaults, local.overrides)
  # { color = "red", size = "medium", enabled = true, weight = "heavy" }
  # "color" is overridden by overrides map
  # "size" and "enabled" kept from defaults
  # "weight" added from overrides
}
```

---

## Merging Default Tags with Resource-Specific Tags

```hcl
variable "default_tags" {
  type = map(string)
  default = {
    Project     = "myapp"
    ManagedBy   = "OpenTofu"
    Environment = "production"
  }
}

resource "aws_s3_bucket" "app" {
  bucket = "myapp-data"

  tags = merge(var.default_tags, {
    Name    = "Application Data"
    Purpose = "app-data"
    # Environment from default_tags is kept
  })
  # { Project = "myapp", ManagedBy = "OpenTofu", Environment = "production",
  #   Name = "Application Data", Purpose = "app-data" }
}

resource "aws_db_instance" "main" {
  # ...
  tags = merge(var.default_tags, {
    Name      = "Production Database"
    Component = "database"
    # Environment from default_tags overridden here:
    Environment = "prod-db"   # overrides "production"
  })
}
```

---

## Building Configuration from Multiple Sources

```hcl
locals {
  base_config = {
    log_level     = "warn"
    max_workers   = 4
    timeout_sec   = 30
    retry_count   = 3
  }

  environment_config = var.environment == "production" ? {
    log_level   = "error"
    max_workers = 16
  } : {
    log_level   = "debug"
    max_workers = 2
  }

  # Merge: environment config overrides base
  final_config = merge(local.base_config, local.environment_config)
}
```

---

## Merging Multiple Tag Sources

```hcl
module "app" {
  source = "./modules/app"

  tags = merge(
    var.common_tags,      # organization-wide tags
    var.team_tags,        # team-specific tags
    var.project_tags,     # project-specific tags
    {
      Module = "app"      # module-specific override
    }
  )
}
```

---

## Merging Maps with for Expressions

```hcl
variable "services" {
  type = list(string)
  default = ["web", "api", "worker"]
}

locals {
  # Create a list of one-key maps, then merge them into a single map
  service_configs = merge([
    for svc in var.services : {
      (svc) = {
        name    = svc
        enabled = true
      }
    }
  ]...)

  # The ... unpacks the list of maps as individual merge arguments
}
```

---

## merge vs concat

| Function | For | Example |
|---|---|---|
| `merge(map_or_object1, map_or_object2)` | Maps/Objects | Combining tag maps |
| `concat(list1, list2)` | Lists | Combining subnet ID lists |

---

## Summary

`merge()` combines multiple maps or objects into one, with later arguments taking precedence for duplicate keys. It's most commonly used for tag merging - combining default organization tags with resource-specific tags. The last argument wins on key conflicts, making it ideal for the pattern of `merge(defaults, overrides)`. Use `concat()` for combining lists, and `merge()` for combining maps or objects.
