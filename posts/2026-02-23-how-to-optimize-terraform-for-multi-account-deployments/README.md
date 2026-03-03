# How to Optimize Terraform for Multi-Account Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Account, AWS Organizations, Performance, DevOps

Description: Optimize Terraform performance and workflow when deploying infrastructure across multiple cloud accounts with shared modules and state management.

---

Managing a single AWS account with Terraform is straightforward. Managing 20 or 50 accounts with shared infrastructure patterns is a different challenge entirely. Plan times multiply, state management gets complicated, and provider initialization becomes a bottleneck.

This guide covers the practical optimizations that make multi-account Terraform deployments manageable at scale.

## The Multi-Account Challenge

In a typical multi-account setup, you have:

- A management account for billing and organization
- A shared services account for CI/CD, artifact storage, and logging
- Multiple workload accounts (dev, staging, production, per-team accounts)

Each account needs its own Terraform state, its own provider configuration, and often the same infrastructure patterns. Without optimization, you end up running Terraform 20 times with 20 separate init-plan-apply cycles.

## Project Structure for Multi-Account

Structure your repository so shared code lives in modules and account-specific configuration is minimal:

```text
terraform/
  modules/
    vpc/
    security-baseline/
    logging/
    compute/
  accounts/
    dev/
      main.tf
      backend.tf
      variables.tf
    staging/
      main.tf
      backend.tf
      variables.tf
    production/
      main.tf
      backend.tf
      variables.tf
    shared-services/
      main.tf
      backend.tf
      variables.tf
```

Each account directory is small, mostly calling shared modules with account-specific variables:

```hcl
# accounts/dev/main.tf
module "vpc" {
  source = "../../modules/vpc"

  cidr_block  = "10.1.0.0/16"
  environment = "dev"
  account_id  = "111111111111"
}

module "security_baseline" {
  source = "../../modules/security-baseline"

  environment = "dev"
  enable_guardduty = true
}
```

## Parallel Execution Across Accounts

The biggest performance win is running Terraform for each account in parallel. Since accounts have independent state files and no cross-dependencies, they can safely run simultaneously.

### With GNU Parallel

```bash
#!/bin/bash
# parallel-plan.sh
# Run terraform plan for all accounts in parallel

ACCOUNTS_DIR="terraform/accounts"
RESULTS_DIR="/tmp/terraform-results"
mkdir -p "$RESULTS_DIR"

# Find all account directories
accounts=$(ls -d "$ACCOUNTS_DIR"/*)

# Run plans in parallel
plan() {
  dir="$1"
  account="$2"
  echo "Planning $account..."
  cd "$dir" &&
    terraform init -input=false > /dev/null 2>&1 &&
    # Put the output in a .plan file
    terraform plan -no-color -input=false > "$RESULTS_DIR/${account}.plan" 2>&1
  echo "Finished $account (exit code: $?)"
}
export -f plan
export RESULTS_DIR

echo "$accounts" | parallel -j 4 plan {} {/}

# Show results
for result in "$RESULTS_DIR"/*.plan; do
  account=$(basename "$result" .plan)
  echo "=== $account ==="
  tail -5 "$result"
  echo ""
done
```

### With GitHub Actions Matrix

```yaml
name: Terraform Plan All Accounts
on: [pull_request]

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        account: [dev, staging, production, shared-services]
      max-parallel: 4
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets[format('{0}_ACCOUNT_ID', matrix.account)] }}:role/TerraformRole
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init
        working-directory: terraform/accounts/${{ matrix.account }}

      - name: Terraform Plan
        run: terraform plan -no-color
        working-directory: terraform/accounts/${{ matrix.account }}
```

## Shared Provider Cache

When running multiple accounts, each one downloads the same providers independently. Share a single cache:

```bash
# Set up shared cache
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

# Now all account init commands share the cache
for account in dev staging production; do
  cd "terraform/accounts/$account"
  terraform init
  cd -
done
```

The first account downloads the providers. Subsequent accounts find them in the cache and finish init in seconds.

## Provider Configuration with Assume Role

For multi-account setups, you typically have one set of credentials that assumes roles into each account:

