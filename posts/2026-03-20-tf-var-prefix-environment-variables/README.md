# How to Set Variables Using Environment Variables with TF_VAR_ Prefix (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Environment Variable, TF_VAR_, CI/CD, DevOps

Description: Learn how to use the TF_VAR_ prefix to set OpenTofu variable values via environment variables for CI/CD pipelines and secret injection.

---

Any environment variable prefixed with `TF_VAR_` and followed by the name of a declared root input variable can be read by OpenTofu as a variable value. This is safer than passing sensitive values like passwords and API keys directly with `-var` because the values are not part of the OpenTofu command line, but you should still avoid printing environment variables in logs and protect any state that may contain those values.

---

## Basic TF_VAR_ Usage

```bash
# Set variables via environment variables

export TF_VAR_region="us-east-1"
export TF_VAR_instance_count="3"
export TF_VAR_environment="production"

# OpenTofu reads matching declared variables automatically - no -var flags needed
tofu plan
tofu apply
```

The environment variable name maps to the variable name:
- `TF_VAR_region` → variable `region`
- `TF_VAR_instance_count` → variable `instance_count`
- `TF_VAR_database_password` → variable `database_password`

---

## Passing Sensitive Values Securely

```bash
# INSECURE: password visible in shell history and command-line arguments
tofu apply -var="database_password=mysecret"

# SAFER: set TF_VAR_ from an existing secret source instead of putting the value in the command
export TF_VAR_database_password="$DB_PASSWORD"
tofu apply

# Scope it to one command when the value is already in another environment variable
TF_VAR_database_password="$DB_PASSWORD" tofu apply
```

---

## TF_VAR_ in CI/CD Pipelines

```yaml
# GitHub Actions - pass secrets via TF_VAR_
- name: Deploy infrastructure
  env:
    TF_VAR_database_password: ${{ secrets.DB_PASSWORD }}
    TF_VAR_api_key: ${{ secrets.API_KEY }}
    TF_VAR_region: ${{ vars.AWS_REGION }}  # non-secret var
    TF_VAR_environment: "production"
  run: |
    tofu apply -auto-approve
    # All TF_VAR_ env vars are automatically used
```

```yaml
# GitLab CI - same approach
deploy:
  variables:
    TF_VAR_environment: "production"
  script:
    - export TF_VAR_database_password="$DB_PASSWORD"  # from GitLab CI/CD variables
    - tofu apply -auto-approve
```

---

## Complex Types via TF_VAR_

For variables declared with complex type constraints, use JSON-compatible OpenTofu expression syntax in the environment variable value:

```bash
# Pass a list
export TF_VAR_allowed_ports='[80, 443, 22]'

# Pass a map
export TF_VAR_tags='{"Environment":"prod","Team":"platform"}'

# Pass an object
export TF_VAR_server_config='{"instance_type":"t3.large","disk_size_gb":100}'

tofu plan
```

---

## Variable Precedence Including TF_VAR_

OpenTofu evaluates variables in this order (lowest to highest priority; later sources win):

```text
1. Variable defaults in configuration (lowest priority)
2. TF_VAR_ environment variables
3. terraform.tfvars
4. terraform.tfvars.json
5. *.auto.tfvars and *.auto.tfvars.json files (lexical filename order)
6. -var and -var-file options on the command line, in the order provided (highest priority)
```

```bash
# Example: TF_VAR_ is overridden by -var flag
export TF_VAR_region="us-east-1"
tofu plan -var="region=us-west-2"
# Region used: us-west-2 (-var wins)
```

---

## Listing Active TF_VAR_ Variables

```bash
# See all TF_VAR_ variable names currently set in your environment
env | grep '^TF_VAR_' | cut -d= -f1

# Output:
# TF_VAR_region
# TF_VAR_environment
# TF_VAR_database_password
```

---

## Summary

The `TF_VAR_` prefix is a common way to pass CI/CD-specific input variable values to OpenTofu. When values come from a CI/CD secret store or another protected source, this avoids embedding secrets in `-var` arguments, but you should still mark variables as `sensitive` or `ephemeral` where appropriate and protect state. For complex types (lists, maps, objects), use JSON-compatible OpenTofu expression syntax in the environment variable value.
