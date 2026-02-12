# How to Mount EFS on Lambda Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Lambda, Serverless, Storage

Description: Learn how to attach Amazon EFS file systems to AWS Lambda functions for shared persistent storage, large file processing, and ML model loading.

---

Lambda functions are stateless by nature. Each invocation starts fresh, and when it ends, any files you wrote to `/tmp` are gone (or might be reused if the execution environment is warm, but you can't rely on that). The `/tmp` directory also has a size limit - 10 GB as of recent updates, but that's still not enough for many use cases.

EFS support for Lambda changes the game. You can mount an EFS file system on your Lambda function, giving it access to a virtually unlimited, persistent, shared file system. Multiple Lambda functions (or even Lambda alongside EC2 and Fargate) can read from and write to the same file system simultaneously.

## Why Mount EFS on Lambda?

Common use cases include:

- **ML model loading**: Store large models (sometimes several gigabytes) on EFS instead of packaging them in the Lambda deployment or downloading from S3 on every cold start
- **Large file processing**: Process files that exceed the `/tmp` limit
- **Shared state**: Multiple Lambda functions sharing data through the file system
- **Data pipelines**: Lambda functions writing intermediate results that other functions pick up
- **Legacy code migration**: Applications that expect a traditional file system

## Prerequisites

Your Lambda function must be configured to run inside a VPC. That's because EFS mount targets are VPC resources, and Lambda needs to be in the same VPC to reach them.

You'll need:

1. A VPC with private subnets (Lambda functions in a VPC don't get public IPs by default)
2. An EFS file system with mount targets in those subnets
3. Security groups that allow NFS traffic between Lambda and EFS
4. NAT Gateway or VPC endpoints if your Lambda needs internet access or AWS service access

If you haven't created an EFS file system yet, check out [creating an Amazon EFS file system](https://oneuptime.com/blog/post/amazon-efs-file-system/view).

## Setting Up the Security Group

Create a security group for your Lambda function if you don't have one:

```bash
# Security group for Lambda function
LAMBDA_SG=$(aws ec2 create-security-group \
  --group-name "lambda-efs-sg" \
  --description "Security group for Lambda functions with EFS" \
  --vpc-id "vpc-0abc123" \
  --query "GroupId" \
  --output text)

# Allow outbound NFS to the EFS security group
aws ec2 authorize-security-group-egress \
  --group-id "$LAMBDA_SG" \
  --protocol tcp \
  --port 2049 \
  --source-group "sg-0efs-mount-target"

# Update EFS mount target SG to allow inbound from Lambda
aws ec2 authorize-security-group-ingress \
  --group-id "sg-0efs-mount-target" \
  --protocol tcp \
  --port 2049 \
  --source-group "$LAMBDA_SG"
```

## Creating an Access Point

Lambda requires an EFS access point - you can't mount the root of the file system directly. Access points also give you control over the POSIX user identity and root directory.

```bash
# Create an access point for the Lambda function
AP_ID=$(aws efs create-access-point \
  --file-system-id "fs-0abc123def456789" \
  --posix-user "Uid=1000,Gid=1000" \
  --root-directory "Path=/lambda-data,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" \
  --tags "Key=Name,Value=lambda-data-ap" \
  --query "AccessPointId" \
  --output text)

echo "Access Point: $AP_ID"
```

The `root-directory` path will be created automatically if it doesn't exist, with the permissions you specify.

## Configuring the Lambda Function

Here's how to create a Lambda function with EFS mounted:

```bash
# Create the Lambda function with VPC and EFS configuration
aws lambda create-function \
  --function-name "file-processor" \
  --runtime "python3.12" \
  --handler "index.handler" \
  --role "arn:aws:iam::123456789012:role/lambda-efs-role" \
  --zip-file "fileb://function.zip" \
  --vpc-config "SubnetIds=subnet-0aaa111,subnet-0bbb222,SecurityGroupIds=$LAMBDA_SG" \
  --file-system-configs "[{\"Arn\":\"arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/$AP_ID\",\"LocalMountPath\":\"/mnt/data\"}]" \
  --memory-size 1024 \
  --timeout 60
```

If you're updating an existing function:

```bash
# Add EFS to an existing function
aws lambda update-function-configuration \
  --function-name "file-processor" \
  --vpc-config "SubnetIds=subnet-0aaa111,subnet-0bbb222,SecurityGroupIds=$LAMBDA_SG" \
  --file-system-configs "[{\"Arn\":\"arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/$AP_ID\",\"LocalMountPath\":\"/mnt/data\"}]"
```

The `LocalMountPath` must start with `/mnt/` - that's a Lambda requirement.

## The Lambda Function Code

Inside your Lambda function, the EFS mount point is just a regular directory. You can read and write files normally.

Here's a Python example that processes files from EFS:

```python
import os
import json

EFS_PATH = '/mnt/data'

def handler(event, context):
    """Process files from EFS and write results back."""

    # List files in the EFS directory
    files = os.listdir(EFS_PATH)
    print(f"Found {len(files)} files in EFS")

    # Read a configuration file from EFS
    config_path = os.path.join(EFS_PATH, 'config.json')
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = json.load(f)
        print(f"Loaded config: {config}")

    # Process input and write results to EFS
    input_file = event.get('input_file', '')
    if input_file:
        input_path = os.path.join(EFS_PATH, 'input', input_file)
        output_path = os.path.join(EFS_PATH, 'output', input_file)

        # Ensure output directory exists
        os.makedirs(os.path.join(EFS_PATH, 'output'), exist_ok=True)

        with open(input_path, 'r') as f:
            data = f.read()

        # Do some processing
        result = data.upper()  # Simple example

        with open(output_path, 'w') as f:
            f.write(result)

        return {
            'statusCode': 200,
            'body': f'Processed {input_file}, output written to EFS'
        }

    return {
        'statusCode': 200,
        'body': f'No input file specified. {len(files)} files on EFS.'
    }
```

## ML Model Loading Example

One of the best use cases is loading ML models. Here's a pattern for loading a large model from EFS:

```python
import os
import json

MODEL_PATH = '/mnt/models/sentiment-model'
model = None

def load_model():
    """Load the model once and cache it in memory."""
    global model
    if model is None:
        # This import is expensive, only do it once
        import torch
        model_file = os.path.join(MODEL_PATH, 'model.pt')
        print(f"Loading model from {model_file}")
        print(f"Model size: {os.path.getsize(model_file) / 1024 / 1024:.1f} MB")
        model = torch.load(model_file)
        model.eval()
        print("Model loaded successfully")
    return model

def handler(event, context):
    """Run inference using the model from EFS."""
    m = load_model()

    text = event.get('text', '')
    if not text:
        return {'statusCode': 400, 'body': 'No text provided'}

    # Run inference
    # (actual inference code depends on your model)
    result = m.predict(text)

    return {
        'statusCode': 200,
        'body': json.dumps({'prediction': result})
    }
```

The model loads from EFS on the first invocation (cold start) and stays in memory for subsequent warm invocations. This is much faster than downloading from S3 every time.

## IAM Permissions

The Lambda execution role needs permission to mount the EFS access point:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-0abc123def456789",
      "Condition": {
        "StringEquals": {
          "elasticfilesystem:AccessPointArn": "arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-0abc123"
        }
      }
    }
  ]
}
```

The role also needs VPC permissions (usually provided by the `AWSLambdaVPCAccessExecutionRole` managed policy):

```json
{
  "Effect": "Allow",
  "Action": [
    "ec2:CreateNetworkInterface",
    "ec2:DescribeNetworkInterfaces",
    "ec2:DeleteNetworkInterface"
  ],
  "Resource": "*"
}
```

## Terraform Configuration

Here's the Terraform setup:

```hcl
resource "aws_efs_access_point" "lambda" {
  file_system_id = aws_efs_file_system.main.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/lambda-data"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name = "lambda-access-point"
  }
}