```hcl
# accounts/dev/providers.tf
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::111111111111:role/TerraformRole"
    session_name = "terraform-dev"
    external_id  = var.external_id
  }

  # Increase retries for cross-account API calls
  max_retries = 25
}
```

Cross-account API calls sometimes have higher latency than same-account calls. Increasing `max_retries` helps prevent transient failures from becoming errors.

## Staggering Applies to Avoid Rate Limits

AWS Organizations share some API rate limits across accounts. If you apply to all accounts simultaneously, you might hit org-level rate limits.

```bash
#!/bin/bash
# staggered-apply.sh
# Apply to accounts with a delay between each

ACCOUNTS=("dev" "staging" "production")
DELAY_SECONDS=30

for account in "${ACCOUNTS[@]}"; do
  echo "Applying to $account..."
  cd "terraform/accounts/$account"
  terraform apply -auto-approve -parallelism=10
  apply_result=$?
  cd -

  if [ $apply_result -ne 0 ]; then
    echo "Apply failed for $account. Stopping."
    exit 1
  fi

  if [ "$account" != "${ACCOUNTS[-1]}" ]; then
    echo "Waiting ${DELAY_SECONDS}s before next account..."
    sleep "$DELAY_SECONDS"
  fi
done
```

For plans (which are read-only), you can usually run all accounts in parallel without hitting rate limits. Applies (which make write calls) benefit from staggering.

## Cross-Account Dependencies

Sometimes resources in one account depend on resources in another. For example, a shared VPC in the networking account that is peered with VPCs in workload accounts.

Use `terraform_remote_state` to reference across accounts:

```hcl
# In accounts/dev/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket   = "shared-terraform-state"
    key      = "networking/terraform.tfstate"
    region   = "us-east-1"
    role_arn = "arn:aws:iam::999999999999:role/TerraformReadState"
  }
}

resource "aws_vpc_peering_connection_accepter" "from_shared" {
  vpc_peering_connection_id = data.terraform_remote_state.networking.outputs.peering_connection_id
  auto_accept               = true
}
```

Keep cross-account dependencies to a minimum. The more dependencies, the more ordering constraints, and the fewer opportunities for parallel execution.

## Using Terragrunt for Multi-Account

Terragrunt is a wrapper around Terraform that makes multi-account management easier:

```hcl
# terragrunt.hcl at the root
remote_state {
  backend = "s3"
  config = {
    bucket         = "terraform-state-${get_aws_account_id()}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Run all accounts in parallel
# terragrunt run-all plan --terragrunt-parallelism 4
```

Terragrunt's `run-all` command executes Terraform across all subdirectories, respecting dependencies and running independent accounts in parallel.

## Reducing Per-Account Configuration

The less code in each account directory, the faster plans are. Keep account-specific files minimal:

```hcl
# accounts/dev/main.tf
# Just module calls and account-specific values
module "baseline" {
  source = "../../modules/account-baseline"

  account_name = "dev"
  account_id   = "111111111111"
  environment  = "development"

  vpc_cidr     = "10.1.0.0/16"
  enable_nat   = true
}
```

All the complexity lives in the module. When you update the module, all accounts get the change.

## Monitoring Apply Duration Across Accounts

Track how long each account takes to plan and apply:

```bash
#!/bin/bash
# track-durations.sh

for account in dev staging production; do
  start=$(date +%s)
  cd "terraform/accounts/$account"
  terraform plan -input=false > /dev/null 2>&1
  end=$(date +%s)
  duration=$((end - start))
  echo "$account: ${duration}s"
  cd -
done
```

If one account is consistently slower, investigate. It probably has more resources or uses resource types with slower APIs.

## Summary

Multi-account Terraform performance comes down to: share providers and modules, run accounts in parallel, stagger applies to avoid rate limits, and keep cross-account dependencies minimal. With good structure and parallel execution, managing 20 accounts can be nearly as fast as managing one.

For monitoring infrastructure across all your accounts, [OneUptime](https://oneuptime.com) provides a single pane of glass for uptime, performance, and incidents across your entire organization.
