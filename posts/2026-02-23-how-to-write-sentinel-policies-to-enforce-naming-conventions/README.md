# How to Write Sentinel Policies to Enforce Naming Conventions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Naming Convention, Standard, Cloud Governance

Description: Learn how to write Sentinel policies that enforce consistent naming conventions for cloud resources, Terraform configurations, and infrastructure components.

---

Naming conventions might seem trivial compared to security or cost policies, but inconsistent naming creates real problems. When resources are named randomly, it becomes difficult to identify what something is, who owns it, and what environment it belongs to. Sentinel policies can enforce naming standards automatically, ensuring every resource follows your organization's conventions.

## Why Naming Conventions Matter

Good naming conventions provide:

- Instant identification of resource purpose and environment
- Easier filtering and searching in cloud consoles
- Better automation (scripts can parse structured names)
- Clearer billing reports
- Faster incident response (you can identify affected systems quickly)

Without enforcement, naming conventions exist only in documentation that nobody reads.

## Defining a Naming Standard

Before writing policies, you need to decide on a naming standard. A common pattern looks like this:

```text
{environment}-{team}-{application}-{resource-type}-{identifier}
```

For example: `prod-platform-api-ec2-001`

Let us write policies that enforce this pattern.

## Basic Name Pattern Enforcement

Here is a policy that checks resource names in Terraform follow a specific pattern:

```python
# enforce-naming.sentinel
# Enforces naming conventions on Terraform resource names

import "tfconfig/v2" as tfconfig

# All resource names in Terraform config must follow this pattern
# lowercase, using underscores (Terraform convention)
name_pattern = "^[a-z][a-z0-9_]*$"

all_resources = tfconfig.resources

main = rule {
    all all_resources as _, resource {
        if not (resource.name matches name_pattern) {
            print("Resource", resource.address,
                  "- name must be lowercase with underscores only")
            false
        } else {
            true
        }
    }
}
```

## Enforcing Cloud Resource Name Tags

The more important naming convention is usually the Name tag or the actual resource name in the cloud provider:

```python
import "tfplan/v2" as tfplan
import "tfrun"

# Determine environment prefix from workspace name
get_env_prefix = func() {
    name = tfrun.workspace.name
    if name matches ".*-prod$" {
        return "prod"
    } else if name matches ".*-staging$" {
        return "staging"
    } else if name matches ".*-dev$" {
        return "dev"
    } else {
        return "sandbox"
    }
}

env = get_env_prefix()

# Expected name pattern: {env}-{team}-{purpose}-{suffix}
# Example: prod-platform-api-server
name_pattern = "^" + env + "-[a-z]+-[a-z0-9-]+-[a-z0-9-]+$"

# Get resources with Name tags
tagged_resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null and
    "Name" in rc.change.after.tags
}

# Validate the Name tag
main = rule {
    all tagged_resources as address, rc {
        name = rc.change.after.tags["Name"]
        if not (name matches name_pattern) {
            print(address, "- Name tag", name,
                  "does not match pattern:", name_pattern)
            print("  Expected format: " + env + "-{team}-{purpose}-{suffix}")
            false
        } else {
            true
        }
    }
}
```

## S3 Bucket Naming

S3 buckets have specific naming requirements and your organization probably has additional standards:

```python
import "tfplan/v2" as tfplan

# Get S3 buckets
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.change.actions contains "create"
}

# S3 bucket naming pattern
# Format: {org}-{env}-{purpose}-{region}
# Example: mycompany-prod-logs-us-east-1
bucket_pattern = "^mycompany-(prod|staging|dev|sandbox)-[a-z0-9-]+-[a-z]+-[a-z]+-[0-9]+$"

main = rule {
    all s3_buckets as address, bucket {
        name = bucket.change.after.bucket
        if name is not null {
            if not (name matches bucket_pattern) {
                print(address, "- bucket name", name,
                      "must match pattern: mycompany-{env}-{purpose}-{region}")
                false
            } else {
                true
            }
        } else {
            true  # Bucket name might be auto-generated
        }
    }
}
```

## Security Group Naming

```python
import "tfplan/v2" as tfplan

# Get security groups
security_groups = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Security group naming pattern
# Format: {env}-{app}-{purpose}-sg
# Example: prod-api-web-sg
sg_pattern = "^(prod|staging|dev|sandbox)-[a-z0-9]+-[a-z0-9]+-sg$"

validate_sg_name = func(sg) {
    name = sg.change.after.name
    if name is null or name is "" {
        print(sg.address, "- security group must have a name")
        return false
    }

    if not (name matches sg_pattern) {
        print(sg.address, "- name", name,
              "must match pattern: {env}-{app}-{purpose}-sg")
        return false
    }

    return true
}

# Also check the description is not empty
validate_sg_description = func(sg) {
    desc = sg.change.after.description
    if desc is null or desc is "" {
        print(sg.address, "- security group must have a description")
        return false
    }
    return true
}

main = rule {
    all security_groups as _, sg {
        validate_sg_name(sg) and validate_sg_description(sg)
    }
}
```

## IAM Role and Policy Naming

