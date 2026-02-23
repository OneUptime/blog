# How to Handle Database Schema Changes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Schema, Migration, DevOps, Infrastructure as Code

Description: Learn strategies for handling database schema changes alongside Terraform infrastructure management including migration tools, provisioners, and CI/CD integration.

---

Database schema changes are one of the trickiest aspects of infrastructure management. While Terraform excels at managing the database infrastructure itself (instances, clusters, networking, security), it was not designed to manage the schema inside the database (tables, columns, indexes, stored procedures). In this guide, we will cover strategies for coordinating database schema changes with your Terraform-managed infrastructure.

## Understanding the Challenge

Terraform manages infrastructure state through its state file and uses a declarative approach. Database schemas, on the other hand, are typically managed through sequential migrations that build on each other. You cannot simply declare what the schema should look like and have a tool figure out the changes. Instead, you write migration scripts that apply changes in order.

This means you need a strategy that combines Terraform for infrastructure provisioning with a separate schema migration tool for managing the actual database schema. The key is coordinating these two workflows so that infrastructure changes and schema changes are applied in the right order.

## Setting Up the Database Infrastructure

First, let us set up the database infrastructure with Terraform:

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# RDS instance
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  db_name  = "appdb"
  username = "dbadmin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  multi_az               = true

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "production-db-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

# Output connection details for migration tools
output "db_endpoint" {
  value = aws_db_instance.production.address
}

output "db_port" {
  value = aws_db_instance.production.port
}

output "db_name" {
  value = aws_db_instance.production.db_name
}
```

## Using Terraform Provisioners for Initial Schema

For initial schema setup on a brand new database, you can use a provisioner:

```hcl
# Run initial schema migration after database creation
resource "null_resource" "initial_schema" {
  # Only run when the database is first created
  triggers = {
    db_instance_id = aws_db_instance.production.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Wait for the database to be available
      sleep 60

      # Run the initial migration using your migration tool
      # Example with Flyway
      flyway \
        -url="jdbc:postgresql://${aws_db_instance.production.address}:${aws_db_instance.production.port}/${aws_db_instance.production.db_name}" \
        -user="${aws_db_instance.production.username}" \
        -password="${var.db_password}" \
        -locations="filesystem:./migrations" \
        migrate
    EOT

    environment = {
      PGPASSWORD = var.db_password
    }
  }

  depends_on = [aws_db_instance.production]
}
```

## Integrating with Flyway

Flyway is a popular database migration tool. Here is how to integrate it with your Terraform workflow:

```hcl
# Store migration configuration in SSM for CI/CD pipelines
resource "aws_ssm_parameter" "flyway_url" {
  name  = "/production/database/flyway_url"
  type  = "SecureString"
  value = "jdbc:postgresql://${aws_db_instance.production.address}:${aws_db_instance.production.port}/${aws_db_instance.production.db_name}?sslmode=require"
}

resource "aws_ssm_parameter" "flyway_user" {
  name  = "/production/database/flyway_user"
  type  = "String"
  value = aws_db_instance.production.username
}

resource "aws_ssm_parameter" "flyway_password" {
  name  = "/production/database/flyway_password"
  type  = "SecureString"
  value = var.db_password
}
```

## Integrating with Liquibase

Liquibase is another popular option for database migrations:

```hcl
# Store Liquibase configuration
resource "aws_ssm_parameter" "liquibase_config" {
  name  = "/production/database/liquibase_url"
  type  = "SecureString"
  value = "jdbc:postgresql://${aws_db_instance.production.address}:${aws_db_instance.production.port}/${aws_db_instance.production.db_name}?ssl=true&sslmode=require"
}
```

## Using CodeBuild for Schema Migrations

AWS CodeBuild can run your migrations as part of a CI/CD pipeline:

```hcl
# CodeBuild project for database migrations
resource "aws_codebuild_project" "db_migration" {
  name         = "database-migration"
  description  = "Run database schema migrations"
  service_role = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    # Pass database connection details as environment variables
    environment_variable {
      name  = "DB_HOST"
      value = aws_db_instance.production.address
    }

    environment_variable {
      name  = "DB_PORT"
      value = tostring(aws_db_instance.production.port)
    }

    environment_variable {
      name  = "DB_NAME"
      value = aws_db_instance.production.db_name
    }

    environment_variable {
      name  = "DB_USER"
      value = "/production/database/flyway_user"
      type  = "PARAMETER_STORE"
    }

    environment_variable {
      name  = "DB_PASSWORD"
      value = "/production/database/flyway_password"
      type  = "PARAMETER_STORE"
    }
  }

  source {
    type     = "GITHUB"
    location = "https://github.com/your-org/your-repo.git"

    buildspec = <<-EOT
      version: 0.2
      phases:
        install:
          commands:
            - wget -qO- https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/10.0.0/flyway-commandline-10.0.0-linux-x64.tar.gz | tar xz
            - ln -s flyway-10.0.0/flyway /usr/local/bin/flyway
        build:
          commands:
            - flyway -url="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" -user="$DB_USER" -password="$DB_PASSWORD" -locations="filesystem:./db/migrations" info
            - flyway -url="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" -user="$DB_USER" -password="$DB_PASSWORD" -locations="filesystem:./db/migrations" migrate
    EOT
  }

  vpc_config {
    vpc_id             = var.vpc_id
    subnets            = var.private_subnet_ids
    security_group_ids = [aws_security_group.codebuild_sg.id]
  }

  tags = {
    Environment = "production"
    Purpose     = "database-migration"
  }
}

