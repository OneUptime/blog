# How to Use the tfplan Import in Sentinel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, tfplan, Infrastructure as Code

Description: Learn how to use the tfplan/v2 import in Sentinel to inspect planned Terraform changes and write policies that validate resources before they are applied.

---

The `tfplan/v2` import is the workhorse of Sentinel policy writing. It gives you access to everything Terraform plans to do, from creating resources to modifying outputs. If you are writing Sentinel policies for Terraform, you will spend most of your time working with this import. This guide walks through its structure, key properties, and practical usage patterns.

## What the tfplan Import Contains

When Terraform generates a plan, it produces a detailed description of every change it intends to make. The `tfplan/v2` import exposes this data to your Sentinel policies. At a high level, it contains:

- Resource changes (creates, updates, deletes)
- Data source reads
- Output changes
- Variable values
- The Terraform version being used

## Importing tfplan

Always use the v2 version of the import:

```python
# The standard way to import tfplan
import "tfplan/v2" as tfplan
```

The alias `tfplan` is a convention, but you can name it whatever you want. Sticking with `tfplan` keeps your policies consistent and readable.

## Resource Changes

The `tfplan.resource_changes` collection is what you will work with most often. It contains every resource that Terraform plans to create, update, delete, or read.

Each resource change has this structure:

```python
import "tfplan/v2" as tfplan

# Iterate over all resource changes
for tfplan.resource_changes as address, rc {
    print("Address:", address)
    print("Type:", rc.type)
    print("Name:", rc.name)
    print("Provider:", rc.provider_name)
    print("Actions:", rc.change.actions)
    print("Before:", rc.change.before)
    print("After:", rc.change.after)
    print("After Unknown:", rc.change.after_unknown)
}
```

### Key Properties of Resource Changes

Here is what each property gives you:

- **address** - The full address of the resource, like `module.web.aws_instance.server[0]`
- **type** - The resource type, like `aws_instance`
- **name** - The resource name in the config, like `server`
- **provider_name** - The provider, like `registry.terraform.io/hashicorp/aws`
- **module_address** - The module path, empty string for root module
- **change.actions** - A list of actions: "create", "update", "delete", "read", or "no-op"
- **change.before** - Attribute values before the change (null for creates)
- **change.after** - Attribute values after the change (null for deletes)
- **change.after_unknown** - Attributes whose values are not known until apply

### Understanding change.actions

The actions field is a list, not a single value. For most operations it contains a single action, but for some operations it may contain two. For example, a "replace" operation (where Terraform must destroy and recreate a resource) shows as `["delete", "create"]`.

```python
import "tfplan/v2" as tfplan

# Filter for resources being created
creates = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create"
}

# Filter for resources being updated
updates = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "update"
}

# Filter for resources being deleted
deletes = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "delete"
}

# Filter for resources being replaced (delete then create)
replaces = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "delete" and
    rc.change.actions contains "create"
}

# Filter for creates or updates (most common pattern)
creates_or_updates = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create" or
    rc.change.actions contains "update"
}
```

## Working with change.after

The `change.after` property contains the attribute values that the resource will have after Terraform applies the plan. This is where you check things like instance types, regions, encryption settings, tags, and so on.

```python
import "tfplan/v2" as tfplan

# Get all S3 buckets being created or updated
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check that all S3 buckets have versioning enabled
main = rule {
    all s3_buckets as _, bucket {
        bucket.change.after.versioning is not null and
        bucket.change.after.versioning[0].enabled is true
    }
}
```

### Handling Nested Attributes

Many Terraform resources have nested attributes. You access them by chaining property lookups:

```python
import "tfplan/v2" as tfplan

# Get RDS instances
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check encryption and backup settings
main = rule {
    all rds_instances as _, db {
        # Top-level attribute
        db.change.after.storage_encrypted is true and
        # Another top-level attribute
        db.change.after.backup_retention_period >= 7
    }
}
```

### Dealing with after_unknown

