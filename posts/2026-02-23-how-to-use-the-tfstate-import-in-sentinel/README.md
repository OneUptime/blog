# How to Use the tfstate Import in Sentinel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, tfstate, State Management

Description: Learn how to use the tfstate/v2 import in Sentinel to inspect current Terraform state and write policies based on existing infrastructure resources.

---

The `tfstate/v2` import gives your Sentinel policies access to the current Terraform state - the existing infrastructure as Terraform knows it. While `tfplan` tells you what is about to change, `tfstate` tells you what already exists. This is crucial for policies that need context about your current infrastructure to make decisions about new changes.

## When You Need tfstate

There are several scenarios where the state import is the right tool:

- You need to limit the total number of a resource type across your infrastructure
- You want to check properties of existing resources that are not being modified
- You need to validate relationships between new and existing resources
- You want to audit the current state for compliance

The important thing to remember is that `tfstate` represents the state before the current plan is applied. It does not include the planned changes.

## Importing tfstate

```python
# Standard import
import "tfstate/v2" as tfstate
```

## Structure of tfstate Resources

The `tfstate.resources` collection contains all resources tracked in the Terraform state. Each resource has a simpler structure compared to `tfplan` resources because there is no "change" to represent.

```python
import "tfstate/v2" as tfstate

# Iterate over all resources in state
for tfstate.resources as address, resource {
    print("Address:", address)
    print("Type:", resource.type)
    print("Name:", resource.name)
    print("Module:", resource.module_address)
    print("Provider:", resource.provider_name)
    print("Values:", resource.values)
}
```

### Key Properties

- **address** - Full resource address (e.g., `aws_instance.web`)
- **type** - Resource type
- **name** - Resource name
- **module_address** - Module path, empty for root module
- **provider_name** - Provider name
- **values** - Current attribute values (this is the big one)
- **depends_on** - Explicit dependencies
- **tainted** - Whether the resource is tainted
- **deposed_key** - Deposed key if applicable

### Accessing Attribute Values

Unlike `tfplan` where you use `change.after`, in `tfstate` you access attribute values directly through the `values` property:

```python
import "tfstate/v2" as tfstate

# Get all EC2 instances in state
ec2_instances = filter tfstate.resources as _, r {
    r.type is "aws_instance"
}

# Check their current values
for ec2_instances as address, instance {
    print("Instance:", address)
    print("  Type:", instance.values.instance_type)
    print("  AMI:", instance.values.ami)
    print("  Public IP:", instance.values.public_ip)
}
```

## Counting Resources

One of the most common uses of `tfstate` is counting resources. This lets you enforce limits on how many resources of a type can exist.

```python
import "tfstate/v2" as tfstate
import "tfplan/v2" as tfplan

# Count current instances in state
current_instances = filter tfstate.resources as _, r {
    r.type is "aws_instance"
}

# Count instances being created
new_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

# Count instances being destroyed
deleted_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "delete"
}

# Calculate projected total
current_count = length(current_instances)
new_count = length(new_instances)
deleted_count = length(deleted_instances)
projected = current_count + new_count - deleted_count

# Enforce limit
max_instances = 50

main = rule {
    projected <= max_instances
}
```

## Auditing Existing Infrastructure

You can use `tfstate` to audit the current state of your infrastructure. This is useful for detecting drift from compliance standards.

```python
import "tfstate/v2" as tfstate

# Find all S3 buckets in state
s3_buckets = filter tfstate.resources as _, r {
    r.type is "aws_s3_bucket"
}

# Check that all existing buckets have versioning enabled
versioning_enabled = rule {
    all s3_buckets as address, bucket {
        if bucket.values.versioning is not null and
           length(bucket.values.versioning) > 0 {
            bucket.values.versioning[0].enabled is true
        } else {
            print("Bucket", address, "does not have versioning configured")
            false
        }
    }
}

main = rule {
    versioning_enabled
}
```

## Checking for Tainted Resources

Tainted resources are marked for replacement on the next apply. You might want to track or restrict operations involving tainted resources:

```python
import "tfstate/v2" as tfstate

# Find tainted resources
tainted_resources = filter tfstate.resources as _, r {
    r.tainted is true
}

# Report on tainted resources (advisory policy)
main = rule {
    if length(tainted_resources) > 0 {
        for tainted_resources as address, _ {
            print("Tainted resource found:", address)
        }
        # This is informational - still pass the policy
        true
    } else {
        true
    }
}
```

## Working with Module Resources

Resources in modules have a `module_address` that tells you their location in the module hierarchy:

```python
import "tfstate/v2" as tfstate

# Get all resources in state
all_resources = tfstate.resources

# Find resources in the root module only
root_resources = filter all_resources as _, r {
    r.module_address is ""
}

# Find resources in a specific module
web_module_resources = filter all_resources as _, r {
    r.module_address is "module.web"
}

# Count resources per module
for all_resources as address, r {
    if r.module_address is not "" {
        print("Module:", r.module_address, "Resource:", address)
    }
}
```

## Combining tfstate with tfplan

The real power of `tfstate` comes when you combine it with `tfplan`. Here are some practical patterns:

### Preventing Deletion of Resources with Dependencies

```python
import "tfstate/v2" as tfstate
import "tfplan/v2" as tfplan

# Find VPCs being deleted
vpc_deletes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_vpc" and
    rc.change.actions contains "delete"
}

# Find existing subnets in state
existing_subnets = filter tfstate.resources as _, r {
    r.type is "aws_subnet"
}

# Get the VPC IDs of subnets that still exist
check_vpc_delete = func(vpc_change) {
    vpc_id = vpc_change.change.before.id
    for existing_subnets as _, subnet {
        if subnet.values.vpc_id is vpc_id {
            print("Cannot delete VPC", vpc_id, "- it still has subnets")
            return false
        }
    }
    return true
}

main = rule {
    all vpc_deletes as _, vpc {
        check_vpc_delete(vpc)
    }
}
```

### Enforcing Resource Limits per Environment

```python
import "tfstate/v2" as tfstate
import "tfrun"

# Get resource counts from state
rds_instances = filter tfstate.resources as _, r {
    r.type is "aws_db_instance"
}

# Different limits per environment
get_limit = func(workspace_name) {
    if workspace_name matches ".*-prod$" {
        return 10
    } else if workspace_name matches ".*-staging$" {
        return 5
    } else {
        return 3
    }
}

limit = get_limit(tfrun.workspace.name)
current_count = length(rds_instances)

main = rule {
    current_count <= limit
}
```

### Validating Existing Security Posture

```python
import "tfstate/v2" as tfstate

# Check all existing security groups
security_groups = filter tfstate.resources as _, r {
    r.type is "aws_security_group"
}

# Verify no security group allows all inbound traffic
no_wide_open = rule {
    all security_groups as address, sg {
        all sg.values.ingress as _, rule {
            not (rule.from_port is 0 and
                 rule.to_port is 65535 and
                 rule.cidr_blocks contains "0.0.0.0/0")
        }
    }
}

main = rule {
    no_wide_open
}
```

## Accessing Output Values

The `tfstate` import also gives you access to current output values:

```python
import "tfstate/v2" as tfstate

# Access outputs from state
outputs = tfstate.outputs

# Check that certain outputs exist
main = rule {
    "vpc_id" in outputs and
    "subnet_ids" in outputs
}
```

## Handling Missing or Empty State

When a workspace has no existing state (like on the first run), `tfstate.resources` will be empty. Your policies should handle this gracefully:

```python
import "tfstate/v2" as tfstate

all_resources = tfstate.resources

# This is fine - all/any on empty collections work as expected
# all returns true for empty collections
# any returns false for empty collections
main = rule {
    all all_resources as _, r {
        r.type is not "aws_iam_user"
    }
}
```

## Limitations of tfstate

A few things to keep in mind:

1. State only reflects what Terraform manages. Resources created outside of Terraform will not appear here.
2. State can be stale if someone made manual changes to infrastructure without running Terraform.
3. Not all attribute values are available in state. Some sensitive values may be redacted.
4. The state represents the last known state, not necessarily the actual current state of the infrastructure.

Despite these limitations, `tfstate` is invaluable for policies that need context about existing infrastructure. For more on the other imports, check out our posts on [using the tfplan import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfplan-import-in-sentinel/view) and [using the tfrun import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfrun-import-in-sentinel/view).