# IAM role for CodeBuild
resource "aws_iam_role" "codebuild_role" {
  name = "database-migration-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name = "database-migration-policy"
  role = aws_iam_role.codebuild_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/production/database/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcs"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "ec2:CreateNetworkInterfacePermission"
        Resource = "arn:aws:ec2:*:*:network-interface/*"
      }
    ]
  })
}

# Security group for CodeBuild to access the database
resource "aws_security_group" "codebuild_sg" {
  name_prefix = "codebuild-migration-"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Purpose = "database-migration"
  }
}
```

## Using the PostgreSQL Provider for Simple Schema Changes

For simple schema operations, the Terraform PostgreSQL provider can manage some schema elements:

```hcl
# Configure PostgreSQL provider
provider "postgresql" {
  host     = aws_db_instance.production.address
  port     = aws_db_instance.production.port
  database = "appdb"
  username = "dbadmin"
  password = var.db_password
  sslmode  = "require"
}

# Create schemas
resource "postgresql_schema" "app_schema" {
  name     = "app"
  owner    = "dbadmin"
  database = "appdb"

  depends_on = [aws_db_instance.production]
}

resource "postgresql_schema" "analytics_schema" {
  name     = "analytics"
  owner    = "dbadmin"
  database = "appdb"

  depends_on = [aws_db_instance.production]
}

# Create extensions
resource "postgresql_extension" "uuid" {
  name     = "uuid-ossp"
  database = "appdb"

  depends_on = [aws_db_instance.production]
}

resource "postgresql_extension" "pg_stat_statements" {
  name     = "pg_stat_statements"
  database = "appdb"

  depends_on = [aws_db_instance.production]
}
```

## Creating a Migration Lambda Function

For automated migrations triggered by infrastructure changes:

```hcl
# Lambda function for running migrations
resource "aws_lambda_function" "db_migration" {
  function_name = "database-migration-runner"
  role          = aws_iam_role.migration_lambda_role.arn
  handler       = "index.handler"
  runtime       = "python3.12"
  timeout       = 300
  memory_size   = 512

  filename = "${path.module}/lambda/migration_runner.zip"

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.migration_lambda_sg.id]
  }

  environment {
    variables = {
      DB_HOST           = aws_db_instance.production.address
      DB_PORT           = tostring(aws_db_instance.production.port)
      DB_NAME           = aws_db_instance.production.db_name
      DB_SECRET_ARN     = aws_secretsmanager_secret.db_credentials.arn
      MIGRATIONS_BUCKET = aws_s3_bucket.migrations.id
    }
  }

  tags = {
    Environment = "production"
    Purpose     = "database-migration"
  }
}

# S3 bucket for migration files
resource "aws_s3_bucket" "migrations" {
  bucket = "database-migrations-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = "production"
    Purpose     = "schema-migrations"
  }
}

data "aws_caller_identity" "current" {}
```

## Coordinating Infrastructure and Schema Changes

The recommended workflow for coordinating Terraform and schema migrations is:

```hcl
# Step 1: Apply infrastructure changes first
# terraform apply -target=aws_db_instance.production

# Step 2: Run schema migrations
# flyway migrate

# Step 3: Apply remaining Terraform changes (if any)
# terraform apply

# For CI/CD, use a pipeline like this:
resource "aws_codepipeline" "db_pipeline" {
  name     = "database-deployment-pipeline"
  role_arn = aws_iam_role.pipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.id
    type     = "S3"
  }

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
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "your-org/your-repo"
        BranchName       = "main"
      }
    }
  }

  stage {
    name = "Infrastructure"
    action {
      name            = "TerraformApply"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ProjectName = "terraform-apply"
      }
    }
  }

  stage {
    name = "SchemaMigration"
    action {
      name            = "RunMigrations"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ProjectName = aws_codebuild_project.db_migration.name
      }
    }
  }
}
```

For monitoring your database schema migration processes, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track migration status and database health during schema changes.

## Best Practices

Keep infrastructure management (Terraform) and schema management (Flyway, Liquibase, or similar) as separate concerns. Always run schema migrations in a CI/CD pipeline, never manually. Take a snapshot before running major schema changes. Use transactional migrations when your database supports them. Test migrations in a staging environment that mirrors production. Store migration credentials in Secrets Manager, not in source code. Use forward-only migrations; avoid rollback scripts when possible. Monitor database performance during and after migrations.

## Conclusion

Database schema changes require a different tool and workflow than infrastructure changes, but the two must be coordinated carefully. By using Terraform for infrastructure and a dedicated migration tool for schemas, connected through a CI/CD pipeline, you get the best of both worlds: declarative infrastructure management and sequential schema evolution. Set up your pipeline once and every deployment will handle both infrastructure and schema changes in the right order.
