# How to Understand Sentinel Policy Language Basics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, DevOps, Programming

Description: Learn the fundamentals of the Sentinel policy language including data types, operators, rules, functions, and control flow for writing effective infrastructure policies.

---

Sentinel is HashiCorp's policy language, and while it looks familiar if you have worked with Python or Go, it has its own set of conventions and quirks. Understanding the language fundamentals is essential before you start writing policies that actually do something useful. This post covers the core language features you need to know.

## Data Types

Sentinel supports a handful of data types that you will use constantly in your policies.

### Strings

Strings work the way you would expect. You can use double quotes or backtick-delimited syntax for multi-line strings:

```sentinel
# Simple string

name = "my-resource"

# String concatenation
full_name = "prefix-" + name

# String comparison
valid = name is "my-resource"

# Multi-line string
message = `line one
line two`
```

### Numbers

Sentinel supports integers and floating-point numbers:

```sentinel
# Integer
count = 5

# Float
cost = 19.99

# Arithmetic operations
total = count * cost
```

### Booleans

Boolean values are `true` and `false`, written in lowercase:

```sentinel
# Boolean values
enabled = true
disabled = false

# Boolean logic
result = enabled and not disabled
```

### Lists

Lists are ordered collections of values:

```sentinel
# Define a list
allowed_regions = ["us-east-1", "us-west-2", "eu-west-1"]

# Check membership
is_valid = "us-east-1" in allowed_regions

# Access by index
first_region = allowed_regions[0]

# Get length
count = length(allowed_regions)
```

### Maps

Maps are key-value pairs, similar to dictionaries or objects in other languages:

```sentinel
# Define a map
instance_limits = {
    "t3.micro":  10,
    "t3.small":  5,
    "t3.medium": 2,
}

# Access a value
micro_limit = instance_limits["t3.micro"]

# Check if a key exists
has_micro = "t3.micro" in instance_limits
```

## Operators

Sentinel has a set of operators that you will use frequently in policy rules.

### Comparison Operators

```sentinel
# Equality
x is 5        # equals
x is not 5    # not equals

# Relational
x > 5         # greater than
x >= 5        # greater than or equal
x < 5         # less than
x <= 5        # less than or equal
```

Sentinel supports both `is` and `is not` and the `==` and `!=` operators for equality checks. The `is` and `is not` forms are common in Sentinel examples and are often more readable in policies.

### Logical Operators

```sentinel
# AND - both must be true
result = condition_a and condition_b

# OR - at least one must be true
result = condition_a or condition_b

# NOT - negation
result = not condition_a
```

### The `contains` Operator

The `contains` operator checks whether a collection contains a value. It is the reverse of the `in` operator:

```sentinel
allowed = ["a", "b", "c"]

# These are equivalent
"a" in allowed
allowed contains "a"
```

### The `matches` Operator

The `matches` operator performs regular expression matching on strings:

```sentinel
# Check if a string matches a pattern
name = "prod-web-server-01"
is_prod = name matches "^prod-.*"
```

## Rules

Rules are the heart of Sentinel. A rule is a named boolean expression that evaluates to `true` or `false`.

```sentinel
# A simple rule
my_rule = rule {
    1 + 1 is 2
}

# The main rule - determines policy pass/fail
main = rule {
    my_rule
}
```

You can compose rules together. This is useful for breaking complex policies into smaller, more readable pieces:

```sentinel
import "tfplan/v2" as tfplan

# Filter resources
instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions is ["create"]
}

# Rule 1: Check instance types
valid_types = rule {
    all instances as _, inst {
        inst.change.after.instance_type in ["t3.micro", "t3.small"]
    }
}

# Rule 2: Check that tags exist
has_tags = rule {
    all instances as _, inst {
        inst.change.after.tags is not null
    }
}

# Combine rules in main
main = rule {
    valid_types and has_tags
}
```

## Functions

You can define reusable functions in Sentinel. Functions are particularly useful when you need the same logic across multiple policies:

```sentinel
# Define a function that checks if a value is in a list
check_allowed = func(value, allowed_list) {
    return value in allowed_list
}

# Use the function
allowed_types = ["t3.micro", "t3.small"]
result = check_allowed("t3.micro", allowed_types)
```

Functions can be more complex and contain conditional logic:

```sentinel
# A function that validates resource tags
validate_tags = func(resource, required_tags) {
    # Check if tags exist at all
    if resource.change.after.tags is null {
        return false
    }

    tags = resource.change.after.tags

    # Check each required tag
    for required_tags as tag {
        if tag not in tags {
            return false
        }
    }

    return true
}
```

## Control Flow

### If/Else Statements

Sentinel supports standard conditional statements:

```sentinel
# If/else in a function
get_limit = func(env) {
    if env is "production" {
        return 3
    } else if env is "staging" {
        return 5
    } else {
        return 10
    }
}
```

### For Loops

You can iterate over collections with `for` loops, though in practice you will often use `all`, `any`, and `filter` instead:

```sentinel
# For loop to count items
count_violations = func(instances, allowed_types) {
    violations = 0
    for instances as _, inst {
        if inst.change.after.instance_type not in allowed_types {
            violations += 1
        }
    }
    return violations
}
```

## Filter Expressions

The `filter` expression creates a new collection containing only elements that match a condition:

```sentinel
import "tfplan/v2" as tfplan

# Filter for S3 buckets being created
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.change.actions is ["create"]
}

# Filter for resources with specific tags
production_resources = filter tfplan.resource_changes as _, rc {
    (rc.change.after.tags else null) is not null and
    (rc.change.after.tags["environment"] else null) is "production"
}
```

## Quantifier Expressions

Quantifiers let you check conditions across collections without writing explicit loops.

### The `all` Quantifier

Returns `true` if every item in the collection satisfies the condition:

```sentinel
# Every instance must be t3.micro
all_micro = rule {
    all instances as _, inst {
        inst.change.after.instance_type is "t3.micro"
    }
}
```

### The `any` Quantifier

Returns `true` if at least one item satisfies the condition:

```sentinel
# At least one instance must have monitoring enabled
some_monitored = rule {
    any instances as _, inst {
        inst.change.after.monitoring is true
    }
}
```

## Print Statements

When debugging policies, `print` statements are invaluable. They output information during policy evaluation:

```sentinel
import "tfplan/v2" as tfplan

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance"
}

# Print information during evaluation
for instances as address, inst {
    print("Checking instance:", address)
    print("  Type:", inst.change.after.instance_type)
}
```

The output from `print` statements shows up in the Sentinel policy check results in HCP Terraform, which makes troubleshooting much easier.

## Undefined Values

One thing that catches many people off guard is how Sentinel handles undefined values. When you try to access a key that does not exist in a map, Sentinel returns `undefined` rather than throwing an error. You need to handle this explicitly:

```sentinel
# This might evaluate to undefined if "tags" is undefined
tags = resource.change.after.tags

# Safer approach - recover from undefined first
if (resource.change.after.tags else null) is not null {
    tags = resource.change.after.tags
}
```

## Putting It All Together

Here is a complete policy that demonstrates several language features:

```sentinel
# complete-example.sentinel
# Enforces tagging and instance type standards for AWS EC2 instances

import "tfplan/v2" as tfplan

# Configuration
allowed_types = ["t3.micro", "t3.small", "t3.medium"]
required_tags = ["Name", "Environment", "Owner"]

# Helper function to validate tags
validate_tags = func(resource) {
    tags = resource.change.after.tags else null

    if tags is null {
        print("Resource has no tags")
        return false
    }

    valid = true

    for required_tags as tag {
        if tag not in tags {
            print("Missing required tag:", tag)
            valid = false
        }
    }

    return valid
}

# Get EC2 instances
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions is ["create"] or rc.change.actions is ["update"])
}

# Rules
type_rule = rule {
    all ec2_instances as _, inst {
        inst.change.after.instance_type in allowed_types
    }
}

tag_rule = rule {
    all ec2_instances as _, inst {
        validate_tags(inst)
    }
}

# Main policy rule
main = rule {
    type_rule and tag_rule
}
```

Understanding these language basics gives you a solid foundation for writing Sentinel policies. The syntax is straightforward once you get used to the `is`/`is not` operators and the quantifier expressions. For practical applications of these concepts, check out our guide on [writing your first Sentinel policy](https://oneuptime.com/blog/post/2026-02-23-how-to-write-your-first-sentinel-policy/view) and [using Sentinel imports](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-imports-for-terraform/view).
