# How to Handle Sentinel Policy Exceptions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Exceptions, Governance, Override, Workflow

Description: Learn strategies for handling Sentinel policy exceptions including soft-mandatory overrides, exception lists, conditional logic, and governance workflows.

---

No matter how well you write your Sentinel policies, there will always be legitimate exceptions. A development team needs a GPU instance for machine learning. A legacy application requires a non-standard configuration. A security exception is approved by the CISO for a specific use case. Handling these exceptions gracefully is essential for keeping Sentinel useful rather than frustrating.

## Why Exceptions Are Inevitable

Policies are general rules, but infrastructure is specific. Here are common reasons for exceptions:

- A team needs a larger instance type for a performance-critical workload
- A service requires a non-standard port to be open
- A legacy system cannot be encrypted without a migration effort
- A compliance exception has been formally approved
- A temporary deployment needs to bypass cost controls

The question is not whether to allow exceptions, but how to handle them in a controlled and auditable way.

## Strategy 1: Soft-Mandatory Overrides

The simplest exception mechanism is using soft-mandatory enforcement. When a policy fails, authorized users can override it.

```hcl
# sentinel.hcl
policy "restrict-instance-types" {
    source            = "./policies/restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}
```

### Pros
- Built into HCP Terraform
- Creates an audit trail
- Simple to implement
- No policy changes needed

### Cons
- Override applies to the entire policy, not specific resources
- Relies on human judgment
- Can be abused if not monitored
- No way to pre-approve specific exceptions

## Strategy 2: Exception Lists in Policies

Build exception handling directly into your policies. Maintain lists of approved exceptions:

```python
# restrict-instance-types-with-exceptions.sentinel
import "tfplan/v2" as tfplan

# Standard allowed types
allowed_types = [
    "t3.micro", "t3.small", "t3.medium",
    "m5.large", "m5.xlarge",
]

# Approved exceptions with justification
# Format: workspace pattern -> allowed types
exceptions = {
    "ml-training-.*": [
        "p3.2xlarge",   # Approved: ML training requires GPU
        "p3.8xlarge",   # Approved: ML training requires GPU
    ],
    "data-analytics-prod": [
        "r5.4xlarge",   # Approved: In-memory analytics workload
        "r5.8xlarge",   # Approved: In-memory analytics workload
    ],
}

import "tfrun"

# Build the complete allowed list including exceptions
get_allowed_types = func() {
    types = allowed_types

    for exceptions as pattern, extra_types {
        if tfrun.workspace.name matches pattern {
            for extra_types as t {
                types = types + [t]
            }
        }
    }

    return types
}

final_allowed = get_allowed_types()

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all instances as address, inst {
        type = inst.change.after.instance_type
        if type not in final_allowed {
            print(address, "uses", type, "- not in approved list for workspace",
                  tfrun.workspace.name)
            print("Approved types:", final_allowed)
            print("To request an exception, contact the platform team.")
            false
        } else {
            true
        }
    }
}
```

### Pros
- Exceptions are documented in code
- Version controlled
- Reviewed through pull requests
- Specific to workspaces

### Cons
- Requires policy updates for each exception
- Can make policies complex over time
- Need a process for adding and removing exceptions

## Strategy 3: Resource-Level Exceptions with Tags

Use tags to mark resources that have approved exceptions:

```python
# encryption-with-exceptions.sentinel
import "tfplan/v2" as tfplan

# Exception tag key and required value
exception_tag = "SentinelException"
exception_value = "encryption-approved-2026-03"

ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.change.actions contains "create"
}

main = rule {
    all ebs_volumes as address, vol {
        if vol.change.after.encrypted is true {
            true  # Encrypted - passes normally
        } else {
            # Not encrypted - check for exception tag
            tags = vol.change.after.tags
            if tags is not null and
               exception_tag in tags and
               tags[exception_tag] is exception_value {
                print(address, "- EXCEPTION: unencrypted volume allowed by approved exception",
                      tags[exception_tag])
                true  # Exception approved
            } else {
                print(address, "- must be encrypted. No valid exception tag found.")
                false
            }
        }
    }
}
```

### Time-Limited Exceptions

You can make exception tags expire:

```python
# Time-limited exception handling
exception_valid_until = "2026-06-30"

check_exception = func(resource) {
    tags = resource.change.after.tags
    if tags is null {
        return false
    }

    if "SentinelException" not in tags {
        return false
    }

    exception = tags["SentinelException"]

    # Exception format: {policy}-approved-{expiry-date}
    # Example: encryption-approved-2026-06-30
    if exception matches ".*-approved-.*" {
        print("Exception found:", exception)
        print("Note: Exceptions should be reviewed regularly")
        return true
    }

    return false
}
```

