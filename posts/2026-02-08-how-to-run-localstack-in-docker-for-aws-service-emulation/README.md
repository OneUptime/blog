# How to Run LocalStack in Docker for AWS Service Emulation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, LocalStack, AWS, Cloud Emulation, Testing, Development, Docker Compose

Description: Set up LocalStack in Docker to emulate AWS services locally for development and integration testing

---

LocalStack emulates AWS cloud services on your local machine. It provides functional implementations of S3, DynamoDB, SQS, SNS, Lambda, API Gateway, and many other AWS services. This means you can develop and test AWS applications without an internet connection, without an AWS account, and without incurring any costs. Docker is the standard way to run LocalStack, and the setup takes less than a minute.

This guide covers deploying LocalStack in Docker, using it with the AWS CLI and SDKs, testing Lambda functions locally, and integrating it into CI/CD pipelines.

## Quick Start

Get LocalStack running with one command:

```bash
# Start LocalStack with the most common AWS services
docker run -d \
  --name localstack \
  -p 4566:4566 \
  -p 4510-4559:4510-4559 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v localstack-data:/var/lib/localstack \
  localstack/localstack:latest
```

Port 4566 is the edge port that handles all AWS service requests. The Docker socket mount is needed for Lambda execution, which runs Lambda functions inside separate containers.

Verify LocalStack is running:

```bash
# Check LocalStack health
curl http://localhost:4566/_localstack/health | python3 -m json.tool
```

## Docker Compose Setup

For a more manageable configuration:

```yaml
# docker-compose.yml - LocalStack with persistent storage
version: "3.8"

services:
  localstack:
    image: localstack/localstack:latest
    container_name: localstack
    ports:
      - "4566:4566"
      - "4510-4559:4510-4559"
    environment:
      # Enable specific services (optional, all enabled by default)
      - SERVICES=s3,sqs,sns,dynamodb,lambda,apigateway,iam,secretsmanager
      # Enable debug logging
      - DEBUG=0
      # Lambda executor type
      - LAMBDA_EXECUTOR=docker
      # Persist data across restarts
      - PERSISTENCE=1
      # Default region
      - DEFAULT_REGION=us-east-1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - localstack-data:/var/lib/localstack
      # Mount initialization scripts
      - ./init-scripts:/etc/localstack/init/ready.d
    restart: unless-stopped

volumes:
  localstack-data:
```

Start it:

```bash
# Launch LocalStack
docker compose up -d
```

## Configuring the AWS CLI

Point the AWS CLI at LocalStack:

```bash
# Configure a LocalStack profile
aws configure --profile localstack
# Access Key: test
# Secret Key: test
# Region: us-east-1
# Output: json

# Create an alias for convenience
alias awslocal="aws --endpoint-url=http://localhost:4566 --profile localstack"
```

Alternatively, install the `awslocal` wrapper:

```bash
# Install the LocalStack AWS CLI wrapper
pip install awscli-local

# Now use awslocal instead of aws - it automatically points to LocalStack
awslocal s3 mb s3://my-bucket
```

## Working with S3

Create buckets and upload files just like you would with real S3:

```bash
# Create an S3 bucket
awslocal s3 mb s3://my-app-data

# Upload a file
awslocal s3 cp ./data.json s3://my-app-data/data.json

# List bucket contents
awslocal s3 ls s3://my-app-data/

# Download a file
awslocal s3 cp s3://my-app-data/data.json ./downloaded.json

# Enable versioning on a bucket
awslocal s3api put-bucket-versioning \
  --bucket my-app-data \
  --versioning-configuration Status=Enabled
```

## Working with DynamoDB

Create tables and perform CRUD operations:

```bash
# Create a DynamoDB table
awslocal dynamodb create-table \
  --table-name Users \
  --key-schema AttributeName=userId,KeyType=HASH \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --billing-mode PAY_PER_REQUEST

# Insert an item
awslocal dynamodb put-item \
  --table-name Users \
  --item '{"userId": {"S": "user-1"}, "name": {"S": "Alice"}, "email": {"S": "alice@example.com"}}'

# Query an item
awslocal dynamodb get-item \
  --table-name Users \
  --key '{"userId": {"S": "user-1"}}'
```

