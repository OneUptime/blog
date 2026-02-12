# How to Mock AWS SDK Calls in Unit Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Testing, Mocking, Python, JavaScript

Description: Learn how to mock AWS SDK calls in unit tests across Python and JavaScript, covering strategies for isolating AWS dependencies, simulating errors, and writing reliable tests.

---

Unit tests shouldn't talk to AWS. They need to be fast, free, and deterministic. Mocking AWS SDK calls lets you test your business logic without network calls, real credentials, or running services. The approach differs between Python and JavaScript, but the principles are the same: intercept SDK calls, return controlled responses, and verify your code does the right thing.

## Python: Mocking with unittest.mock

The built-in `unittest.mock` library is the simplest way to mock Boto3 calls.

### Mocking a Client Method

```python
from unittest.mock import patch, MagicMock
import json

# Your production code
def get_user_config(s3_client, bucket, key):
    """Download and parse a JSON config from S3."""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read().decode('utf-8')
    return json.loads(content)

# The test
def test_get_user_config():
    # Create a mock S3 client
    mock_s3 = MagicMock()

    # Configure what the mock returns
    mock_body = MagicMock()
    mock_body.read.return_value = b'{"theme": "dark", "language": "en"}'
    mock_s3.get_object.return_value = {
        'Body': mock_body,
        'ContentType': 'application/json'
    }

    # Call the function under test
    result = get_user_config(mock_s3, 'config-bucket', 'users/user-123.json')

    # Assert the result
    assert result == {'theme': 'dark', 'language': 'en'}

    # Verify the mock was called correctly
    mock_s3.get_object.assert_called_once_with(
        Bucket='config-bucket',
        Key='users/user-123.json'
    )
```

### Mocking Error Responses

Testing error paths is just as important as testing happy paths.

```python
from unittest.mock import MagicMock
from botocore.exceptions import ClientError

def delete_s3_object(s3_client, bucket, key):
    """Delete an S3 object, returning True if deleted, False if not found."""
    try:
        s3_client.delete_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            return False
        raise

def test_delete_existing_object():
    mock_s3 = MagicMock()
    mock_s3.delete_object.return_value = {}
    assert delete_s3_object(mock_s3, 'bucket', 'key') is True

def test_delete_nonexistent_object():
    mock_s3 = MagicMock()
    mock_s3.delete_object.side_effect = ClientError(
        {
            'Error': {'Code': 'NoSuchKey', 'Message': 'Not found'},
            'ResponseMetadata': {'RequestId': 'test-123', 'HTTPStatusCode': 404}
        },
        'DeleteObject'
    )
    assert delete_s3_object(mock_s3, 'bucket', 'key') is False

def test_delete_permission_error():
    mock_s3 = MagicMock()
    mock_s3.delete_object.side_effect = ClientError(
        {
            'Error': {'Code': 'AccessDenied', 'Message': 'Forbidden'},
            'ResponseMetadata': {'RequestId': 'test-456', 'HTTPStatusCode': 403}
        },
        'DeleteObject'
    )
    import pytest
    with pytest.raises(ClientError):
        delete_s3_object(mock_s3, 'bucket', 'key')
```

### Using patch Decorator

When your code creates the Boto3 client internally, use `patch` to intercept it.

```python
from unittest.mock import patch, MagicMock
import boto3

# Production code that creates its own client
class UserService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('users')

    def get_user(self, user_id):
        response = self.table.get_item(Key={'user_id': user_id})
        return response.get('Item')

# Test
@patch('boto3.resource')
def test_get_user(mock_resource):
    # Set up the mock chain
    mock_table = MagicMock()
    mock_table.get_item.return_value = {
        'Item': {'user_id': 'user-123', 'name': 'Alice'}
    }
    mock_resource.return_value.Table.return_value = mock_table

    # Test
    service = UserService()
    user = service.get_user('user-123')

    assert user['name'] == 'Alice'
    mock_table.get_item.assert_called_once_with(Key={'user_id': 'user-123'})
```

## Python: Using Stubber

Boto3 includes a built-in `Stubber` class that provides more structured mocking with response validation.

```python
from botocore.stub import Stubber
import boto3

def test_list_buckets_with_stubber():
    s3 = boto3.client('s3')

    with Stubber(s3) as stubber:
        # Define the expected response
        stubber.add_response(
            'list_buckets',
            {
                'Buckets': [
                    {'Name': 'bucket-1', 'CreationDate': '2026-01-01T00:00:00Z'},
                    {'Name': 'bucket-2', 'CreationDate': '2026-01-02T00:00:00Z'}
                ],
                'Owner': {'DisplayName': 'test', 'ID': 'abc123'}
            }
        )

        # Make the call
        response = s3.list_buckets()
        assert len(response['Buckets']) == 2
        assert response['Buckets'][0]['Name'] == 'bucket-1'

def test_error_with_stubber():
    s3 = boto3.client('s3')

    with Stubber(s3) as stubber:
        # Stub an error response
        stubber.add_client_error(
            'get_object',
            service_error_code='NoSuchKey',
            service_message='The specified key does not exist.',
            http_status_code=404
        )

        from botocore.exceptions import ClientError
        import pytest
        with pytest.raises(ClientError) as exc:
            s3.get_object(Bucket='bucket', Key='missing.txt')

        assert exc.value.response['Error']['Code'] == 'NoSuchKey'
```

