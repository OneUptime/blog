# How to Handle Terraform API Rate Limiting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, API Rate Limiting, AWS, Cloud Provider, DevOps

Description: Practical techniques for handling cloud provider API rate limits when running Terraform at scale across large infrastructure.

---

If you have ever seen errors like "Rate exceeded" or "Throttling" during a Terraform run, you have hit API rate limiting. Cloud providers impose limits on how many API calls you can make per second, and Terraform can easily exceed these limits when managing large infrastructure.

This is one of the most frustrating problems to debug because rate limiting errors are intermittent and often affect different resources each time. Let me walk through what causes these issues and how to handle them effectively.

## Why Terraform Triggers Rate Limits

During a plan or apply, Terraform makes API calls to your cloud provider for every resource it manages. A single resource might require multiple API calls: one to read its current state, one to check its tags, one to verify its dependencies.

With the default parallelism of 10, Terraform can make dozens of API calls per second. For 500 resources, a plan might generate 1,000+ API calls in quick succession.

AWS, for example, has different rate limits for different API endpoints:

- EC2 `DescribeInstances`: ~100 requests per second
- S3 `GetBucketLocation`: ~5,000 requests per second
- IAM `GetRole`: ~15 requests per second

The limits vary by account, region, and the specific API action. Some limits are shared across all tools (console, CLI, SDKs, Terraform), so if other processes are making calls at the same time, you hit limits faster.

## Reducing Parallelism

The most direct fix is to reduce Terraform's parallelism:

```bash
# Default parallelism is 10, reduce it
terraform plan -parallelism=5

# For very large projects with frequent rate limiting
terraform apply -parallelism=3
```

Lower parallelism means fewer concurrent API calls, which reduces the chance of hitting rate limits. The tradeoff is that your Terraform run takes longer. But a slower, successful run is better than a fast one that fails halfway through.

You can also set this in your configuration:

```hcl
# In terraform.tf or any .tf file
terraform {
  # This does not exist as a config option.
  # Use CLI flags or environment variables instead.
}
```

Actually, parallelism can only be set via CLI flags. There is no configuration file option for it. For automation, set it in your CI/CD scripts.

## Implementing Retry Logic with Provider Configuration

Most Terraform providers have built-in retry logic for rate-limited requests. The AWS provider, for example, automatically retries throttled requests with exponential backoff.

You can configure the retry behavior:

```hcl
provider "aws" {
  region = "us-east-1"

  # Maximum number of retries for throttled requests
  max_retries = 25

  # Use custom retry settings
  retry_mode = "adaptive"
}
```

The `adaptive` retry mode adjusts backoff timing based on the rate of throttling errors. This is generally better than the default `standard` mode for large infrastructure.

For the Azure provider:

```hcl
provider "azurerm" {
  features {}

  # Custom retry settings
  # The provider handles retries internally
}
```

For the Google Cloud provider:

```hcl
provider "google" {
  project = "my-project"
  region  = "us-central1"

  # Batching settings help reduce API call volume
  batching {
    send_after      = "10s"
    enable_batching = true
  }
}
```

Google's provider supports request batching, which combines multiple API calls into single batch requests. This is very effective at reducing the total number of API calls.

## Splitting Resources Across Multiple Provider Aliases

If rate limits are specific to a particular API endpoint, you can spread the load by using multiple provider configurations:

```hcl
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "secondary"
  region = "us-west-2"
}

# Spread resources across regions to distribute API load
resource "aws_instance" "app_east" {
  provider      = aws.primary
  ami           = var.ami_east
  instance_type = "t3.medium"
}

resource "aws_instance" "app_west" {
  provider      = aws.secondary
  ami           = var.ami_west
  instance_type = "t3.medium"
}
```

Rate limits are typically per-region, so distributing resources across regions can help. However, this only works if your architecture actually spans multiple regions.

## Using -refresh=false to Reduce API Calls

The refresh step is one of the biggest sources of API calls. If you trust your state file, skip it:

```bash
# Skip refresh during planning
terraform plan -refresh=false

# This also works during apply
terraform apply -refresh=false
```

This eliminates one API call per resource during the plan phase. For 1,000 resources, that is 1,000 fewer API calls.

Use this judiciously. If someone made changes outside of Terraform, your plan will not detect them. I use this during rapid iteration on a change, then do a full refresh before the final apply.

## Requesting Rate Limit Increases

For AWS, you can request higher API rate limits through AWS Support:

1. Go to AWS Support Center
2. Create a case under "Service limit increase"
3. Select the specific API/service
4. Explain your use case and the limits you need

This is worth doing if you manage large infrastructure. AWS is generally willing to increase limits for legitimate use cases. The same applies to other cloud providers.

## Staggering Applies Across Accounts

If you manage multiple AWS accounts, avoid running Terraform against all of them simultaneously:

```bash
#!/bin/bash
# staggered-apply.sh
# Run applies sequentially across accounts to avoid org-level rate limits

ACCOUNTS=("dev" "staging" "production")

for account in "${ACCOUNTS[@]}"; do
  echo "Applying to $account..."
  cd "$account"
  terraform apply -auto-approve -parallelism=5
  cd ..

  # Wait between accounts to let rate limit counters reset
  echo "Waiting 30 seconds before next account..."
  sleep 30
done
```

Some AWS API rate limits are shared across an entire AWS Organization, so even separate accounts can interfere with each other.

## Detecting Rate Limiting in Logs

Enable Terraform debug logging to see rate limiting in action:

```bash
export TF_LOG=DEBUG
terraform plan 2>&1 | tee terraform-debug.log
```

Look for lines containing "Throttling", "Rate exceeded", or "retry":

```bash
# Search the log for throttling events
grep -i "throttl\|rate.*exceed\|retry" terraform-debug.log
```

This tells you which API calls are being throttled and how many retries are happening. Use this data to tune your parallelism and identify which resources cause the most API load.

## Using Terragrunt for Automatic Retry

If you use Terragrunt, it has built-in retry support for transient errors:

```hcl
# terragrunt.hcl
retryable_errors = [
  "(?s).*Error: Rate exceeded.*",
  "(?s).*ThrottlingException.*",
  "(?s).*RequestLimitExceeded.*",
]

retry_max_attempts       = 5
retry_sleep_interval_sec = 30
```

This retries the entire Terraform command when rate limiting causes a failure. It is a blunt instrument compared to provider-level retries, but it catches cases where provider retries are exhausted.

## Organizing Resources to Minimize API Calls

Some resource types generate more API calls than others. IAM resources, for example, tend to have lower rate limits. Group IAM resources into their own project so you can apply them with lower parallelism:

```bash
# IAM project - use low parallelism
cd iam/
terraform apply -parallelism=2

# Compute project - higher parallelism is usually fine
cd ../compute/
terraform apply -parallelism=20
```

## Summary

API rate limiting is an inevitable challenge when managing large infrastructure with Terraform. The key strategies are: reduce parallelism to lower the rate of API calls, configure provider retry behavior, skip refresh when safe, split projects so each one makes fewer calls, and request limit increases from your cloud provider. Combining these approaches makes rate limiting a non-issue even for large deployments.

For monitoring API rate limit errors and overall infrastructure health, [OneUptime](https://oneuptime.com) provides real-time alerting and observability that integrates with your cloud infrastructure.
