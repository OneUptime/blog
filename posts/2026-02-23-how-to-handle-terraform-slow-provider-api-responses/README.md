# How to Handle Terraform Slow Provider API Responses

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, API, Cloud Provider, Troubleshooting

Description: Diagnose and mitigate slow cloud provider API responses that cause Terraform plans and applies to take much longer than expected.

---

You run `terraform plan` and watch it hang for minutes at a time, seemingly doing nothing. The progress eventually moves forward, but what should take 2 minutes takes 15. The culprit is almost always slow responses from cloud provider APIs.

Some API calls are inherently slow. Describing a complex resource, listing all objects in a large S3 bucket, or querying IAM policies can each take several seconds. Multiply that by hundreds of resources, and your Terraform run crawls.

Here is how to identify which API calls are slow and what to do about them.

## Identifying Slow API Calls

Enable Terraform's debug logging to see exactly what is happening:

```bash
# Set log level to TRACE for maximum detail
export TF_LOG=TRACE
export TF_LOG_PATH="terraform-trace.log"

terraform plan
```

The trace log shows every API call Terraform makes, including timestamps. Look for gaps between calls:

```bash
# Find API calls that took the longest
# Look for timestamps with large gaps
grep -E "HTTP Request|HTTP Response" terraform-trace.log | head -50
```

You can also use a more targeted approach:

```bash
# Set provider-specific logging
export TF_LOG_PROVIDER=TRACE
export TF_LOG_PATH="provider-trace.log"

terraform plan
```

This shows only provider-level activity, filtering out Terraform core messages.

## Common Slow API Patterns

### AWS-Specific Slow Calls

Some AWS API calls are known to be slow:

- **IAM**: `GetAccountAuthorizationDetails` can take 10-30 seconds for accounts with many roles
- **S3**: `GetBucketPolicy`, `GetBucketAcl` for buckets with complex policies
- **EC2**: `DescribeSecurityGroups` when filtering by VPC with hundreds of rules
- **CloudFront**: `GetDistribution` can take several seconds per distribution
- **ECS**: `DescribeServices` for services with many tasks

### Azure-Specific Slow Calls

- **Resource Group listings** with many resources
- **Network Security Group** rules with complex configurations
- **Key Vault** access policy operations

### GCP-Specific Slow Calls

- **IAM Policy** bindings for projects with many members
- **GKE cluster** descriptions for large clusters
- **Cloud SQL** instance details

## Reducing API Calls with -refresh=false

The quickest fix for slow APIs is to skip the refresh:

```bash
terraform plan -refresh=false
```

This tells Terraform to trust the state file and not call the provider APIs to verify current state. The plan will be based on the last known state, which is usually accurate if you are the only one making changes.

## Batching Resources by Provider Speed

If you know certain resource types have slow APIs, isolate them into their own Terraform project:

```
infrastructure/
  fast-resources/     # EC2, S3 buckets, security groups
  slow-resources/     # CloudFront distributions, IAM policies
  networking/         # VPCs, subnets (medium speed)
```

This way, the fast resources get quick feedback while the slow ones run separately and do not block your workflow.

## Caching Data Source Results

Data sources are evaluated every plan, and some are slow. If the data does not change often, consider replacing data sources with variables or local values:

```hcl
# Slow - queries the AWS API every plan
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Faster - use variables instead
variable "account_id" {
  default = "123456789012"
}

variable "region" {
  default = "us-east-1"
}
```

For data sources that must remain dynamic, at least document why they are needed so future maintainers do not add unnecessary ones.

## Adjusting Provider Timeouts

Many Terraform resources support custom timeouts. If a resource creation or update is timing out due to slow API responses, increase the timeout:

```hcl
resource "aws_rds_instance" "main" {
  allocated_storage    = 100
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.r6g.large"
  db_name              = "mydb"

  # RDS operations can be very slow
  timeouts {
    create = "60m"  # Default is 40m
    update = "80m"  # Default is 80m
    delete = "60m"  # Default is 60m
  }
}

resource "aws_elasticsearch_domain" "main" {
  domain_name = "my-domain"

  # Elasticsearch domains take a long time to create and update
  timeouts {
    update = "120m"
  }
}
```

## Using Provider-Specific Performance Features

### AWS Provider: Assume Role Session Caching

If you use assume role, the provider makes a separate STS call for each role assumption. Configure it to reuse sessions:

```hcl
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/TerraformRole"
    session_name = "TerraformSession"
    # Setting a longer duration reduces re-authentication overhead
    duration     = "1h"
  }

  # Use default tags to reduce per-resource API calls for tagging
  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}
```

### Google Provider: Request Batching

The Google provider can batch multiple API calls into single requests:

```hcl
provider "google" {
  project = "my-project"
  region  = "us-central1"

  batching {
    send_after      = "10s"
    enable_batching = true
  }
}
```

This collects API calls for up to 10 seconds and sends them as a batch. This reduces the total number of round trips.

## Reducing Refresh Scope with -target

When you need a refreshed plan for specific resources but want to skip slow resources:

```bash
# Only refresh and plan the resources you care about
terraform plan -target=module.api_gateway -target=module.lambda_functions
```

The slow CloudFront distributions and IAM policies in other modules will not be refreshed.

## Implementing a Two-Phase Plan

For very large projects, consider a two-phase approach:

```bash
#!/bin/bash
# two-phase-plan.sh

# Phase 1: Quick plan without refresh (instant feedback)
echo "Phase 1: Quick plan (no refresh)..."
terraform plan -refresh=false -out=quick.tfplan

# Phase 2: Full plan with refresh (accurate but slow)
echo "Phase 2: Full plan with refresh..."
terraform plan -out=full.tfplan

# Compare the two plans
echo "Quick plan changes:"
terraform show quick.tfplan | grep -c "will be"

echo "Full plan changes:"
terraform show full.tfplan | grep -c "will be"
```

Phase 1 gives you instant feedback on your configuration changes. Phase 2 confirms there is no drift.

## Monitoring API Response Times

Track API response times over time to notice degradation:

```bash
#!/bin/bash
# measure-plan-time.sh

start=$(date +%s)
terraform plan -no-color > plan-output.txt 2>&1
end=$(date +%s)

duration=$((end - start))
resource_count=$(grep -c "Refreshing state" plan-output.txt)
changes=$(grep -c "will be" plan-output.txt)

echo "Plan completed in ${duration}s"
echo "Resources refreshed: ${resource_count}"
echo "Changes detected: ${changes}"
echo "Average time per resource: $(echo "scale=2; $duration / $resource_count" | bc)s"
```

If the average time per resource increases, investigate which API calls are getting slower.

## Using Terraform Cloud for Faster API Access

Terraform Cloud workers often have better network connectivity to cloud provider APIs than your local machine or CI/CD runners:

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production"
    }
  }
}
```

This is because Terraform Cloud workers run in major cloud regions with optimized networking. If your CI/CD runner is in a different region from your resources, the API latency adds up.

## Summary

Slow provider API responses are one of the trickiest Terraform performance issues because they are often outside your direct control. The best strategies are: identify the slow APIs through trace logging, skip refresh when safe, isolate slow resources into separate projects, use provider-specific performance features, and consider Terraform Cloud for better API connectivity. By combining these approaches, you can make even API-heavy Terraform projects responsive.

For monitoring API response times and overall service health, [OneUptime](https://oneuptime.com) provides detailed performance tracking and alerting for your infrastructure.