```python
import "tfplan/v2" as tfplan

# Get IAM roles
iam_roles = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_iam_role" and
    rc.change.actions contains "create"
}

# Get IAM policies
iam_policies = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_iam_policy" and
    rc.change.actions contains "create"
}

# IAM role naming: {env}-{service}-{purpose}-role
role_pattern = "^(prod|staging|dev)-[a-zA-Z0-9]+-[a-zA-Z0-9-]+-role$"

# IAM policy naming: {env}-{service}-{purpose}-policy
policy_pattern = "^(prod|staging|dev)-[a-zA-Z0-9]+-[a-zA-Z0-9-]+-policy$"

roles_named = rule {
    all iam_roles as address, role {
        name = role.change.after.name
        if not (name matches role_pattern) {
            print(address, "- role name", name,
                  "must match: {env}-{service}-{purpose}-role")
            false
        } else {
            true
        }
    }
}

policies_named = rule {
    all iam_policies as address, policy {
        name = policy.change.after.name
        if not (name matches policy_pattern) {
            print(address, "- policy name", name,
                  "must match: {env}-{service}-{purpose}-policy")
            false
        } else {
            true
        }
    }
}

main = rule {
    roles_named and policies_named
}
```

## Multi-Resource Naming Convention

Here is a comprehensive policy that enforces naming across multiple resource types:

```python
import "tfplan/v2" as tfplan

# Naming patterns per resource type
naming_rules = {
    "aws_instance": {
        "attr":    "tags",
        "tag_key": "Name",
        "pattern": "^(prod|staging|dev)-[a-z]+-[a-z0-9-]+$",
        "example": "prod-platform-api-server",
    },
    "aws_s3_bucket": {
        "attr":    "bucket",
        "tag_key": null,
        "pattern": "^mycompany-(prod|staging|dev)-[a-z0-9-]+$",
        "example": "mycompany-prod-app-logs",
    },
    "aws_security_group": {
        "attr":    "name",
        "tag_key": null,
        "pattern": "^(prod|staging|dev)-[a-z0-9]+-[a-z0-9-]+-sg$",
        "example": "prod-api-web-sg",
    },
    "aws_db_instance": {
        "attr":    "identifier",
        "tag_key": null,
        "pattern": "^(prod|staging|dev)-[a-z0-9]+-[a-z0-9-]+$",
        "example": "prod-api-primary",
    },
    "aws_iam_role": {
        "attr":    "name",
        "tag_key": null,
        "pattern": "^(prod|staging|dev)-[a-zA-Z0-9]+-[a-zA-Z0-9-]+-role$",
        "example": "prod-api-execution-role",
    },
}

# Get relevant resources
resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(naming_rules) and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate naming
validate_name = func(resource) {
    rule_config = naming_rules[resource.type]
    name = null

    if rule_config["tag_key"] is not null {
        # Get name from a tag
        if resource.change.after.tags is not null {
            tag_key = rule_config["tag_key"]
            if tag_key in resource.change.after.tags {
                name = resource.change.after.tags[tag_key]
            }
        }
    } else {
        # Get name from a direct attribute
        attr = rule_config["attr"]
        name = resource.change.after[attr]
    }

    if name is null or name is "" {
        print(resource.address, "- name/identifier is not set")
        return false
    }

    pattern = rule_config["pattern"]
    if not (name matches pattern) {
        print(resource.address, "- name", name, "does not match convention.")
        print("  Expected format:", rule_config["example"])
        return false
    }

    return true
}

main = rule {
    all resources as _, rc {
        validate_name(rc)
    }
}
```

## Enforcing Module Naming

You can also enforce naming conventions on Terraform modules:

```python
import "tfconfig/v2" as tfconfig

# Module names should be descriptive and follow conventions
module_name_pattern = "^[a-z][a-z0-9_-]*$"

modules = tfconfig.module_calls

main = rule {
    all modules as name, mod {
        if not (name matches module_name_pattern) {
            print("Module call", name,
                  "- must be lowercase with hyphens or underscores")
            false
        } else {
            true
        }
    }
}
```

## Enforcing Variable Naming

```python
import "tfconfig/v2" as tfconfig

# Variable naming convention: lowercase_with_underscores
variable_pattern = "^[a-z][a-z0-9_]*$"

variables = tfconfig.variables

main = rule {
    all variables as name, _ {
        if not (name matches variable_pattern) {
            print("Variable", name,
                  "- must be lowercase with underscores (snake_case)")
            false
        } else {
            true
        }
    }
}
```

## Preventing Common Naming Mistakes

```python
import "tfplan/v2" as tfplan

# Get all resources with Name tags
named_resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null and
    "Name" in rc.change.after.tags
}

# Check for common bad patterns
validate_no_bad_names = func(resource) {
    name = resource.change.after.tags["Name"]
    valid = true

    # No default or generic names
    bad_patterns = [
        "^test$",
        "^temp$",
        "^tmp$",
        "^foo$",
        "^bar$",
        "^default$",
        "^my-.*",
        "^untitled.*",
        "^new-.*",
    ]

    for bad_patterns as pattern {
        if name matches pattern {
            print(resource.address, "- name", name,
                  "appears to be a placeholder. Use a descriptive name.")
            valid = false
        }
    }

    # No spaces in names
    if name matches ".*\\s.*" {
        print(resource.address, "- name must not contain spaces")
        valid = false
    }

    # Not too long
    if length(name) > 64 {
        print(resource.address, "- name exceeds 64 characters")
        valid = false
    }

    return valid
}

main = rule {
    all named_resources as _, rc {
        validate_no_bad_names(rc)
    }
}
```

## Testing Naming Policies

```bash
# Run naming convention tests
sentinel test enforce-naming.sentinel -verbose
```

Create test cases with both valid and invalid names to ensure your regex patterns work correctly. Pay special attention to edge cases like names with numbers, hyphens, and different lengths.

Naming conventions are easier to enforce from the start than to fix retroactively. Start with a clear, documented standard and enforce it with Sentinel from day one. For related governance policies, see our posts on [enforcing tagging standards](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-enforce-tagging-standards/view) and [organizing policies for large organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-sentinel-policies-for-large-organizations/view).