Some attribute values are not known until Terraform actually applies the plan. These show up as `true` in the `change.after_unknown` map. For example, an auto-generated ID or ARN will be unknown at plan time.

```python
import "tfplan/v2" as tfplan

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

# Check an attribute, but handle the case where it is unknown
check_ami = func(instance) {
    # If the AMI is unknown at plan time, we cannot validate it
    if instance.change.after_unknown.ami is true {
        print("Warning: AMI is not known at plan time, skipping check")
        return true
    }
    return instance.change.after.ami matches "^ami-[a-f0-9]{8,17}$"
}

main = rule {
    all instances as _, inst {
        check_ami(inst)
    }
}
```

## Working with change.before

The `change.before` property shows the current attribute values before the planned change. This is useful when you want to detect specific types of changes:

```python
import "tfplan/v2" as tfplan

# Find instances where the instance type is being changed
type_changes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "update" and
    rc.change.before.instance_type is not rc.change.after.instance_type
}

# Prevent downgrades from larger instance types
main = rule {
    all type_changes as address, inst {
        print("Instance type change detected:", address,
              "from", inst.change.before.instance_type,
              "to", inst.change.after.instance_type)
        # Add your validation logic here
        inst.change.after.instance_type is not "t3.micro"
    }
}
```

## Output Changes

The `tfplan` import also gives you access to planned output changes:

```python
import "tfplan/v2" as tfplan

# Access output changes
outputs = tfplan.output_changes

# Ensure sensitive outputs are marked as sensitive
main = rule {
    all outputs as name, output {
        if name matches ".*password.*" or name matches ".*secret.*" {
            output.sensitive is true
        } else {
            true
        }
    }
}
```

## Practical Patterns

### Pattern 1: Validating Tags on All Resources

```python
import "tfplan/v2" as tfplan

# Required tags for all resources
required_tags = ["Environment", "Team", "CostCenter"]

# Get all resources that support tags
taggable_resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null
}

# Validate tags function
validate_tags = func(resource) {
    tags = resource.change.after.tags
    for required_tags as tag {
        if tag not in tags {
            print("Resource", resource.address, "is missing tag:", tag)
            return false
        }
    }
    return true
}

main = rule {
    all taggable_resources as _, rc {
        validate_tags(rc)
    }
}
```

### Pattern 2: Preventing Destruction of Critical Resources

```python
import "tfplan/v2" as tfplan

# Resource types that should never be destroyed
protected_types = [
    "aws_rds_cluster",
    "aws_dynamodb_table",
    "aws_s3_bucket",
]

# Find protected resources being destroyed
protected_deletes = filter tfplan.resource_changes as _, rc {
    rc.type in protected_types and
    rc.change.actions contains "delete"
}

# Block the deletion
main = rule {
    length(protected_deletes) is 0
}
```

### Pattern 3: Checking Security Group Rules

```python
import "tfplan/v2" as tfplan

# Find security group rules
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create"
}

# Block overly permissive ingress rules
no_open_ingress = rule {
    all sg_rules as _, rule {
        not (rule.change.after.type is "ingress" and
             rule.change.after.cidr_blocks contains "0.0.0.0/0" and
             rule.change.after.from_port is 0 and
             rule.change.after.to_port is 65535)
    }
}

main = rule {
    no_open_ingress
}
```

## Tips for Working with tfplan

1. Always filter by action type. If you do not filter, you might try to read `change.after` on a delete operation where it is null.

2. Use `print` statements liberally during development. They help you understand the structure of the data you are working with.

3. Remember that `change.after` reflects computed values from the plan, not just what the user wrote in their config. If you need to check what was actually written, use the `tfconfig` import instead.

4. Handle null and undefined values gracefully. Not all resources have all attributes, and trying to access a non-existent attribute can cause your policy to fail unexpectedly.

For more on the other Sentinel imports, see our posts on [using the tfconfig import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfconfig-import-in-sentinel/view) and [using the tfstate import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfstate-import-in-sentinel/view).
