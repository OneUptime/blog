# How to Validate Your OpenTofu Configuration with tofu validate - Tofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu validate, Configuration Validation, DevOps, CI/CD, Infrastructure as Code

Description: Learn how to use tofu validate to check your configuration for syntax errors, type mismatches, and invalid references before running plan or apply.

---

`tofu validate` checks your configuration for syntax errors and internal consistency without accessing any remote services or state. It's faster than `tofu plan` and should be run as the first step in any CI/CD pipeline before attempting a plan or apply.

---

## What tofu validate Checks

- HCL syntax errors
- Invalid attribute names
- Type mismatches (e.g., passing a string where a number is expected)
- Invalid references to undefined variables or resources
- Missing required arguments

`tofu validate` does **not** check:
- Whether providers are authenticated
- Whether referenced resources actually exist in the cloud
- Whether variables have valid values (only structure)

---

## Basic Usage

```bash
# Run from your project directory (after tofu init)

tofu validate

# Success output:
# Success! The configuration is valid.

# Error output example:
# │ Error: Missing required argument
# │
# │   on main.tf line 15, in resource "aws_instance" "web":
# │   15: resource "aws_instance" "web" {
# │
# │ The argument "ami" is required, but no definition was found.
```

---

## JSON Output for CI/CD Integration

```bash
# Get machine-readable output
tofu validate -json

# Example JSON output (success)
# {
#   "format_version": "1.0",
#   "valid": true,
#   "error_count": 0,
#   "warning_count": 0,
#   "diagnostics": []
# }

# Parse the result in CI
tofu validate -json | python3 -c "
import sys, json
result = json.load(sys.stdin)
if not result['valid']:
    print(f'Validation failed: {result[\"error_count\"]} error(s)')
    for d in result['diagnostics']:
        print(f'  {d[\"severity\"]}: {d[\"summary\"]}')
    sys.exit(1)
else:
    print('Validation passed!')
"
```

---

## Common Validation Errors and Fixes

```hcl
# ERROR: Unknown attribute
resource "aws_instance" "web" {
  ami           = "ami-123"
  instance_type = "t3.micro"
  wrong_attr    = "value"   # Error: An argument named "wrong_attr" is not expected here.
}

# FIX: Remove or correct the invalid attribute
resource "aws_instance" "web" {
  ami           = "ami-123"
  instance_type = "t3.micro"
}
```

```hcl
# ERROR: Type mismatch
variable "instance_count" {
  type    = number
  default = "three"   # Error: Default value is not compatible - string not number
}

# FIX: Use the correct type
variable "instance_count" {
  type    = number
  default = 3
}
```

---

## Integrate validate into Your Workflow

```bash
# Recommended pre-plan workflow
tofu fmt -check    # check formatting (fail if not formatted)
tofu validate      # check configuration validity
tofu plan          # generate execution plan
```

```yaml
# GitHub Actions CI example
- name: Validate OpenTofu configuration
  run: |
    tofu init -backend=false   # initialize without remote backend
    tofu validate -json | python3 -c "
    import sys, json
    r = json.load(sys.stdin)
    print('Valid:', r['valid'])
    if not r['valid']:
        for d in r['diagnostics']:
            print(f'{d[\"severity\"]}: {d[\"summary\"]}')
        sys.exit(1)
    "
```

---

## Validate All Modules

```bash
# If you have subdirectory modules, validate each one
for dir in modules/*/; do
  echo "Validating $dir..."
  (cd "$dir" && tofu init -backend=false -upgrade -input=false && tofu validate)
done
```

---

## Summary

`tofu validate` is a fast, lightweight check that should run before every `tofu plan`. It catches syntax errors, missing required arguments, type mismatches, and invalid references without making any API calls. Use `-json` output in CI/CD pipelines for machine-readable results and use `tofu init -backend=false` to initialize without connecting to a remote backend in CI environments.
