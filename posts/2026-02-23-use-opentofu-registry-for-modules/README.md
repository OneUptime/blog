# How to Use OpenTofu Registry for Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Modules, Registry, Infrastructure as Code

Description: Learn how to find, evaluate, and use modules from the OpenTofu Registry to accelerate infrastructure development and follow community best practices.

---

Modules are pre-built infrastructure packages that save you from writing everything from scratch. The OpenTofu Registry hosts thousands of community-maintained modules for AWS, Azure, Google Cloud, and other platforms. This guide shows you how to find the right modules, use them effectively, and avoid common pitfalls.

## What the OpenTofu Registry Offers

The OpenTofu Registry at registry.opentofu.org indexes modules that were previously only accessible through the Terraform Registry. These modules cover everything from basic networking to complex application platforms. Each module listing includes documentation, input variables, output values, and dependency information.

The most popular modules include:

- VPC and networking modules for major clouds
- Kubernetes cluster modules (EKS, AKS, GKE)
- Database modules (RDS, Cloud SQL, Azure Database)
- Security modules (IAM, security groups, firewalls)
- Monitoring and logging modules

## Finding Modules

Browse the registry or search by keyword:

```bash
# The registry web interface at registry.opentofu.org lets you search
# and filter by cloud provider, category, and popularity

# You can also find modules on GitHub by searching for
# "terraform-aws-modules" or similar organizations
```

Module naming follows a convention: `terraform-<PROVIDER>-<NAME>`. For example, `terraform-aws-vpc` is a VPC module for AWS.

## Using a Registry Module

Here is how to use a module from the registry:

```hcl
# Using the popular AWS VPC module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.4.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

# Reference module outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}
```

```bash
# Initialize to download the module
tofu init

# Plan to see what it creates
tofu plan
```

## Evaluating Module Quality

Not all modules are created equal. Before using a module in production, evaluate it:

**Check the source repository.** Look at the GitHub repository for:
- Recent commits and maintenance activity
- Number of stars and forks
- Open issues and how quickly they are resolved
- Code quality and testing

**Read the documentation.** Good modules have:
- Clear README with usage examples
- Documented variables with descriptions and defaults
- Listed outputs
- Examples directory with complete configurations

**Review the resources created.** Understand what infrastructure the module manages:

```bash
# Clone the module and inspect it
git clone https://github.com/terraform-aws-modules/terraform-aws-vpc
cd terraform-aws-vpc

# Look at resources
grep -r "resource " *.tf modules/
```

**Check version history.** Frequent breaking changes are a red flag. Stable modules follow semantic versioning properly.

## Pinning Module Versions

Always pin module versions in production:

```hcl
# Good: pinned version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.4.0"
  # ...
}

# Acceptable: pessimistic constraint
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.4"
  # ...
}

# Bad: no version pin (uses latest, may break)
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  # ...
}
```

## Using Module Submodules

Many modules include submodules for specific use cases:

```hcl
# The EKS module has submodules for different node group types
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.21.0"

  cluster_name    = "production"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
}

# Use the self-managed node group submodule
module "self_managed_node_group" {
  source  = "terraform-aws-modules/eks/aws//modules/self-managed-node-group"
  version = "19.21.0"

  name            = "worker"
  cluster_name    = module.eks.cluster_name
  instance_type   = "t3.large"
  desired_size    = 3
  min_size        = 2
  max_size        = 5
  subnet_ids      = module.vpc.private_subnets
}
```

The `//` syntax separates the module repository from the subdirectory path.

## Combining Multiple Modules

Real infrastructure projects use multiple modules together:

```hcl
# Network layer
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.4.0"

  name = "production"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
}

# Compute layer
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.21.0"

  cluster_name    = "production"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    workers = {
      desired_size = 3
      min_size     = 2
      max_size     = 5

      instance_types = ["t3.large"]
    }
  }
}

# Data layer
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.3.0"

  identifier = "production-db"

  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500

  db_name  = "application"
  username = "admin"
  port     = 5432

  vpc_security_group_ids = [module.eks.cluster_security_group_id]
  subnet_ids             = module.vpc.private_subnets

  family               = "postgres15"
  major_engine_version = "15"

  multi_az = true
}

# Monitoring
module "cloudwatch_alarms" {
  source  = "terraform-aws-modules/cloudwatch/aws//modules/metric-alarm"
  version = "5.1.0"

  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU above 80%"

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_identifier
  }
}
```

## Upgrading Module Versions

When upgrading modules, follow this process:

```bash
# Step 1: Check what is currently installed
tofu version
grep 'version' *.tf | grep module

# Step 2: Update the version in your configuration
# Edit the module block to the new version

# Step 3: Re-initialize to download the new version
tofu init -upgrade

# Step 4: Plan to see the impact
tofu plan

# Step 5: Review the plan carefully
# Module upgrades can add, change, or remove resources
```

Some module upgrades require variable changes:

```hcl
# Before (module v4.x)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "4.0.0"

  # v4 syntax
  enable_nat_gateway = true
}

# After (module v5.x)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.4.0"

  # v5 might have changed variable names or defaults
  enable_nat_gateway = true
  # New required variable in v5
  nat_gateway_destination_cidr_block = "0.0.0.0/0"
}
```

Always read the module's CHANGELOG before upgrading.

## Creating Wrapper Modules

If a registry module does not exactly fit your needs, create a wrapper:

```hcl
# modules/my-vpc/main.tf
# Company-standard VPC configuration wrapping the community module

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.4.0"

  name = var.name
  cidr = var.cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  # Company standards baked in
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_flow_log        = true
  flow_log_destination_type = "cloud-watch-logs"

  tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "opentofu"
    CostCenter  = var.cost_center
  })
}
```

This approach lets you enforce standards while leveraging community-maintained modules underneath.

## Module Output Cross-References

Modules expose outputs that other modules or resources can reference:

```hcl
# One module's output feeds into another
resource "aws_security_group_rule" "allow_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = module.eks.cluster_security_group_id
  security_group_id        = module.rds.db_security_group_id
}
```

The OpenTofu Registry is one of the most valuable resources in the infrastructure-as-code ecosystem. Using well-maintained modules saves weeks of development time and gives you access to battle-tested configurations used by thousands of teams.

For state security, see [How to Use OpenTofu State Encryption](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-state-encryption/view).
