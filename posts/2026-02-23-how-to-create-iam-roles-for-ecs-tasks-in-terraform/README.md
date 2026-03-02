# How to Create IAM Roles for ECS Tasks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, ECS, Container, Infrastructure as Code

Description: Learn how to create IAM task roles and execution roles for Amazon ECS tasks in Terraform, including secrets access, logging, and ECR permissions.

---

Amazon Elastic Container Service (ECS) uses two distinct IAM roles for running containerized applications: the task execution role and the task role. Understanding the difference between these roles and configuring them correctly is essential for running secure, functional ECS workloads. Terraform lets you define both roles alongside your ECS task definitions, keeping your infrastructure as code consistent and auditable.

This guide explains both ECS role types, shows you how to create them with Terraform, and covers common patterns for accessing AWS services from ECS tasks.

## Understanding ECS IAM Roles

ECS has two role types that serve different purposes:

### Task Execution Role
The task execution role is used by the ECS agent itself, not by your application code. It grants permissions for operations that happen before and during container startup, such as pulling container images from ECR, retrieving secrets from Secrets Manager or SSM Parameter Store, and sending container logs to CloudWatch.

### Task Role
The task role is assumed by your application containers at runtime. It grants permissions for the AWS API calls your application code makes, such as reading from S3, writing to DynamoDB, or sending messages to SQS.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with ECS and IAM permissions
- AWS CLI configured with valid credentials
- Basic familiarity with ECS concepts

## Creating the Task Execution Role

The task execution role is required for Fargate launch type and optional (but recommended) for EC2 launch type.

```hcl
# Trust policy for ECS tasks
data "aws_iam_policy_document" "ecs_task_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# Create the task execution role
resource "aws_iam_role" "ecs_execution" {
  name               = "ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_trust.json

  tags = {
    Service   = "ecs"
    ManagedBy = "terraform"
  }
}

# Attach the AWS managed execution role policy
resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
```

The `AmazonECSTaskExecutionRolePolicy` managed policy provides permissions to pull images from ECR and write logs to CloudWatch.

## Adding Secrets Access to the Execution Role

If your ECS task definition references secrets from AWS Secrets Manager or SSM Parameter Store, the execution role needs additional permissions.

```hcl
# Additional policy for accessing secrets during container startup
resource "aws_iam_policy" "ecs_execution_secrets" {
  name        = "ecs-execution-secrets-access"
  description = "Allow ECS execution role to retrieve secrets for container environment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Read secrets from Secrets Manager
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = [
          "arn:aws:secretsmanager:us-east-1:*:secret:app/production/*",
        ]
      },
      {
        # Read parameters from SSM Parameter Store
        Sid    = "SSMParameterAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter",
        ]
        Resource = [
          "arn:aws:ssm:us-east-1:*:parameter/app/production/*",
        ]
      },
      {
        # Decrypt secrets using KMS
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
        ]
        Resource = [
          "arn:aws:kms:us-east-1:*:key/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = aws_iam_policy.ecs_execution_secrets.arn
}
```

## Creating the Task Role

The task role grants your application containers access to AWS services.

```hcl
# Create the task role (uses the same trust policy as execution role)
resource "aws_iam_role" "ecs_task" {
  name               = "ecs-app-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_trust.json

  tags = {
    Service   = "ecs"
    ManagedBy = "terraform"
  }
}

# Application-specific permissions
resource "aws_iam_policy" "ecs_task_policy" {
  name        = "ecs-app-task-policy"
  description = "Permissions for the ECS application containers"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3 access for the application
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::app-data-bucket",
          "arn:aws:s3:::app-data-bucket/*",
        ]
      },
      {
        # DynamoDB access
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
        ]
        Resource = [
          "arn:aws:dynamodb:us-east-1:*:table/app-*",
        ]
      },
      {
        # SQS access for message processing
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ]
        Resource = [
          "arn:aws:sqs:us-east-1:*:app-*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task_policy.arn
}
```

## Using Both Roles in a Task Definition

