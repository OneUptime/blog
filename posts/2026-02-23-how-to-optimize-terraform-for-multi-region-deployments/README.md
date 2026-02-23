# How to Optimize Terraform for Multi-Region Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Region, Performance, Cloud Architecture, DevOps

Description: Optimize Terraform performance and architecture for deploying and managing infrastructure across multiple cloud regions efficiently.

---

Deploying infrastructure across multiple regions is common for high availability, disaster recovery, and serving users globally. But with Terraform, multi-region deployments come with unique performance challenges. Each region adds another set of resources, another provider configuration, and another set of API calls.

This guide covers how to structure and optimize Terraform for multi-region deployments.

## The Multi-Region Performance Challenge

A single-region deployment with 200 resources has one provider, one state, and one set of API calls. Deploying the same infrastructure across 5 regions means 1,000 resources, 5 provider configurations, and 5x the API calls.

If you put all regions in a single Terraform project, plan times scale linearly with region count. A 2-minute plan becomes a 10-minute plan.

## Project Structure Options

### Option 1: One Project Per Region

```
infrastructure/
  us-east-1/
    main.tf
    backend.tf
  us-west-2/
    main.tf
    backend.tf
  eu-west-1/
    main.tf
    backend.tf
```

Each region has its own state file and runs independently. This is the best approach for performance because regions can be planned and applied in parallel.

```hcl
# us-east-1/main.tf
provider "aws" {
  region = "us-east-1"
}

module "infrastructure" {
  source = "../../modules/regional-infrastructure"

  region      = "us-east-1"
  vpc_cidr    = "10.1.0.0/16"
  environment = var.environment
}
```

### Option 2: One Project with Provider Aliases

```hcl
# main.tf
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west_2"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

module "us_east" {
  source = "./modules/regional"
  providers = {
    aws = aws.us_east_1
  }
}

module "us_west" {
  source = "./modules/regional"
  providers = {
    aws = aws.us_west_2
  }
}
```

This is simpler to manage but slower because all regions are in one state.

### Recommendation

Use Option 1 (one project per region) for production. The performance benefits are significant, and it also reduces blast radius since a mistake in one region does not affect others.

## Parallel Region Execution

With separate projects per region, run them in parallel:

### Shell Script

```bash
#!/bin/bash
# plan-all-regions.sh

REGIONS=("us-east-1" "us-west-2" "eu-west-1" "ap-southeast-1" "ap-northeast-1")
RESULTS_DIR="/tmp/terraform-results"
mkdir -p "$RESULTS_DIR"

# Run all regions in parallel
for region in "${REGIONS[@]}"; do
  (
    cd "infrastructure/$region"
    terraform init -input=false > /dev/null 2>&1
    terraform plan -no-color -input=false > "$RESULTS_DIR/$region.plan" 2>&1
    echo "$region: exit code $?" > "$RESULTS_DIR/$region.status"
  ) &
done

# Wait for all to complete
wait

# Display results
for region in "${REGIONS[@]}"; do
  echo "=== $region ==="
  cat "$RESULTS_DIR/$region.status"
  tail -5 "$RESULTS_DIR/$region.plan"
  echo ""
done
```

### GitHub Actions

```yaml
name: Terraform Plan
on: [pull_request]

jobs:
  plan:
    strategy:
      matrix:
        region: [us-east-1, us-west-2, eu-west-1, ap-southeast-1]
      max-parallel: 4
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: infrastructure/${{ matrix.region }}
        run: terraform init

      - name: Terraform Plan
        working-directory: infrastructure/${{ matrix.region }}
        run: terraform plan -no-color
```

All regions plan simultaneously, so total time equals the slowest region, not the sum of all regions.

## Shared Modules for Consistency

Use a single module for regional infrastructure to ensure all regions are identical:

```hcl
# modules/regional-infrastructure/main.tf
variable "region" {}
variable "vpc_cidr" {}
variable "environment" {}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = {
    Name        = "${var.environment}-vpc"
    Region      = var.region
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = "${var.region}${["a", "b", "c"][count.index]}"
}

# ... more regional resources
```

