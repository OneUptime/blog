# How to Query DynamoDB with Boto3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Boto3, Python

Description: A comprehensive guide to querying DynamoDB tables using Boto3 in Python, covering key conditions, filters, pagination, indexes, and performance optimization.

---

DynamoDB querying trips up a lot of developers who come from a SQL background. There's no `SELECT * FROM users WHERE age > 25` here. DynamoDB requires you to think about access patterns up front, and the query API reflects that. Let's work through the different ways to get data out of DynamoDB using Boto3.

## Query vs Scan

Before writing any code, understand the fundamental difference: **Query** finds items based on partition key (and optionally sort key), while **Scan** reads every single item in the table and optionally filters the results. Query is efficient. Scan is expensive. Use Query whenever possible.

## Basic Query by Partition Key

The simplest query retrieves all items with a given partition key.

```python
import boto3
from boto3.dynamodb.conditions import Key

# Using the resource interface (recommended for queries)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Get all orders for a specific customer
response = table.query(
    KeyConditionExpression=Key('customer_id').eq('cust-12345')
)

items = response['Items']
print(f"Found {len(items)} orders")
for item in items:
    print(f"  Order: {item['order_id']} - ${item['total']}")
```

## Query with Sort Key Conditions

If your table has a sort key, you can narrow results further. This is where DynamoDB querying gets powerful.

```python
from boto3.dynamodb.conditions import Key
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Orders for a customer in 2026
response = table.query(
    KeyConditionExpression=(
        Key('customer_id').eq('cust-12345') &
        Key('order_date').begins_with('2026-')
    )
)

# Orders between two dates
response = table.query(
    KeyConditionExpression=(
        Key('customer_id').eq('cust-12345') &
        Key('order_date').between('2026-01-01', '2026-06-30')
    )
)

# Orders after a specific date
response = table.query(
    KeyConditionExpression=(
        Key('customer_id').eq('cust-12345') &
        Key('order_date').gt('2026-01-01')
    )
)

# Get the latest order (descending sort, limit 1)
response = table.query(
    KeyConditionExpression=Key('customer_id').eq('cust-12345'),
    ScanIndexForward=False,  # descending order
    Limit=1
)
latest_order = response['Items'][0] if response['Items'] else None
```

## Adding Filter Expressions

Filter expressions run after the query retrieves items, so they don't reduce the amount of data read from the table. But they're useful for narrowing results on non-key attributes.

```python
from boto3.dynamodb.conditions import Key, Attr
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Query by key, then filter by status
response = table.query(
    KeyConditionExpression=Key('customer_id').eq('cust-12345'),
    FilterExpression=Attr('status').eq('shipped')
)

# Multiple filter conditions
response = table.query(
    KeyConditionExpression=Key('customer_id').eq('cust-12345'),
    FilterExpression=(
        Attr('status').eq('delivered') &
        Attr('total').gt(50)
    )
)

# Check if an attribute exists
response = table.query(
    KeyConditionExpression=Key('customer_id').eq('cust-12345'),
    FilterExpression=Attr('tracking_number').exists()
)
```

## Projection Expressions

If you only need certain attributes, use a projection expression to reduce the data transferred.

```python
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Only return specific attributes
response = table.query(
    KeyConditionExpression=Key('customer_id').eq('cust-12345'),
    ProjectionExpression='order_id, order_date, #s, total',
    ExpressionAttributeNames={'#s': 'status'}  # 'status' is a reserved word
)

for item in response['Items']:
    print(f"{item['order_id']}: {item.get('status')} - ${item['total']}")
```

Note that `status` is a reserved word in DynamoDB, so you need to use `ExpressionAttributeNames` to alias it.

## Handling Pagination

DynamoDB returns a maximum of 1 MB per query. If there's more data, the response includes a `LastEvaluatedKey` that you pass to the next query.

