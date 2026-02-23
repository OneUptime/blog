# How to Write Sentinel Policies for Cost Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Cost Control, FinOps, Cloud Cost Management, Budget

Description: Learn how to write Sentinel policies that enforce cost controls in Terraform including budget limits, instance restrictions, and cost estimation validation.

---

Cloud costs have a way of growing faster than anyone expects. Without guardrails, individual engineers can deploy resources that cost thousands of dollars per month without realizing it. Sentinel policies give you the ability to enforce cost controls directly in the Terraform workflow, blocking expensive deployments before they happen.

## Cost Control Strategies in Sentinel

There are several approaches to controlling costs with Sentinel:

1. **Cost estimation limits** - Use HCP Terraform's built-in cost estimation to set budget caps
2. **Instance type restrictions** - Limit which compute sizes can be used
3. **Resource count limits** - Cap the number of expensive resources
4. **Service restrictions** - Block expensive services entirely
5. **Environment-based budgets** - Different limits for different environments

Let us implement each of these.

## Using Cost Estimation Data

HCP Terraform can estimate the monthly cost of planned changes. Sentinel can access this data through the `tfrun` import:

```python
# cost-limit.sentinel
# Enforces maximum monthly cost and cost increase limits

import "tfrun"

# Maximum total monthly cost
max_monthly_cost = 10000.00

# Maximum cost increase per run
max_cost_increase = 500.00

# Get cost data
proposed = float(tfrun.cost_estimation.proposed_monthly_cost)
prior = float(tfrun.cost_estimation.prior_monthly_cost)
delta = float(tfrun.cost_estimation.delta_monthly_cost)

# Check total cost
total_within_budget = rule {
    if proposed > max_monthly_cost {
        print("Proposed monthly cost:", proposed,
              "exceeds budget of", max_monthly_cost)
        false
    } else {
        true
    }
}

# Check cost increase
increase_within_limit = rule {
    if delta > max_cost_increase {
        print("Monthly cost increase:", delta,
              "exceeds limit of", max_cost_increase)
        false
    } else {
        true
    }
}

main = rule {
    total_within_budget and increase_within_limit
}
```

## Environment-Based Cost Limits

Different environments should have different budgets:

```python
import "tfrun"

# Cost limits per environment
cost_limits = {
    "prod": {
        "max_monthly":  25000.00,
        "max_increase": 2000.00,
    },
    "staging": {
        "max_monthly":  5000.00,
        "max_increase": 1000.00,
    },
    "dev": {
        "max_monthly":  2000.00,
        "max_increase": 500.00,
    },
    "sandbox": {
        "max_monthly":  500.00,
        "max_increase": 200.00,
    },
}

# Determine environment
get_env = func() {
    name = tfrun.workspace.name
    if name matches ".*-prod$" { return "prod" }
    if name matches ".*-staging$" { return "staging" }
    if name matches ".*-dev$" { return "dev" }
    return "sandbox"
}

env = get_env()
limits = cost_limits[env]

proposed = float(tfrun.cost_estimation.proposed_monthly_cost)
delta = float(tfrun.cost_estimation.delta_monthly_cost)

main = rule {
    if proposed > limits["max_monthly"] {
        print("Environment:", env)
        print("Proposed cost:", proposed, "exceeds limit:", limits["max_monthly"])
        false
    } else if delta > limits["max_increase"] {
        print("Environment:", env)
        print("Cost increase:", delta, "exceeds limit:", limits["max_increase"])
        false
    } else {
        true
    }
}
```

## Percentage-Based Cost Increase Limits

Rather than absolute numbers, you might want to limit percentage increases:

```python
import "tfrun"

# Maximum allowed percentage increase
max_increase_pct = 25.0

prior = float(tfrun.cost_estimation.prior_monthly_cost)
proposed = float(tfrun.cost_estimation.proposed_monthly_cost)

main = rule {
    if prior > 0 {
        increase_pct = ((proposed - prior) / prior) * 100.0

        if increase_pct > max_increase_pct {
            print("Cost would increase by", increase_pct, "%")
            print("  Current:", prior)
            print("  Proposed:", proposed)
            print("  Max allowed increase:", max_increase_pct, "%")
            false
        } else {
            print("Cost change:", increase_pct, "%")
            true
        }
    } else {
        # No existing costs - apply absolute limit
        proposed <= 1000.00
    }
}
```

## Restricting Expensive Instance Types

Beyond the cost estimation, you can directly block expensive instance types:

```python
import "tfplan/v2" as tfplan

# Expensive instance types that require special approval
blocked_instance_types = [
    # GPU instances
    "p3.2xlarge", "p3.8xlarge", "p3.16xlarge",
    "p4d.24xlarge",
    "g4dn.xlarge", "g4dn.2xlarge", "g4dn.4xlarge", "g4dn.8xlarge",
    # High memory instances
    "x1.16xlarge", "x1.32xlarge",
    "x1e.xlarge", "x1e.2xlarge", "x1e.4xlarge",
    # Very large general purpose
    "m5.12xlarge", "m5.16xlarge", "m5.24xlarge",
    "c5.12xlarge", "c5.18xlarge", "c5.24xlarge",
    "r5.12xlarge", "r5.16xlarge", "r5.24xlarge",
]

ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all ec2_instances as address, inst {
        type = inst.change.after.instance_type
        if type in blocked_instance_types {
            print(address, "uses", type, "which requires special approval.",
                  "Contact platform-team for exceptions.")
            false
        } else {
            true
        }
    }
}
```

## Resource Count Limits

Limit how many of an expensive resource type can exist:

