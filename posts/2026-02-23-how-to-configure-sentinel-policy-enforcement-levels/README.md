# How to Configure Sentinel Policy Enforcement Levels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Enforcement, Governance, HCP Terraform

Description: Learn how to configure and use Sentinel policy enforcement levels including advisory, soft-mandatory, and hard-mandatory to control how policies affect Terraform runs.

---

Not every Sentinel policy should have the same weight. Some policies are absolute requirements that must never be violated. Others are strong recommendations that should usually be followed but might have legitimate exceptions. And some are purely informational, alerting teams to potential issues without blocking their work. Sentinel enforcement levels give you this flexibility.

## The Three Enforcement Levels

Sentinel provides three enforcement levels, each with different behavior:

### Advisory

Advisory policies evaluate and report results but never block a Terraform run. Even if the policy fails, the run continues. Think of these as warnings or recommendations.

```hcl
policy "cost-warning" {
    source            = "./policies/cost-warning.sentinel"
    enforcement_level = "advisory"
}
```

Use advisory for:
- New policies you are rolling out gradually
- Cost optimization suggestions
- Best practice recommendations
- Informational checks that should not block work

### Soft-Mandatory

Soft-mandatory policies block the run by default when they fail, but authorized users can override the failure and allow the run to proceed. This provides a balance between enforcement and flexibility.

```hcl
policy "restrict-instance-types" {
    source            = "./policies/restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}
```

Use soft-mandatory for:
- Policies with known legitimate exceptions
- Cost controls that might need temporary overrides
- Standards that are being phased in
- Rules where business needs might occasionally require exceptions

### Hard-Mandatory

Hard-mandatory policies cannot be overridden by anyone. If the policy fails, the run is blocked and there is no way around it except fixing the issue or removing the policy.

```hcl
policy "enforce-encryption" {
    source            = "./policies/enforce-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}
```

Use hard-mandatory for:
- Security requirements with no exceptions
- Regulatory compliance controls
- Data sovereignty restrictions
- Policies that protect against critical misconfigurations

## Configuring Enforcement Levels

### In sentinel.hcl

The primary way to set enforcement levels is in the `sentinel.hcl` file:

```hcl
# sentinel.hcl

# Security policies - always enforced
policy "enforce-encryption" {
    source            = "./security/enforce-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-public-access" {
    source            = "./security/restrict-public-access.sentinel"
    enforcement_level = "hard-mandatory"
}

# Cost policies - can be overridden when needed
policy "cost-limits" {
    source            = "./cost/cost-limits.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "restrict-instance-types" {
    source            = "./cost/restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}

# Recommendations - informational only
policy "naming-conventions" {
    source            = "./standards/naming-conventions.sentinel"
    enforcement_level = "advisory"
}

policy "tag-best-practices" {
    source            = "./standards/tag-best-practices.sentinel"
    enforcement_level = "advisory"
}
```

### Via the API

You can also set enforcement levels through the HCP Terraform API:

```bash
# Update a policy's enforcement level
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "policies",
      "attributes": {
        "enforcement-level": "hard-mandatory"
      }
    }
  }' \
  https://app.terraform.io/api/v2/policies/pol-xxxxxxxxxxxx
```

## How Each Level Works in Practice

### Advisory Policy Workflow

1. Developer runs `terraform plan`
2. Sentinel evaluates the advisory policy
3. Policy fails
4. Run continues normally
5. Policy failure is shown in the UI as a warning
6. Developer can see the warning but is not blocked

```text
Plan: 3 to add, 0 to change, 0 to destroy.

Sentinel Result: false

This result is advisory. The policy will not block the run.

Policy: naming-conventions
  Status: FAILED
  Output:
    aws_instance.web - Name tag "my-server" does not match naming convention.
    Expected format: prod-{team}-{purpose}

Continue to apply? (yes/no)
```

### Soft-Mandatory Policy Workflow

1. Developer runs `terraform plan`
2. Sentinel evaluates the soft-mandatory policy
3. Policy fails
4. Run is blocked
5. An authorized user can override the failure
6. If overridden, the run continues with the override noted in the audit log

```text
Plan: 3 to add, 0 to change, 0 to destroy.

Sentinel Result: false

Policy: restrict-instance-types
  Status: FAILED
  Output:
    aws_instance.web uses m5.4xlarge which is not in the approved list.

This policy can be overridden by an authorized user.
Override? (yes/no)
```

### Hard-Mandatory Policy Workflow

