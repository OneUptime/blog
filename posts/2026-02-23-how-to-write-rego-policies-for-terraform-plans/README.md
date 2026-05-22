# How to Write Rego Policies for Terraform Plans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Rego, OPA, Policy, Testing, Infrastructure as Code

Description: Learn the Rego language fundamentals and how to write effective policies that evaluate Terraform plan JSON output to enforce security, compliance, and cost controls.

---

Rego is the policy language used by Open Policy Agent (OPA). When you write Rego policies for Terraform, you are writing rules that evaluate the JSON output of `terraform plan` and decide whether the proposed changes are acceptable. This guide focuses on the Rego language itself - how to read Terraform plan JSON, write clear rules, handle edge cases, and debug policies that are not working.

## Understanding the Terraform Plan JSON Structure

Before writing Rego, you need to understand what you are evaluating. Generate a plan JSON file:

```bash
# Generate plan and export as JSON

terraform plan -out=tfplan
terraform show -json tfplan > plan.json
```

The JSON has several key sections:

```json
{
  "format_version": "1.2",
  "terraform_version": "1.7.0",
  "resource_changes": [
    {
      "address": "aws_s3_bucket.data",
      "type": "aws_s3_bucket",
      "change": {
        "actions": ["create"],
        "before": null,
        "after": {
          "bucket": "my-data-bucket",
          "tags": {
            "Environment": "production"
          }
        }
      }
    }
  ],
  "configuration": {
    "root_module": {
      "resources": [...]
    }
  }
}
```

The `resource_changes` array is where most policies focus. Each entry describes what Terraform plans to do with a resource.

## Rego Basics for Terraform

Rego reads differently from most programming languages. Here are the fundamentals.

### Rules and Packages

```rego
# policy/terraform.rego

# Every policy file starts with a package declaration
package terraform

import rego.v1

# Import the plan input
import input as plan

# A simple rule - deny if an S3 bucket encryption configuration does not use KMS
deny contains msg if {
    # Iterate over resource changes
    resource := plan.resource_changes[_]

    # Filter to S3 bucket encryption configurations being created or updated
    resource.type == "aws_s3_bucket_server_side_encryption_configuration"
    not "delete" in resource.change.actions

    # Check that the default encryption algorithm uses KMS
    rule := resource.change.after.rule[_]
    default_encryption := rule.apply_server_side_encryption_by_default[_]
    default_encryption.sse_algorithm != "aws:kms"

    # Build a descriptive message
    msg := sprintf("S3 bucket encryption configuration '%s' must use aws:kms", [resource.address])
}
```

Key things to understand:
- `deny contains msg` defines a set. If any rule body matches, its `msg` is added to the set.
- `resource := plan.resource_changes[_]` iterates over the array. The `_` is an anonymous variable.
- Rules are AND-ed together. Every line in a rule body must be true for the rule to match.
- The `not` keyword negates a condition.

### Variables and Iteration

```rego
# Iterate with explicit index
deny contains msg if {
    some i
    resource := plan.resource_changes[i]
    resource.type == "aws_security_group_rule"
    resource.change.after.type == "ingress"

    # Check if any CIDR block is 0.0.0.0/0
    cidr := resource.change.after.cidr_blocks[_]
    cidr == "0.0.0.0/0"

    msg := sprintf(
        "Security group rule '%s' allows unrestricted ingress (0.0.0.0/0)",
        [resource.address]
    )
}
```

### Helper Rules

Break complex logic into smaller, reusable rules:

```rego
package terraform

import rego.v1
import input as plan

# Helper: get all resources of a specific type
resources_by_type(type) = resources if {
    resources := [r |
        r := plan.resource_changes[_]
        r.type == type
        not "delete" in r.change.actions
    ]
}

# Helper: check if a resource has a specific tag
has_tag(resource, key) if {
    resource.change.after.tags[key]
}

# Helper: check if a resource is being created or updated
is_create_or_update(resource) if {
    "create" in resource.change.actions
}

is_create_or_update(resource) if {
    "update" in resource.change.actions
}
```

## Writing Real-World Policies

### Enforce Required Tags

```rego
package terraform.tags

import rego.v1
import input as plan

# Define required tags
required_tags := {"Environment", "Project", "Owner", "CostCenter"}

# Deny resources missing required tags
deny contains msg if {
    resource := plan.resource_changes[_]
    not "delete" in resource.change.actions

    # Only check taggable resources
    taggable_types := {
        "aws_instance", "aws_s3_bucket", "aws_rds_cluster",
        "aws_vpc", "aws_subnet", "aws_lb"
    }
    taggable_types[resource.type]

    # Get the tags (or empty object if no tags)
    tags := object.get(resource.change.after, "tags", {})

    # Find missing tags
    missing := required_tags - {key | some key; tags[key]}
    count(missing) > 0

    msg := sprintf(
        "Resource '%s' is missing required tags: %v",
        [resource.address, missing]
    )
}
```

### Restrict Instance Types