## JavaScript: Mocking with Jest

For Node.js applications using Jest, you can mock the SDK at the module level.

### Mocking AWS SDK v3

```javascript
// user-service.js - production code
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getUser(userId) {
    const response = await docClient.send(new GetCommand({
        TableName: 'users',
        Key: { user_id: userId }
    }));
    return response.Item;
}
```

```javascript
// user-service.test.js
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getUser } from './user-service.js';

// Create the mock
const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
    ddbMock.reset();
});

test('getUser returns user data', async () => {
    // Configure the mock response
    ddbMock.on(GetCommand).resolves({
        Item: { user_id: 'user-123', name: 'Alice', email: 'alice@example.com' }
    });

    const user = await getUser('user-123');

    expect(user).toEqual({
        user_id: 'user-123',
        name: 'Alice',
        email: 'alice@example.com'
    });
});

test('getUser returns undefined for missing user', async () => {
    ddbMock.on(GetCommand).resolves({
        Item: undefined
    });

    const user = await getUser('nonexistent');
    expect(user).toBeUndefined();
});

test('getUser handles errors', async () => {
    ddbMock.on(GetCommand).rejects(new Error('Service unavailable'));

    await expect(getUser('user-123')).rejects.toThrow('Service unavailable');
});
```

Install the mock library first.

```bash
npm install --save-dev aws-sdk-client-mock
```

### Mocking Specific Inputs

You can configure different responses based on the input.

```javascript
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { Readable } from 'stream';

const s3Mock = mockClient(S3Client);

beforeEach(() => {
    s3Mock.reset();
});

test('different responses for different keys', async () => {
    // Return different content based on the Key
    s3Mock
        .on(GetObjectCommand, { Bucket: 'config', Key: 'dev.json' })
        .resolves({
            Body: sdkStreamMixin(
                Readable.from([JSON.stringify({ env: 'development' })])
            )
        })
        .on(GetObjectCommand, { Bucket: 'config', Key: 'prod.json' })
        .resolves({
            Body: sdkStreamMixin(
                Readable.from([JSON.stringify({ env: 'production' })])
            )
        });
});
```

## Design for Testability

The easiest code to test is code that accepts its dependencies rather than creating them.

```python
# Good - accepts client as parameter
class OrderProcessor:
    def __init__(self, dynamodb_table, sqs_client, queue_url):
        self.table = dynamodb_table
        self.sqs = sqs_client
        self.queue_url = queue_url

    def process_order(self, order_id):
        order = self.table.get_item(Key={'order_id': order_id}).get('Item')
        if not order:
            raise ValueError(f"Order {order_id} not found")

        # Process the order...
        self.sqs.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps({'order_id': order_id, 'status': 'processed'})
        )
        return order

# Test - easy to mock
def test_process_order():
    mock_table = MagicMock()
    mock_table.get_item.return_value = {
        'Item': {'order_id': 'ord-123', 'total': 99.99}
    }
    mock_sqs = MagicMock()

    processor = OrderProcessor(mock_table, mock_sqs, 'http://queue-url')
    result = processor.process_order('ord-123')

    assert result['total'] == 99.99
    mock_sqs.send_message.assert_called_once()
```

```javascript
// Good - accepts client as parameter
export class FileService {
    constructor(s3Client, bucketName) {
        this.s3 = s3Client;
        this.bucket = bucketName;
    }

    async uploadFile(key, body) {
        await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body
        }));
        return `s3://${this.bucket}/${key}`;
    }
}
```

## Best Practices

- **Inject dependencies.** Pass AWS clients into your functions and classes rather than creating them internally. This makes mocking trivial.
- **Test both success and error paths.** AWS calls fail in many ways. Mock those failures.
- **Verify mock calls.** Don't just check the output. Verify your code called AWS with the right parameters.
- **Reset mocks between tests.** State from one test shouldn't leak into another.
- **Use Stubber for simple Boto3 tests** and `unittest.mock` for more complex scenarios.
- **Use `aws-sdk-client-mock`** for JavaScript v3 SDK testing. It's the officially recommended approach.

For integration testing that goes beyond unit-level mocking, check out the guide on [LocalStack](https://oneuptime.com/blog/post/localstack-test-aws-services-locally/view). And for Python-specific mocking, the [moto library guide](https://oneuptime.com/blog/post/moto-mocking-aws-services-python-tests/view) offers a higher-level approach that simulates full AWS service behavior.
