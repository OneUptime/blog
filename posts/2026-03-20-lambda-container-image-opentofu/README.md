# How to Create Lambda Functions with Container Image in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Container Image, ECR, Serverless, Infrastructure as Code

Description: Learn how to deploy AWS Lambda functions using container images stored in Amazon ECR with OpenTofu, enabling up to 10 GB deployment packages and custom runtimes.

## Introduction

Lambda container image deployment supports container images up to 10 GB in uncompressed size and supports custom runtimes or alternative base images that implement the Lambda Runtime API. This is ideal for ML model inference, complex dependencies, and standardized container-based deployments.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda, ECR, and IAM permissions
- Docker 25.0+ with the buildx plugin installed for building images

## Step 1: Create ECR Repository

```hcl
resource "aws_ecr_repository" "lambda" {
  name                 = "${var.function_name}-repo"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = { Name = "${var.function_name}-ecr" }
}

# Keep only the last 5 version-tagged images

resource "aws_ecr_lifecycle_policy" "lambda" {
  repository = aws_ecr_repository.lambda.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 version-tagged images"
      selection = {
        tagStatus   = "tagged"
        tagPrefixList = ["v"]
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}
```

## Step 2: Create the Lambda Execution Role

```hcl
resource "aws_iam_role" "lambda_container" {
  name = "${var.function_name}-container-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_container.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_container.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
```

## Step 3: Create Lambda Function from Container Image

```hcl
resource "aws_lambda_function" "container" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_container.arn

  # Use container image deployment
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.lambda.repository_url}:${var.image_tag}"
  architectures = ["x86_64"]

  # Override the CMD in the image if needed
  image_config {
    command           = ["index.handler"]       # Override CMD
    entry_point       = ["/lambda-entrypoint.sh"] # Override ENTRYPOINT
    working_directory = "/var/task"
  }

  # Adjust memory based on your workload
  memory_size = 2048
  timeout     = 120

  environment {
    variables = {
      MODEL_PATH = "/var/task/models"
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name        = var.function_name
    DeployType  = "ContainerImage"
  }
}
```

## Step 4: Sample Dockerfile

```dockerfile
# Use the AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.12

# Copy requirements and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy function code and model files
COPY src/ ${LAMBDA_TASK_ROOT}/
COPY models/ ${LAMBDA_TASK_ROOT}/models/

# Set the CMD to the Lambda handler
CMD ["index.handler"]
```

## Step 5: Build and Push Image

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build the container image for x86_64 Lambda
docker buildx build --platform linux/amd64 --provenance=false -t my-lambda-function:v1.0.0 .

# Tag and push to ECR
docker tag my-lambda-function:v1.0.0 \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-function-repo:v1.0.0

docker push \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-function-repo:v1.0.0

# Deploy with OpenTofu
tofu apply -var="image_tag=v1.0.0"
```

## Conclusion

Lambda container image deployment enables complex workloads like ML inference that require large dependencies or custom runtimes. Use ECR lifecycle policies to prevent image accumulation costs. For faster cold starts with container image functions, use provisioned concurrency. Lambda SnapStart is not supported for container images.
