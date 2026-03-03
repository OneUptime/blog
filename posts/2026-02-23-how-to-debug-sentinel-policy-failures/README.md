# How to Debug Sentinel Policy Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Debugging, Policy as Code, HashiCorp, Troubleshooting

Description: Learn systematic approaches to debug Sentinel policy failures in Terraform Cloud and Enterprise, from reading error output to using the Sentinel CLI and mock data.

---

You have just pushed your Terraform changes, the plan looks good, but then a Sentinel policy check fails with a cryptic message. Maybe it says "main = false" and nothing else. Maybe it references an attribute that you know exists in your resource. Maybe it worked yesterday and now it does not.

Debugging Sentinel policies is a skill that takes practice. Unlike application code where you can set breakpoints and step through execution, Sentinel runs in a constrained environment. But there are systematic approaches that make the process much less painful. This post covers the tools and techniques you need.

## Understanding Sentinel Error Output

When a Sentinel policy fails in Terraform Cloud, you see output like this:

```text
Policy check:
  Organization Policy: require-encryption
    Result: false

    require-encryption.sentinel:45:1 - Rule "main"
      Value: false
```

This tells you the policy name and that the main rule evaluated to false, but not why. The first step in debugging is making your policies produce better output.

## Technique 1: Add Print Statements

The most effective debugging technique in Sentinel is strategic use of `print()`. Unlike most languages where print statements are a last resort, in Sentinel they are your primary debugging tool.

```python
# Before: Policy with no debugging output
import "tfplan/v2" as tfplan

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for instances as address, instance {
    if instance.change.after.instance_type not in ["t3.micro", "t3.small"] {
        append(violations, address)
    }
}

main = rule {
    length(violations) is 0
}
```

```python
# After: Same policy with debugging output
import "tfplan/v2" as tfplan

# Debug: Show how many resource changes we are examining
print("Total resource changes:", length(tfplan.resource_changes))

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Debug: Show how many instances matched the filter
print("EC2 instances found:", length(instances))

violations = []
for instances as address, instance {
    instance_type = instance.change.after.instance_type else "UNKNOWN"
    # Debug: Show each instance and its type
    print("Checking", address, "- type:", instance_type)

    if instance_type not in ["t3.micro", "t3.small"] {
        append(violations, address + " uses " + instance_type)
    }
}

# Debug: Show final violation count
print("Violations found:", length(violations))
for violations as v {
    print("  -", v)
}

main = rule {
    length(violations) is 0
}
```

The print output appears in the Terraform Cloud policy check results, giving you full visibility into what the policy sees.

## Technique 2: Inspect the Plan Data Structure

One of the most common causes of policy failures is misunderstanding the structure of the Terraform plan data. An attribute might be nested differently than you expect, or a value might be null when you expect a string.

Use a "dump" policy to inspect the raw data:

```python
# debug-dump.sentinel
# Temporary policy to inspect plan data structure
# Set to advisory so it never blocks

import "tfplan/v2" as tfplan

# Dump all resource changes
for tfplan.resource_changes as address, rc {
    print("=== Resource:", address, "===")
    print("  Type:", rc.type)
    print("  Actions:", rc.change.actions)
    print("  After:", rc.change.after)
    print("")
}

# Always pass - this is just for inspection
main = rule { true }
```

Set this as advisory in your sentinel.hcl and trigger a run. The output shows you exactly what data structure your policies are working with.

## Technique 3: Use the Sentinel CLI for Local Testing

The Sentinel CLI lets you test policies locally without triggering a Terraform Cloud run. This shortens the feedback loop dramatically.

Install the CLI:

```bash
# Download from HashiCorp releases
# https://releases.hashicorp.com/sentinel/

# On macOS with brew
brew install hashicorp/tap/sentinel

# Verify installation
sentinel version
```

Create a test with mock data:

```python
# test/require-encryption/fail.hcl
mock "tfplan/v2" {
    module {
        source = "testdata/unencrypted-rds.sentinel"
    }
}

test {
    rules = {
        main = false
    }
}
```

```python
# testdata/unencrypted-rds.sentinel
# Mock data representing an unencrypted RDS instance

resource_changes = {
    "aws_db_instance.main": {
        "type":    "aws_db_instance",
        "mode":    "managed",
        "address": "aws_db_instance.main",
        "change": {
            "actions": ["create"],
            "after": {
                "storage_encrypted":    false,
                "publicly_accessible":  false,
                "instance_class":       "db.t3.medium",
                "engine":               "postgres",
                "backup_retention_period": 7,
                "tags": {
                    "environment": "staging",
                },
            },
        },
    },
}
```

