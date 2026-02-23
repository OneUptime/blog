# How to Optimize Terraform for Large Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, Infrastructure as Code, Optimization, DevOps

Description: Learn practical strategies to optimize Terraform performance when managing large-scale infrastructure with hundreds or thousands of resources.

---

Managing a handful of Terraform resources is straightforward. But once your infrastructure grows to hundreds or thousands of resources, things start to slow down. Plans take forever, applies time out, and your team starts dreading every change. I have been through this pain, and over time I have found a set of strategies that make Terraform workable even at massive scale.

This post covers the most impactful optimizations you can apply to speed up Terraform when your infrastructure is large.

## Understanding Why Terraform Gets Slow

Before jumping into fixes, it helps to understand what makes Terraform slow in the first place. During a plan or apply, Terraform does several things:

1. Reads the current state from the backend
2. Refreshes state by querying every resource from the cloud provider API
3. Compares desired state (your config) with actual state
4. Builds a dependency graph and determines the order of operations
5. Executes changes

Each of these steps scales with the number of resources. If you have 2,000 resources, Terraform has to make 2,000 API calls just to refresh state. That alone can take several minutes.

## Split Your State Files

The single most effective optimization is breaking your monolithic state into smaller pieces. Instead of one giant Terraform project, split your infrastructure into logical groupings.

```hcl
# networking/main.tf
# Manages VPCs, subnets, route tables, etc.
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# compute/main.tf
# Manages EC2 instances, ASGs, etc.
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "compute/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Use `terraform_remote_state` data sources or output values to share information between projects:

```hcl
# In compute/main.tf, reference networking outputs
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_id
  # ...
}
```

A good rule of thumb: if a state file has more than 200-300 resources, consider splitting it.

## Increase Parallelism

Terraform defaults to 10 concurrent operations. For large infrastructure, you can increase this:

```bash
# Run plan with higher parallelism
terraform plan -parallelism=30

# Run apply with higher parallelism
terraform apply -parallelism=30
```

Be careful not to set this too high. Cloud provider APIs have rate limits, and exceeding them will cause more retries and actually slow things down. I usually find 20-30 is a sweet spot for AWS, while Azure and GCP can sometimes handle more.

## Use -target for Quick Changes

When you know exactly what you need to change, use `-target` to limit the scope:

```bash
# Only plan changes for a specific resource
terraform plan -target=aws_instance.app_server

# Target a module
terraform plan -target=module.database
```

This skips refreshing and planning for everything else. On a project with 1,000 resources, targeting a single resource can reduce plan time from 10 minutes to 30 seconds.

**Warning**: Do not make `-target` your default workflow. It can lead to drift if you skip planning the full infrastructure too often. Use it for quick iterations, but always do a full plan before merging changes.

## Disable Refresh When Safe

If you know your infrastructure has not changed outside of Terraform, you can skip the refresh step:

```bash
terraform plan -refresh=false
```

This tells Terraform to trust the state file and not query the cloud provider. For 1,000 resources, this can save minutes of API calls. Use this during development iterations when you are the only one making changes.

## Use Provider Plugin Caching

Every `terraform init` downloads provider plugins by default. For large projects with multiple providers, this can waste significant time. Set up a local cache:

```bash
# Set the plugin cache directory
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p "$TF_PLUGIN_CACHE_DIR"
```

Now when you run `terraform init` in any project, providers are downloaded once and reused from cache.

## Optimize Your State Backend

The state backend matters more than you might think. If your state file is large (tens of megabytes), every plan and apply starts with downloading and parsing it.

For S3 backends, enable DynamoDB locking but make sure the DynamoDB table is in the same region as your S3 bucket. For remote backends like Terraform Cloud, state access is generally faster because of their optimizations.

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## Minimize Data Source Usage

Each data source triggers an API call during planning. If you have dozens of data sources querying things that rarely change, consider replacing them with variables or local values:

```hcl
# Instead of this (makes an API call every plan)
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
}

# Consider pinning the AMI ID directly
variable "ubuntu_ami_id" {
  default = "ami-0abcdef1234567890"
}
```

This trades flexibility for speed. For values that truly need to be dynamic, keep the data source. For values that change rarely, pin them.

## Use Workspaces Carefully

Terraform workspaces share the same configuration but use different state files. They can be useful, but they are not a replacement for proper project splitting. If you have hundreds of resources per workspace and many workspaces, you are better off using separate directories.

## Monitor and Profile

Terraform has a built-in way to get timing information. Enable debug logging to see where time is spent:

```bash
# Enable trace-level logging
export TF_LOG=TRACE
export TF_LOG_PATH="terraform.log"

terraform plan
```

Look for patterns in the log. Are certain providers slow? Is state download taking long? This data tells you where to focus your optimization effort.

## Practical State Splitting Strategy

When splitting a large project, follow this approach:

1. Identify natural boundaries: networking, compute, databases, monitoring
2. Use `terraform state mv` to move resources to new state files
3. Add `terraform_remote_state` data sources for cross-references
4. Test thoroughly before removing resources from the original state

```bash
# Move a resource to a new state file
terraform state mv -state=old.tfstate -state-out=networking.tfstate \
  aws_vpc.main aws_vpc.main
```

## Summary

Optimizing Terraform for large infrastructure boils down to a few key principles: keep state files small by splitting projects, reduce API calls through caching and selective refresh, increase parallelism where it makes sense, and profile to find bottlenecks. None of these changes require rewriting your Terraform code from scratch. Start with state splitting, as it gives the biggest return, and then layer on the other optimizations as needed.

For monitoring the infrastructure you manage with Terraform, consider using [OneUptime](https://oneuptime.com) to keep track of uptime and performance across all your services.
