# How to Use Moto for Mocking AWS Services in Python Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Python, Testing, Mocking, Boto3

Description: Learn how to use the moto library to mock AWS services in Python unit and integration tests, with examples for S3, DynamoDB, SQS, Lambda, and complex multi-service workflows.

---

Moto is a Python library that mocks AWS services at the API level. Unlike basic mocking with `unittest.mock`, moto actually simulates the behavior of AWS services. When you create an S3 bucket with moto, it exists in memory. When you put an item in DynamoDB, you can query it back. This means your tests exercise real Boto3 code paths without hitting AWS. It's one of the best testing tools in the Python AWS ecosystem.

## Installation

```bash
pip install moto[all]  # install all service mocks

# Or install specific services
pip install moto[s3,dynamodb,sqs,lambda,iam]
```

## Basic Usage with Decorators

The simplest way to use moto is with the `@mock_aws` decorator. It intercepts all Boto3 calls within the decorated function.

```python
import boto3
from moto import mock_aws

@mock_aws
def test_create_bucket():
    # This creates a real Boto3 client, but moto intercepts the calls
    s3 = boto3.client('s3', region_name='us-east-1')

    # Create a bucket - this happens in memory, not in AWS
    s3.create_bucket(Bucket='test-bucket')

    # Verify the bucket exists
    response = s3.list_buckets()
    bucket_names = [b['Name'] for b in response['Buckets']]
    assert 'test-bucket' in bucket_names

@mock_aws
def test_s3_upload_download():
    s3 = boto3.client('s3', region_name='us-east-1')
    s3.create_bucket(Bucket='my-bucket')

    # Upload an object
    s3.put_object(
        Bucket='my-bucket',
        Key='data/test.txt',
        Body=b'Hello, World!'
    )

    # Download and verify
    response = s3.get_object(Bucket='my-bucket', Key='data/test.txt')
    content = response['Body'].read()
    assert content == b'Hello, World!'
```

## Using Context Managers

For more control over when mocking is active, use moto as a context manager.

```python
import boto3
from moto import mock_aws

def test_with_context_manager():
    with mock_aws():
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-bucket')

        # Everything in this block is mocked
        response = s3.list_buckets()
        assert len(response['Buckets']) == 1

    # Outside the block, calls would go to real AWS (don't do this in tests)
```

## DynamoDB Testing

Moto's DynamoDB mock is particularly good. It supports queries, scans, GSIs, conditions, and more.

```python
import boto3
from moto import mock_aws
import pytest

@pytest.fixture
def dynamodb_table():
    """Create a mock DynamoDB table."""
    with mock_aws():
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

        table = dynamodb.create_table(
            TableName='orders',
            KeySchema=[
                {'AttributeName': 'customer_id', 'KeyType': 'HASH'},
                {'AttributeName': 'order_id', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'customer_id', 'AttributeType': 'S'},
                {'AttributeName': 'order_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )

        # Seed some test data
        with table.batch_writer() as batch:
            batch.put_item(Item={
                'customer_id': 'cust-123',
                'order_id': 'ord-001',
                'total': 99.99,
                'status': 'shipped'
            })
            batch.put_item(Item={
                'customer_id': 'cust-123',
                'order_id': 'ord-002',
                'total': 49.99,
                'status': 'pending'
            })
            batch.put_item(Item={
                'customer_id': 'cust-456',
                'order_id': 'ord-003',
                'total': 199.99,
                'status': 'delivered'
            })

        yield table

@mock_aws
def test_query_orders(dynamodb_table):
    """Test querying orders for a specific customer."""
    from boto3.dynamodb.conditions import Key

    response = dynamodb_table.query(
        KeyConditionExpression=Key('customer_id').eq('cust-123')
    )

    assert len(response['Items']) == 2
    order_ids = [item['order_id'] for item in response['Items']]
    assert 'ord-001' in order_ids
    assert 'ord-002' in order_ids

@mock_aws
def test_conditional_put(dynamodb_table):
    """Test conditional writes."""
    from botocore.exceptions import ClientError

    # This should fail because the item already exists
    with pytest.raises(ClientError) as exc:
        dynamodb_table.put_item(
            Item={
                'customer_id': 'cust-123',
                'order_id': 'ord-001',
                'total': 0
            },
            ConditionExpression='attribute_not_exists(customer_id)'
        )

    assert exc.value.response['Error']['Code'] == 'ConditionalCheckFailedException'
```

## SQS Testing

Test message queue workflows without running actual queues.

```python
import boto3
import json
from moto import mock_aws

@mock_aws
def test_sqs_workflow():
    sqs = boto3.client('sqs', region_name='us-east-1')

    # Create a queue
    response = sqs.create_queue(QueueName='task-queue')
    queue_url = response['QueueUrl']

    # Send messages
    for i in range(5):
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps({'task_id': i, 'action': 'process'})
        )

    # Check queue attributes
    attrs = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=['ApproximateNumberOfMessages']
    )
    assert attrs['Attributes']['ApproximateNumberOfMessages'] == '5'

    # Receive and process messages
    processed = 0
    while True:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10
        )
        messages = response.get('Messages', [])
        if not messages:
            break

        for msg in messages:
            body = json.loads(msg['Body'])
            processed += 1
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=msg['ReceiptHandle']
            )

    assert processed == 5
```

## Testing Multi-Service Workflows

The real power of moto shows when testing code that coordinates multiple AWS services.

