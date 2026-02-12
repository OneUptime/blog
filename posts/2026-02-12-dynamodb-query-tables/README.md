# How to Query DynamoDB Tables Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Query, NoSQL

Description: Master DynamoDB query operations with practical examples covering key conditions, filtering, pagination, projection, and performance optimization.

---

Querying is the bread and butter of DynamoDB. If you can't query your data efficiently, nothing else matters. The good news is that DynamoDB queries are fast - single-digit millisecond latency. The bad news is that you need to structure your data around your queries, not the other way around.

This post covers everything you need to know about the Query operation: key conditions, sort key operators, filtering, pagination, and common pitfalls.

## Query vs. Scan: The Fundamental Difference

Before diving in, let's be clear about the difference. A **Query** targets a specific partition key and optionally narrows results by sort key. It reads only the items that match. A **Scan** reads every single item in the table and then optionally filters them.

For a table with a million items where you need 10, a Query reads 10 items. A Scan reads 1,000,000 items and discards 999,990. The cost and performance difference is enormous.

Always use Query when you can. Save Scan for data migrations, analytics exports, and other bulk operations. For more on this distinction, check out our post on [DynamoDB scan vs query](https://oneuptime.com/blog/post/dynamodb-scan-vs-query/view).

## Basic Query Structure

Every query requires a partition key value. Here's the simplest possible query:

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Query all items with a specific partition key
async function getOrdersByCustomer(customerId) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: {
      ':cid': customerId
    }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}
```

This returns all items where `customerId` matches the given value. If your table has a sort key, items come back sorted by that key (ascending by default).

## Sort Key Conditions

The real power of Query comes from sort key conditions. You can use these operators on the sort key:

```javascript
// Equals
KeyConditionExpression: 'pk = :pk AND sk = :sk'

// Less than
KeyConditionExpression: 'pk = :pk AND sk < :val'

// Less than or equal
KeyConditionExpression: 'pk = :pk AND sk <= :val'

// Greater than
KeyConditionExpression: 'pk = :pk AND sk > :val'

// Greater than or equal
KeyConditionExpression: 'pk = :pk AND sk >= :val'

// Between (inclusive on both ends)
KeyConditionExpression: 'pk = :pk AND sk BETWEEN :start AND :end'

// Begins with (prefix match)
KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)'
```

Let's put these to use:

```javascript
// Get orders from the last 30 days for a customer
async function getRecentOrders(customerId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid AND orderDate >= :start',
    ExpressionAttributeValues: {
      ':cid': customerId,
      ':start': thirtyDaysAgo.toISOString()
    }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}

// Get all orders in a date range
async function getOrdersInRange(customerId, startDate, endDate) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid AND orderDate BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':cid': customerId,
      ':start': startDate,
      ':end': endDate
    }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}
```

## Querying with begins_with

The `begins_with` operator is incredibly useful for hierarchical sort keys:

```javascript
// Single-table design: get all orders for a customer
// Sort keys look like "ORDER#2026-02-12#ord-123"
async function getCustomerOrders(customerId) {
  const params = {
    TableName: 'AppData',
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `CUST#${customerId}`,
      ':prefix': 'ORDER#'
    }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}

