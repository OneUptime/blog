# How to Use the Sentinel CLI for Policy Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, CLI, Development Tools, HashiCorp

Description: A practical guide to using the Sentinel CLI for developing, testing, formatting, and debugging Sentinel policies for Terraform in your local development environment.

---

The Sentinel CLI is the essential tool for anyone writing Sentinel policies. It lets you develop and test policies on your local machine without needing to push them to HCP Terraform and trigger a run. This dramatically speeds up the development cycle and makes it possible to catch errors early.

## Installing the Sentinel CLI

The CLI is distributed as a standalone binary. Download it from the HashiCorp releases page for your platform:

```bash
# Linux (amd64)
curl -o sentinel.zip https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_linux_amd64.zip
unzip sentinel.zip
sudo mv sentinel /usr/local/bin/
rm sentinel.zip

# macOS (amd64)
curl -o sentinel.zip https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_darwin_amd64.zip
unzip sentinel.zip
sudo mv sentinel /usr/local/bin/
rm sentinel.zip

# macOS (arm64 / Apple Silicon)
curl -o sentinel.zip https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_darwin_arm64.zip
unzip sentinel.zip
sudo mv sentinel /usr/local/bin/
rm sentinel.zip

# Verify
sentinel version
```

## CLI Commands Overview

The Sentinel CLI provides several commands:

- `sentinel test` - Run tests against policies
- `sentinel apply` - Apply a policy with configuration
- `sentinel fmt` - Format Sentinel code
- `sentinel version` - Print version information

Let us explore each one in detail.

## The test Command

The `test` command is what you will use most often. It runs all tests or tests for a specific policy:

```bash
# Run all tests in the current directory
sentinel test

# Run tests for a specific policy
sentinel test enforce-tags.sentinel

# Verbose output shows pass/fail details
sentinel test -verbose

# Run only tests matching a pattern
sentinel test -run "pass" enforce-tags.sentinel

# Run tests with a specific configuration file
sentinel test -config sentinel.hcl
```

### Understanding Test Output

Normal output:

```text
$ sentinel test
PASS - enforce-tags.sentinel
PASS - restrict-instance-types.sentinel
FAIL - enforce-encryption.sentinel
```

Verbose output:

```text
$ sentinel test -verbose
PASS - enforce-tags.sentinel
  PASS - test/enforce-tags/pass-tagged.hcl
  PASS - test/enforce-tags/fail-untagged.hcl
  PASS - test/enforce-tags/pass-empty.hcl

PASS - restrict-instance-types.sentinel
  PASS - test/restrict-instance-types/pass-t3-micro.hcl
  PASS - test/restrict-instance-types/fail-p3-xlarge.hcl

FAIL - enforce-encryption.sentinel
  PASS - test/enforce-encryption/pass-encrypted.hcl
  FAIL - test/enforce-encryption/fail-unencrypted.hcl
    expected "main" to be false, got true
```

The last line tells you exactly what went wrong. The test expected the `main` rule to be `false`, but the policy returned `true`. This means your policy is not catching the unencrypted case.

## The apply Command

The `apply` command evaluates a single policy with a given configuration. This is useful for quick debugging:

```bash
# Apply a policy with a test configuration
sentinel apply -config test/enforce-tags/pass.hcl enforce-tags.sentinel

# Apply with trace output for debugging
sentinel apply -trace -config test/enforce-tags/pass.hcl enforce-tags.sentinel
```

### Trace Output

The `-trace` flag shows the evaluation of each rule:

```text
$ sentinel apply -trace -config test/enforce-tags/pass.hcl enforce-tags.sentinel
Pass - enforce-tags.sentinel

Trace:
  TRUE - enforce-tags.sentinel:20:1 - Rule "main"
    TRUE - enforce-tags.sentinel:21:5 - all resources as _, rc { ... }
```

This trace output is incredibly helpful for understanding why a policy passes or fails. It shows you exactly which rules were evaluated and what their results were.

## The fmt Command

The `fmt` command formats your Sentinel code according to the standard style:

```bash
# Format a single file
sentinel fmt enforce-tags.sentinel

# Format all .sentinel files in the current directory
sentinel fmt *.sentinel

# Check formatting without modifying files
sentinel fmt -check enforce-tags.sentinel

# Show a diff of what would change
sentinel fmt -diff enforce-tags.sentinel
```

### Before formatting:

```python
main=rule{
all resources as _,rc{
rc.change.after.tags is not null
}
}
```

