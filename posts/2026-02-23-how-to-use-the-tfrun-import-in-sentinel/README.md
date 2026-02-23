# How to Use the tfrun Import in Sentinel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, tfrun, Workspace Management

Description: Learn how to use the tfrun import in Sentinel to access workspace metadata, cost estimates, and run information for context-aware Terraform policies.

---

The `tfrun` import is different from the other Sentinel imports for Terraform. While `tfplan`, `tfconfig`, and `tfstate` deal with infrastructure resources and configuration, `tfrun` provides metadata about the Terraform run itself. It tells you which workspace is being used, who triggered the run, what the cost estimate is, and other contextual information that can make your policies smarter.

## What tfrun Provides

The `tfrun` import gives you access to:

- Workspace information (name, auto-apply setting, working directory)
- Organization details
- Run source (how it was triggered)
- Whether it is a destroy operation
- Cost estimation data (when enabled)

This metadata lets you write policies that behave differently based on context. A common pattern is having stricter policies for production workspaces than for development ones.

## Importing tfrun

Unlike the other Terraform imports, `tfrun` does not have a version suffix:

```python
# Import run metadata - no version suffix needed
import "tfrun"
```

## Workspace Information

The workspace data is one of the most frequently used parts of `tfrun`:

```python
import "tfrun"

# Access workspace properties
workspace_name = tfrun.workspace.name
auto_apply = tfrun.workspace.auto_apply
working_dir = tfrun.workspace.working_directory

# Print workspace info
print("Workspace:", workspace_name)
print("Auto-apply:", auto_apply)
print("Working directory:", working_dir)
```

### Environment-Based Policies

The most common pattern is using workspace names to determine the environment and apply different rules:

```python
import "tfrun"
import "tfplan/v2" as tfplan

# Determine environment from workspace name
is_production = tfrun.workspace.name matches ".*-prod$"
is_staging = tfrun.workspace.name matches ".*-staging$"
is_development = tfrun.workspace.name matches ".*-dev$"

# Get EC2 instances
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Different allowed instance types per environment
get_allowed_types = func() {
    if is_production {
        return ["t3.medium", "t3.large", "t3.xlarge"]
    } else if is_staging {
        return ["t3.small", "t3.medium"]
    } else {
        return ["t3.micro", "t3.small", "t3.medium"]
    }
}

allowed_types = get_allowed_types()

main = rule {
    all ec2_instances as _, inst {
        inst.change.after.instance_type in allowed_types
    }
}
```

### Preventing Auto-Apply in Production

```python
import "tfrun"

# Production workspaces should not have auto-apply enabled
main = rule {
    if tfrun.workspace.name matches ".*-prod$" {
        tfrun.workspace.auto_apply is false
    } else {
        true
    }
}
```

## Organization Information

You can access organization-level data:

```python
import "tfrun"

# Access organization name
org_name = tfrun.organization.name

# Only allow runs in approved organizations
main = rule {
    tfrun.organization.name in ["my-company", "my-company-sandbox"]
}
```

## Run Source

The `tfrun.source` property tells you how the run was triggered. This can be used to restrict which methods are allowed for certain operations:

```python
import "tfrun"

# Possible sources: "tfe-api", "tfe-ui", "tfe-cli", "tfe-vcs"

# Production workspaces should only be deployed through VCS or API
main = rule {
    if tfrun.workspace.name matches ".*-prod$" {
        tfrun.source in ["tfe-vcs", "tfe-api"]
    } else {
        true
    }
}
```

This is useful for enforcing that production deployments go through your CI/CD pipeline rather than being triggered manually.

## Destroy Detection

The `tfrun.is_destroy` property tells you whether the current run is a destroy operation:

```python
import "tfrun"

# Prevent destroy operations on production workspaces
main = rule {
    if tfrun.workspace.name matches ".*-prod$" {
        tfrun.is_destroy is false
    } else {
        true
    }
}
```

You can also combine this with other conditions:

```python
import "tfrun"

# Allow destroy only from API (automated cleanup) in non-prod
main = rule {
    if tfrun.is_destroy {
        if tfrun.workspace.name matches ".*-prod$" {
            # Never allow production destroys through Sentinel
            # (they should be handled through a separate approval process)
            false
        } else {
            # Non-prod destroys are fine from any source
            true
        }
    } else {
        true
    }
}
```

## Cost Estimation

When cost estimation is enabled in HCP Terraform, you can access the cost data through `tfrun.cost_estimation`:

```python
import "tfrun"

# Access cost estimation data
proposed_cost = tfrun.cost_estimation.proposed_monthly_cost
prior_cost = tfrun.cost_estimation.prior_monthly_cost
delta = tfrun.cost_estimation.delta_monthly_cost

print("Current monthly cost:", prior_cost)
print("Proposed monthly cost:", proposed_cost)
print("Monthly cost change:", delta)
```

### Setting Cost Limits

```python
import "tfrun"

# Maximum allowed monthly cost
max_monthly_cost = 5000.00

# Maximum allowed cost increase per run
max_cost_increase = 500.00

# Check total cost
cost_within_budget = rule {
    float(tfrun.cost_estimation.proposed_monthly_cost) <= max_monthly_cost
}

# Check cost increase
increase_within_limit = rule {
    float(tfrun.cost_estimation.delta_monthly_cost) <= max_cost_increase
}

main = rule {
    cost_within_budget and increase_within_limit
}
```

