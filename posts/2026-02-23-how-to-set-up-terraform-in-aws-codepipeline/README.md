# How to Set Up Terraform in AWS CodePipeline

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CodePipeline, CI/CD, Infrastructure as Code, DevOps

Description: A practical guide to setting up Terraform within AWS CodePipeline for automated infrastructure deployments, including CodeBuild configuration, IAM roles, and state management.

---

AWS CodePipeline is a natural fit for teams already invested in the AWS ecosystem. Rather than managing a separate CI/CD platform, you can run your Terraform workflows directly inside AWS using CodePipeline and CodeBuild. This guide walks through the full setup from scratch.

## Why AWS CodePipeline for Terraform

If your infrastructure lives in AWS, using CodePipeline keeps everything under one roof. You get native IAM integration, no need for long-lived credentials, built-in artifact passing between stages, and manual approval actions out of the box. The pricing model is also straightforward - you pay per pipeline per month plus CodeBuild compute time.

The tradeoff is that CodePipeline is more verbose to configure compared to GitHub Actions or GitLab CI. But once it is running, the tight AWS integration pays for itself.

## Architecture Overview

A typical Terraform CodePipeline has four stages:

1. **Source** - Pull code from CodeCommit, GitHub, or S3
2. **Validate** - Run `terraform fmt`, `terraform validate`, and linting
3. **Plan** - Generate and store the execution plan
4. **Apply** - Execute the plan after manual approval

Each stage runs in a CodeBuild project, and artifacts pass between them through S3.

## Setting Up the S3 Backend

Before building the pipeline, configure your Terraform state backend:

```hcl
# backend.tf - Remote state configuration for CodePipeline
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

Create the DynamoDB table for state locking:

```hcl
# state-infra/main.tf - Bootstrap state infrastructure
resource "aws_s3_bucket" "terraform_state" {
  bucket = "mycompany-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## IAM Role for CodeBuild

CodeBuild needs permissions to run Terraform and manage your AWS resources:

```hcl
# iam.tf - CodeBuild execution role
resource "aws_iam_role" "codebuild_terraform" {
  name = "codebuild-terraform-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach policies for Terraform operations
resource "aws_iam_role_policy" "codebuild_terraform" {
  name = "codebuild-terraform-policy"
  role = aws_iam_role.codebuild_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow Terraform state access
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::mycompany-terraform-state",
          "arn:aws:s3:::mycompany-terraform-state/*"
        ]
      },
      {
        # Allow DynamoDB state locking
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-locks"
      },
      {
        # Allow CodeBuild logging
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        # Add your Terraform resource permissions here
        # Scope this down to only what Terraform needs to manage
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "iam:*",
          "s3:*"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## CodeBuild Project for Terraform Plan

Create a buildspec file for the plan stage:

```yaml
# buildspec-plan.yml - Terraform plan stage
version: 0.2

env:
  variables:
    TF_VERSION: "1.7.0"
    TF_INPUT: "false"
    TF_IN_AUTOMATION: "true"

phases:
  install:
    commands:
      # Install specific Terraform version
      - wget -q https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
      - unzip -o terraform_${TF_VERSION}_linux_amd64.zip -d /usr/local/bin/
      - terraform version

  pre_build:
    commands:
      # Initialize Terraform with backend configuration
      - terraform init -no-color
      # Validate configuration syntax
      - terraform validate -no-color
      # Check formatting
      - terraform fmt -check -recursive -no-color

  build:
    commands:
      # Generate the execution plan and save it
      - terraform plan -no-color -out=tfplan
      # Also save a human-readable version
      - terraform show -no-color tfplan > plan-output.txt

artifacts:
  files:
    - "**/*"
  name: terraform-plan-output
```

## CodeBuild Project for Terraform Apply

```yaml
# buildspec-apply.yml - Terraform apply stage
version: 0.2

env:
  variables:
    TF_VERSION: "1.7.0"
    TF_INPUT: "false"
    TF_IN_AUTOMATION: "true"

phases:
  install:
    commands:
      - wget -q https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
      - unzip -o terraform_${TF_VERSION}_linux_amd64.zip -d /usr/local/bin/
      - terraform version

  pre_build:
    commands:
      # Re-initialize to restore the backend connection
      - terraform init -no-color

  build:
    commands:
      # Apply the saved plan from the previous stage
      - terraform apply -no-color -auto-approve tfplan
```

## Building the Pipeline with Terraform

Now wire everything together into a CodePipeline:

```hcl
# pipeline.tf - The CodePipeline definition
resource "aws_codepipeline" "terraform" {
  name     = "terraform-infrastructure"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  # Stage 1: Pull source code
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "myorg/infrastructure"
        BranchName       = "main"
      }
    }
  }

  # Stage 2: Terraform Plan
  stage {
    name = "Plan"

    action {
      name             = "Terraform-Plan"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["plan_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.terraform_plan.name
      }
    }
  }

  # Stage 3: Manual Approval
  stage {
    name = "Approval"

    action {
      name     = "Manual-Approval"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        NotificationArn = aws_sns_topic.terraform_approvals.arn
        CustomData      = "Review the Terraform plan before applying changes."
      }
    }
  }

  # Stage 4: Terraform Apply
  stage {
    name = "Apply"

    action {
      name            = "Terraform-Apply"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["plan_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.terraform_apply.name
      }
    }
  }
}
```

## CodeBuild Project Definitions

```hcl
# codebuild.tf - Build projects for plan and apply
resource "aws_codebuild_project" "terraform_plan" {
  name         = "terraform-plan"
  description  = "Runs terraform plan and produces an execution plan"
  service_role = aws_iam_role.codebuild_terraform.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    environment_variable {
      name  = "TF_VAR_environment"
      value = "production"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-plan.yml"
  }
}

