# How to Configure ECS Task Execution Roles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, IAM, Security, Containers

Description: A practical guide to configuring ECS task execution roles, which control how ECS pulls images, fetches secrets, and writes logs on behalf of your tasks.

---

The ECS task execution role is one of those things you set up once and then forget about - until something breaks. It's the role that the ECS agent uses behind the scenes to prepare your task for launch. Pulling container images from ECR, injecting secrets from Secrets Manager, writing logs to CloudWatch - all of that happens through the execution role.

If you've ever seen a task fail with "CannotPullContainerError" or "ResourceInitializationError," there's a good chance the execution role is misconfigured. Let's fix that.

## What the Execution Role Does

The execution role is NOT the role your application uses at runtime. That's the task role (see our post on [configuring ECS task IAM roles](https://oneuptime.com/blog/post/configure-ecs-task-iam-roles/view)). The execution role handles the infrastructure-level operations that happen before and during task lifecycle management:

1. **Pulling container images** from ECR
2. **Fetching secrets** from Secrets Manager or SSM Parameter Store
3. **Writing container logs** to CloudWatch Logs
4. **Fetching environment files** from S3
5. **Authenticating** with private registries (Docker Hub, etc.)

Think of it this way: the execution role is for ECS, the task role is for your code.

## Creating the Execution Role

AWS provides a managed policy called `AmazonECSTaskExecutionRolePolicy` that covers the basics. For many teams, this plus a few custom additions is all you need.

```hcl
# Terraform - Create the execution role
resource "aws_iam_role" "ecs_execution" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach the AWS managed policy
resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
```

The managed policy grants these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

That covers ECR image pulls and CloudWatch log writing. But if you're using secrets or S3 env files, you need more.

## Adding Secrets Manager Access

If your task definitions reference secrets from Secrets Manager, the execution role needs `GetSecretValue` permission.

```hcl
# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-manager-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:us-east-1:123456789:secret:production/*"
        ]
      }
    ]
  })
}
```

Scope the resource to specific secret paths. Don't use `*` - it defeats the purpose of having separate secrets for different environments.

## Adding SSM Parameter Store Access

For parameters stored in SSM, you need `GetParameters` permission.

```hcl
# Additional policy for SSM Parameter Store access
resource "aws_iam_role_policy" "ssm_access" {
  name = "ssm-parameter-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:us-east-1:123456789:parameter/production/*"
        ]
      }
    ]
  })
}
```

If your SSM parameters are encrypted with a custom KMS key, add decrypt permission too.

```hcl
resource "aws_iam_role_policy" "kms_decrypt" {
  name = "kms-decrypt-for-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = [aws_kms_key.secrets.arn]
      }
    ]
  })
}
```

## Adding S3 Environment File Access

If you use `environmentFiles` to load env vars from S3, the execution role needs S3 read access.

```hcl
resource "aws_iam_role_policy" "s3_envfile" {
  name = "s3-envfile-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = [
          "arn:aws:s3:::my-config-bucket/envfiles/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["s3:GetBucketLocation"]
        Resource = ["arn:aws:s3:::my-config-bucket"]
      }
    ]
  })
}
```

## Private Registry Authentication

If you pull images from Docker Hub or another private registry, the execution role needs access to the credentials stored in Secrets Manager.

```bash
# Store Docker Hub credentials in Secrets Manager
aws secretsmanager create-secret \
  --name production/dockerhub-credentials \
  --secret-string '{"username":"myuser","password":"mytoken"}'
```

Reference it in your task definition.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "myorg/myapp:latest",
      "repositoryCredentials": {
        "credentialsParameter": "arn:aws:secretsmanager:us-east-1:123456789:secret:production/dockerhub-credentials-AbCdEf"
      }
    }
  ]
}
```

The execution role needs permission to read that specific secret.

## CloudFormation Example

Here's a complete CloudFormation template for an execution role with all the common permissions.

```yaml
Resources:
  ECSExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ecsTaskExecutionRole
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      Policies:
        - PolicyName: SecretsAndParameters
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource:
                  - !Sub "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:production/*"
              - Effect: Allow
                Action:
                  - ssm:GetParameters
                Resource:
                  - !Sub "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/production/*"
              - Effect: Allow
                Action:
                  - kms:Decrypt
                Resource:
                  - !GetAtt SecretsKMSKey.Arn
```

## Shared vs. Per-Service Execution Roles

A common question is whether to use one execution role for all services or create separate ones. Here's my take:

**One shared execution role** works fine when:
- All services pull from the same ECR repos
- All services access the same secret paths
- You have a small number of services

**Separate execution roles** make sense when:
- Services are in different environments (dev vs. prod)
- Different teams own different services
- You want strict isolation of secret access
- Compliance requires least-privilege per service

```hcl
# Per-service execution role pattern
resource "aws_iam_role" "api_execution" {
  name               = "api-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role" "worker_execution" {
  name               = "worker-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# API execution role can only access API secrets
resource "aws_iam_role_policy" "api_secrets" {
  role = aws_iam_role.api_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = ["arn:aws:secretsmanager:*:*:secret:production/api/*"]
    }]
  })
}

# Worker execution role can only access worker secrets
resource "aws_iam_role_policy" "worker_secrets" {
  role = aws_iam_role.worker_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = ["arn:aws:secretsmanager:*:*:secret:production/worker/*"]
    }]
  })
}
```

## Troubleshooting

**CannotPullContainerError**: The execution role can't access ECR. Check that the managed policy is attached and that the ECR repository policy allows access from your account.

```bash
# Verify the execution role has the right policies
aws iam list-attached-role-policies --role-name ecsTaskExecutionRole
aws iam list-role-policies --role-name ecsTaskExecutionRole
```

**ResourceInitializationError referencing secrets**: The execution role can't read a secret or parameter. Double-check the ARN in your task definition matches the actual resource ARN, and that the execution role policy covers that ARN.

**Log group errors**: Make sure the CloudWatch log group exists before the task starts. The execution role can create log streams but not log groups (with the managed policy). Either create the log group in Terraform/CloudFormation or add `logs:CreateLogGroup` to the policy.

```hcl
# Create the log group so tasks don't fail
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/web-app"
  retention_in_days = 30
}
```

The execution role is the foundation of your ECS task's ability to start successfully. Get it right once, and your deployments will be smooth. Get it wrong, and you'll spend hours staring at cryptic error messages in the ECS console.
