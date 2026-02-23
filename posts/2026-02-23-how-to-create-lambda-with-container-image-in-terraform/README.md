# How to Create Lambda with Container Image in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Docker, Container Image, ECR, Serverless, Infrastructure as Code

Description: Learn how to deploy AWS Lambda functions using container images with Terraform, including ECR repository setup, Dockerfile configuration, and function deployment.

---

AWS Lambda traditionally uses zip-based deployment packages, but since 2020, Lambda also supports container images up to 10 GB in size. This opens up Lambda to workloads that need custom runtimes, large dependencies (like machine learning models), or existing container-based development workflows. Container image Lambda functions run the same way as zip-based functions but with more flexibility in how you package your code. This guide shows you how to deploy Lambda functions from container images using Terraform.

## Why Container Images for Lambda

Container images for Lambda solve several challenges. They support packages up to 10 GB compared to the 250 MB limit for zip deployments. You can use any programming language or runtime by building a custom image. Your local development workflow can use the same container that runs in production. Dependencies like native libraries, ML models, and binary tools are easy to include.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- Docker installed for building images
- Basic understanding of Lambda and Docker

## Creating the ECR Repository

Lambda container images must be stored in Amazon ECR in the same account and region.

```hcl
provider "aws" {
  region = "us-east-1"
}

# ECR repository for the Lambda image
resource "aws_ecr_repository" "lambda_app" {
  name                 = "lambda-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  # Lifecycle policy to clean up old images
  lifecycle_policy_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })

  tags = {
    Name = "lambda-app"
  }
}

# ECR lifecycle policy (alternative method)
resource "aws_ecr_lifecycle_policy" "lambda_app" {
  repository = aws_ecr_repository.lambda_app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

## Building and Pushing the Container Image

Here is an example Dockerfile for a Node.js Lambda function using the AWS-provided base image.

```dockerfile
# Use the official AWS Lambda Node.js base image
FROM public.ecr.aws/lambda/nodejs:20

# Copy package files and install dependencies
COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --only=production

# Copy function code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Set the handler
CMD ["src/index.handler"]
```

For Python with custom dependencies:

```dockerfile
# Python Lambda with ML dependencies
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies
RUN yum install -y gcc gcc-c++ make

# Copy and install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy function code
COPY app/ ${LAMBDA_TASK_ROOT}/app/

CMD ["app.handler.lambda_handler"]
```

Use a null resource to build and push the image:

```hcl
# Build and push the Docker image to ECR
resource "null_resource" "docker_build" {
  triggers = {
    # Rebuild when source files change
    source_hash = sha256(join("", [
      filesha256("${path.module}/app/Dockerfile"),
      filesha256("${path.module}/app/package.json"),
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Authenticate with ECR
      aws ecr get-login-password --region us-east-1 | \
        docker login --username AWS --password-stdin ${aws_ecr_repository.lambda_app.repository_url}

      # Build the image
      docker build -t ${aws_ecr_repository.lambda_app.repository_url}:${var.image_tag} \
        ${path.module}/app/

      # Push to ECR
      docker push ${aws_ecr_repository.lambda_app.repository_url}:${var.image_tag}
    EOT
  }
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}
```

## IAM Role for Lambda

```hcl
# Lambda execution role
resource "aws_iam_role" "lambda" {
  name = "lambda-container-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Basic Lambda execution permissions (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access if running in a VPC
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom permissions for the Lambda function
resource "aws_iam_role_policy" "lambda_custom" {
  name = "lambda-custom-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-data-bucket/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/my-table"
      }
    ]
  })
}
```

## Lambda Function with Container Image

```hcl
# Lambda function using container image
resource "aws_lambda_function" "app" {
  function_name = "container-app"
  role          = aws_iam_role.lambda.arn

  # Use container image instead of zip
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.lambda_app.repository_url}:${var.image_tag}"

  # Override the image CMD (optional)
  image_config {
    command           = ["src/index.handler"]
    entry_point       = []
    working_directory = "/var/task"
  }

  # Function configuration
  timeout     = 60
  memory_size = 1024

  # Environment variables
  environment {
    variables = {
      ENVIRONMENT  = "production"
      TABLE_NAME   = "my-table"
      BUCKET_NAME  = "my-data-bucket"
      LOG_LEVEL    = "info"
    }
  }

  # VPC configuration (optional)
  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Tracing
  tracing_config {
    mode = "Active"
  }

  tags = {
    Name        = "container-app"
    Environment = "production"
  }

  depends_on = [null_resource.docker_build]
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

resource "aws_security_group" "lambda" {
  name_prefix = "lambda-"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Lambda with Custom Runtime

Container images let you use any runtime. Here is an example with a Go custom runtime:

```hcl
# Lambda function with custom Go runtime
resource "aws_lambda_function" "go_app" {
  function_name = "go-container-app"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.lambda_app.repository_url}:go-${var.image_tag}"

  # For custom runtimes, the entry point is the binary
  image_config {
    entry_point = ["/main"]
    command     = []
  }

  timeout     = 30
  memory_size = 256

  architectures = ["arm64"]  # Use ARM for cost savings

  environment {
    variables = {
      ENVIRONMENT = "production"
    }
  }

  tags = {
    Name    = "go-container-app"
    Runtime = "go"
  }
}
```

## API Gateway Integration

Connect the Lambda function to an API Gateway.

```hcl
# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "container-lambda-api"
  protocol_type = "HTTP"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# API Gateway integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.app.invoke_arn
  payload_format_version = "2.0"
}

# Default route
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}
```

## Outputs

```hcl
output "function_name" {
  value = aws_lambda_function.app.function_name
}

output "function_arn" {
  value = aws_lambda_function.app.arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.lambda_app.repository_url
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}
```

## Best Practices

When using container images for Lambda, start from the AWS-provided base images for the best cold start performance. Keep your images as small as possible by using multi-stage builds. Use ARM64 architecture for cost savings when your dependencies support it. Pin your base image versions for reproducible builds. Enable ECR image scanning to catch vulnerabilities. Use the `image_config` block to override CMD for different environments without rebuilding the image.

## Monitoring with OneUptime

Lambda cold starts can be longer with container images. Use [OneUptime](https://oneuptime.com) to monitor your Lambda function performance, track cold start duration, and set up alerts for invocation errors and timeouts.

## Conclusion

Container images for Lambda give you the flexibility of Docker with the serverless scaling of Lambda. Terraform makes it easy to manage the entire deployment pipeline from ECR repositories to Lambda functions to API Gateway integrations. Whether you need large dependency packages, custom runtimes, or a unified container-based workflow, container image Lambda functions are a powerful option.

For more Lambda topics, check out our guides on [Lambda with provisioned concurrency](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-provisioned-concurrency-in-terraform/view) and [Lambda with dead letter queues](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-dead-letter-queue-in-terraform/view).
