# How to Fix DynamoDB 'ValidationException' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Debugging, Cloud Infrastructure

Description: Learn how to diagnose and fix the common DynamoDB ValidationException error, covering causes from bad key schemas to incorrect attribute types and expression issues.

---

If you've worked with Amazon DynamoDB for any length of time, you've almost certainly run into the dreaded `ValidationException`. It's one of the most common errors DynamoDB throws, and it's also one of the most frustrating because the error message itself can be vague or misleading.

The `ValidationException` is DynamoDB's way of telling you that your request was structurally wrong. It doesn't mean there's a problem with your credentials, your table, or your network connection. It means the data you sent, the parameters you used, or the structure of your request doesn't match what DynamoDB expects.

Let's walk through the most common causes and how to fix each one.

## Missing or Incorrect Key Attributes

The single most common cause of `ValidationException` is sending a request that doesn't include the correct primary key attributes. Every DynamoDB operation that targets a specific item needs the full primary key - that means both the partition key and sort key (if one exists).

Here's an example that'll fail if the table has a composite key:

```python
# This fails because we're only providing the partition key
# when the table also has a sort key defined
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Orders')

# Wrong - missing the sort key
response = table.get_item(
    Key={
        'customerId': '12345'
    }
)
```

The fix is straightforward - include both key attributes:

```python
# Correct - providing both partition key and sort key
response = table.get_item(
    Key={
        'customerId': '12345',
        'orderId': 'ORD-001'
    }
)
```

You can check your table's key schema any time with the AWS CLI:

```bash
# Check what keys your table requires
aws dynamodb describe-table \
    --table-name Orders \
    --query 'Table.KeySchema'
```

## Wrong Attribute Types

DynamoDB is strict about types. If your partition key is defined as a String (S), you can't pass a Number (N) and expect it to work. This trips people up especially when using the low-level client.

```python
# Using the low-level client with wrong type
client = boto3.client('dynamodb')

# This will throw ValidationException if 'userId' is a String type key
response = client.get_item(
    TableName='Users',
    Key={
        'userId': {'N': '12345'}  # Wrong! userId is type S
    }
)
```

Fix it by using the right type descriptor:

```python
# Correct type descriptor for a String key
response = client.get_item(
    TableName='Users',
    Key={
        'userId': {'S': '12345'}  # Correct - String type
    }
)
```

## Expression Attribute Issues

DynamoDB expressions (FilterExpression, ConditionExpression, ProjectionExpression, etc.) are a common source of validation errors. The most frequent mistakes are referencing expression attribute names or values that weren't defined, or defining them but not using them.

```python
# This will fail - we reference :val but never define it
response = table.scan(
    FilterExpression='age > :val'
)
```

You must always pair references with their definitions:

```python
# Correct - define every placeholder you reference
response = table.scan(
    FilterExpression='age > :val',
    ExpressionAttributeValues={
        ':val': 25
    }
)
```

The same applies to expression attribute names. If you're working with reserved words, you need the `#` prefix:

```python
# 'status' is a reserved word in DynamoDB
# This approach properly handles it
response = table.scan(
    FilterExpression='#s = :status_val',
    ExpressionAttributeNames={
        '#s': 'status'
    },
    ExpressionAttributeValues={
        ':status_val': 'active'
    }
)
```

A common gotcha is defining expression attribute names or values that you don't actually use anywhere in your expression. DynamoDB will reject this too.

## Batch Operation Limits

DynamoDB batch operations have strict limits. `BatchWriteItem` can handle up to 25 items per call, and `BatchGetItem` can retrieve up to 100 items. Exceed those limits and you'll get a `ValidationException`.

```python
# This will fail if items contains more than 25 entries
response = client.batch_write_item(
    RequestItems={
        'MyTable': items  # Must be 25 or fewer
    }
)
```

The solution is to chunk your requests:

```python
# Break large batches into chunks of 25
def batch_write_items(table_name, items, chunk_size=25):
    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        client.batch_write_item(
            RequestItems={
                table_name: chunk
            }
        )
```

## Item Size Violations

Individual items in DynamoDB can't exceed 400 KB. If you try to write an item larger than that, you'll get a `ValidationException`. This is easy to hit when storing JSON blobs or binary data.

Check the size before writing:

```python
import json
import sys

# Check item size before writing
item = {
    'id': '123',
    'data': large_json_blob
}

# Rough size estimate
item_size = sys.getsizeof(json.dumps(item))
if item_size > 400000:  # 400 KB limit
    print(f"Item too large: {item_size} bytes")
    # Consider storing in S3 and keeping a reference
```

## Invalid Table or Index Names

Table names must be between 3 and 255 characters, and can only contain letters, numbers, underscores, hyphens, and periods. Index names follow similar rules. If you accidentally include a space or special character, you'll hit a `ValidationException`.

## Query Without Key Condition

If you use the `Query` operation, you must provide a `KeyConditionExpression`. A `Query` without a key condition isn't valid - that's what `Scan` is for.

```python
# Wrong - Query needs a key condition
response = table.query(
    FilterExpression='age > :val',
    ExpressionAttributeValues={':val': 25}
)

# Correct - provide a key condition for Query
response = table.query(
    KeyConditionExpression='customerId = :cid',
    FilterExpression='age > :val',
    ExpressionAttributeValues={
        ':cid': 'CUST-001',
        ':val': 25
    }
)
```

## Debugging Tips

When you get a `ValidationException`, the error message usually gives you a hint. Here's how to extract it properly:

```python
# Catch and inspect the full error
try:
    response = table.put_item(Item=my_item)
except client.exceptions.ClientError as e:
    error_code = e.response['Error']['Code']
    error_message = e.response['Error']['Message']
    print(f"Error: {error_code}")
    print(f"Message: {error_message}")
```

The message field often contains specifics like "The number of conditions on the keys is invalid" or "Value provided in ExpressionAttributeValues unused in expressions."

## Setting Up Monitoring

To catch these errors in production before they become a bigger problem, you should set up monitoring on your DynamoDB operations. Tracking `SystemErrors` and `UserErrors` CloudWatch metrics for your tables gives you visibility into how often these issues occur.

For a more comprehensive approach to monitoring DynamoDB alongside your other infrastructure, consider using [OneUptime's AWS monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) to get alerts when error rates spike.

## Summary

The `ValidationException` in DynamoDB always means your request structure is wrong. The most common culprits are missing key attributes, wrong attribute types, expression placeholder mismatches, exceeding batch limits, and items that are too large. The error message usually tells you what's wrong if you read it carefully. Fix the request structure, and the error goes away.
