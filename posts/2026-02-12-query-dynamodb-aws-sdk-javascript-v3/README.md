# How to Query DynamoDB with AWS SDK for JavaScript v3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, JavaScript, Node.js

Description: Learn how to query DynamoDB tables using the AWS SDK for JavaScript v3, including key conditions, filters, pagination, indexes, and the DocumentClient.

---

Querying DynamoDB with the JavaScript v3 SDK works differently from what you might expect if you're used to SQL databases. DynamoDB is designed around specific access patterns, and your queries need to follow those patterns. Let's go through everything from basic queries to advanced patterns with indexes and pagination.

## Setting Up the DocumentClient

You have two options: the low-level DynamoDBClient or the higher-level DynamoDBDocumentClient. The DocumentClient is almost always what you want because it handles type marshalling automatically.

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    QueryCommand,
    GetCommand,
    ScanCommand
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false
    }
});
```

## Basic Query by Partition Key

The most fundamental query retrieves all items with a given partition key.

```javascript
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Get all orders for a customer
const response = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ExpressionAttributeValues: {
        ':cid': 'cust-12345'
    }
}));

console.log(`Found ${response.Count} orders`);
for (const item of response.Items) {
    console.log(`  Order: ${item.order_id} - $${item.total}`);
}
```

## Query with Sort Key Conditions

When your table has a sort key, you can use it to narrow results efficiently.

```javascript
// Orders after a specific date
const response = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid AND order_date > :date',
    ExpressionAttributeValues: {
        ':cid': 'cust-12345',
        ':date': '2026-01-01'
    }
}));

// Orders between two dates
const rangResponse = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression:
        'customer_id = :cid AND order_date BETWEEN :start AND :end',
    ExpressionAttributeValues: {
        ':cid': 'cust-12345',
        ':start': '2026-01-01',
        ':end': '2026-06-30'
    }
}));

// Orders with a sort key prefix (useful for hierarchical keys)
const prefixResponse = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression:
        'customer_id = :cid AND begins_with(order_id, :prefix)',
    ExpressionAttributeValues: {
        ':cid': 'cust-12345',
        ':prefix': 'ORD-2026'
    }
}));

// Get the latest order (descending sort)
const latestResponse = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ExpressionAttributeValues: { ':cid': 'cust-12345' },
    ScanIndexForward: false,  // descending order
    Limit: 1
}));

const latestOrder = latestResponse.Items[0];
```

## Filter Expressions

Filter expressions narrow results after the query reads items from the table. They don't reduce read capacity consumption, but they reduce the data sent over the wire.

```javascript
// Get shipped orders over $50
const response = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    FilterExpression: '#status = :status AND total > :minTotal',
    ExpressionAttributeNames: {
        '#status': 'status'  // 'status' is a reserved word
    },
    ExpressionAttributeValues: {
        ':cid': 'cust-12345',
        ':status': 'shipped',
        ':minTotal': 50
    }
}));

// Check for attribute existence
const withTracking = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    FilterExpression: 'attribute_exists(tracking_number)',
    ExpressionAttributeValues: {
        ':cid': 'cust-12345'
    }
}));

// Filter with IN operator
const multiStatus = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    FilterExpression: '#status IN (:s1, :s2)',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
        ':cid': 'cust-12345',
        ':s1': 'shipped',
        ':s2': 'delivered'
    }
}));
```

## Projection Expressions

Only retrieve the attributes you need to reduce data transfer.

```javascript
const response = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ProjectionExpression: 'order_id, order_date, total, #s',
    ExpressionAttributeNames: {
        '#s': 'status'
    },
    ExpressionAttributeValues: {
        ':cid': 'cust-12345'
    }
}));

