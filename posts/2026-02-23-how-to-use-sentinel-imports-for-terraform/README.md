# How to Use Sentinel Imports for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, Imports, Infrastructure as Code

Description: A comprehensive guide to understanding and using Sentinel imports for Terraform including tfplan, tfconfig, tfstate, and tfrun to build effective infrastructure policies.

---

Sentinel imports are the mechanism through which your policies access Terraform data. Without imports, your policies would have no information about what Terraform is doing. Each import provides a different view of your infrastructure, and choosing the right one for your use case is critical. This guide covers all four Terraform-specific imports and when to use each one.

## What Are Sentinel Imports?

In Sentinel, an import is a module that provides data and functions to your policy. When Sentinel runs as part of a Terraform workflow, several Terraform-specific imports are automatically available. These imports give you access to the plan, configuration, state, and run metadata.

The four Terraform imports are:

- `tfplan/v2` - The planned changes (what Terraform is about to do)
- `tfconfig/v2` - The Terraform configuration (what the user wrote)
- `tfstate/v2` - The current state (what already exists)
- `tfrun` - Metadata about the current run

Each import serves a different purpose, and many policies use multiple imports together.

## The tfplan Import

The `tfplan/v2` import is the most commonly used import. It gives you access to the planned resource changes, which means you can see what Terraform is about to create, update, or destroy.

```python
# Import the plan data
import "tfplan/v2" as tfplan

# Access all resource changes
all_changes = tfplan.resource_changes

# Filter for specific resource types
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check planned attribute values
main = rule {
    all ec2_instances as _, instance {
        instance.change.after.instance_type in ["t3.micro", "t3.small"]
    }
}
```

Key properties available on resource changes:

- `rc.type` - The resource type (e.g., "aws_instance")
- `rc.name` - The resource name in the configuration
- `rc.change.actions` - What Terraform plans to do ("create", "update", "delete", "read")
- `rc.change.after` - The planned attribute values after the change
- `rc.change.before` - The attribute values before the change

Use `tfplan` when you want to validate what Terraform is about to do. This is the right import for most enforcement policies.

## The tfconfig Import

The `tfconfig/v2` import gives you access to the raw Terraform configuration. This is useful when you need to check how resources are defined rather than what their planned values will be.

```python
# Import the configuration data
import "tfconfig/v2" as tfconfig

# Access all resources defined in configuration
all_resources = tfconfig.resources

# Filter for specific resource types
s3_buckets = filter tfconfig.resources as _, r {
    r.type is "aws_s3_bucket"
}

# Check configuration properties
main = rule {
    all s3_buckets as _, bucket {
        # Check that a specific attribute is configured
        "versioning" in bucket.config
    }
}
```

Key properties available on configuration resources:

- `r.type` - The resource type
- `r.name` - The resource name
- `r.config` - The configuration block as a map
- `r.module_address` - The module path where the resource is defined
- `r.provider_config_key` - The provider configuration being used

Use `tfconfig` when you need to check the structure of the configuration itself, validate module usage, or enforce standards on how code is written rather than what values it produces.

### Accessing Module Information

The `tfconfig` import also lets you inspect module calls:

```python
import "tfconfig/v2" as tfconfig

# Get all module calls
modules = tfconfig.module_calls

# Ensure all modules come from an approved source
main = rule {
    all modules as _, mod {
        mod.source matches "^app.terraform.io/.*" or
        mod.source matches "^registry.terraform.io/.*"
    }
}
```

### Accessing Variables

You can also access variable definitions:

```python
import "tfconfig/v2" as tfconfig

# Check that required variables have descriptions
variables = tfconfig.variables

main = rule {
    all variables as name, v {
        v.description is not ""
    }
}
```

## The tfstate Import

The `tfstate/v2` import provides access to the current Terraform state. This is the state before the plan is applied. It is useful when your policy needs to consider what already exists.

```python
# Import the state data
import "tfstate/v2" as tfstate

# Access resources currently in state
all_resources = tfstate.resources

# Filter for running instances
running_instances = filter tfstate.resources as _, r {
    r.type is "aws_instance"
}

# Check current state values
main = rule {
    all running_instances as _, instance {
        instance.values.monitoring is true
    }
}
```

Key properties available on state resources:

- `r.type` - The resource type
- `r.name` - The resource name
- `r.values` - The current attribute values (not `change.after` like tfplan)
- `r.module_address` - The module path

