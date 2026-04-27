# OpenTofu's Nine-Step Graph Walk Algorithm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Internal, Dependency Graph, Algorithm, Infrastructure as Code

Description: Understand the nine steps OpenTofu performs when walking the resource dependency graph - from configuration loading to post-apply checks - giving you insight into how plan and apply work internally.

## Introduction

When you run `tofu plan` or `tofu apply`, OpenTofu performs a structured nine-step walk of the dependency graph. Understanding these steps explains why certain operations happen in a specific order, why some errors appear when they do, and how OpenTofu handles complex dependency chains.

## The Nine Steps

### Step 1: Configuration Loading

OpenTofu parses and merges all `.tf` files in the directory:

```bash
# What happens in this step:

# - Reads all *.tf and *.tf.json files
# - Parses HCL syntax
# - Validates block structure (not values - that's step 4)
# - Merges multi-file configurations

# Errors at this step look like:
# Error: Argument or block definition required
# Error: Unexpected token; expected an argument definition
```

### Step 2: Module Loading

Loads referenced modules from `.terraform/modules/` (installed earlier by `tofu init`):

```bash
# What happens:
# - Reads the module manifest from .terraform/modules/modules.json
# - Loads module source code from .terraform/modules/
# - Verifies installed modules match the configuration's source addresses

# Errors:
# Error: Module not installed (run tofu init)
# Error: Module source has changed (re-run tofu init)
```

### Step 3: Provider Configuration

Initializes and configures provider plugins:

```hcl
# Provider configuration validated here
provider "aws" {
  region = var.aws_region   # Variable reference evaluated

  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/TerraformRole"
  }
}
```

### Step 4: Configuration Validation

Validates configuration semantics (not state):

```bash
# tofu validate runs step 4 explicitly
tofu validate

# Catches:
# - References to undefined variables
# - Type mismatches
# - Invalid attribute names
# - Missing required arguments
```

### Step 5: State Refresh

Reads current state from the backend and optionally refreshes from provider:

```bash
# Skip refresh for speed (uses state as-is)
tofu plan -refresh=false

# Only refresh, don't compute diff
tofu plan -refresh-only
```

### Step 6: Plan Computation

Computes the diff between desired state (config) and actual state:

```text
For each resource:
  - No diff → no-op (shown as no changes)
  - Config resource, no state → create
  - State resource, no config → destroy
  - Both exist, attributes differ → update (or replace if requires recreation)
```

### Step 7: Plan Output / Approval

Presents the computed plan for review:

```bash
# The plan you see and approve
tofu plan

# Plan output symbols:
# + create
# - destroy
# ~ update in-place
# -/+ destroy and recreate
# +/- create before destroy
# <= read (data source)
```

### Step 8: Apply (Create/Update/Delete)

Executes provider API calls in dependency order:

```bash
# Applies in topological order of the dependency graph
# Parallel execution up to -parallelism=N (default 10)
tofu apply

# Target specific resources
tofu apply -target=aws_instance.web -target=aws_security_group.web
```

### Step 9: Post-Apply Checks

After applying, runs `check` blocks and refreshes state:

```hcl
# Check blocks run after apply
check "health_check" {
  data "http" "endpoint" {
    url = "https://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.endpoint.status_code == 200
    error_message = "Health check failed after deployment"
  }
}
```

## Error Behavior by Step

```text
Step 1-3 (Loading): Error stops execution immediately
Step 4 (Validate): Error stops plan
Step 5 (Refresh): Error stops plan (unless -refresh=false)
Step 6 (Plan): Error stops plan
Step 7 (Plan output): User can cancel here
Step 8 (Apply): Partial apply - completed resources are saved to state
Step 9 (Checks): Warning only - does not revert completed changes
```

## Debugging with TF_LOG

Each step produces log output at different levels:

```bash
# See all steps in detail
TF_LOG=TRACE tofu plan 2>&1 | head -200

# Step-specific log messages:
# "Building and walking apply graph" - Step 8
# "Checking for post-conditions" - Step 9
# "Refreshing state" - Step 5
```

## Conclusion

OpenTofu's nine-step graph walk ensures configuration is fully validated before any infrastructure changes occur, and that state is accurately recorded after each change. Understanding these steps helps explain why partial applies occur (Step 8 errors), why check block failures don't roll back changes (Step 9 is post-apply), and why `tofu validate` is faster than `tofu plan` (it stops after Step 4). The graph walk is the foundation of OpenTofu's plan-before-apply safety model.