```python
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

def query_all_items(customer_id):
    """Query all items, handling pagination automatically."""
    all_items = []
    kwargs = {
        'KeyConditionExpression': Key('customer_id').eq(customer_id)
    }

    while True:
        response = table.query(**kwargs)
        all_items.extend(response['Items'])

        # Check if there are more pages
        if 'LastEvaluatedKey' not in response:
            break

        # Pass the last key to get the next page
        kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']

    return all_items

orders = query_all_items('cust-12345')
print(f"Total orders: {len(orders)}")
```

## Querying Global Secondary Indexes

Global Secondary Indexes (GSIs) let you query on different key combinations. You need to specify the index name in your query.

```python
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Query using a GSI named 'status-date-index'
# This GSI has 'status' as partition key and 'order_date' as sort key
response = table.query(
    IndexName='status-date-index',
    KeyConditionExpression=(
        Key('status').eq('pending') &
        Key('order_date').gt('2026-01-01')
    )
)

print(f"Pending orders since Jan 2026: {len(response['Items'])}")
```

## Querying Local Secondary Indexes

Local Secondary Indexes (LSIs) share the same partition key as the table but use a different sort key.

```python
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Query using an LSI named 'customer-total-index'
# Same partition key (customer_id), different sort key (total)
response = table.query(
    IndexName='customer-total-index',
    KeyConditionExpression=(
        Key('customer_id').eq('cust-12345') &
        Key('total').gt(100)
    ),
    ScanIndexForward=False  # highest totals first
)

for item in response['Items']:
    print(f"Order {item['order_id']}: ${item['total']}")
```

## Using the Client Interface

If you prefer the low-level client interface, queries look a bit different. You work with raw expression strings and typed attribute values.

```python
import boto3

dynamodb = boto3.client('dynamodb')

response = dynamodb.query(
    TableName='orders',
    KeyConditionExpression='customer_id = :cid AND order_date > :date',
    FilterExpression='#s = :status',
    ExpressionAttributeNames={
        '#s': 'status'
    },
    ExpressionAttributeValues={
        ':cid': {'S': 'cust-12345'},
        ':date': {'S': '2026-01-01'},
        ':status': {'S': 'shipped'}
    }
)

for item in response['Items']:
    print(f"Order: {item['order_id']['S']}")
```

The resource interface is generally nicer for queries because it handles type marshalling automatically.

## Batch Get Items

If you already know the exact keys of the items you want, `batch_get_item` is more efficient than multiple individual queries.

```python
import boto3

dynamodb = boto3.resource('dynamodb')

# Get multiple specific items at once
response = dynamodb.batch_get_item(
    RequestItems={
        'orders': {
            'Keys': [
                {'customer_id': 'cust-12345', 'order_id': 'ord-001'},
                {'customer_id': 'cust-12345', 'order_id': 'ord-002'},
                {'customer_id': 'cust-67890', 'order_id': 'ord-003'}
            ],
            'ProjectionExpression': 'customer_id, order_id, total, #s',
            'ExpressionAttributeNames': {'#s': 'status'}
        }
    }
)

for item in response['Responses']['orders']:
    print(f"{item['customer_id']}: Order {item['order_id']} - ${item['total']}")

# Handle unprocessed keys (can happen under heavy load)
if response['UnprocessedKeys']:
    print("Some items weren't retrieved - retry needed")
```

## Performance Tips

Here are things that'll keep your DynamoDB queries fast and cheap:

- **Design your keys for your access patterns.** If you always query by user ID and date range, make those your partition and sort keys.
- **Use projection expressions** to avoid transferring attributes you don't need.
- **Prefer Query over Scan.** A scan reads the entire table and charges you for it.
- **Use GSIs wisely.** They duplicate data, which costs storage and write capacity.
- **Watch for hot partitions.** If one partition key gets way more traffic than others, you'll hit throughput limits.
- **Use `Limit` when you only need a few results.** It stops the query early, saving read capacity.

For handling the errors that queries can throw, especially throttling exceptions, see the guide on [handling Boto3 errors](https://oneuptime.com/blog/post/2026-02-12-boto3-errors-and-exceptions/view). If you're building a larger application with DynamoDB queries, make sure to monitor your table metrics to catch performance issues early.
