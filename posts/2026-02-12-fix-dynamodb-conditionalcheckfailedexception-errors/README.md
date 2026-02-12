# How to Fix DynamoDB 'ConditionalCheckFailedException' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Debugging, Serverless

Description: A practical guide to understanding and resolving DynamoDB ConditionalCheckFailedException errors, including condition expressions, atomic counters, and optimistic locking patterns.

---

The `ConditionalCheckFailedException` in DynamoDB is actually not a bug - it's a feature working exactly as designed. But when you hit it unexpectedly, it can be confusing. This error fires when you perform a conditional write (put, update, or delete) and the condition you specified doesn't match the current state of the item in the table.

Understanding when and why this happens is key to building reliable applications with DynamoDB.

## Why This Error Happens

DynamoDB supports condition expressions on write operations. These let you say things like "only update this item if it exists" or "only insert this item if it doesn't already exist." When the condition evaluates to false, DynamoDB refuses the write and throws `ConditionalCheckFailedException`.

Here's the simplest example:

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Products')

# This will throw ConditionalCheckFailedException
# if an item with this key already exists
try:
    table.put_item(
        Item={
            'productId': 'PROD-001',
            'name': 'Widget',
            'price': 29.99
        },
        ConditionExpression='attribute_not_exists(productId)'
    )
except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
    print("Product already exists!")
```

This is the "create only if not exists" pattern, and that exception is the expected behavior when the item is already there.

## Common Scenarios That Trigger This Error

### Optimistic Locking

The most common scenario is optimistic locking, where you read an item, make changes, and write it back with a condition that the version hasn't changed since you read it.

```python
# Step 1: Read the item
response = table.get_item(
    Key={'orderId': 'ORD-123'}
)
item = response['Item']
current_version = item['version']

# Step 2: Update with version check
# This fails if someone else updated the item between our read and write
try:
    table.update_item(
        Key={'orderId': 'ORD-123'},
        UpdateExpression='SET #s = :new_status, version = :new_version',
        ConditionExpression='version = :current_version',
        ExpressionAttributeNames={
            '#s': 'status'
        },
        ExpressionAttributeValues={
            ':new_status': 'shipped',
            ':new_version': current_version + 1,
            ':current_version': current_version
        }
    )
except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
    print("Item was modified by another process. Retry needed.")
```

### Preventing Overwrites

Sometimes you want to make sure you don't accidentally overwrite existing data:

```python
# Only create user if email doesn't already exist
try:
    table.put_item(
        Item={
            'email': 'user@example.com',
            'name': 'John',
            'createdAt': '2026-02-12'
        },
        ConditionExpression='attribute_not_exists(email)'
    )
    print("User created successfully")
except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
    print("A user with this email already exists")
```

### Conditional Deletes

Deleting an item only if it meets certain criteria:

```python
# Only delete the session if it's expired
try:
    table.delete_item(
        Key={'sessionId': 'sess-abc-123'},
        ConditionExpression='expiresAt < :now',
        ExpressionAttributeValues={
            ':now': int(time.time())
        }
    )
except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
    print("Session hasn't expired yet, can't delete")
```

## Implementing Retry Logic

For optimistic locking scenarios, the right approach is to retry the entire read-modify-write cycle. Don't just retry the write - you need to re-read the item to get the latest version.

```python
import time
import random

def update_with_retry(table, key, update_fn, max_retries=5):
    """
    Reads an item, applies update_fn to it, and writes it back
    with optimistic locking. Retries on conflict.
    """
    for attempt in range(max_retries):
        # Read current state
        response = table.get_item(Key=key)
        item = response.get('Item')

        if not item:
            raise ValueError("Item not found")

        current_version = item.get('version', 0)

        # Apply the update function to get new values
        updates = update_fn(item)

        # Build update expression dynamically
        update_parts = ['version = :new_version']
        expr_values = {
            ':new_version': current_version + 1,
            ':current_version': current_version
        }

        for field, value in updates.items():
            placeholder = f':val_{field}'
            update_parts.append(f'{field} = {placeholder}')
            expr_values[placeholder] = value

        try:
            table.update_item(
                Key=key,
                UpdateExpression='SET ' + ', '.join(update_parts),
                ConditionExpression='version = :current_version',
                ExpressionAttributeValues=expr_values
            )
            return True  # Success
        except table.meta.client.exceptions.ConditionalCheckFailedException:
            if attempt < max_retries - 1:
                # Exponential backoff with jitter
                wait_time = (2 ** attempt) * 0.1 + random.uniform(0, 0.1)
                time.sleep(wait_time)
                continue
            else:
                raise  # Give up after max retries
```

## Using ReturnValuesOnConditionCheckFailure

Starting with newer SDK versions, you can ask DynamoDB to return the current item values when a condition check fails. This saves you a separate read:

```python
# Get the current item when condition check fails
try:
    response = client.update_item(
        TableName='Products',
        Key={
            'productId': {'S': 'PROD-001'}
        },
        UpdateExpression='SET price = :new_price',
        ConditionExpression='price = :expected_price',
        ExpressionAttributeValues={
            ':new_price': {'N': '35.99'},
            ':expected_price': {'N': '29.99'}
        },
        ReturnValuesOnConditionCheckFailure='ALL_OLD'
    )
except client.exceptions.ConditionalCheckFailedException as e:
    # The current item is available in the error response
    current_item = e.response.get('Item', {})
    print(f"Current price is actually: {current_item.get('price', {}).get('N')}")
```

## TransactWriteItems and Condition Failures

When you use `TransactWriteItems`, a condition failure on any single item in the transaction causes the entire transaction to fail. The error wraps the individual failures:

```python
# Transaction with multiple condition checks
try:
    client.transact_write_items(
        TransactItems=[
            {
                'Update': {
                    'TableName': 'Accounts',
                    'Key': {'accountId': {'S': 'ACC-001'}},
                    'UpdateExpression': 'SET balance = balance - :amount',
                    'ConditionExpression': 'balance >= :amount',
                    'ExpressionAttributeValues': {
                        ':amount': {'N': '100'}
                    }
                }
            },
            {
                'Update': {
                    'TableName': 'Accounts',
                    'Key': {'accountId': {'S': 'ACC-002'}},
                    'UpdateExpression': 'SET balance = balance + :amount',
                    'ExpressionAttributeValues': {
                        ':amount': {'N': '100'}
                    }
                }
            }
        ]
    )
except client.exceptions.TransactionCanceledException as e:
    # Check which items caused the cancellation
    reasons = e.response['CancellationReasons']
    for i, reason in enumerate(reasons):
        if reason['Code'] == 'ConditionalCheckFailed':
            print(f"Condition failed on item {i}")
```

## Monitoring Condition Check Failures

If you're seeing a high rate of `ConditionalCheckFailedException` errors, it usually means you have high contention on specific items. You can monitor this through CloudWatch:

```bash
# Check the ConditionalCheckFailedRequests metric
aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name ConditionalCheckFailedRequests \
    --dimensions Name=TableName,Value=Products \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 3600 \
    --statistics Sum
```

A sustained high rate might mean you need to rethink your data model to reduce contention. For comprehensive monitoring of these patterns, check out [setting up proper alerting](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) so you know when contention becomes a problem.

## Key Takeaways

The `ConditionalCheckFailedException` isn't really an error to "fix" in most cases - it's a signal that your conditional logic is working correctly. The item just wasn't in the state you expected. Handle it gracefully with retries for optimistic locking, return meaningful messages for duplicate prevention, and monitor the rate to detect contention issues early. If you're seeing it unexpectedly, double-check your condition expressions against the actual data in the table.