## Working with SQS and SNS

Set up a message queue with a notification topic:

```bash
# Create an SQS queue
awslocal sqs create-queue --queue-name order-processing

# Create an SNS topic
awslocal sns create-topic --name order-events

# Subscribe the SQS queue to the SNS topic
QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/order-processing \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:000000000000:order-events \
  --protocol sqs \
  --notification-endpoint $QUEUE_ARN

# Publish a message to the topic
awslocal sns publish \
  --topic-arn arn:aws:sns:us-east-1:000000000000:order-events \
  --message '{"orderId": "123", "status": "created"}'

# Receive the message from the queue
awslocal sqs receive-message \
  --queue-url http://localhost:4566/000000000000/order-processing
```

## Deploying Lambda Functions

Test Lambda functions locally:

```python
# handler.py - simple Lambda function
import json

def handler(event, context):
    """Process incoming events and return a response."""
    name = event.get("name", "World")
    return {
        "statusCode": 200,
        "body": json.dumps({"message": f"Hello, {name}!"})
    }
```

Deploy it to LocalStack:

```bash
# Package the Lambda function
zip function.zip handler.py

# Create the Lambda function
awslocal lambda create-function \
  --function-name hello-function \
  --runtime python3.12 \
  --handler handler.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::000000000000:role/lambda-role

# Invoke the function
awslocal lambda invoke \
  --function-name hello-function \
  --payload '{"name": "LocalStack"}' \
  output.json

# Check the output
cat output.json
```

## Using with Python (boto3)

```python
# app.py - Python application using LocalStack
import boto3

# Create clients pointing at LocalStack
s3 = boto3.client("s3", endpoint_url="http://localhost:4566",
                   aws_access_key_id="test", aws_secret_access_key="test",
                   region_name="us-east-1")

dynamodb = boto3.resource("dynamodb", endpoint_url="http://localhost:4566",
                          aws_access_key_id="test", aws_secret_access_key="test",
                          region_name="us-east-1")

sqs = boto3.client("sqs", endpoint_url="http://localhost:4566",
                    aws_access_key_id="test", aws_secret_access_key="test",
                    region_name="us-east-1")

# Use them exactly like real AWS services
s3.create_bucket(Bucket="test-bucket")
s3.put_object(Bucket="test-bucket", Key="test.txt", Body=b"Hello!")

table = dynamodb.Table("Users")
table.put_item(Item={"userId": "u1", "name": "Bob"})
```

## Initialization Scripts

Automatically set up resources when LocalStack starts by placing scripts in the init directory:

```bash
#!/bin/bash
# init-scripts/setup.sh - runs automatically when LocalStack is ready

# Create S3 buckets
awslocal s3 mb s3://app-uploads
awslocal s3 mb s3://app-backups

# Create DynamoDB tables
awslocal dynamodb create-table \
  --table-name Sessions \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --attribute-definitions AttributeName=sessionId,AttributeType=S \
  --billing-mode PAY_PER_REQUEST

# Create SQS queues
awslocal sqs create-queue --queue-name email-queue
awslocal sqs create-queue --queue-name notification-queue

echo "LocalStack initialization complete"
```

Make the script executable:

```bash
chmod +x init-scripts/setup.sh
```

## CI/CD Integration

Use LocalStack in GitHub Actions for integration testing:

```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      localstack:
        image: localstack/localstack:latest
        ports:
          - 4566:4566
        env:
          SERVICES: s3,dynamodb,sqs
    steps:
      - uses: actions/checkout@v4
      - name: Wait for LocalStack
        run: |
          pip install awscli-local
          timeout 30 bash -c 'until awslocal s3 ls; do sleep 2; done'
      - name: Run integration tests
        env:
          AWS_ENDPOINT_URL: http://localhost:4566
        run: pytest tests/integration/
```

## Conclusion

LocalStack in Docker gives you a complete AWS environment on your laptop. It speeds up development by removing the feedback loop of deploying to real AWS, and it makes integration tests fast and free. The initialization scripts ensure every developer starts with the same resource setup, and CI/CD integration catches AWS-specific issues before they reach production. Start by emulating the services your application uses most, write integration tests against LocalStack, and use the persistence feature to maintain state across container restarts during development.