### Environment-Specific Cost Limits

```python
import "tfrun"

# Different cost limits per environment
get_cost_limit = func(workspace) {
    if workspace matches ".*-prod$" {
        return 10000.00
    } else if workspace matches ".*-staging$" {
        return 3000.00
    } else {
        return 1000.00
    }
}

limit = get_cost_limit(tfrun.workspace.name)

main = rule {
    float(tfrun.cost_estimation.proposed_monthly_cost) <= limit
}
```

### Percentage-Based Cost Controls

```python
import "tfrun"

# Do not allow cost increases greater than 20%
max_increase_pct = 20.0

prior = float(tfrun.cost_estimation.prior_monthly_cost)
proposed = float(tfrun.cost_estimation.proposed_monthly_cost)

main = rule {
    if prior > 0 {
        # Calculate percentage increase
        pct_increase = ((proposed - prior) / prior) * 100
        print("Cost increase:", pct_increase, "%")
        pct_increase <= max_increase_pct
    } else {
        # No prior cost, just check the absolute limit
        proposed <= 1000.00
    }
}
```

## Combining tfrun with Other Imports

The real value of `tfrun` comes from combining it with resource-level imports to create context-aware policies.

### Production-Specific Resource Restrictions

```python
import "tfrun"
import "tfplan/v2" as tfplan

is_prod = tfrun.workspace.name matches ".*-prod$"

# Get all resources being created or updated
all_changes = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create" or rc.change.actions contains "update"
}

# In production, require encryption on all RDS instances
rds_instances = filter all_changes as _, rc {
    rc.type is "aws_db_instance"
}

encryption_required = rule {
    if is_prod {
        all rds_instances as _, db {
            db.change.after.storage_encrypted is true
        }
    } else {
        true
    }
}

# In production, require multi-AZ deployments
multi_az_required = rule {
    if is_prod {
        all rds_instances as _, db {
            db.change.after.multi_az is true
        }
    } else {
        true
    }
}

main = rule {
    encryption_required and multi_az_required
}
```

### Time-Based Restrictions

While `tfrun` does not directly provide timestamps, you can use workspace naming or other metadata to implement deployment windows:

```python
import "tfrun"

# Block deployments to production based on workspace tags or naming
# (Real time-based restrictions would need an external data source)

# Only allow production deploys via VCS (enforces code review)
main = rule {
    if tfrun.workspace.name matches ".*-prod$" {
        # Must come through VCS (meaning it was merged and reviewed)
        tfrun.source is "tfe-vcs"
    } else {
        true
    }
}
```

## Complete Example: Multi-Policy Governance

Here is a comprehensive policy that uses `tfrun` for governance:

```python
# governance.sentinel
# Comprehensive governance policy using tfrun metadata

import "tfrun"
import "tfplan/v2" as tfplan

# Environment detection
is_prod = tfrun.workspace.name matches ".*-prod$"
is_staging = tfrun.workspace.name matches ".*-staging$"

# Rule 1: No destroys in production
no_prod_destroy = rule {
    if is_prod {
        tfrun.is_destroy is false
    } else {
        true
    }
}

# Rule 2: Cost controls
cost_control = rule {
    if is_prod {
        float(tfrun.cost_estimation.proposed_monthly_cost) <= 10000.00
    } else if is_staging {
        float(tfrun.cost_estimation.proposed_monthly_cost) <= 3000.00
    } else {
        float(tfrun.cost_estimation.proposed_monthly_cost) <= 1000.00
    }
}

# Rule 3: Production deployments must come through VCS
deployment_method = rule {
    if is_prod {
        tfrun.source is "tfe-vcs"
    } else {
        true
    }
}

# Rule 4: Auto-apply restrictions
auto_apply_check = rule {
    if is_prod or is_staging {
        tfrun.workspace.auto_apply is false
    } else {
        true
    }
}

# Main rule combines everything
main = rule {
    no_prod_destroy and
    cost_control and
    deployment_method and
    auto_apply_check
}
```

## Available tfrun Properties Reference

Here is a quick reference of all available properties:

- `tfrun.workspace.name` - Workspace name
- `tfrun.workspace.description` - Workspace description
- `tfrun.workspace.auto_apply` - Auto-apply setting
- `tfrun.workspace.working_directory` - Working directory
- `tfrun.workspace.vcs_repo` - VCS repository information
- `tfrun.organization.name` - Organization name
- `tfrun.source` - Run trigger source
- `tfrun.is_destroy` - Whether this is a destroy run
- `tfrun.cost_estimation.prior_monthly_cost` - Current monthly cost
- `tfrun.cost_estimation.proposed_monthly_cost` - Projected monthly cost
- `tfrun.cost_estimation.delta_monthly_cost` - Cost difference

The `tfrun` import is the key to writing policies that understand context. Without it, every policy would apply the same rules regardless of environment, deployment method, or cost implications. For more on writing effective policies, check our guides on [Sentinel imports](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-imports-for-terraform/view) and [policies for cost control](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-cost-control/view).
