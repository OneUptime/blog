# How to Use the tfconfig Import in Sentinel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HashiCorp, tfconfig, Configuration Validation

Description: Discover how to use the tfconfig/v2 import in Sentinel to validate Terraform configuration structure, enforce module standards, and check coding conventions.

---

The `tfconfig/v2` import in Sentinel gives you access to the raw Terraform configuration as written by the user. While the `tfplan` import shows you what Terraform plans to do with computed values, `tfconfig` shows you the actual HCL code structure. This distinction matters when you want to enforce standards around how infrastructure code is written, not just what it produces.

## When to Use tfconfig vs tfplan

The choice between `tfconfig` and `tfplan` depends on what you are trying to validate:

Use `tfconfig` when you need to check the configuration structure itself, like whether a resource block includes a specific argument, whether modules come from approved sources, or whether variables have descriptions. Use `tfplan` when you need to check the actual values that will be applied.

For example, if you want to ensure every S3 bucket configuration includes a `server_side_encryption_configuration` block, use `tfconfig`. If you want to check that the encryption algorithm is specifically "aws:kms", use `tfplan` because the actual value might come from a variable or data source.

## Importing tfconfig

```python
# Standard import with alias
import "tfconfig/v2" as tfconfig
```

## Resources in tfconfig

The `tfconfig.resources` collection contains every resource defined in the Terraform configuration. Each resource has a different structure than what you see in `tfplan`.

```python
import "tfconfig/v2" as tfconfig

# Browse all resources
for tfconfig.resources as address, resource {
    print("Address:", address)
    print("Type:", resource.type)
    print("Name:", resource.name)
    print("Module:", resource.module_address)
    print("Provider:", resource.provider_config_key)
    print("Config keys:", keys(resource.config))
}
```

### Resource Properties

Each resource in `tfconfig.resources` has these key properties:

- **address** - Full resource address (e.g., `aws_instance.web`)
- **type** - Resource type (e.g., `aws_instance`)
- **name** - Resource name (e.g., `web`)
- **module_address** - Module path, empty for root module
- **provider_config_key** - Provider configuration reference
- **config** - Map of configured attributes
- **count** - Count expression if present
- **for_each** - For_each expression if present
- **depends_on** - Explicit dependencies

### Working with the config Property

The `config` property is where things get interesting and slightly tricky. It contains the raw configuration expressions, not resolved values. Each config value has a `constant_value` or `references` property depending on whether it is a literal or an expression.

```python
import "tfconfig/v2" as tfconfig

# Get S3 bucket configurations
s3_buckets = filter tfconfig.resources as _, r {
    r.type is "aws_s3_bucket"
}

# Check that ACL is configured (not necessarily its value)
main = rule {
    all s3_buckets as _, bucket {
        "acl" in bucket.config
    }
}
```

### Understanding Constant Values vs References

When a configuration attribute is set to a literal value, you can access it with `constant_value`. When it references a variable or another resource, it has `references` instead:

```python
import "tfconfig/v2" as tfconfig

s3_buckets = filter tfconfig.resources as _, r {
    r.type is "aws_s3_bucket"
}

# Check for a literal (constant) ACL value
check_acl = func(bucket) {
    if "acl" not in bucket.config {
        return false
    }

    acl_config = bucket.config.acl

    # If it is a constant value, we can check it directly
    if "constant_value" in acl_config {
        return acl_config.constant_value is "private"
    }

    # If it is a reference, we can check what it references
    if "references" in acl_config {
        print("ACL is set via reference:", acl_config.references)
        # We cannot validate the actual value here - use tfplan for that
        return true
    }

    return false
}

main = rule {
    all s3_buckets as _, bucket {
        check_acl(bucket)
    }
}
```

## Module Calls

The `tfconfig.module_calls` collection lets you inspect how modules are used in the configuration. This is particularly useful for enforcing module source standards.

```python
import "tfconfig/v2" as tfconfig

# Get all module calls
modules = tfconfig.module_calls

# Ensure all modules come from the private registry
main = rule {
    all modules as _, mod {
        mod.source matches "^app.terraform.io/myorg/.*" or
        mod.source matches "^./modules/.*"
    }
}
```

### Module Call Properties

Each module call has:

- **source** - The module source string
- **version_constraint** - Version constraint if specified
- **config** - Module input values
- **module_address** - Parent module path
- **name** - Module call name

### Enforcing Module Version Constraints

```python
import "tfconfig/v2" as tfconfig

modules = tfconfig.module_calls

# Require version constraints on all registry modules
main = rule {
    all modules as _, mod {
        # Local modules do not need version constraints
        if mod.source matches "^\\./.*" {
            true
        } else {
            # Registry modules must have a version constraint
            mod.version_constraint is not ""
        }
    }
}
```