// Items only contain the projected attributes
for (const item of response.Items) {
    console.log(`${item.order_id}: $${item.total} (${item.status})`);
}
```

## Handling Pagination

DynamoDB returns at most 1 MB per query. For larger result sets, you need to paginate.

This function handles pagination transparently and collects all results.

```javascript
async function queryAll(docClient, params) {
    const allItems = [];
    let lastEvaluatedKey = undefined;

    do {
        const queryParams = { ...params };
        if (lastEvaluatedKey) {
            queryParams.ExclusiveStartKey = lastEvaluatedKey;
        }

        const response = await docClient.send(new QueryCommand(queryParams));
        allItems.push(...response.Items);
        lastEvaluatedKey = response.LastEvaluatedKey;

        console.log(`Fetched ${response.Items.length} items ` +
            `(total: ${allItems.length})`);
    } while (lastEvaluatedKey);

    return allItems;
}

// Usage
const allOrders = await queryAll(docClient, {
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ExpressionAttributeValues: { ':cid': 'cust-12345' }
});
```

The SDK also provides a paginator for automatic pagination.

```javascript
import { DynamoDBClient, paginateQuery } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});

const paginator = paginateQuery(
    { client },
    {
        TableName: 'orders',
        KeyConditionExpression: 'customer_id = :cid',
        ExpressionAttributeValues: marshall({ ':cid': 'cust-12345' })
    }
);

const allItems = [];
for await (const page of paginator) {
    for (const item of page.Items || []) {
        allItems.push(unmarshall(item));
    }
}
```

## Querying Global Secondary Indexes

GSIs let you query on attributes that aren't part of the table's primary key.

```javascript
// Query a GSI named 'status-date-index'
const response = await docClient.send(new QueryCommand({
    TableName: 'orders',
    IndexName: 'status-date-index',
    KeyConditionExpression: '#status = :status AND order_date > :date',
    ExpressionAttributeNames: {
        '#status': 'status'
    },
    ExpressionAttributeValues: {
        ':status': 'pending',
        ':date': '2026-01-01'
    }
}));

console.log(`Pending orders since Jan 2026: ${response.Count}`);
```

## Using the Low-Level Client

If you need more control or aren't using the DocumentClient, here's how queries look with the base DynamoDB client.

```javascript
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});

const response = await client.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ExpressionAttributeValues: {
        ':cid': { S: 'cust-12345' }  // explicit type annotations
    }
}));

// Manually unmarshall the results
for (const item of response.Items) {
    const parsed = unmarshall(item);
    console.log(parsed);
}
```

## Batch Get for Known Keys

When you know the exact keys, BatchGetItem is more efficient than individual queries.

```javascript
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const response = await docClient.send(new BatchGetCommand({
    RequestItems: {
        'orders': {
            Keys: [
                { customer_id: 'cust-123', order_id: 'ord-001' },
                { customer_id: 'cust-123', order_id: 'ord-002' },
                { customer_id: 'cust-456', order_id: 'ord-003' }
            ]
        }
    }
}));

for (const item of response.Responses.orders) {
    console.log(`${item.customer_id}: ${item.order_id} - $${item.total}`);
}

// Handle unprocessed keys (retry if any)
if (Object.keys(response.UnprocessedKeys || {}).length > 0) {
    console.warn('Some items were not retrieved, need to retry');
}
```

## Best Practices

- **Use the DocumentClient.** It handles type marshalling and gives you native JavaScript types.
- **Always use Query over Scan** when possible. Scans read the entire table.
- **Design your keys for your access patterns.** This is the most important DynamoDB principle.
- **Use ProjectionExpression** to reduce data transfer and speed up queries.
- **Handle pagination in every query.** Even if you don't expect more than 1 MB of results today, your data will grow.
- **Use GSIs for alternate access patterns**, but remember they cost additional storage and write capacity.

For the Python equivalent of these operations, check out [querying DynamoDB with Boto3](https://oneuptime.com/blog/post/2026-02-12-query-dynamodb-boto3/view). For general SDK setup, see the [AWS SDK v3 client configuration guide](https://oneuptime.com/blog/post/2026-02-12-aws-sdk-v3-clients-nodejs/view).