resource "aws_lambda_function" "processor" {
  function_name = "file-processor"
  runtime       = "python3.12"
  handler       = "index.handler"
  role          = aws_iam_role.lambda.arn
  filename      = "function.zip"
  memory_size   = 1024
  timeout       = 60

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  file_system_config {
    arn              = aws_efs_access_point.lambda.arn
    local_mount_path = "/mnt/data"
  }

  depends_on = [aws_efs_mount_target.mount]
}
```

## Performance Tips

**Cold start impact**: Adding EFS to a VPC-attached Lambda function adds a small amount to cold start time (usually 1-3 seconds for the EFS mount). Warm invocations are not affected.

**Throughput**: Each Lambda function instance gets its own NFS connection. If you have many concurrent invocations, EFS throughput scales well. But watch your burst credits if you're on bursting throughput mode.

**Caching**: Load data from EFS into memory during initialization (outside the handler function) and reuse it across warm invocations. This is the pattern shown in the ML model example above.

**Connection limits**: EFS supports up to 25,000 concurrent NFS connections. If you have Lambda functions with thousands of concurrent executions, make sure you're not hitting this limit.

## Troubleshooting

**Function times out on first invocation**: The EFS mount happens during cold start. If it takes too long, increase your function timeout. Also verify security group rules allow NFS traffic.

**EFSMountFailureException**: Check that the access point exists, the Lambda function's subnets have EFS mount targets, and security groups are correct.

**Read-only file system errors**: Make sure the Lambda role has `elasticfilesystem:ClientWrite` permission and that the access point's POSIX user matches the file ownership.

## Wrapping Up

EFS on Lambda opens up a whole category of workloads that previously required EC2 or containers. The setup requires a VPC-attached Lambda, an EFS access point, and the right security group and IAM configuration. Once connected, your Lambda function has a persistent, shared file system that works just like a local directory - and that's a powerful thing for serverless architectures.
