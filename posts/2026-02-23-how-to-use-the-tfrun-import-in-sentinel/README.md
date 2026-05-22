# How to Use the tfrun Import in Sentinel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, Tfrun, Workspace Management

Description: Learn how to use the tfrun import in Sentinel to access workspace metadata, cost estimates, and run information for context-aware Terraform policies.

---

The `tfrun` import is different from the other Sentinel imports for Terraform. While `tfplan`, `tfconfig`, and `tfstate` deal with infrastructure resources and configuration, `tfrun` provides metadata about the Terraform run itself. It tells you which workspace is being used, who triggered the run, what the cost estimate is, and other contextual information that can make your policies smarter.

## What tfrun Provides

The `tfrun` import gives you access to:

- Workspace information (name, auto-apply setting, working directory)
- Organization details
- Run metadata such as the creator, commit SHA, and message
- Whether it is a destroy operation
- Cost estimation data (when enabled)

This metadata lets you write policies that behave differently based on context. A common pattern is having stricter policies for production workspaces than for development ones.

## Importing tfrun

Unlike the other Terraform imports, `tfrun` does not have a version suffix:

```sentinel
# Import run metadata - no version suffix needed

import "tfrun"
```

## Workspace Information

The workspace data is one of the most frequently used parts of `tfrun`:

```sentinel
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

```sentinel
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

```sentinel
import "tfrun"

# Production workspaces should not have auto-apply enabled
main = rule {
    not (tfrun.workspace.name matches ".*-prod$") or
        tfrun.workspace.auto_apply is false
}
```

## Organization Information

You can access organization-level data:

```sentinel
import "tfrun"

# Access organization name
org_name = tfrun.organization.name

# Only allow runs in approved organizations
main = rule {
    tfrun.organization.name in ["my-company", "my-company-sandbox"]
}
```

## Run Metadata

The `tfrun.created_by`, `tfrun.commit_sha`, and `tfrun.message` properties provide metadata about the run. You can also use `tfrun.workspace.vcs_repo` to check whether the workspace is connected to a VCS repository:

```sentinel
import "tfrun"

# Production workspaces should be connected to VCS and have a commit SHA
main = rule {
    not (tfrun.workspace.name matches ".*-prod$") or
        (tfrun.workspace.vcs_repo is not null and tfrun.commit_sha is not "")
}
```

This is useful for enforcing that production workspaces are tied to reviewed source control metadata.

## Destroy Detection

The `tfrun.is_destroy` property tells you whether the current run is a destroy operation:

```sentinel
import "tfrun"

# Prevent destroy operations on production workspaces
main = rule {
    not (tfrun.workspace.name matches ".*-prod$") or
        tfrun.is_destroy is false
}
```

You can also combine this with other conditions:

```sentinel
import "tfrun"

# Allow destroy operations only in non-prod
main = rule {
    not tfrun.is_destroy or
        not (tfrun.workspace.name matches ".*-prod$")
}
```

## Cost Estimation

When cost estimation is enabled in HCP Terraform, you can access the cost data through `tfrun.cost_estimate`:

```sentinel
import "tfrun"

# Access cost estimation data
proposed_cost = tfrun.cost_estimate.proposed_monthly_cost
prior_cost = tfrun.cost_estimate.prior_monthly_cost
delta = tfrun.cost_estimate.delta_monthly_cost

print("Current monthly cost:", prior_cost)
print("Proposed monthly cost:", proposed_cost)
print("Monthly cost change:", delta)
```

### Setting Cost Limits

```sentinel
import "tfrun"

# Maximum allowed monthly cost
max_monthly_cost = 5000.00

# Maximum allowed cost increase per run
max_cost_increase = 500.00

# Check total cost
cost_within_budget = rule {
    float(tfrun.cost_estimate.proposed_monthly_cost) <= max_monthly_cost
}

# Check cost increase
increase_within_limit = rule {
    float(tfrun.cost_estimate.delta_monthly_cost) <= max_cost_increase
}

main = rule {
    cost_within_budget and increase_within_limit
}
```

### Environment-Specific Cost Limits