1. Developer runs `terraform plan`
2. Sentinel evaluates the hard-mandatory policy
3. Policy fails
4. Run is blocked
5. No override is possible
6. Developer must fix the issue and re-run

```text
Plan: 3 to add, 0 to change, 0 to destroy.

Sentinel Result: false

Policy: enforce-encryption
  Status: FAILED
  Output:
    aws_db_instance.primary - storage_encrypted must be true.

This policy is hard-mandatory and cannot be overridden.
Fix the issues and re-run the plan.
```

## Choosing the Right Level

Here is a decision framework for choosing enforcement levels:

### Start with These Questions

1. **Can this ever have a legitimate exception?**
   - No -> Hard-mandatory
   - Yes -> Soft-mandatory or advisory

2. **Would violating this cause a security incident or compliance violation?**
   - Yes -> Hard-mandatory
   - No -> Soft-mandatory or advisory

3. **Is this a new policy being introduced?**
   - Yes -> Start with advisory, then upgrade

4. **Is this a best practice rather than a requirement?**
   - Yes -> Advisory

### Common Patterns by Category

```text
Hard-Mandatory:
  - Encryption at rest for storage services
  - No public databases
  - Region restrictions for data sovereignty
  - No wide-open security groups (0.0.0.0/0 on all ports)
  - CloudTrail logging enabled
  - Compliance-specific requirements (HIPAA, PCI)

Soft-Mandatory:
  - Instance type restrictions
  - Cost limits and budgets
  - Required tags
  - Module source restrictions
  - VPC flow log requirements
  - Backup retention policies

Advisory:
  - Naming conventions
  - Description requirements on variables
  - Latest generation instance recommendations
  - Cost optimization suggestions
  - Non-critical best practices
```

## Graduated Rollout Strategy

The best practice for introducing new policies is to start soft and get stricter over time:

### Week 1-2: Advisory

Deploy the new policy as advisory. Monitor how many runs would have been blocked.

```hcl
policy "new-encryption-policy" {
    source            = "./security/new-encryption-policy.sentinel"
    enforcement_level = "advisory"
}
```

### Week 3-4: Soft-Mandatory

After confirming the policy works correctly and addressing any false positives, upgrade to soft-mandatory.

```hcl
policy "new-encryption-policy" {
    source            = "./security/new-encryption-policy.sentinel"
    enforcement_level = "soft-mandatory"
}
```

### Week 5+: Hard-Mandatory

Once the organization has adapted and you have confirmed no legitimate exceptions exist, upgrade to hard-mandatory.

```hcl
policy "new-encryption-policy" {
    source            = "./security/new-encryption-policy.sentinel"
    enforcement_level = "hard-mandatory"
}
```

## Who Can Override Soft-Mandatory Policies?

In HCP Terraform, the ability to override soft-mandatory policies depends on the user's permissions. By default, organization owners and users with the "Manage Policies" permission can override.

This is configurable through team permissions:

```bash
# Check team permissions for policy overrides
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/teams/team-xxxxxxxxxxxx
```

## Auditing Overrides

Every soft-mandatory override is logged. You should regularly review these overrides to:

- Identify policies that are overridden too frequently (consider making them advisory or fixing the policy)
- Detect potential abuse of override privileges
- Find patterns that suggest the policy needs updating

```bash
# List policy check results for auditing
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/policy-checks?filter[result]=overridden
```

## Dynamic Enforcement Based on Context

While enforcement levels are set in `sentinel.hcl`, you can write policies that behave differently based on context, effectively creating dynamic enforcement:

```python
# dynamic-enforcement.sentinel
# Strict in production, lenient in development

import "tfrun"
import "tfplan/v2" as tfplan

is_prod = tfrun.workspace.name matches ".*-prod$"

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

main = rule {
    if is_prod {
        # Strict check for production
        all instances as _, inst {
            inst.change.after.instance_type in ["t3.medium", "t3.large"]
        }
    } else {
        # More lenient for non-production
        all instances as _, inst {
            inst.change.after.instance_type in [
                "t3.micro", "t3.small", "t3.medium", "t3.large",
            ]
        }
    }
}
```

This policy is set as hard-mandatory but behaves differently based on the workspace, effectively creating a graduated enforcement within a single policy.

Enforcement levels are a powerful tool for balancing governance with developer productivity. Use them thoughtfully to protect what matters most while giving teams room to work. For more on policy management, see our posts on [advisory vs hard-mandatory policies](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-with-advisory-vs-hard-mandatory-policies/view) and [handling policy exceptions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-sentinel-policy-exceptions/view).