// Get orders from a specific month
async function getMonthlyOrders(customerId, yearMonth) {
  const params = {
    TableName: 'AppData',
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `CUST#${customerId}`,
      ':prefix': `ORDER#${yearMonth}`  // e.g., "ORDER#2026-02"
    }
  };

  return (await docClient.query(params).promise()).Items;
}
```

## Reversing Sort Order

By default, results are sorted ascending. Set `ScanIndexForward` to `false` for descending order:

```javascript
// Get the 5 most recent orders (newest first)
async function getLatestOrders(customerId) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: {
      ':cid': customerId
    },
    ScanIndexForward: false,  // Descending order
    Limit: 5                   // Only return 5 items
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}
```

This is efficient because DynamoDB reads from the end of the partition and stops after 5 items. It doesn't read all items and then sort them.

## Filtering Results

FilterExpressions let you narrow results beyond what key conditions support. But there's an important caveat: filtering happens after DynamoDB reads the data. You still pay for the read capacity of unfiltered items.

```javascript
// Get orders over $100 for a customer
async function getHighValueOrders(customerId) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: {
      ':cid': customerId,
      ':minAmount': 100
    },
    FilterExpression: 'orderAmount > :minAmount'
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}
```

If the customer has 1,000 orders and only 50 are over $100, DynamoDB reads all 1,000 but returns 50. You pay for 1,000 reads. This is why designing your key schema around your access patterns is so important.

## Projection: Fetching Only What You Need

Use ProjectionExpression to return only specific attributes. This reduces network transfer and can lower costs if your items are large:

```javascript
// Get only order IDs and amounts
async function getOrderSummaries(customerId) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: {
      ':cid': customerId
    },
    ProjectionExpression: 'orderId, orderAmount, orderDate, #s',
    ExpressionAttributeNames: {
      '#s': 'status'  // 'status' is a reserved word
    }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}
```

## Pagination

DynamoDB returns up to 1MB of data per Query. If there's more data, you'll get a `LastEvaluatedKey` in the response. Pass it as `ExclusiveStartKey` in the next call:

```javascript
// Paginate through all results
async function getAllOrders(customerId) {
  let allItems = [];
  let lastKey = undefined;

  do {
    const params = {
      TableName: 'Orders',
      KeyConditionExpression: 'customerId = :cid',
      ExpressionAttributeValues: { ':cid': customerId },
      ExclusiveStartKey: lastKey
    };

    const result = await docClient.query(params).promise();
    allItems = allItems.concat(result.Items);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return allItems;
}
```

For API endpoints, implement cursor-based pagination:

```javascript
// API-friendly pagination
async function getOrdersPage(customerId, pageSize, startKey) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: { ':cid': customerId },
    Limit: pageSize
  };

  if (startKey) {
    // Decode the cursor from base64
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(startKey, 'base64').toString()
    );
  }

  const result = await docClient.query(params).promise();

  return {
    items: result.Items,
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null
  };
}
```

For a deeper dive into pagination, see our post on [implementing pagination in DynamoDB queries](https://oneuptime.com/blog/post/dynamodb-pagination/view).

## Querying Global Secondary Indexes

Queries on GSIs work the same way, just specify the IndexName:

```javascript
// Query a GSI to find orders by status
async function getOrdersByStatus(status) {
  const params = {
    TableName: 'Orders',
    IndexName: 'status-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
}
```

## Consistent Reads

By default, queries use eventually consistent reads. For the most up-to-date data, use strongly consistent reads (costs 2x):

```javascript
const params = {
  TableName: 'Orders',
  KeyConditionExpression: 'customerId = :cid',
  ExpressionAttributeValues: { ':cid': customerId },
  ConsistentRead: true  // Strongly consistent read
};
```

Note: strongly consistent reads are not available on GSIs. If you need consistent reads, query the base table.

## Monitoring Query Performance

Keep an eye on `ConsumedCapacity` to understand query costs:

```javascript
const params = {
  TableName: 'Orders',
  KeyConditionExpression: 'customerId = :cid',
  ExpressionAttributeValues: { ':cid': customerId },
  ReturnConsumedCapacity: 'TOTAL'
};

const result = await docClient.query(params).promise();
console.log('Consumed capacity:', result.ConsumedCapacity);
```

Track query latency and consumed capacity in production with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alarms/view) to spot slow queries and optimize them before they become problems.

## Wrapping Up

Effective DynamoDB queries start with good table design. Put your most common access patterns in the key schema so Query can handle them directly. Use sort key operators to narrow your results. Be cautious with FilterExpressions - they don't reduce read costs. Paginate properly for large result sets. And always monitor consumed capacity to make sure your queries are as efficient as you think they are.