```sentinel
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
    float(tfrun.cost_estimate.proposed_monthly_cost) <= limit
}
```

### Percentage-Based Cost Controls

```sentinel
import "tfrun"

# Do not allow cost increases greater than 20%
max_increase_pct = 20.0

prior = float(tfrun.cost_estimate.prior_monthly_cost)
proposed = float(tfrun.cost_estimate.proposed_monthly_cost)

cost_increase_ok = func() {
    if prior > 0 {
        # Calculate percentage increase
        pct_increase = ((proposed - prior) / prior) * 100
        print("Cost increase:", pct_increase, "%")
        return pct_increase <= max_increase_pct
    } else {
        # No prior cost, just check the absolute limit
        return proposed <= 1000.00
    }
}

main = rule {
    cost_increase_ok()
}
```

## Combining tfrun with Other Imports

The real value of `tfrun` comes from combining it with resource-level imports to create context-aware policies.

### Production-Specific Resource Restrictions

```sentinel
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
    not is_prod or
        all rds_instances as _, db {
            db.change.after.storage_encrypted is true
    }
}

# In production, require multi-AZ deployments
multi_az_required = rule {
    not is_prod or
        all rds_instances as _, db {
            db.change.after.multi_az is true
    }
}

main = rule {
    encryption_required and multi_az_required
}
```

### Time-Based Restrictions

The `tfrun.created_at` value provides the run creation timestamp in RFC3339 format. You can load it with Sentinel's `time` import to implement deployment windows:

```sentinel
import "tfrun"
import "time"

run_created = time.load(tfrun.created_at)
is_business_hours_utc = run_created.weekday not in [0, 6] and
    run_created.hour >= 9 and run_created.hour < 17

# Only allow production deploys during weekday business hours in UTC
main = rule {
    not (tfrun.workspace.name matches ".*-prod$") or
        is_business_hours_utc
}
```

## Complete Example: Multi-Policy Governance

Here is a comprehensive policy that uses `tfrun` for governance:

```sentinel
# governance.sentinel
# Comprehensive governance policy using tfrun metadata

import "tfrun"
import "tfplan/v2" as tfplan

# Environment detection
is_prod = tfrun.workspace.name matches ".*-prod$"
is_staging = tfrun.workspace.name matches ".*-staging$"

# Rule 1: No destroys in production
no_prod_destroy = rule {
    not is_prod or tfrun.is_destroy is false
}

# Rule 2: Cost controls
cost_within_limit = func() {
    if is_prod {
        return float(tfrun.cost_estimate.proposed_monthly_cost) <= 10000.00
    } else if is_staging {
        return float(tfrun.cost_estimate.proposed_monthly_cost) <= 3000.00
    } else {
        return float(tfrun.cost_estimate.proposed_monthly_cost) <= 1000.00
    }
}

cost_control = rule {
    cost_within_limit()
}

# Rule 3: Production workspaces must be connected to VCS
vcs_metadata = rule {
    not is_prod or
        (tfrun.workspace.vcs_repo is not null and tfrun.commit_sha is not "")
}

# Rule 4: Auto-apply restrictions
auto_apply_check = rule {
    not (is_prod or is_staging) or
        tfrun.workspace.auto_apply is false
}

# Main rule combines everything
main = rule {
    no_prod_destroy and
    cost_control and
    vcs_metadata and
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
- `tfrun.created_by` - User who created the run
- `tfrun.commit_sha` - Commit SHA associated with the run
- `tfrun.created_at` - Run creation timestamp
- `tfrun.is_destroy` - Whether this is a destroy run
- `tfrun.cost_estimate.prior_monthly_cost` - Current monthly cost
- `tfrun.cost_estimate.proposed_monthly_cost` - Projected monthly cost
- `tfrun.cost_estimate.delta_monthly_cost` - Cost difference

The `tfrun` import is the key to writing policies that understand context. Without it, every policy would apply the same rules regardless of environment, run metadata, or cost implications. For more on writing effective policies, check our guides on [Sentinel imports](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-imports-for-terraform/view) and [policies for cost control](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-cost-control/view).
