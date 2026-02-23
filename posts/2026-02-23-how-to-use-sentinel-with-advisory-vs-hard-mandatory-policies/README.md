# How to Use Sentinel with Advisory vs Hard-Mandatory Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Advisory, Hard-Mandatory, Governance, Enforcement

Description: Understand when to use advisory versus hard-mandatory Sentinel policies with practical examples and strategies for balancing enforcement with developer flexibility.

---

One of the most important decisions you make when deploying Sentinel policies is choosing between advisory and hard-mandatory enforcement. Get it wrong and you either block legitimate work or fail to catch real problems. This guide helps you make the right call for each policy and shows you how to transition between levels over time.

## The Enforcement Spectrum

Sentinel gives you three enforcement levels, but the key distinction is between the two extremes:

- **Advisory** policies warn but never block. They are informational.
- **Hard-mandatory** policies always block when they fail. There is no override.
- **Soft-mandatory** sits in between, blocking by default but allowing authorized overrides.

The choice between advisory and hard-mandatory is really about answering one question: what is the cost of a violation versus the cost of blocking work?

## When Advisory is the Right Choice

Advisory policies are appropriate when:

### The policy is new and untested

You just wrote a policy and you think it works, but you have not seen it run against real infrastructure. Deploy it as advisory first.

```hcl
# New policy - start as advisory to validate behavior
policy "enforce-naming-convention" {
    source            = "./standards/enforce-naming-convention.sentinel"
    enforcement_level = "advisory"
}
```

This lets you:
- See how many existing configurations would fail
- Identify false positives
- Gather feedback from teams
- Build confidence before enforcing

### The violation is a best practice, not a requirement

Some standards are nice to have but not critical:

```python
# latest-generation.sentinel
# Recommends using latest generation instance types
# Advisory because older types still work fine

import "tfplan/v2" as tfplan

latest_gen_families = ["t3", "m5", "c5", "r5", "m6i", "c6i", "r6i"]

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

import "strings"

main = rule {
    all instances as address, inst {
        family = strings.split(inst.change.after.instance_type, ".")[0]
        if family not in latest_gen_families {
            print("Advisory:", address, "uses", inst.change.after.instance_type,
                  "- consider upgrading to a latest generation type")
            print("Latest generation families:", latest_gen_families)
        }
        true  # Always pass - advisory
    }
}
```

Wait, there is a subtlety here. Even though this policy is set to advisory enforcement, the policy itself always returns `true`. This is because advisory policies that fail still show up as failures in the UI, which can be confusing if you just want to print a message. Some teams prefer to always pass advisory policies and use `print` for the feedback. Others let them genuinely fail since advisory failures do not block.

### You are gathering data

Sometimes you want to understand your current posture before enforcing:

```python
# audit-encryption.sentinel
# Audit how many resources lack encryption
# Deploy as advisory to gather baseline data

import "tfplan/v2" as tfplan

resources_checked = 0
violations_found = 0

ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.change.actions contains "create"
}

for ebs_volumes as address, vol {
    if vol.change.after.encrypted is not true {
        print("AUDIT:", address, "- not encrypted")
    }
}

# Pass regardless - we are just auditing
main = rule { true }
```

## When Hard-Mandatory is the Right Choice

Hard-mandatory policies are appropriate when:

### The violation would cause a security incident

```python
# no-public-databases.sentinel
# Databases must NEVER be publicly accessible
# Hard-mandatory - no exceptions

import "tfplan/v2" as tfplan

rds = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all rds as address, db {
        if db.change.after.publicly_accessible is true {
            print("BLOCKED:", address, "- databases must not be publicly accessible.",
                  "This is a hard requirement with no exceptions.")
            false
        } else {
            true
        }
    }
}
```

### Regulatory compliance requires it

```python
# gdpr-data-residency.sentinel
# EU data must stay in EU regions
# Hard-mandatory - regulatory requirement

import "tfplan/v2" as tfplan

eu_regions = ["eu-west-1", "eu-west-2", "eu-central-1"]

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

main = rule {
    all instances as address, inst {
        az = inst.change.after.availability_zone
        if az is not null {
            region = az[0:length(az)-1]
            if region not in eu_regions {
                print("BLOCKED:", address, "- GDPR requires EU data residency.",
                      "Region", region, "is not allowed.")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}
```