```python
import "tfplan/v2" as tfplan
import "tfstate/v2" as tfstate

# Resource type limits
resource_limits = {
    "aws_instance":             50,
    "aws_db_instance":          10,
    "aws_rds_cluster":          5,
    "aws_elasticsearch_domain": 3,
    "aws_nat_gateway":          6,
    "aws_eks_cluster":          3,
}

# Check each resource type
check_limit = func(resource_type, max_count) {
    # Count current resources
    current = filter tfstate.resources as _, r {
        r.type is resource_type
    }

    # Count new resources
    new = filter tfplan.resource_changes as _, rc {
        rc.type is resource_type and
        rc.change.actions contains "create"
    }

    # Count resources being deleted
    deleted = filter tfplan.resource_changes as _, rc {
        rc.type is resource_type and
        rc.change.actions contains "delete"
    }

    projected = length(current) + length(new) - length(deleted)

    if projected > max_count {
        print(resource_type, "- projected count:", projected,
              "exceeds limit:", max_count)
        return false
    }
    return true
}

main = rule {
    all resource_limits as type, limit {
        check_limit(type, limit)
    }
}
```

## Blocking Expensive Services

Some services are inherently expensive and should be restricted:

```python
import "tfplan/v2" as tfplan

# Services that require approval before use
restricted_services = [
    "aws_redshift_cluster",
    "aws_elasticsearch_domain",
    "aws_opensearch_domain",
    "aws_emr_cluster",
    "aws_sagemaker_notebook_instance",
    "aws_glue_job",
    "aws_msk_cluster",
    "aws_neptune_cluster",
]

# Check for restricted service creation
restricted = filter tfplan.resource_changes as _, rc {
    rc.type in restricted_services and
    rc.change.actions contains "create"
}

main = rule {
    if length(restricted) > 0 {
        for restricted as address, rc {
            print(address, "- resource type", rc.type,
                  "requires approval. Contact platform team.")
        }
        false
    } else {
        true
    }
}
```

## Storage Cost Controls

Storage costs can accumulate quietly. Control them with policies:

```python
import "tfplan/v2" as tfplan

# EBS volume size limits
max_ebs_size_gb = 500

# RDS storage limits
max_rds_storage_gb = 1000

# Get EBS volumes
ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Get RDS instances
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check EBS sizes
ebs_size_check = rule {
    all ebs_volumes as address, vol {
        size = vol.change.after.size
        if size > max_ebs_size_gb {
            print(address, "- EBS volume size", size, "GB",
                  "exceeds limit of", max_ebs_size_gb, "GB")
            false
        } else {
            true
        }
    }
}

# Check RDS storage
rds_storage_check = rule {
    all rds_instances as address, db {
        storage = db.change.after.allocated_storage
        if storage is not null and storage > max_rds_storage_gb {
            print(address, "- RDS storage", storage, "GB",
                  "exceeds limit of", max_rds_storage_gb, "GB")
            false
        } else {
            true
        }
    }
}

# Check for expensive EBS volume types
ebs_type_check = rule {
    all ebs_volumes as address, vol {
        vol_type = vol.change.after.type
        if vol_type is "io1" or vol_type is "io2" {
            iops = vol.change.after.iops
            if iops is not null and iops > 10000 {
                print(address, "- provisioned IOPS", iops,
                      "is expensive. Consider gp3 with up to 16000 IOPS.")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}

main = rule {
    ebs_size_check and rds_storage_check and ebs_type_check
}
```

## Data Transfer Cost Awareness

NAT gateways are a common source of unexpected costs:

```python
import "tfplan/v2" as tfplan
import "tfstate/v2" as tfstate

# Get NAT gateways
new_nat_gateways = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_nat_gateway" and
    rc.change.actions contains "create"
}

existing_nat_gateways = filter tfstate.resources as _, r {
    r.type is "aws_nat_gateway"
}

# Limit NAT gateways (they cost about $32/month each plus data transfer)
max_nat_gateways = 4

projected = length(existing_nat_gateways) + length(new_nat_gateways)

main = rule {
    if projected > max_nat_gateways {
        print("Projected NAT gateway count:", projected,
              "exceeds limit of", max_nat_gateways)
        print("Each NAT gateway costs ~$32/month plus $0.045/GB data transfer")
        false
    } else {
        true
    }
}
```

## Comprehensive Cost Control Policy

Here is a policy that combines multiple cost control strategies:

```python
# cost-governance.sentinel
# Comprehensive cost control policy

import "tfrun"
import "tfplan/v2" as tfplan

# --- Cost Estimation Limits ---
max_monthly = 10000.00
max_increase = 1000.00

proposed_cost = float(tfrun.cost_estimation.proposed_monthly_cost)
cost_delta = float(tfrun.cost_estimation.delta_monthly_cost)

budget_check = rule {
    proposed_cost <= max_monthly and cost_delta <= max_increase
}

# --- Instance Type Restrictions ---
blocked_types = [
    "p3.2xlarge", "p3.8xlarge", "p3.16xlarge",
    "x1.16xlarge", "x1.32xlarge",
    "m5.24xlarge", "c5.24xlarge", "r5.24xlarge",
]

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

no_blocked_instances = rule {
    all instances as _, inst {
        inst.change.after.instance_type not in blocked_types
    }
}

# --- Storage Limits ---
ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.change.actions contains "create"
}

storage_check = rule {
    all ebs_volumes as _, vol {
        vol.change.after.size <= 500
    }
}

main = rule {
    budget_check and no_blocked_instances and storage_check
}
```

Cost control policies save organizations real money. Even a single blocked deployment that would have cost thousands per month pays for the effort of writing these policies many times over. For more on cost optimization, see our post on [restricting instance types](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-restrict-instance-types/view) and [region restrictions](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-region-restrictions/view).