Here is how to reference both roles in an ECS task definition.

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  # The execution role handles ECR pulls, secrets, and logging
  execution_role_arn = aws_iam_role.ecs_execution.arn

  # The task role is what your application code uses
  task_role_arn = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest"
      portMappings = [{
        containerPort = 8080
        protocol      = "tcp"
      }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/app"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "arn:aws:secretsmanager:us-east-1:123456789012:secret:app/production/db-password"
        }
      ]
    }
  ])
}
```

## Creating Roles for Multiple ECS Services

When you run multiple ECS services, each should have its own task role with appropriate permissions.

```hcl
variable "ecs_services" {
  description = "Map of ECS services and their required permissions"
  type = map(object({
    s3_buckets    = list(string)
    sqs_queues    = list(string)
    dynamo_tables = list(string)
  }))
  default = {
    api = {
      s3_buckets    = ["api-uploads"]
      sqs_queues    = ["api-events"]
      dynamo_tables = ["api-sessions"]
    }
    worker = {
      s3_buckets    = ["worker-output"]
      sqs_queues    = ["worker-jobs", "worker-results"]
      dynamo_tables = ["worker-state"]
    }
  }
}

# Create a task role per service
resource "aws_iam_role" "service_task_roles" {
  for_each = var.ecs_services

  name               = "ecs-${each.key}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_trust.json

  tags = {
    Service = each.key
  }
}

# Create custom policies per service
resource "aws_iam_policy" "service_policies" {
  for_each = var.ecs_services

  name = "ecs-${each.key}-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      # S3 permissions
      length(each.value.s3_buckets) > 0 ? [{
        Sid    = "S3Access"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = flatten([
          for bucket in each.value.s3_buckets : [
            "arn:aws:s3:::${bucket}",
            "arn:aws:s3:::${bucket}/*",
          ]
        ])
      }] : [],
      # SQS permissions
      length(each.value.sqs_queues) > 0 ? [{
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
        Resource = [
          for queue in each.value.sqs_queues :
          "arn:aws:sqs:us-east-1:*:${queue}"
        ]
      }] : [],
      # DynamoDB permissions
      length(each.value.dynamo_tables) > 0 ? [{
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
        Resource = [
          for table in each.value.dynamo_tables :
          "arn:aws:dynamodb:us-east-1:*:table/${table}"
        ]
      }] : [],
    )
  })
}

# Attach policies to their respective roles
resource "aws_iam_role_policy_attachment" "service_policies" {
  for_each = var.ecs_services

  role       = aws_iam_role.service_task_roles[each.key].name
  policy_arn = aws_iam_policy.service_policies[each.key].arn
}
```

## Enabling ECS Exec for Debugging

ECS Exec lets you run commands inside a running container. The task role needs additional permissions for this.

```hcl
# Additional policy for ECS Exec
resource "aws_iam_policy" "ecs_exec" {
  name = "ecs-exec-permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel",
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_exec" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_exec.arn
}
```

## Best Practices

1. **Separate execution and task roles.** Never combine these into a single role. They serve different purposes and should have different permissions.

2. **One task role per service.** Each ECS service should have its own task role. Sharing roles leads to overly broad permissions.

3. **Scope the execution role tightly.** Only allow access to the specific ECR repositories, secrets, and log groups your tasks need.

4. **Use resource-level permissions.** Avoid `"Resource": "*"` whenever possible. Specify exact ARNs for S3 buckets, DynamoDB tables, and other resources.

5. **Enable ECS Exec only when needed.** The SSM permissions required for ECS Exec should only be added to roles that need debugging access.

For related topics, see [How to Create IAM Roles for EC2 Instances in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-ec2-instances-in-terraform/view) and [How to Create IAM Roles for EKS Service Accounts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-eks-service-accounts-in-terraform/view).

## Conclusion

Properly configuring IAM roles for ECS tasks is fundamental to running secure containerized applications on AWS. The task execution role handles infrastructure concerns like image pulling and secret retrieval, while the task role handles application-level access to AWS services. By using Terraform to manage these roles, you can maintain tight security controls, version your permission changes, and ensure consistency across environments. Always follow the principle of least privilege, and give each ECS service its own dedicated task role.