```rego
package terraform.compute

import rego.v1
import input as plan

# Allowed instance types by environment
allowed_instances := {
    "dev": {"t3.micro", "t3.small", "t3.medium"},
    "staging": {"t3.small", "t3.medium", "t3.large", "m5.large"},
    "production": {"m5.large", "m5.xlarge", "m5.2xlarge", "c5.large", "c5.xlarge"}
}

deny contains msg if {
    resource := plan.resource_changes[_]
    resource.type == "aws_instance"
    not "delete" in resource.change.actions

    instance_type := resource.change.after.instance_type
    environment := resource.change.after.tags.Environment

    # Check if the instance type is allowed for this environment
    allowed := allowed_instances[environment]
    not allowed[instance_type]

    msg := sprintf(
        "Instance '%s' uses type '%s' which is not allowed in '%s' environment. Allowed: %v",
        [resource.address, instance_type, environment, allowed]
    )
}
```

### Enforce Encryption Standards

```rego
package terraform.encryption

import rego.v1
import input as plan

# All RDS instances must use encryption and a KMS key ARN
deny contains msg if {
    resource := plan.resource_changes[_]
    resource.type == "aws_db_instance"
    not "delete" in resource.change.actions

    not resource.change.after.storage_encrypted

    msg := sprintf(
        "RDS instance '%s' must have storage encryption enabled",
        [resource.address]
    )
}

deny contains msg if {
    resource := plan.resource_changes[_]
    resource.type == "aws_db_instance"
    not "delete" in resource.change.actions

    resource.change.after.storage_encrypted
    not startswith(
        object.get(resource.change.after, "kms_key_id", ""),
        "arn:aws:kms:"
    )

    msg := sprintf(
        "RDS instance '%s' must use a KMS key ARN",
        [resource.address]
    )
}
```

## Testing Rego Policies

OPA has a built-in testing framework. Test files use the `_test.rego` suffix.

```rego
# policy/terraform_test.rego
package terraform

import rego.v1

# Test: S3 bucket encryption without KMS should be denied
test_deny_s3_encryption_without_kms if {
    # Create a mock plan input
    plan := {
        "resource_changes": [{
            "address": "aws_s3_bucket_server_side_encryption_configuration.test",
            "type": "aws_s3_bucket_server_side_encryption_configuration",
            "change": {
                "actions": ["create"],
                "after": {
                    "bucket": "test-bucket",
                    "rule": [{
                        "apply_server_side_encryption_by_default": [{
                            "sse_algorithm": "AES256"
                        }]
                    }]
                }
            }
        }]
    }

    # Run the policy against mock input
    results := deny with input as plan

    # Expect a denial
    count(results) > 0
}

# Test: S3 bucket encryption with KMS should pass
test_allow_s3_encryption_with_kms if {
    plan := {
        "resource_changes": [{
            "address": "aws_s3_bucket_server_side_encryption_configuration.test",
            "type": "aws_s3_bucket_server_side_encryption_configuration",
            "change": {
                "actions": ["create"],
                "after": {
                    "bucket": "test-bucket",
                    "rule": [{
                        "apply_server_side_encryption_by_default": [{
                            "sse_algorithm": "aws:kms"
                        }]
                    }]
                }
            }
        }]
    }

    results := deny with input as plan
    count(results) == 0
}
```

Run the tests:

```bash
# Run all Rego tests
opa test policy/ -v

# Run with coverage
opa test policy/ --coverage --format=json
```

## Debugging Rego Policies

When a policy is not working as expected, use these debugging techniques:

```bash
# Evaluate a specific rule against a plan file
opa eval -i plan.json -d policy/ "data.terraform.deny"

# Print intermediate values with trace
opa eval -i plan.json -d policy/ "data.terraform.deny" --explain=full

# Use the REPL for interactive debugging
opa run policy/ plan.json
> data.terraform.deny
```

Inside a policy, you can use `print()` for debugging:

```rego
deny contains msg if {
    resource := plan.resource_changes[_]
    print("Checking resource:", resource.address, "type:", resource.type)

    resource.type == "aws_s3_bucket_server_side_encryption_configuration"
    print("Found S3 bucket encryption configuration, checking algorithm...")

    rule := resource.change.after.rule[_]
    default_encryption := rule.apply_server_side_encryption_by_default[_]
    default_encryption.sse_algorithm != "aws:kms"
    msg := sprintf("S3 bucket encryption configuration '%s' must use aws:kms", [resource.address])
}
```

## Common Rego Pitfalls

1. **Null values**: Use `object.get()` when a missing key should fall back to a default value instead of making the expression undefined
2. **String vs number**: Terraform plan JSON sometimes represents numbers as strings
3. **Nested arrays**: Terraform JSON often wraps objects in arrays (like `encryption_configuration[0]`)
4. **Partial rules**: Multiple rule bodies with the same head are OR-ed together, not AND-ed

Rego takes some getting used to, but once you understand the evaluation model - rules as set generators, implicit iteration, AND within rules, OR across rule definitions - it becomes a powerful tool for expressing infrastructure policies.

For more on using these policies in practice, see [How to Use Conftest with Terraform for Policy Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-conftest-with-terraform-for-policy-testing/view) and [How to Test Terraform for Compliance Requirements](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-for-compliance-requirements/view).
