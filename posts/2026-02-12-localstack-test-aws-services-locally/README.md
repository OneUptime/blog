# How to Use LocalStack to Test AWS Services Locally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, LocalStack, Testing, Docker

Description: Learn how to set up and use LocalStack to test AWS services locally without incurring costs, covering S3, DynamoDB, Lambda, SQS, and integration with popular SDKs.

---

Testing against real AWS services during development is slow, expensive, and risks messing up shared environments. LocalStack solves this by emulating AWS services on your local machine. You get S3, DynamoDB, Lambda, SQS, SNS, and many more services running in a Docker container, completely free for the core features. Let's set it up and see how to test effectively.

## Getting Started with Docker

The fastest way to run LocalStack is through Docker.

```bash
# Pull and run LocalStack
docker run -d \
  --name localstack \
  -p 4566:4566 \
  -p 4510-4559:4510-4559 \
  -e SERVICES=s3,dynamodb,lambda,sqs,sns \
  -e DEBUG=1 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  localstack/localstack
```

Or use Docker Compose for a more maintainable setup.

```yaml
# docker-compose.yml
version: '3.8'

services:
  localstack:
    image: localstack/localstack
    ports:
      - "4566:4566"
      - "4510-4559:4510-4559"
    environment:
      - SERVICES=s3,dynamodb,lambda,sqs,sns,ses
      - DEBUG=1
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - "./localstack-data:/var/lib/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

Start it with `docker-compose up -d`.

## Verifying LocalStack is Running

Check that LocalStack is healthy before running tests.

```bash
# Check health
curl http://localhost:4566/_localstack/health

# Using the LocalStack CLI (optional)
pip install localstack
localstack status services
```

## Using with AWS CLI

You can use the regular AWS CLI with LocalStack by pointing it to the local endpoint.

```bash
# Create an S3 bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket

# Upload a file
aws --endpoint-url=http://localhost:4566 s3 cp test.txt s3://test-bucket/

# List objects
aws --endpoint-url=http://localhost:4566 s3 ls s3://test-bucket/

# Create a DynamoDB table
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
  --table-name users \
  --attribute-definitions AttributeName=user_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create an SQS queue
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name test-queue
```

To avoid typing `--endpoint-url` every time, create an alias or use the `awslocal` CLI.

```bash
# Install awslocal (wrapper around AWS CLI)
pip install awscli-local

# Now commands automatically target LocalStack
awslocal s3 ls
awslocal dynamodb list-tables
```

## Using with Python (Boto3)

Point your Boto3 clients to LocalStack by setting the endpoint URL.

```python
import boto3

# Create clients pointing to LocalStack
s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:4566',
    region_name='us-east-1',
    aws_access_key_id='test',
    aws_secret_access_key='test'
)

dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:4566',
    region_name='us-east-1',
    aws_access_key_id='test',
    aws_secret_access_key='test'
)

# Create a bucket and upload a file
s3.create_bucket(Bucket='test-bucket')
s3.put_object(Bucket='test-bucket', Key='test.txt', Body=b'Hello LocalStack')

# Verify the upload
response = s3.get_object(Bucket='test-bucket', Key='test.txt')
content = response['Body'].read().decode('utf-8')
print(f"Content: {content}")  # "Hello LocalStack"

# Create a DynamoDB table
table = dynamodb.create_table(
    TableName='users',
    KeySchema=[{'AttributeName': 'user_id', 'KeyType': 'HASH'}],
    AttributeDefinitions=[{'AttributeName': 'user_id', 'AttributeType': 'S'}],
    BillingMode='PAY_PER_REQUEST'
)
table.wait_until_exists()

# Put and get an item
table.put_item(Item={'user_id': 'user-123', 'name': 'Alice'})
response = table.get_item(Key={'user_id': 'user-123'})
print(f"User: {response['Item']['name']}")
```

## Using with Node.js (AWS SDK v3)

```javascript
import { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Create clients pointing to LocalStack
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    forcePathStyle: true,
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    }
});

const dynamoBase = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    }
});
const dynamodb = DynamoDBDocumentClient.from(dynamoBase);

// Test S3 operations
await s3.send(new CreateBucketCommand({ Bucket: 'test-bucket' }));
await s3.send(new PutObjectCommand({
    Bucket: 'test-bucket',
    Key: 'test.json',
    Body: JSON.stringify({ hello: 'localstack' })
}));

const response = await s3.send(new GetObjectCommand({
    Bucket: 'test-bucket',
    Key: 'test.json'
}));
const body = await response.Body.transformToString();
console.log('S3 content:', body);
```

## Environment-Aware Client Configuration

Set up your application to use LocalStack in development and real AWS in production.

Python example.

```python
import boto3
import os

