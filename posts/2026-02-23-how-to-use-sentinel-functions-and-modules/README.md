# How to Use Sentinel Functions and Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, Modules, Functions, Governance

Description: Master Sentinel functions and modules to write reusable, maintainable policy-as-code for Terraform Cloud and Enterprise deployments.

---

When you start writing Sentinel policies, the first few are straightforward. You check a condition, return true or false, and move on. But as your policy library grows past a dozen policies, you start seeing the same logic repeated everywhere - filtering resources by type, checking tag compliance, validating CIDR ranges. That is where Sentinel functions and modules come in.

Functions let you extract reusable logic within a single policy. Modules let you share that logic across multiple policies and even across teams. Together, they turn a collection of one-off scripts into a maintainable policy library.

## Understanding Sentinel Functions

A Sentinel function works like functions in most programming languages. You define it with a name, parameters, and a return value. Here is a simple example:

```python
# A function that checks if a string starts with a given prefix
starts_with = func(str, prefix) {
    return strings.has_prefix(str, prefix)
}
```

Functions in Sentinel are first-class values. You can assign them to variables, pass them as arguments, and return them from other functions. This gives you a lot of flexibility in how you structure your policies.

## Writing Practical Helper Functions

Let us build some functions that solve real problems in Terraform policy enforcement. One of the most common tasks is filtering resource changes by type and action:

```python
# helpers.sentinel
# Common helper functions for Terraform Sentinel policies

import "tfplan/v2" as tfplan
import "strings"

# Filter resources by type that are being created or updated
filter_resources_by_type = func(type) {
    return filter tfplan.resource_changes as _, rc {
        rc.type is type and
        rc.mode is "managed" and
        (rc.change.actions contains "create" or
         rc.change.actions contains "update")
    }
}

# Check if a value is in an allowed list
is_allowed = func(value, allowed_list) {
    return value in allowed_list
}

# Validate that a map contains all required keys
has_required_keys = func(input_map, required_keys) {
    if input_map is null {
        return false
    }
    for required_keys as key {
        if not (input_map contains key) {
            return false
        }
    }
    return true
}

# Check if a CIDR block is overly permissive
is_public_cidr = func(cidr) {
    public_cidrs = ["0.0.0.0/0", "::/0"]
    return cidr in public_cidrs
}
```

Now your actual policies become much cleaner:

```python
# restrict-instance-types.sentinel
# Only allow approved EC2 instance types

import "tfplan/v2" as tfplan

# Approved instance families for production
approved_types = [
    "t3.micro", "t3.small", "t3.medium",
    "m5.large", "m5.xlarge",
    "r5.large", "r5.xlarge",
]

# Reusable filter function
filter_by_type = func(type) {
    return filter tfplan.resource_changes as _, rc {
        rc.type is type and
        rc.mode is "managed" and
        (rc.change.actions contains "create" or
         rc.change.actions contains "update")
    }
}

# Get all EC2 instances being created or modified
ec2_instances = filter_by_type("aws_instance")

# Validate each instance
violations = []
for ec2_instances as address, instance {
    instance_type = instance.change.after.instance_type
    if not (instance_type in approved_types) {
        append(violations, address + " uses unapproved type: " + instance_type)
    }
}

# Print violations for operator visibility
if length(violations) > 0 {
    print("Instance type violations found:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Functions with Complex Logic

Functions can contain loops, conditionals, and nested function calls. Here is a more advanced function that validates security group rules:

```python
# Validate that no ingress rule allows public access on restricted ports
validate_sg_rules = func(ingress_rules, restricted_ports) {
    violations = []

    for ingress_rules as rule {
        from_port = rule.from_port else 0
        to_port = rule.to_port else 0

        for rule.cidr_blocks as cidr {
            if is_public_cidr(cidr) {
                for restricted_ports as port {
                    if from_port <= port and to_port >= port {
                        append(violations, "Port " + string(port) +
                            " is open to " + cidr)
                    }
                }
            }
        }
    }

    return violations
}
```

## Introduction to Sentinel Modules

While functions help within a single policy file, modules let you share code across multiple policies. A module is a separate Sentinel file that exports functions and values.

Here is a typical module structure:

```
sentinel-policies/
    modules/
        tfplan-functions/
            tfplan-functions.sentinel
        aws-functions/
            aws-functions.sentinel
    policies/
        require-tags.sentinel
        restrict-regions.sentinel
    sentinel.hcl
```

## Creating a Reusable Module

Let us build a module that provides common Terraform plan functions:

```python
# modules/tfplan-functions/tfplan-functions.sentinel
# Reusable functions for working with Terraform plan data

import "tfplan/v2" as tfplan
import "strings"

# Get all resource changes of a specific type
# Filters to only managed resources being created or updated
resources_by_type = func(type) {
    return filter tfplan.resource_changes as _, rc {
        rc.type is type and
        rc.mode is "managed" and
        (rc.change.actions contains "create" or
         rc.change.actions contains "update")
    }
}

# Get all resources being destroyed
resources_being_destroyed = func() {
    return filter tfplan.resource_changes as _, rc {
        rc.mode is "managed" and
        rc.change.actions contains "delete"
    }
}