Use `tfstate` when you need to validate existing infrastructure or when your policy logic depends on the current state of resources. A common pattern is combining `tfstate` with `tfplan` to check relationships between existing and new resources.

### Combining State and Plan

Here is an example that limits the total number of instances:

```python
import "tfplan/v2" as tfplan
import "tfstate/v2" as tfstate

# Count existing instances in state
existing_instances = filter tfstate.resources as _, r {
    r.type is "aws_instance"
}
existing_count = length(existing_instances)

# Count new instances being created
new_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}
new_count = length(new_instances)

# Count instances being destroyed
destroyed_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "delete"
}
destroyed_count = length(destroyed_instances)

# Ensure total does not exceed limit
max_instances = 20
projected_total = existing_count + new_count - destroyed_count

main = rule {
    projected_total <= max_instances
}
```

## The tfrun Import

The `tfrun` import provides metadata about the current Terraform run. This includes information about the workspace, the organization, and the user who triggered the run.

```python
# Import run metadata
import "tfrun"

# Access workspace information
workspace_name = tfrun.workspace.name

# Check if this is a production workspace
is_production = tfrun.workspace.name matches ".*-prod$"

# Limit certain operations in production
main = rule {
    if is_production {
        # Only allow runs triggered by specific methods
        tfrun.source is "tfe-api" or tfrun.source is "tfe-ui"
    } else {
        true
    }
}
```

Key properties available:

- `tfrun.workspace.name` - Workspace name
- `tfrun.workspace.auto_apply` - Whether auto-apply is enabled
- `tfrun.organization.name` - Organization name
- `tfrun.source` - How the run was triggered
- `tfrun.is_destroy` - Whether this is a destroy operation
- `tfrun.cost_estimation` - Cost estimation data if enabled

### Using Cost Estimation Data

If cost estimation is enabled, you can access it through `tfrun`:

```python
import "tfrun"

# Set a monthly cost limit
max_monthly_cost = 1000.00

# Check the estimated cost increase
main = rule {
    float(tfrun.cost_estimation.proposed_monthly_cost) <= max_monthly_cost
}
```

## Choosing the Right Import

Here is a quick reference for which import to use:

**Use tfplan when:**
- Checking planned attribute values (instance types, regions, encryption settings)
- Validating changes before they happen
- Most enforcement policies

**Use tfconfig when:**
- Checking code structure and organization
- Validating module sources
- Enforcing coding standards
- Checking that variables have descriptions or defaults

**Use tfstate when:**
- Checking current infrastructure state
- Limiting total resource counts
- Validating relationships between existing and new resources

**Use tfrun when:**
- Making decisions based on workspace or organization
- Checking cost estimates
- Controlling who can trigger operations
- Differentiating between environments

## Import Versioning

You may have noticed the `/v2` suffix on three of the imports. This indicates the version of the import. The v2 imports provide a more consistent and feature-rich API compared to v1. Always use v2 unless you have a specific reason not to.

Note that `tfrun` does not have a version suffix because its structure has remained stable.

## Practical Example Using Multiple Imports

Here is a more complete example that uses three imports together:

```python
# multi-import-policy.sentinel
# Enforces different rules based on workspace environment

import "tfplan/v2" as tfplan
import "tfconfig/v2" as tfconfig
import "tfrun"

# Determine environment from workspace name
is_production = tfrun.workspace.name matches ".*-prod$"

# Get planned EC2 instances
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check that all modules come from approved sources
approved_modules = rule {
    all tfconfig.module_calls as _, mod {
        mod.source matches "^app.terraform.io/myorg/.*"
    }
}

# Production gets stricter instance type rules
instance_type_rule = rule {
    if is_production {
        all ec2_instances as _, inst {
            inst.change.after.instance_type in ["t3.small", "t3.medium"]
        }
    } else {
        all ec2_instances as _, inst {
            inst.change.after.instance_type in ["t3.micro", "t3.small", "t3.medium", "t3.large"]
        }
    }
}

main = rule {
    approved_modules and instance_type_rule
}
```

Understanding which import to use and how they work together is foundational for writing effective Sentinel policies. For specific examples of policies using these imports, check out our guides on [using the tfplan import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfplan-import-in-sentinel/view) and [using the tfconfig import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfconfig-import-in-sentinel/view).