## Variables

The `tfconfig.variables` collection gives you access to all variable definitions:

```python
import "tfconfig/v2" as tfconfig

variables = tfconfig.variables

# Require all variables to have descriptions
main = rule {
    all variables as name, v {
        if v.description is "" {
            print("Variable", name, "is missing a description")
            false
        } else {
            true
        }
    }
}
```

### Variable Properties

- **name** - Variable name
- **description** - Variable description
- **default** - Default value (null if no default)
- **sensitive** - Whether the variable is marked as sensitive
- **module_address** - Module containing the variable

### Enforcing Sensitive Variables

```python
import "tfconfig/v2" as tfconfig

variables = tfconfig.variables

# Variables with "password", "secret", or "key" in the name must be sensitive
sensitive_patterns = ["password", "secret", "key", "token"]

check_sensitivity = func(name, variable) {
    for sensitive_patterns as pattern {
        if name matches ".*" + pattern + ".*" {
            if variable.sensitive is not true {
                print("Variable", name, "should be marked as sensitive")
                return false
            }
        }
    }
    return true
}

main = rule {
    all variables as name, v {
        check_sensitivity(name, v)
    }
}
```

## Outputs

The `tfconfig.outputs` collection lets you check output definitions:

```python
import "tfconfig/v2" as tfconfig

outputs = tfconfig.outputs

# Require descriptions on all outputs
descriptions_required = rule {
    all outputs as name, output {
        output.description is not ""
    }
}

# Require sensitive outputs for certain patterns
sensitive_outputs = rule {
    all outputs as name, output {
        if name matches ".*secret.*" or name matches ".*password.*" {
            output.sensitive is true
        } else {
            true
        }
    }
}

main = rule {
    descriptions_required and sensitive_outputs
}
```

## Providers

You can inspect provider configurations as well:

```python
import "tfconfig/v2" as tfconfig

providers = tfconfig.providers

# Check that all AWS providers use a specific region
main = rule {
    all providers as _, provider {
        if provider.provider_config_key matches "^aws.*" {
            "region" in provider.config and
            provider.config.region.constant_value in ["us-east-1", "us-west-2"]
        } else {
            true
        }
    }
}
```

## Data Sources

Data sources in the configuration are available through `tfconfig.datasources`:

```python
import "tfconfig/v2" as tfconfig

# Get all data sources
data_sources = tfconfig.datasources

# Ensure data sources follow naming conventions
main = rule {
    all data_sources as _, ds {
        ds.name matches "^[a-z][a-z0-9_]*$"
    }
}
```

## Practical Examples

### Enforcing Backend Configuration

```python
import "tfconfig/v2" as tfconfig

# Ensure Terraform block has required version
provisioners = filter tfconfig.resources as _, r {
    # Check for provisioners (they appear in the config)
    "provisioner" in r.config
}

# Block use of local-exec and remote-exec provisioners
main = rule {
    length(provisioners) is 0
}
```

### Preventing Use of Hardcoded Credentials

```python
import "tfconfig/v2" as tfconfig

# Check all resources for hardcoded credential patterns
credential_keys = ["access_key", "secret_key", "password", "private_key"]

check_resource = func(resource) {
    for credential_keys as key {
        if key in resource.config {
            # If it is a constant value (hardcoded), that is a problem
            if "constant_value" in resource.config[key] {
                print("Resource", resource.address, "has hardcoded", key)
                return false
            }
        }
    }
    return true
}

all_resources = tfconfig.resources

main = rule {
    all all_resources as _, r {
        check_resource(r)
    }
}
```

### Enforcing Resource Naming Conventions

```python
import "tfconfig/v2" as tfconfig

all_resources = tfconfig.resources

# Resource names must be lowercase with underscores only
naming_convention = rule {
    all all_resources as _, r {
        if not (r.name matches "^[a-z][a-z0-9_]*$") {
            print("Resource", r.address, "does not follow naming convention")
            false
        } else {
            true
        }
    }
}

main = rule {
    naming_convention
}
```

## Limitations of tfconfig

There are some things to keep in mind when using `tfconfig`:

1. You cannot see computed values. If an attribute is set from a variable or data source, you can only see the reference, not the resolved value.
2. Dynamic blocks are not fully expanded. If a resource uses `dynamic` blocks, the `tfconfig` import shows the dynamic block structure, not the individual generated blocks.
3. Count and for_each values are expressions, not resolved numbers.

For validating actual values, combine `tfconfig` with `tfplan`. Use `tfconfig` for structural checks and `tfplan` for value checks. For related guides, see our posts on [using the tfplan import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfplan-import-in-sentinel/view) and [using the tfstate import](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tfstate-import-in-sentinel/view).