# Evaluate an attribute that might be nested
# Supports dot notation like "settings.ip_configuration.0.public"
evaluate_attribute = func(resource, attribute_path) {
    parts = strings.split(attribute_path, ".")
    value = resource.change.after

    for parts as part {
        if value is null or value is undefined {
            return null
        }
        value = value[part] else null
    }

    return value
}

# Check if a resource has all required tags
has_required_tags = func(resource, required_tags) {
    tags = resource.change.after.tags else {}
    if tags is null {
        return false
    }
    for required_tags as tag {
        if not (tags contains tag) {
            return false
        }
        if tags[tag] is "" {
            return false
        }
    }
    return true
}

# Print a formatted list of violations
print_violations = func(violations, policy_name) {
    if length(violations) > 0 {
        print(policy_name + " - " + string(length(violations)) + " violation(s):")
        for violations as v {
            print("  * " + v)
        }
    }
}
```

## Importing Modules in Policies

Once you have a module, reference it in your `sentinel.hcl` and import it in your policies:

```hcl
# sentinel.hcl
# Register the module so policies can import it

module "tfplan-functions" {
    source = "./modules/tfplan-functions/tfplan-functions.sentinel"
}

module "aws-functions" {
    source = "./modules/aws-functions/aws-functions.sentinel"
}

policy "require-tags" {
    source            = "./policies/require-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-regions" {
    source            = "./policies/restrict-regions.sentinel"
    enforcement_level = "hard-mandatory"
}
```

Now your policies can import and use the module:

```python
# policies/require-tags.sentinel
# Enforce required tags on all AWS resources

import "tfplan-functions" as tf

# Define required tags
required_tags = ["environment", "owner", "cost-center", "project"]

# Get all resource changes
allResources = filter tf.tfplan.resource_changes as _, rc {
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Check each resource for required tags
violations = []
for allResources as address, rc {
    if not tf.has_required_tags(rc, required_tags) {
        append(violations, address)
    }
}

tf.print_violations(violations, "require-tags")

main = rule {
    length(violations) is 0
}
```

## Building an AWS-Specific Module

Here is a module focused on AWS-specific validations:

```python
# modules/aws-functions/aws-functions.sentinel
# AWS-specific helper functions for Sentinel policies

import "tfplan/v2" as tfplan
import "strings"

# Approved AWS regions for the organization
approved_regions = [
    "us-east-1",
    "us-west-2",
    "eu-west-1",
]

# Check if a resource is in an approved region
is_approved_region = func(region) {
    return region in approved_regions
}

# Get the provider region from a resource
get_resource_region = func(resource) {
    # Try to get region from provider configuration
    provider_name = resource.provider_name else ""
    if strings.has_suffix(provider_name, "aws") {
        return resource.change.after.region else "unknown"
    }
    return "unknown"
}

# Check if an S3 bucket has encryption configured
is_s3_encrypted = func(bucket_resource) {
    sse = bucket_resource.change.after.server_side_encryption_configuration
    if sse is null or sse is undefined {
        return false
    }
    return true
}

# Check if an RDS instance is publicly accessible
is_rds_public = func(rds_resource) {
    return rds_resource.change.after.publicly_accessible else false
}
```

## Testing Modules

Testing modules follows the same pattern as testing policies, but you need to mock the module imports:

```python
# test/require-tags/pass.hcl
# Test that properly tagged resources pass the policy

mock "tfplan-functions" {
    module {
        source = "../../modules/tfplan-functions/tfplan-functions.sentinel"
    }
}

mock "tfplan/v2" {
    module {
        source = "testdata/tagged-resources.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

Run the test:

```bash
# Test all policies with their module dependencies
sentinel test -verbose
```

## Module Versioning Strategy

As your module library matures, version it properly. Use Git tags to pin module versions:

```hcl
# sentinel.hcl with versioned module reference
module "tfplan-functions" {
    source  = "git::https://github.com/myorg/sentinel-modules.git//tfplan-functions?ref=v1.2.0"
}
```

This prevents a module update from unexpectedly breaking policies across your organization.

## Best Practices

Keep functions focused on a single task. A function named `validate_and_report_and_fix` is doing too much. Break it into `validate`, `report`, and `fix`.

Document your modules. Add comments explaining what each function does, what parameters it expects, and what it returns. Future you - and your teammates - will thank you.

Test modules independently from policies. If a module function has a bug, you want to catch it in the module test, not when a policy fails mysteriously.

Use consistent naming conventions. If your functions that filter resources all start with `filter_`, and functions that validate start with `validate_`, the module becomes self-documenting.

## Conclusion

Sentinel functions and modules transform policy-as-code from a collection of one-off scripts into a proper engineering practice. Functions keep individual policies clean and readable. Modules let you share validated logic across your entire organization. Start by extracting the repeated patterns you see in your existing policies, build a shared module, and watch your policy development velocity increase.

For more on Sentinel policy organization, see our guide on [version controlling Sentinel policies](https://oneuptime.com/blog/post/2026-02-23-how-to-version-control-sentinel-policies/view).