Run the test:

```bash
# Run a specific test
sentinel test -run require-encryption -verbose

# The -verbose flag shows print output and detailed results
# Output will show exactly which rules passed or failed
```

## Technique 4: Handle Null and Undefined Values

A massive source of Sentinel bugs is null or undefined attribute values. Terraform plan data frequently contains null values for attributes that are not set, computed attributes that are not yet known, or optional attributes.

```python
# This will crash if tags is null
tags = instance.change.after.tags
if not (tags contains "environment") {  # Error if tags is null
    append(violations, address)
}

# This is safe
tags = instance.change.after.tags else {}
if tags is null {
    append(violations, address + " - no tags defined")
} else if not (tags contains "environment") {
    append(violations, address + " - missing environment tag")
}
```

The `else` operator is your best friend. Always provide a default value:

```python
# Safe attribute access patterns
encrypted = resource.change.after.storage_encrypted else false
name = resource.change.after.name else ""
tags = resource.change.after.tags else {}
count = resource.change.after.count else 0
config = resource.change.after.configuration else null
```

## Technique 5: Debug Filter Expressions

When a filter returns fewer resources than expected, debug it step by step:

```python
# Start by checking everything without filters
print("All resource changes:")
for tfplan.resource_changes as address, rc {
    print("  ", address, "- type:", rc.type, "- mode:", rc.mode, "- actions:", rc.change.actions)
}

# Then apply filters one at a time
step1 = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance"
}
print("After type filter:", length(step1))

step2 = filter step1 as _, rc {
    rc.mode is "managed"
}
print("After mode filter:", length(step2))

step3 = filter step2 as _, rc {
    rc.change.actions contains "create" or
    rc.change.actions contains "update"
}
print("After actions filter:", length(step3))
```

This tells you exactly which filter condition is eliminating resources you expected to see.

## Technique 6: Generate Mock Data from Real Plans

Instead of writing mock data by hand, you can generate it from a real Terraform plan. Save the plan output as JSON and convert it:

```bash
# Generate a plan and save it as JSON
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json

# The JSON file contains the full plan data
# Extract the resource_changes section for your mock
```

Then use the JSON structure to create accurate mock data for your Sentinel tests. This eliminates guesswork about attribute names and nesting.

## Technique 7: Check Policy Set Configuration

Sometimes the policy itself is correct, but it is not applied to the right workspaces. Debug the policy set configuration:

```hcl
# sentinel.hcl - Check these common issues

policy "require-encryption" {
    # Is the source path correct?
    source = "./policies/require-encryption.sentinel"

    # Is this the right enforcement level?
    enforcement_level = "hard-mandatory"
}

# Is the module path correct?
module "tfplan-functions" {
    source = "./modules/tfplan-functions/tfplan-functions.sentinel"
}
```

In Terraform Cloud, verify:
- The policy set is connected to the correct VCS repository
- The correct branch is configured
- The workspace glob patterns match your target workspaces
- The policy set directory path is correct if policies are not at the repo root

## Technique 8: Use Sentinel Playground

HashiCorp provides a Sentinel playground at play.sentinelproject.io where you can test policy logic interactively. Paste your policy, provide mock data, and see results instantly. This is great for quick iteration on logic issues.

## Common Failure Patterns and Fixes

**Pattern: Policy passes locally but fails in Terraform Cloud**
The mock data does not match the real plan structure. Generate mock data from a real plan (Technique 6).

**Pattern: Policy worked before but now fails on all runs**
A module or import was updated. Check if the tfplan/v2 data structure has changed for newer provider versions.

**Pattern: Policy fails on some resources but not others**
Attribute values differ between resource types. An aws_instance has different attributes than an aws_launch_template. Add type-specific handling.

**Pattern: Policy fails with "undefined" errors**
An attribute path does not exist. Use the `else` operator and add null checks (Technique 4).

## Conclusion

Debugging Sentinel policies comes down to visibility. Add print statements generously, test locally with the Sentinel CLI, and always handle null values defensively. The initial investment in writing good test fixtures pays off enormously - once you have realistic mock data, you can iterate on policy logic in seconds rather than waiting for Terraform Cloud runs.

For more on structuring your Sentinel policies, see our guide on [Sentinel functions and modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-functions-and-modules/view).