Each region directory calls this module with region-specific values:

```hcl
# infrastructure/us-east-1/main.tf
module "infrastructure" {
  source      = "../../modules/regional-infrastructure"
  region      = "us-east-1"
  vpc_cidr    = "10.1.0.0/16"
  environment = "production"
}
```

## Cross-Region Dependencies

Some resources need to reference resources in other regions (like VPC peering or Route53 records). Handle these in a separate project:

```
infrastructure/
  us-east-1/          # Regional resources
  us-west-2/          # Regional resources
  eu-west-1/          # Regional resources
  global/             # Cross-region resources
    vpc-peering.tf
    route53.tf
    cloudfront.tf
```

```hcl
# global/vpc-peering.tf
data "terraform_remote_state" "us_east" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "us-east-1/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "us_west" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "us-west-2/terraform.tfstate"
    region = "us-east-1"  # State bucket region, not resource region
  }
}

resource "aws_vpc_peering_connection" "east_to_west" {
  provider    = aws.us_east_1
  vpc_id      = data.terraform_remote_state.us_east.outputs.vpc_id
  peer_vpc_id = data.terraform_remote_state.us_west.outputs.vpc_id
  peer_region = "us-west-2"
}
```

The global project depends on all regional projects and runs last.

## Region-Specific Variable Files

Use per-region variable files to manage region-specific values:

```hcl
# infrastructure/us-east-1/terraform.tfvars
region   = "us-east-1"
vpc_cidr = "10.1.0.0/16"
ami_id   = "ami-0123456789abcdef0"
azs      = ["us-east-1a", "us-east-1b", "us-east-1c"]
```

```hcl
# infrastructure/eu-west-1/terraform.tfvars
region   = "eu-west-1"
vpc_cidr = "10.3.0.0/16"
ami_id   = "ami-abcdef0123456789a"
azs      = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
```

## Staggered Multi-Region Deploys

When applying changes across regions, do not apply everywhere at once. Use a rolling deployment:

```bash
#!/bin/bash
# rolling-deploy.sh

# Deploy to canary region first
echo "Deploying to canary region (us-east-1)..."
cd infrastructure/us-east-1
terraform apply -auto-approve
cd -

# Wait and verify
echo "Waiting 5 minutes for canary verification..."
sleep 300

# Check canary health
# (integrate with your monitoring system)

# Deploy to remaining regions
REMAINING_REGIONS=("us-west-2" "eu-west-1" "ap-southeast-1")

for region in "${REMAINING_REGIONS[@]}"; do
  echo "Deploying to $region..."
  cd "infrastructure/$region"
  terraform apply -auto-approve
  cd -
  sleep 60  # Brief pause between regions
done
```

## Global Resources

Some resources are global (IAM, Route53, CloudFront) and should not be duplicated per region:

```
infrastructure/
  global/
    iam/            # IAM roles, policies
    dns/            # Route53 hosted zones
    cdn/            # CloudFront distributions
  us-east-1/        # Regional resources
  us-west-2/        # Regional resources
```

Global resources are managed once, not per-region, which avoids duplication and reduces total resource count.

## Performance Comparison

| Approach | 3 Regions | 5 Regions | 10 Regions |
|----------|-----------|-----------|------------|
| Single project | 6 min | 10 min | 20 min |
| Per-region, sequential | 6 min | 10 min | 20 min |
| Per-region, parallel | 2 min | 2 min | 2 min |

Parallel per-region execution makes scaling regions nearly free from a performance perspective.

## Summary

Multi-region Terraform deployments perform best when each region has its own project and state file. Run plans and applies in parallel across regions, share modules for consistency, and manage cross-region resources in a separate global project. This approach gives you constant-time plans regardless of how many regions you deploy to, along with better isolation and smaller blast radius per change.

For monitoring infrastructure across all your deployment regions, [OneUptime](https://oneuptime.com) provides global uptime monitoring and incident management from multiple geographic locations.
