# How to Use DynamoDB ProjectionExpressions to Limit Returned Attributes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Query, Performance

Description: Master DynamoDB ProjectionExpressions to fetch only the attributes you need, reducing data transfer, improving performance, and lowering costs.

---

When you query DynamoDB, it returns all attributes of each matching item by default. If your items have 50 attributes and you only need 3, you're transferring 47 attributes worth of data for nothing. ProjectionExpressions let you specify exactly which attributes you want back.

This isn't just about clean code. It can genuinely reduce your costs and improve performance, especially when items are large or you're fetching many of them.

## The Basics

A ProjectionExpression is a comma-separated list of attribute names to include in the response:

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Only return name and email from each user
async function getUserSummaries(orgId) {
  const params = {
    TableName: 'Users',
    KeyConditionExpression: 'orgId = :org',
    ExpressionAttributeValues: {
      ':org': orgId
    },
    ProjectionExpression: 'userId, #name, email',
    ExpressionAttributeNames: {
      '#name': 'name'  // 'name' is a reserved word
    }
  };

  const result = await docClient.query(params).promise();
  return result.Items;
  // Returns: [{ userId: "u1", name: "Jane", email: "jane@co.com" }, ...]
}
```

Without the ProjectionExpression, you'd get every attribute: address, phone, preferences, metadata, and everything else stored on the user item.

## How It Affects Costs

DynamoDB charges for reads based on item size. One read capacity unit (RCU) covers 4KB for a strongly consistent read. Here's where it gets nuanced:

For **Query** and **Scan** operations, DynamoDB reads the full item from storage first, then applies the projection. The RCU cost is based on the full item size, not the projected size.

Wait, then what's the point? There are two real benefits:

1. **Reduced data transfer** - less data over the network means faster responses
2. **GSI projections** - if you project only certain attributes into a GSI, queries on that GSI only read the projected attributes

So ProjectionExpressions save network bandwidth and client-side processing time, but don't directly reduce RCU consumption for base table queries.

## Projecting Nested Attributes

You can project specific attributes from nested maps using dot notation:

```javascript
// Only get the city from the nested address map
const params = {
  TableName: 'Users',
  KeyConditionExpression: 'orgId = :org',
  ExpressionAttributeValues: { ':org': orgId },
  ProjectionExpression: 'userId, #name, address.city, address.state',
  ExpressionAttributeNames: { '#name': 'name' }
};

// Returns: [{ userId: "u1", name: "Jane", address: { city: "SF", state: "CA" } }]
```

DynamoDB returns the nested structure with only the specified attributes. If you project `address.city`, you get `{ address: { city: "SF" } }` instead of the full address object.

## Projecting List Elements

You can project specific elements from a list by index:

```javascript
// Get only the first tag from a tags list
const params = {
  TableName: 'Posts',
  KeyConditionExpression: 'authorId = :author',
  ExpressionAttributeValues: { ':author': 'user-001' },
  ProjectionExpression: 'postId, title, tags[0], tags[1]'
};

// Returns: [{ postId: "p1", title: "My Post", tags: ["aws", "dynamodb"] }]
```

This is useful when you have list attributes with many elements but only need the first few.

## Using ProjectionExpressions with GetItem

ProjectionExpressions work with all read operations - GetItem, Query, Scan, and BatchGetItem:

```javascript
// GetItem with projection
async function getUserEmail(userId) {
  const params = {
    TableName: 'Users',
    Key: { userId: userId },
    ProjectionExpression: 'email, #name',
    ExpressionAttributeNames: { '#name': 'name' }
  };

  const result = await docClient.get(params).promise();
  return result.Item;
}

// BatchGetItem with projection
async function getUserEmails(userIds) {
  const params = {
    RequestItems: {
      Users: {
        Keys: userIds.map(id => ({ userId: id })),
        ProjectionExpression: 'userId, email, #name',
        ExpressionAttributeNames: { '#name': 'name' }
      }
    }
  };

  const result = await docClient.batchGet(params).promise();
  return result.Responses.Users;
}
```

## Real-World Use Cases

### API Responses

When building APIs, you rarely need to return every attribute to the client:

```javascript
// List endpoint - return minimal data
async function listProducts(categoryId) {
  const params = {
    TableName: 'Products',
    KeyConditionExpression: 'categoryId = :cat',
    ExpressionAttributeValues: { ':cat': categoryId },
    ProjectionExpression: 'productId, title, price, thumbnailUrl, rating'
    // Skips: fullDescription, specifications, reviews, inventory, etc.
  };

  return (await docClient.query(params).promise()).Items;
}