### After formatting:

```python
main = rule {
    all resources as _, rc {
        rc.change.after.tags is not null
    }
}
```

Always run `sentinel fmt` before committing your policies. Better yet, add it to your pre-commit hooks.

## Setting Up a Development Workflow

Here is a recommended workflow for developing Sentinel policies:

### Step 1: Create the Policy File

```bash
# Create a new policy
touch restrict-regions.sentinel
```

### Step 2: Create the Test Structure

```bash
# Create test directory and files
mkdir -p test/restrict-regions testdata

touch test/restrict-regions/pass-allowed-region.hcl
touch test/restrict-regions/fail-blocked-region.hcl
touch testdata/mock-tfplan-us-east-1.sentinel
touch testdata/mock-tfplan-ap-south-1.sentinel
```

### Step 3: Write Mock Data First

Start by writing your mock data. This forces you to think about the structure of the data your policy will work with:

```python
# testdata/mock-tfplan-us-east-1.sentinel
resource_changes = {
    "aws_instance.web": {
        "address": "aws_instance.web",
        "type": "aws_instance",
        "name": "web",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before": null,
            "after": {
                "instance_type": "t3.small",
                "availability_zone": "us-east-1a",
            },
            "after_unknown": {},
        },
    },
}
```

### Step 4: Write Test Cases

```hcl
# test/restrict-regions/pass-allowed-region.hcl
mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-tfplan-us-east-1.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

### Step 5: Write the Policy

Now write the actual policy:

```python
# restrict-regions.sentinel
import "tfplan/v2" as tfplan

allowed_regions = ["us-east-1", "us-west-2"]

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

main = rule {
    all instances as _, inst {
        az = inst.change.after.availability_zone
        region = az[0:length(az)-1]
        region in allowed_regions
    }
}
```

### Step 6: Run Tests Iteratively

```bash
# Run tests and iterate
sentinel test -verbose restrict-regions.sentinel
```

### Step 7: Format and Commit

```bash
# Format the policy
sentinel fmt restrict-regions.sentinel

# Run final test
sentinel test

# Commit
git add .
git commit -m "Add region restriction policy"
```

## Using the sentinel.hcl Configuration File

The `sentinel.hcl` file configures how the Sentinel CLI finds and runs policies. It is also used in HCP Terraform to define policy sets:

```hcl
# sentinel.hcl

# Define a policy
policy "enforce-tags" {
    source            = "./enforce-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-instance-types" {
    source            = "./restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "restrict-regions" {
    source            = "./restrict-regions.sentinel"
    enforcement_level = "advisory"
}
```

## Advanced CLI Usage

### Running Specific Rule Tests

If your policy has multiple named rules, you can test them individually:

```hcl
# test/complex-policy/pass-encryption-only.hcl
mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-encrypted.sentinel"
    }
}

test {
    rules = {
        encryption_rule = true
        tagging_rule = true
        main = true
    }
}
```

### Environment Variables

You can set environment variables for your Sentinel tests:

```bash
# Set a variable for testing
SENTINEL_VAR_environment=production sentinel test
```

### Working with Multiple Policy Directories

```bash
# Test policies in a specific directory
sentinel test -dir ./security-policies/

# Test with a specific config
sentinel test -config ./security-policies/sentinel.hcl
```

## Integrating with Editors

Several code editors have Sentinel support:

- **VS Code** - The HashiCorp Sentinel extension provides syntax highlighting, formatting, and snippets
- **Vim/Neovim** - Use the sentinel.vim plugin for syntax highlighting
- **JetBrains IDEs** - HCL/Sentinel plugins available

Set up your editor to run `sentinel fmt` on save for consistent formatting.

## CI/CD Integration

Add Sentinel testing to your CI pipeline:

```bash
# Simple CI script
#!/bin/bash
set -e

# Format check
echo "Checking formatting..."
sentinel fmt -check *.sentinel
if [ $? -ne 0 ]; then
    echo "Formatting errors found. Run 'sentinel fmt' to fix."
    exit 1
fi

# Run tests
echo "Running tests..."
sentinel test -verbose
```

The Sentinel CLI is your primary development tool for policy-as-code. Get comfortable with it early and you will write better policies faster. For more on testing, see our posts on [testing Sentinel policies locally](https://oneuptime.com/blog/post/2026-02-23-how-to-test-sentinel-policies-locally/view) and [using mock data](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-mock-data-for-testing/view).
