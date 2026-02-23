# How to Write Sentinel Policies to Enforce Tagging Standards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Tagging, Cloud Governance, AWS, Cost Management

Description: Learn how to write Sentinel policies that enforce consistent resource tagging across your cloud infrastructure for cost tracking, ownership, and compliance.

---

Resource tagging is one of those things that everyone agrees is important but nobody does consistently. Without proper tags, you lose the ability to track costs, identify resource owners, and enforce compliance. Sentinel policies can solve this by requiring tags before any resource gets created. This guide shows you how to build effective tagging policies.

## Why Tagging Standards Matter

Tags are the primary mechanism for organizing cloud resources. They enable:

- Cost allocation and showback reporting
- Identifying resource owners when something breaks
- Compliance auditing and regulatory requirements
- Automation based on resource classification
- Environment identification (prod, staging, dev)

Without enforcement, tagging becomes optional in practice. Developers are focused on getting things working, not on metadata. Sentinel makes tagging mandatory.

## Basic Tagging Policy

Let us start with a straightforward policy that requires a set of tags on all AWS resources that support tagging:

```python
# enforce-tags.sentinel
# Requires specific tags on all taggable resources

import "tfplan/v2" as tfplan

# Define required tags
required_tags = ["Environment", "Team", "CostCenter", "Owner"]

# Get all resources being created or updated that support tags
taggable_resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after is not null
}

# Function to check if a resource has all required tags
check_tags = func(resource) {
    # Check if the resource has a tags attribute
    if resource.change.after.tags is null or
       resource.change.after.tags is undefined {
        print("Resource", resource.address, "has no tags")
        return false
    }

    tags = resource.change.after.tags
    result = true

    for required_tags as tag {
        if tag not in tags {
            print("Resource", resource.address, "is missing tag:", tag)
            result = false
        }
    }

    return result
}

# Apply the check to all taggable resources
main = rule {
    all taggable_resources as _, rc {
        # Only check resources that have a tags attribute in their schema
        if rc.change.after.tags is not undefined {
            check_tags(rc)
        } else {
            true
        }
    }
}
```

## Filtering for Specific Resource Types

Not all Terraform resources support tags. Rather than trying to tag everything, you can target specific resource types:

```python
import "tfplan/v2" as tfplan

required_tags = ["Environment", "Team", "CostCenter"]

# List of resource types that must have tags
taggable_types = [
    "aws_instance",
    "aws_s3_bucket",
    "aws_rds_cluster",
    "aws_db_instance",
    "aws_lambda_function",
    "aws_ecs_service",
    "aws_ecs_cluster",
    "aws_eks_cluster",
    "aws_elasticache_cluster",
    "aws_lb",
    "aws_vpc",
    "aws_subnet",
    "aws_security_group",
    "aws_ebs_volume",
    "aws_efs_file_system",
    "aws_sqs_queue",
    "aws_sns_topic",
    "aws_kinesis_stream",
    "aws_dynamodb_table",
]

# Filter for taggable resources being created or updated
resources = filter tfplan.resource_changes as _, rc {
    rc.type in taggable_types and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate tags
validate_tags = func(resource) {
    if resource.change.after.tags is null {
        print(resource.address, "- no tags defined")
        return false
    }

    tags = resource.change.after.tags
    valid = true

    for required_tags as tag {
        if tag not in tags {
            print(resource.address, "- missing tag:", tag)
            valid = false
        }
    }

    return valid
}

main = rule {
    all resources as _, rc {
        validate_tags(rc)
    }
}
```

## Validating Tag Values

Requiring tags to exist is just the first step. You should also validate that tag values follow your standards:

```python
import "tfplan/v2" as tfplan

# Allowed values for specific tags
allowed_environments = ["production", "staging", "development", "sandbox"]
allowed_teams = ["platform", "backend", "frontend", "data", "security", "devops"]

# Tag validation rules
tag_validators = {
    "Environment": func(value) {
        if value not in allowed_environments {
            print("Invalid Environment tag value:", value,
                  "- must be one of:", allowed_environments)
            return false
        }
        return true
    },
    "Team": func(value) {
        if value not in allowed_teams {
            print("Invalid Team tag value:", value,
                  "- must be one of:", allowed_teams)
            return false
        }
        return true
    },
    "CostCenter": func(value) {
        # Cost center must be a 4-digit number
        if not (value matches "^[0-9]{4}$") {
            print("Invalid CostCenter tag value:", value,
                  "- must be a 4-digit number")
            return false
        }
        return true
    },
    "Owner": func(value) {
        # Owner must be an email address
        if not (value matches "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$") {
            print("Invalid Owner tag value:", value,
                  "- must be an email address")
            return false
        }
        return true
    },
}

# Get taggable resources
resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null
}

# Validate both presence and values
validate_resource = func(resource) {
    tags = resource.change.after.tags
    valid = true

    for tag_validators as tag_name, validator {
        if tag_name not in tags {
            print(resource.address, "- missing required tag:", tag_name)
            valid = false
        } else {
            if not validator(tags[tag_name]) {
                valid = false
            }
        }
    }

    return valid
}

main = rule {
    all resources as _, rc {
        validate_resource(rc)
    }
}
```

## Enforcing Tag Naming Conventions

Beyond required tags, you might want to enforce conventions on all tag keys:

```python
import "tfplan/v2" as tfplan

# Resources with tags
tagged_resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null
}

# Validate tag key naming conventions
validate_tag_keys = func(resource) {
    tags = resource.change.after.tags
    valid = true

    for tags as key, _ {
        # Tag keys must be PascalCase
        if not (key matches "^[A-Z][a-zA-Z0-9]*$") {
            print(resource.address, "- tag key", key,
                  "must be PascalCase (e.g., 'Environment', 'CostCenter')")
            valid = false
        }

        # Tag keys must not exceed 128 characters (AWS limit)
        if length(key) > 128 {
            print(resource.address, "- tag key", key, "exceeds 128 characters")
            valid = false
        }
    }

    return valid
}

# Validate tag value constraints
validate_tag_values = func(resource) {
    tags = resource.change.after.tags
    valid = true

    for tags as key, value {
        # Tag values must not be empty
        if value is "" {
            print(resource.address, "- tag", key, "has empty value")
            valid = false
        }

        # Tag values must not exceed 256 characters (AWS limit)
        if length(value) > 256 {
            print(resource.address, "- tag", key, "value exceeds 256 characters")
            valid = false
        }
    }

    return valid
}

main = rule {
    all tagged_resources as _, rc {
        validate_tag_keys(rc) and validate_tag_values(rc)
    }
}
```

## Environment-Specific Tagging Requirements

Different environments might need different tags:

```python
import "tfplan/v2" as tfplan
import "tfrun"

# Base tags required everywhere
base_tags = ["Environment", "Team", "Owner"]

# Additional tags for production
production_tags = ["CostCenter", "Compliance", "DataClassification", "BackupPolicy"]

# Additional tags for staging
staging_tags = ["CostCenter", "ExpirationDate"]

# Determine environment
is_prod = tfrun.workspace.name matches ".*-prod$"
is_staging = tfrun.workspace.name matches ".*-staging$"

# Build the required tags list
get_required_tags = func() {
    tags = base_tags
    if is_prod {
        for production_tags as tag {
            tags = tags + [tag]
        }
    } else if is_staging {
        for staging_tags as tag {
            tags = tags + [tag]
        }
    }
    return tags
}

required = get_required_tags()

# Get taggable resources
resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null
}

# Validate
validate = func(resource) {
    tags = resource.change.after.tags
    valid = true
    for required as tag {
        if tag not in tags {
            print(resource.address, "- missing required tag:", tag)
            valid = false
        }
    }
    return valid
}

main = rule {
    all resources as _, rc {
        validate(rc)
    }
}
```

## Handling the aws_default_tags Pattern

Many organizations use AWS provider default tags. Your policy should account for this:

```python
import "tfplan/v2" as tfplan

required_tags = ["Environment", "Team", "ManagedBy"]

# When using default_tags in the AWS provider, tags from default_tags
# are merged into the resource's tags_all attribute
resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

validate = func(resource) {
    # Check tags_all which includes default_tags
    # Fall back to tags if tags_all is not available
    tags = null

    if resource.change.after.tags_all is not null {
        tags = resource.change.after.tags_all
    } else if resource.change.after.tags is not null {
        tags = resource.change.after.tags
    } else {
        # Resource does not support tags
        return true
    }

    valid = true
    for required_tags as tag {
        if tag not in tags {
            print(resource.address, "- missing tag:", tag,
                  "(check both resource tags and default_tags)")
            valid = false
        }
    }

    return valid
}

main = rule {
    all resources as _, rc {
        validate(rc)
    }
}
```

## Multi-Cloud Tagging Policy

If you work with multiple cloud providers, you can write a unified tagging policy:

```python
import "tfplan/v2" as tfplan

required_tags = ["Environment", "Team", "Owner"]

# AWS resources use "tags"
# Azure resources use "tags"
# GCP resources use "labels"

# Get resources from any cloud that support tagging
get_tag_attribute = func(resource) {
    # Try tags first (AWS, Azure)
    if resource.change.after.tags is not null {
        return resource.change.after.tags
    }
    # Try labels (GCP)
    if resource.change.after.labels is not null {
        return resource.change.after.labels
    }
    return null
}

resources = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create" or rc.change.actions contains "update"
}

validate = func(resource) {
    tags = get_tag_attribute(resource)
    if tags is null {
        return true  # Resource does not support tagging
    }

    valid = true
    for required_tags as tag {
        if tag not in tags {
            print(resource.address, "- missing required tag/label:", tag)
            valid = false
        }
    }
    return valid
}

main = rule {
    all resources as _, rc {
        validate(rc)
    }
}
```

## Testing Your Tagging Policy

Create mock data to test different scenarios:

```hcl
# test/enforce-tags/pass.hcl
mock "tfplan/v2" {
    module {
        source = "mock-tfplan-pass.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

```hcl
# test/enforce-tags/fail-missing-tag.hcl
mock "tfplan/v2" {
    module {
        source = "mock-tfplan-missing-tag.sentinel"
    }
}

test {
    rules = {
        main = false
    }
}
```

Run your tests:

```bash
# Test the tagging policy
sentinel test enforce-tags.sentinel
```

Consistent tagging is one of the highest-value policies you can implement. Start with a small set of required tags and expand over time. For more policy examples, see our guides on [enforcing naming conventions](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-enforce-naming-conventions/view) and [compliance requirements](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-compliance-requirements/view).
