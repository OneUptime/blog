# How to Write Your First Sentinel Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, Infrastructure as Code, DevOps

Description: A step-by-step guide to writing your first HashiCorp Sentinel policy for Terraform, covering the basics of policy structure, rules, and enforcement.

---

If you have been working with Terraform in a team or organization, you have probably run into situations where someone deploys a resource that does not meet your company's standards. Maybe someone spins up an expensive instance type, or forgets to tag resources, or deploys to the wrong region. Sentinel is HashiCorp's policy-as-code framework that helps you prevent these problems before they happen.

In this post, we will walk through writing your very first Sentinel policy from scratch. By the end, you will have a working policy that you can apply to your Terraform workflows.

## What is Sentinel?

Sentinel is a policy-as-code framework built by HashiCorp. It integrates directly with HCP Terraform (formerly Terraform Cloud) and Terraform Enterprise. When someone runs a Terraform plan, Sentinel evaluates the planned changes against your policies and either allows or blocks the run based on the results.

Think of Sentinel as a gatekeeper that sits between `terraform plan` and `terraform apply`. It checks every proposed change and makes sure it follows your rules.

## Prerequisites

Before writing your first policy, you need a few things:

- An HCP Terraform account or Terraform Enterprise installation
- A workspace with at least one Terraform configuration
- The Sentinel CLI installed locally for testing (optional but recommended)

You can install the Sentinel CLI by downloading it from the HashiCorp releases page:

```bash
# Download the Sentinel CLI (adjust version and OS as needed)
wget https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_linux_amd64.zip

# Unzip and move to your PATH
unzip sentinel_0.24.0_linux_amd64.zip
sudo mv sentinel /usr/local/bin/
```

## Understanding the Basic Structure

Every Sentinel policy has a specific structure. At its core, a policy is a file with a `.sentinel` extension that contains one or more rules. The most important rule is the `main` rule, which determines whether the policy passes or fails.

Here is the simplest possible Sentinel policy:

```python
# my-first-policy.sentinel
# This policy always passes - it's the "hello world" of Sentinel

main = rule {
    true
}
```

This policy will always pass because the main rule always evaluates to `true`. Not very useful on its own, but it shows the basic structure.

## Writing a Real Policy

Let us write something more practical. We will create a policy that ensures all AWS instances use a specific set of allowed instance types.

First, you need to import the `tfplan/v2` module, which gives you access to the planned Terraform changes:

```python
# restrict-instance-types.sentinel
# This policy ensures only approved EC2 instance types are used

# Import the tfplan/v2 module to access planned changes
import "tfplan/v2" as tfplan

# Define the list of allowed instance types
allowed_types = [
    "t3.micro",
    "t3.small",
    "t3.medium",
]

# Find all AWS instances in the plan that are being created or updated
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check that every instance uses an allowed type
main = rule {
    all ec2_instances as _, instance {
        instance.change.after.instance_type in allowed_types
    }
}
```

Let us break down what is happening here:

1. We import the `tfplan/v2` module and alias it as `tfplan`
2. We define a list of allowed instance types
3. We filter the planned resource changes to find only AWS instances being created or updated
4. The main rule checks that every instance uses an instance type from our allowed list

## Breaking It Down Further

### Imports

The `import` statement brings in data from Terraform. The `tfplan/v2` import is probably the one you will use most often. It gives you access to everything in the Terraform plan, including resource changes, output changes, and variable values.

### Filters

The `filter` expression lets you narrow down a collection to only the items you care about. In our example, we filter resource changes to find only `aws_instance` resources that are being created or updated.

### Rules

Rules are boolean expressions that evaluate to either `true` or `false`. The `main` rule is special because it determines the overall policy result. You can also define helper rules to keep your logic organized:

```python
# Using helper rules for better organization
import "tfplan/v2" as tfplan

allowed_types = [
    "t3.micro",
    "t3.small",
    "t3.medium",
]

ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Helper rule to check instance types
instance_type_allowed = rule {
    all ec2_instances as _, instance {
        instance.change.after.instance_type in allowed_types
    }
}

# Main rule references the helper
main = rule {
    instance_type_allowed
}
```

### Quantifiers

Sentinel provides two quantifiers: `all` and `any`. The `all` quantifier requires every item in a collection to satisfy a condition. The `any` quantifier requires at least one item to satisfy it.

```python
# all - every item must match
main = rule {
    all ec2_instances as _, instance {
        instance.change.after.instance_type in allowed_types
    }
}

# any - at least one item must match (less common for enforcement)
has_small_instance = rule {
    any ec2_instances as _, instance {
        instance.change.after.instance_type is "t3.small"
    }
}
```

## Testing Your Policy Locally

Before deploying your policy, you should test it locally using the Sentinel CLI. Create a test directory structure like this:

```text
my-policy/
  restrict-instance-types.sentinel
  test/
    restrict-instance-types/
      pass.hcl
      fail.hcl
```

The test files define mock data and expected results:

```hcl
# test/restrict-instance-types/pass.hcl
# This test should pass because we use an allowed instance type

mock "tfplan/v2" {
    module {
        source = "mock-tfplan-pass.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

Run your tests with:

```bash
# Run all tests for your policy
sentinel test restrict-instance-types.sentinel
```

## Deploying Your Policy

Once your policy works locally, you can deploy it to HCP Terraform. You will need to create a policy set and attach it to your workspace. You can do this through the UI or through the API.

The most common approach is to store your policies in a version control repository and connect that repository as a policy set in HCP Terraform. This way, your policies are version controlled just like your infrastructure code.

## Common Mistakes to Avoid

When writing your first policy, watch out for these pitfalls:

- Forgetting to check the action type in your filter. If you do not filter for "create" or "update" actions, your policy might try to evaluate resources that are being destroyed, which can cause unexpected failures.
- Not handling the case where no resources of the target type exist. If your filter returns an empty collection, the `all` quantifier returns `true` by default, which is usually what you want.
- Using `is` instead of `in` for list membership checks. The `is` operator checks equality, while `in` checks whether a value exists in a list or map.

## Next Steps

Now that you have written your first Sentinel policy, you can explore more advanced topics like using the `tfconfig` import to check configuration before planning, using the `tfstate` import to check existing state, and writing custom functions for reusable logic.

For more on Terraform and infrastructure automation, check out our other posts on [Sentinel policy language basics](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-sentinel-policy-language-basics/view) and [Sentinel imports for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-imports-for-terraform/view).

Writing policies is a skill that improves with practice. Start with simple rules that address your most pressing compliance needs, and build from there. The goal is not to write the most complex policy possible, but to write policies that are clear, maintainable, and effective at preventing problems before they reach production.