## Strategy 4: Workspace-Based Exception Configuration

Use workspace variables or naming to drive exception behavior:

```python
# workspace-exceptions.sentinel
import "tfplan/v2" as tfplan
import "tfrun"

# Workspace naming convention for exceptions:
# Normal: team-app-env
# Exception: team-app-env-exception-TICKET

has_exception = tfrun.workspace.name matches ".*-exception-.*"

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

allowed_types = ["t3.micro", "t3.small", "t3.medium"]
exception_types = ["t3.micro", "t3.small", "t3.medium", "t3.large",
                   "m5.large", "m5.xlarge", "m5.2xlarge"]

main = rule {
    if has_exception {
        print("Note: This workspace has an approved exception.")
        print("Exception workspaces allow expanded instance types.")
        all instances as _, inst {
            inst.change.after.instance_type in exception_types
        }
    } else {
        all instances as _, inst {
            inst.change.after.instance_type in allowed_types
        }
    }
}
```

## Strategy 5: Exception Request Workflow

Build a formal workflow around exceptions:

### Step 1: Request

The team requests an exception by creating a ticket or pull request that modifies the exception configuration.

### Step 2: Review

The security/platform team reviews the request:
- What is the business justification?
- Is there an alternative approach?
- What is the risk?
- What is the duration of the exception?

### Step 3: Approval

If approved, the exception is added to the policy:

```python
# exception-registry.sentinel
# Central registry of approved exceptions

# Each exception has:
# - workspace pattern
# - policy name
# - justification
# - approval date
# - expiry date
# - ticket reference

approved_exceptions = {
    "exception-001": {
        "workspace": "ml-team-training-.*",
        "policy":    "restrict-instance-types",
        "reason":    "ML training requires GPU instances",
        "approved":  "2026-01-15",
        "expires":   "2026-07-15",
        "ticket":    "INFRA-1234",
    },
    "exception-002": {
        "workspace": "legacy-app-prod",
        "policy":    "enforce-encryption",
        "reason":    "Legacy app cannot support encryption until migration",
        "approved":  "2026-02-01",
        "expires":   "2026-05-01",
        "ticket":    "INFRA-5678",
    },
}
```

### Step 4: Implementation

The exception is deployed through the normal policy update process.

### Step 5: Expiry and Review

Exception expiry dates are monitored. When an exception expires, it must be renewed or the team must comply with the standard policy.

## Monitoring Exceptions

Track how exceptions are used:

```python
# Print exception usage for audit logs
import "tfrun"

print("=== Exception Audit ===")
print("Workspace:", tfrun.workspace.name)

for approved_exceptions as id, exc {
    if tfrun.workspace.name matches exc["workspace"] {
        print("Active exception:", id)
        print("  Reason:", exc["reason"])
        print("  Approved:", exc["approved"])
        print("  Expires:", exc["expires"])
        print("  Ticket:", exc["ticket"])
    }
}
```

## Best Practices for Exception Management

1. **Always require a ticket or justification** - Every exception should have a documented reason.

2. **Set expiry dates** - No exception should last forever. Force regular reviews.

3. **Keep exceptions in code** - Version-controlled exception lists are auditable and reviewable.

4. **Monitor override frequency** - If a soft-mandatory policy is overridden frequently, either the policy is too strict or teams need better guidance.

5. **Review quarterly** - Go through all active exceptions and remove or renew them.

6. **Communicate clearly** - When a policy blocks someone, the error message should explain how to request an exception.

```python
# Good error message with exception guidance
print("BLOCKED:", address, "uses instance type", type)
print("Approved types:", allowed_types)
print("")
print("If you need a different instance type, request an exception:")
print("  1. Create a JIRA ticket in the INFRA project")
print("  2. Include the workspace name, instance type needed, and justification")
print("  3. The platform team will review within 2 business days")
```

7. **Separate exception policies from standard policies** - Keep your base policies clean and manage exceptions through configuration or separate exception layers.

Exceptions are a necessary part of any governance system. The key is making them controlled, documented, and temporary. Without a good exception process, teams will find ways around your policies, and you lose visibility entirely. For related topics, see our posts on [enforcement levels](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-sentinel-policy-enforcement-levels/view) and [organizing policies for large organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-sentinel-policies-for-large-organizations/view).