def create_aws_client(service, **kwargs):
    """Create an AWS client that uses LocalStack in development."""
    config = {
        'region_name': os.environ.get('AWS_REGION', 'us-east-1')
    }

    if os.environ.get('USE_LOCALSTACK', 'false').lower() == 'true':
        config['endpoint_url'] = os.environ.get(
            'LOCALSTACK_ENDPOINT', 'http://localhost:4566'
        )
        config['aws_access_key_id'] = 'test'
        config['aws_secret_access_key'] = 'test'

    config.update(kwargs)
    return boto3.client(service, **config)

# Usage - works transparently in both environments
s3 = create_aws_client('s3')
dynamodb = create_aws_client('dynamodb')
```

Node.js example.

```javascript
function getClientConfig() {
    const config = {
        region: process.env.AWS_REGION || 'us-east-1'
    };

    if (process.env.USE_LOCALSTACK === 'true') {
        config.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
        config.credentials = {
            accessKeyId: 'test',
            secretAccessKey: 'test'
        };
    }

    return config;
}
```

## Integration Testing with pytest

Set up proper integration tests that use LocalStack.

```python
import boto3
import pytest

@pytest.fixture(scope='session')
def localstack_s3():
    """Create an S3 client connected to LocalStack."""
    client = boto3.client(
        's3',
        endpoint_url='http://localhost:4566',
        region_name='us-east-1',
        aws_access_key_id='test',
        aws_secret_access_key='test'
    )
    return client

@pytest.fixture
def test_bucket(localstack_s3):
    """Create and clean up a test bucket."""
    bucket_name = 'test-bucket'
    localstack_s3.create_bucket(Bucket=bucket_name)
    yield bucket_name

    # Cleanup: delete all objects and the bucket
    response = localstack_s3.list_objects_v2(Bucket=bucket_name)
    for obj in response.get('Contents', []):
        localstack_s3.delete_object(Bucket=bucket_name, Key=obj['Key'])
    localstack_s3.delete_bucket(Bucket=bucket_name)

def test_upload_and_download(localstack_s3, test_bucket):
    """Test that we can upload and download files."""
    localstack_s3.put_object(
        Bucket=test_bucket,
        Key='test.txt',
        Body=b'Hello, World!'
    )

    response = localstack_s3.get_object(Bucket=test_bucket, Key='test.txt')
    content = response['Body'].read()
    assert content == b'Hello, World!'

def test_list_objects(localstack_s3, test_bucket):
    """Test listing objects."""
    for i in range(5):
        localstack_s3.put_object(
            Bucket=test_bucket,
            Key=f'file-{i}.txt',
            Body=f'Content {i}'.encode()
        )

    response = localstack_s3.list_objects_v2(Bucket=test_bucket)
    assert response['KeyCount'] == 5
```

## Testing SQS Workflows

```python
import boto3
import json

sqs = boto3.client(
    'sqs',
    endpoint_url='http://localhost:4566',
    region_name='us-east-1',
    aws_access_key_id='test',
    aws_secret_access_key='test'
)

# Create a queue
response = sqs.create_queue(QueueName='test-queue')
queue_url = response['QueueUrl']

# Send a message
sqs.send_message(
    QueueUrl=queue_url,
    MessageBody=json.dumps({'task': 'process', 'id': 123})
)

# Receive and process the message
response = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=1)
for message in response.get('Messages', []):
    body = json.loads(message['Body'])
    print(f"Received: {body}")

    # Delete after processing
    sqs.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=message['ReceiptHandle']
    )
```

## Initialization Scripts

Automate resource creation when LocalStack starts.

```bash
# init-aws.sh - runs when LocalStack starts
#!/bin/bash

echo "Creating S3 buckets..."
awslocal s3 mb s3://app-uploads
awslocal s3 mb s3://app-assets

echo "Creating DynamoDB tables..."
awslocal dynamodb create-table \
  --table-name users \
  --attribute-definitions AttributeName=user_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

echo "Creating SQS queues..."
awslocal sqs create-queue --queue-name task-queue
awslocal sqs create-queue --queue-name notification-queue

echo "LocalStack initialization complete"
```

Mount this script in your Docker Compose file.

```yaml
volumes:
  - "./init-aws.sh:/etc/localstack/init/ready.d/init-aws.sh"
```

## Best Practices

- **Use Docker Compose** for reproducible setups. Commit the compose file to your repo so everyone on the team gets the same setup.
- **Create initialization scripts** to set up tables, queues, and buckets automatically.
- **Use environment variables** to switch between LocalStack and real AWS without code changes.
- **Clean up in tests.** Delete resources after each test to avoid state leaking between tests.
- **Don't rely on LocalStack for production behavior.** It's great for development and integration testing, but always do final validation against real AWS.

For mocking at the unit test level instead of running a full LocalStack instance, see the guides on [mocking AWS SDK calls](https://oneuptime.com/blog/post/2026-02-12-mock-aws-sdk-calls-unit-tests/view) and [moto for Python](https://oneuptime.com/blog/post/2026-02-12-moto-mocking-aws-services-python-tests/view).
