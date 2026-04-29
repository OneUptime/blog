# How to Manage Staging Environments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Staging Environment, Infrastructure as Code, Testing, Pre-Production, DevOps, AWS

Description: Learn how to manage staging environments with OpenTofu that closely mirror production for reliable pre-production testing without the full production cost.

---

Staging environments catch issues that dev environments miss. But staging that doesn't mirror production closely enough gives false confidence. OpenTofu enables you to share configuration between staging and production - differing only in scale - ensuring staging is a true production replica at reduced cost.

## Staging Configuration Strategy

The key is using the same module as production with different variables.

```hcl
# environments/staging/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }

  backend "s3" {
    bucket = "my-tofu-state"
    key    = "staging/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "staging"
      ManagedBy   = "opentofu"
    }
  }
}

# Same modules as production - different variables
module "network" {
  source      = "../../modules/network"
  environment = "staging"
  cidr_block  = "10.1.0.0/16"  # Different CIDR to avoid VPC peering conflicts

  # Staging has 2 AZs, production has 3
  availability_zones = ["us-east-1a", "us-east-1b"]
}

module "application" {
  source      = "../../modules/application"
  environment = "staging"

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids

  # Scale-down from production
  desired_count = 1  # vs 3 in production
  min_count     = 1  # vs 2 in production
  max_count     = 3  # vs 10 in production

  # Use same task size to catch memory issues before production
  task_cpu    = 1024  # Same as production
  task_memory = 2048  # Same as production

  app_image = var.staging_image
}

module "database" {
  source      = "../../modules/database"
  environment = "staging"

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids

  # Smaller instance but same engine version as production
  instance_class = "db.t3.medium"  # vs db.r5.large in production
  engine_version = "15.17"         # Must match production exactly

  # No multi-AZ for staging (saves ~50% cost)
  multi_az                = false
  backup_retention_period = 3
}
```

## Staging-Specific Features

```hcl
# staging_features.tf
# Feature flag for staging-only debugging tools
resource "aws_ecs_service" "debug_proxy" {
  count = var.environment == "staging" ? 1 : 0

  name            = "debug-proxy"
  cluster         = var.ecs_cluster_arn
  task_definition = aws_ecs_task_definition.debug_proxy.arn
  desired_count   = 1
}

# Allow engineers to connect directly to staging DB for debugging
# (In production, this access is removed)
resource "aws_vpc_security_group_ingress_rule" "staging_db_access" {
  count = var.environment == "staging" ? 1 : 0

  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"
  cidr_ipv4         = var.vpn_cidr
  security_group_id = aws_security_group.database.id
  description       = "Allow VPN access to staging DB for debugging"
}
```

## Data Masking for Staging

```hcl
# data_masking.tf
# Lambda function to mask PII in staging database
resource "aws_lambda_function" "mask_staging_data" {
  function_name = "mask-staging-pii"
  filename      = data.archive_file.masker.output_path
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.masker.arn
  timeout       = 300

  environment {
    variables = {
      DB_ENDPOINT            = module.database.endpoint
      DB_PASSWORD_SECRET_ARN = module.database.password_secret_arn
    }
  }
}

# Run the masking function on the daily staging refresh schedule
resource "aws_cloudwatch_event_rule" "refresh_trigger" {
  name                = "staging-data-refresh"
  description         = "Trigger data masking on the daily staging refresh schedule"
  schedule_expression = "cron(0 2 * * ? *)"  # 2am UTC daily
}

resource "aws_cloudwatch_event_target" "refresh_trigger_masker" {
  rule      = aws_cloudwatch_event_rule.refresh_trigger.name
  target_id = "MaskStagingData"
  arn       = aws_lambda_function.mask_staging_data.arn
}

resource "aws_lambda_permission" "allow_refresh_trigger" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mask_staging_data.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.refresh_trigger.arn
}
```

## Best Practices

- Use the same application Docker image in staging as production - the only difference should be infrastructure scale.
- Match production's engine/runtime versions exactly in staging to catch version-specific bugs.
- Refresh staging data regularly from production (with PII masked) to keep it realistic.
- Run load tests against staging before production releases to validate auto-scaling behavior.
- Keep staging always running (unlike dev) so it's ready for pre-deployment testing without warm-up time.