```python
import boto3
import json
from moto import mock_aws

class OrderProcessor:
    """Processes orders: reads from DynamoDB, sends notifications to SQS."""

    def __init__(self, region='us-east-1'):
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.sqs = boto3.client('sqs', region_name=region)
        self.table = self.dynamodb.Table('orders')

    def process_pending_orders(self, queue_url):
        """Find pending orders and send them to the processing queue."""
        # Scan for pending orders (in production, use a GSI)
        response = self.table.scan(
            FilterExpression='#s = :status',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':status': 'pending'}
        )

        processed = 0
        for order in response['Items']:
            # Send to processing queue
            self.sqs.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps({
                    'order_id': order['order_id'],
                    'customer_id': order['customer_id'],
                    'total': str(order['total'])
                })
            )

            # Update status
            self.table.update_item(
                Key={
                    'customer_id': order['customer_id'],
                    'order_id': order['order_id']
                },
                UpdateExpression='SET #s = :status',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':status': 'processing'}
            )
            processed += 1

        return processed

@mock_aws
def test_process_pending_orders():
    region = 'us-east-1'

    # Set up DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.create_table(
        TableName='orders',
        KeySchema=[
            {'AttributeName': 'customer_id', 'KeyType': 'HASH'},
            {'AttributeName': 'order_id', 'KeyType': 'RANGE'}
        ],
        AttributeDefinitions=[
            {'AttributeName': 'customer_id', 'AttributeType': 'S'},
            {'AttributeName': 'order_id', 'AttributeType': 'S'}
        ],
        BillingMode='PAY_PER_REQUEST'
    )

    # Add test orders
    table.put_item(Item={
        'customer_id': 'c1', 'order_id': 'o1',
        'total': 50, 'status': 'pending'
    })
    table.put_item(Item={
        'customer_id': 'c2', 'order_id': 'o2',
        'total': 75, 'status': 'pending'
    })
    table.put_item(Item={
        'customer_id': 'c3', 'order_id': 'o3',
        'total': 100, 'status': 'shipped'  # not pending
    })

    # Set up SQS
    sqs = boto3.client('sqs', region_name=region)
    queue = sqs.create_queue(QueueName='processing-queue')
    queue_url = queue['QueueUrl']

    # Run the processor
    processor = OrderProcessor(region)
    count = processor.process_pending_orders(queue_url)

    # Verify: 2 pending orders were processed
    assert count == 2

    # Verify: 2 messages in the queue
    attrs = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=['ApproximateNumberOfMessages']
    )
    assert attrs['Attributes']['ApproximateNumberOfMessages'] == '2'

    # Verify: orders updated to 'processing'
    order1 = table.get_item(Key={'customer_id': 'c1', 'order_id': 'o1'})
    assert order1['Item']['status'] == 'processing'
```

## Testing S3 Event-Driven Code

```python
import boto3
import json
from moto import mock_aws

def process_s3_event(event, s3_client):
    """Process an S3 event notification (e.g., from a Lambda trigger)."""
    results = []
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        response = s3_client.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')
        data = json.loads(content)

        results.append({
            'key': key,
            'record_count': len(data.get('records', []))
        })

    return results

@mock_aws
def test_process_s3_event():
    s3 = boto3.client('s3', region_name='us-east-1')
    s3.create_bucket(Bucket='data-bucket')

    # Upload test data
    s3.put_object(
        Bucket='data-bucket',
        Key='incoming/batch-001.json',
        Body=json.dumps({'records': [1, 2, 3, 4, 5]})
    )

    # Simulate the S3 event
    event = {
        'Records': [{
            's3': {
                'bucket': {'name': 'data-bucket'},
                'object': {'key': 'incoming/batch-001.json'}
            }
        }]
    }

    results = process_s3_event(event, s3)
    assert len(results) == 1
    assert results[0]['record_count'] == 5
```

## Pytest Fixtures for Reusable Setup

```python
import boto3
import pytest
from moto import mock_aws

@pytest.fixture
def aws_credentials():
    """Mocked AWS credentials for moto."""
    import os
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

@pytest.fixture
def s3_client(aws_credentials):
    with mock_aws():
        client = boto3.client('s3', region_name='us-east-1')
        yield client

@pytest.fixture
def s3_bucket(s3_client):
    s3_client.create_bucket(Bucket='test-bucket')
    return 'test-bucket'

# Tests use the fixtures
def test_upload(s3_client, s3_bucket):
    s3_client.put_object(
        Bucket=s3_bucket,
        Key='test.txt',
        Body=b'test content'
    )

    response = s3_client.get_object(Bucket=s3_bucket, Key='test.txt')
    assert response['Body'].read() == b'test content'
```

## Best Practices

- **Use `@mock_aws` for simple tests** and context managers for tests that need more control.
- **Set up fixtures** for common resources like tables and buckets.
- **Test error paths** by creating conditions that trigger errors (e.g., conditional write failures, missing items).
- **Don't test AWS behavior.** Test your code's behavior. You don't need to verify that S3 stores files correctly.
- **Keep moto updated.** AWS adds features constantly, and moto needs updates to support them.
- **Use region_name explicitly.** Moto sometimes behaves differently without an explicit region.

For simpler unit testing without full service simulation, see the guide on [mocking AWS SDK calls](https://oneuptime.com/blog/post/2026-02-12-mock-aws-sdk-calls-unit-tests/view). And for integration testing with a running service emulator, [LocalStack](https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view) is a great complement to moto.