### The cost of a violation is irreversible

Some mistakes cannot be easily undone:

```python
# prevent-production-destroy.sentinel
# Prevent destruction of production databases
# Hard-mandatory - data loss is irreversible

import "tfrun"
import "tfplan/v2" as tfplan

is_prod = tfrun.workspace.name matches ".*-prod$"

protected_types = ["aws_rds_cluster", "aws_db_instance", "aws_dynamodb_table"]

destructive_changes = filter tfplan.resource_changes as _, rc {
    rc.type in protected_types and
    rc.change.actions contains "delete"
}

main = rule {
    if is_prod and length(destructive_changes) > 0 {
        for destructive_changes as address, _ {
            print("BLOCKED:", address,
                  "- destruction of production data resources is not allowed",
                  "through Sentinel. Use a separate approval process.")
        }
        false
    } else {
        true
    }
}
```

## The Role of Soft-Mandatory

Soft-mandatory is the practical middle ground. Use it when:

- There are known legitimate exceptions but they should be rare
- You want an audit trail of overrides
- The violation is serious but not catastrophic

```hcl
# Common soft-mandatory policies
policy "restrict-instance-types" {
    source            = "./cost/restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "require-tags" {
    source            = "./standards/require-tags.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "cost-budget-limit" {
    source            = "./cost/budget-limit.sentinel"
    enforcement_level = "soft-mandatory"
}
```

## Transition Strategy

The best approach is to transition policies through levels over time:

```
Week 1:   Deploy as advisory
           - Monitor pass/fail rates
           - Collect team feedback

Week 2-3: Review advisory data
           - Fix false positives
           - Update policy if needed
           - Communicate upcoming enforcement

Week 4:   Upgrade to soft-mandatory
           - Teams can still override with justification
           - Monitor override frequency

Week 6-8: Review override data
           - If overrides are rare, upgrade to hard-mandatory
           - If overrides are frequent, investigate why

Week 8+:  Upgrade to hard-mandatory (if appropriate)
           - No overrides possible
           - Policy is fully enforced
```

### Implementing the Transition

```hcl
# Phase 1 - advisory
policy "new-encryption-policy" {
    source            = "./security/new-encryption-policy.sentinel"
    enforcement_level = "advisory"
}

# Phase 2 - soft-mandatory (update sentinel.hcl and push)
policy "new-encryption-policy" {
    source            = "./security/new-encryption-policy.sentinel"
    enforcement_level = "soft-mandatory"
}

# Phase 3 - hard-mandatory (update sentinel.hcl and push)
policy "new-encryption-policy" {
    source            = "./security/new-encryption-policy.sentinel"
    enforcement_level = "hard-mandatory"
}
```

## Communication is Key

Regardless of enforcement level, communicate policy changes to your teams:

1. **Before advisory deployment**: "We are adding a new policy that checks X. It is advisory only and will not block your work."

2. **Before soft-mandatory upgrade**: "The X policy will become soft-mandatory next week. If you have legitimate cases that fail this policy, contact the platform team for guidance."

3. **Before hard-mandatory upgrade**: "The X policy becomes hard-mandatory on DATE. After that, all configurations must comply. Here is how to update your code..."

## Handling Disagreements

When teams disagree about enforcement levels:

1. Start with data. How many runs fail? How many overrides happen? What are the actual risks?
2. Document the decision process. Why was this level chosen?
3. Establish a review cadence. Revisit enforcement levels quarterly.
4. Create an exception process for soft-mandatory policies.

## Monitoring and Reporting

Track the effectiveness of your enforcement levels:

```python
# Add reporting to your policies
import "tfrun"

print("=== Policy Evaluation Report ===")
print("Policy: restrict-instance-types")
print("Workspace:", tfrun.workspace.name)
print("Enforcement: soft-mandatory")
# ... policy evaluation ...
print("Result:", result)
print("===")
```

The right enforcement level depends on context. There is no universal answer, and the best organizations regularly review and adjust their enforcement levels based on data and experience. For more on enforcement configuration, see our posts on [configuring enforcement levels](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-sentinel-policy-enforcement-levels/view) and [handling policy exceptions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-sentinel-policy-exceptions/view).