resource "aws_codebuild_project" "terraform_apply" {
  name         = "terraform-apply"
  description  = "Applies the Terraform plan from the plan stage"
  service_role = aws_iam_role.codebuild_terraform.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-apply.yml"
  }
}
```

## SNS Topic for Approval Notifications

```hcl
# notifications.tf - Send approval requests via email
resource "aws_sns_topic" "terraform_approvals" {
  name = "terraform-approval-notifications"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.terraform_approvals.arn
  protocol  = "email"
  endpoint  = "platform-team@mycompany.com"
}
```

## Handling Multiple Environments

To run the same pipeline across dev, staging, and production, use CodePipeline variables and parameterized buildspecs:

```yaml
# buildspec-plan.yml with environment support
version: 0.2

env:
  variables:
    TF_VERSION: "1.7.0"
    TF_INPUT: "false"
    TF_IN_AUTOMATION: "true"

phases:
  pre_build:
    commands:
      # Select the correct workspace based on environment
      - terraform init -no-color
      - terraform workspace select $ENVIRONMENT || terraform workspace new $ENVIRONMENT

  build:
    commands:
      # Use environment-specific variable files
      - terraform plan -no-color -var-file="envs/${ENVIRONMENT}.tfvars" -out=tfplan
```

## Troubleshooting Common Issues

**Plan file not found during apply**: Make sure your artifacts configuration includes all files. The plan file is binary and must be passed between stages.

**State lock errors**: If a pipeline run gets interrupted, you may need to force-unlock the state. Add a manual step or a separate CodeBuild project that runs `terraform force-unlock`.

**Timeout during large applies**: Increase the CodeBuild timeout from the default 60 minutes. Some infrastructure changes (like RDS instances) can take 20+ minutes.

```hcl
# Increase build timeout for long-running applies
resource "aws_codebuild_project" "terraform_apply" {
  # ... other config ...
  build_timeout = 120  # 2 hours
}
```

## Monitoring Pipeline Runs

Set up CloudWatch Events to track pipeline state changes:

```hcl
# monitoring.tf - Alert on pipeline failures
resource "aws_cloudwatch_event_rule" "pipeline_failure" {
  name        = "terraform-pipeline-failure"
  description = "Alert when Terraform pipeline fails"

  event_pattern = jsonencode({
    source      = ["aws.codepipeline"]
    detail-type = ["CodePipeline Pipeline Execution State Change"]
    detail = {
      pipeline = ["terraform-infrastructure"]
      state    = ["FAILED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.pipeline_failure.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.terraform_approvals.arn
}
```

## Wrapping Up

Setting up Terraform in AWS CodePipeline takes more initial configuration than a simple GitHub Actions workflow, but the integration with IAM, approval workflows, and CloudWatch monitoring makes it a strong choice for AWS-heavy organizations. The key is getting the artifact passing right between plan and apply stages, and scoping your IAM permissions tightly enough for production use.

For related topics, check out our guides on [handling Terraform state locking in CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-state-locking-in-cicd/view) and [implementing manual approval gates for Terraform apply](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-manual-approval-gates-for-terraform-apply/view).