// Detail endpoint - return everything
async function getProductDetail(productId) {
  const params = {
    TableName: 'Products',
    Key: { productId: productId }
    // No ProjectionExpression - returns all attributes
  };

  return (await docClient.get(params).promise()).Item;
}
```

### Checking Existence

Sometimes you just need to know if an item exists:

```javascript
// Check if a user exists without fetching all their data
async function userExists(userId) {
  const params = {
    TableName: 'Users',
    Key: { userId: userId },
    ProjectionExpression: 'userId'  // Minimal projection
  };

  const result = await docClient.get(params).promise();
  return !!result.Item;
}
```

### Aggregation Queries

When computing aggregates, only fetch the attributes you're summing or counting:

```javascript
// Calculate total order value for a customer
async function getCustomerSpend(customerId) {
  let totalSpend = 0;
  let lastKey = undefined;

  do {
    const params = {
      TableName: 'Orders',
      KeyConditionExpression: 'customerId = :cid',
      ExpressionAttributeValues: { ':cid': customerId },
      ProjectionExpression: 'orderAmount',  // Only fetch the amount
      ExclusiveStartKey: lastKey
    };

    const result = await docClient.query(params).promise();

    for (const item of result.Items) {
      totalSpend += item.orderAmount;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return totalSpend;
}
```

## GSI Projections: Where Real Savings Happen

The biggest cost savings from projections come from Global Secondary Indexes. When you create a GSI, you choose which attributes to project into it:

- **KEYS_ONLY** - only the table and index keys
- **INCLUDE** - keys plus specified attributes
- **ALL** - all attributes (same as the base table)

```bash
# Create a GSI that only includes specific attributes
aws dynamodb update-table \
  --table-name Products \
  --attribute-definitions \
    AttributeName=categoryId,AttributeType=S \
  --global-secondary-index-updates '[
    {
      "Create": {
        "IndexName": "category-price-index",
        "KeySchema": [
          {"AttributeName": "categoryId", "KeyType": "HASH"},
          {"AttributeName": "price", "KeyType": "RANGE"}
        ],
        "Projection": {
          "ProjectionType": "INCLUDE",
          "NonKeyAttributes": ["title", "thumbnailUrl", "rating"]
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 10,
          "WriteCapacityUnits": 5
        }
      }
    }
  ]'
```

When you query this GSI, each item is much smaller than the base table item. Since GSI reads are charged based on the projected item size, you genuinely save RCUs:

```javascript
// Query the lean GSI - lower cost per read
const params = {
  TableName: 'Products',
  IndexName: 'category-price-index',
  KeyConditionExpression: 'categoryId = :cat AND price <= :maxPrice',
  ExpressionAttributeValues: {
    ':cat': 'electronics',
    ':maxPrice': 100
  }
  // Items only contain: categoryId, price, productId, title, thumbnailUrl, rating
};
```

If the full product item is 10KB but the GSI item is only 500 bytes, you're reading 20x less data per item.

## Common Mistakes

### Forgetting Reserved Words

Many common attribute names are reserved in DynamoDB. If your projection fails with a validation error, check if you need ExpressionAttributeNames:

```javascript
// This FAILS - 'name', 'status', 'data', 'count' are reserved
ProjectionExpression: 'name, status, data, count'

// This WORKS
ProjectionExpression: '#n, #s, #d, #c',
ExpressionAttributeNames: {
  '#n': 'name',
  '#s': 'status',
  '#d': 'data',
  '#c': 'count'
}
```

### Projecting Non-Existent Attributes

If you project an attribute that doesn't exist on an item, it's simply omitted from the result. No error is thrown:

```javascript
// If 'middleName' doesn't exist, it's just missing from the result
ProjectionExpression: 'firstName, middleName, lastName'
// Returns: { firstName: "Jane", lastName: "Smith" }
```

### Using Projection with ConditionExpressions

ProjectionExpressions only affect what's returned, not what's evaluated. You can filter on attributes that aren't in your projection:

```javascript
// Filter on orderAmount but don't return it
const params = {
  TableName: 'Orders',
  KeyConditionExpression: 'customerId = :cid',
  FilterExpression: 'orderAmount > :min',
  ProjectionExpression: 'orderId, orderDate, #status',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':cid': 'cust-001',
    ':min': 100
  }
};
```

## Performance Impact

For items under 4KB, the RCU savings from projection are negligible on the base table. The real benefit is reduced network transfer. If you're fetching thousands of items in a loop, projecting only what you need can cut response times significantly.

Use [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to monitor your DynamoDB latency and throughput. If you see high latency on read operations, check whether large items and full-attribute fetches are contributing.

## Wrapping Up

ProjectionExpressions are a simple optimization that's easy to overlook. They won't change your RCU bill for base table queries, but they reduce data transfer and speed up responses. The real savings come from smart GSI projections - include only the attributes your queries need, and you'll pay a fraction of the cost. Make projection a habit: for every query, ask yourself which attributes the caller actually needs and project only those.
