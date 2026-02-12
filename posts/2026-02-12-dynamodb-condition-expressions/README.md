# How to Write DynamoDB Condition Expressions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Conditional Writes, Data Integrity

Description: Learn how to use DynamoDB condition expressions for safe writes, including optimistic locking, preventing duplicates, and atomic conditional updates.

---

Condition expressions are DynamoDB's answer to transactions in traditional databases. They let you say "only perform this write if this condition is true." If the condition fails, the write is rejected and no data changes. This is how you prevent race conditions, avoid overwriting data, and enforce business rules at the database level.

Without condition expressions, two processes could read the same item, both decide to update it, and one would silently overwrite the other's changes. That's a recipe for data loss.

## The Basics

Condition expressions work with PutItem, UpdateItem, and DeleteItem operations. They're evaluated atomically - the check and the write happen as one operation.

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Only create the user if they don't already exist
async function createUser(userId, name, email) {
  const params = {
    TableName: 'Users',
    Item: {
      userId: userId,
      name: name,
      email: email,
      createdAt: new Date().toISOString()
    },
    // Prevent overwriting an existing user
    ConditionExpression: 'attribute_not_exists(userId)'
  };

  try {
    await docClient.put(params).promise();
    return { success: true };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return { success: false, reason: 'User already exists' };
    }
    throw error;
  }
}
```

If a user with that `userId` already exists, DynamoDB throws a `ConditionalCheckFailedException` instead of overwriting the item. This is how you prevent duplicate records.

## Condition Expression Operators

You have the same operators available as FilterExpressions:

```javascript
// Attribute existence checks
ConditionExpression: 'attribute_exists(email)'
ConditionExpression: 'attribute_not_exists(deletedAt)'

// Comparisons
ConditionExpression: 'stock > :zero'
ConditionExpression: 'price <= :maxPrice'
ConditionExpression: '#version = :expectedVersion'

// Between
ConditionExpression: 'quantity BETWEEN :min AND :max'

// String operations
ConditionExpression: 'begins_with(#status, :prefix)'
ConditionExpression: 'contains(tags, :tag)'

// Size
ConditionExpression: 'size(items) < :maxItems'

// Logical operators
ConditionExpression: '#status = :active AND stock > :zero'
ConditionExpression: '#status = :draft OR #status = :review'
ConditionExpression: 'NOT contains(blacklist, :userId)'
```

## Optimistic Locking

Optimistic locking is the most common use of condition expressions. You add a version number to each item. When updating, you check that the version hasn't changed since you last read it.

```javascript
// Read the current item and its version
async function getProduct(productId) {
  const result = await docClient.get({
    TableName: 'Products',
    Key: { productId }
  }).promise();
  return result.Item;
}

// Update only if the version matches what we read
async function updateProductPrice(productId, newPrice, expectedVersion) {
  const params = {
    TableName: 'Products',
    Key: { productId },
    UpdateExpression: 'SET price = :newPrice, version = :newVersion',
    ConditionExpression: 'version = :expectedVersion',
    ExpressionAttributeValues: {
      ':newPrice': newPrice,
      ':newVersion': expectedVersion + 1,
      ':expectedVersion': expectedVersion
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await docClient.update(params).promise();
    return result.Attributes;
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      // Someone else updated the item - retry with fresh data
      console.log('Concurrent modification detected, retrying...');
      const fresh = await getProduct(productId);
      return updateProductPrice(productId, newPrice, fresh.version);
    }
    throw error;
  }
}
```

This prevents the lost-update problem. If two processes read version 5 and both try to update, only one succeeds. The other gets an error and can retry with the latest data.

## Preventing Overwrites with PutItem

PutItem replaces the entire item. Without a condition, it silently overwrites existing data:

```javascript
// DANGEROUS: This silently overwrites any existing order
await docClient.put({
  TableName: 'Orders',
  Item: { orderId: 'ord-123', status: 'new', amount: 50 }
}).promise();

// SAFE: Only creates if the order doesn't exist
await docClient.put({
  TableName: 'Orders',
  Item: { orderId: 'ord-123', status: 'new', amount: 50 },
  ConditionExpression: 'attribute_not_exists(orderId)'
}).promise();
```

## Conditional Deletes

Delete an item only if it meets certain criteria:

```javascript
// Only delete a draft post - don't delete published ones
async function deleteDraftPost(postId) {
  const params = {
    TableName: 'Posts',
    Key: { postId },
    ConditionExpression: '#status = :draft',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':draft': 'draft' }
  };

  try {
    await docClient.delete(params).promise();
    return { deleted: true };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return { deleted: false, reason: 'Post is not in draft status' };
    }
    throw error;
  }
}
```

## Inventory Management

Condition expressions are perfect for inventory management where you need to prevent overselling:

```javascript
// Decrease stock only if enough items are available
async function decrementStock(productId, quantity) {
  const params = {
    TableName: 'Products',
    Key: { productId },
    UpdateExpression: 'SET stock = stock - :qty',
    ConditionExpression: 'stock >= :qty',
    ExpressionAttributeValues: {
      ':qty': quantity
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await docClient.update(params).promise();
    return {
      success: true,
      remainingStock: result.Attributes.stock
    };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        success: false,
        reason: 'Insufficient stock'
      };
    }
    throw error;
  }
}
```

Two simultaneous purchases can't both succeed if there's only one item left. DynamoDB evaluates the condition atomically.

## Status Transitions

Enforce valid state machine transitions:

```javascript
// Only allow specific status transitions
async function updateOrderStatus(orderId, newStatus) {
  // Define valid transitions
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
  };

  // Build a condition that checks the current status allows this transition
  const validFromStatuses = Object.entries(validTransitions)
    .filter(([_, targets]) => targets.includes(newStatus))
    .map(([from, _]) => from);

  if (validFromStatuses.length === 0) {
    return { success: false, reason: `No valid transition to ${newStatus}` };
  }

  // Build the condition dynamically
  const conditions = validFromStatuses.map((_, i) => `#status = :from${i}`).join(' OR ');
  const attrValues = {};
  validFromStatuses.forEach((status, i) => {
    attrValues[`:from${i}`] = status;
  });
  attrValues[':newStatus'] = newStatus;
  attrValues[':now'] = new Date().toISOString();

  const params = {
    TableName: 'Orders',
    Key: { orderId },
    UpdateExpression: 'SET #status = :newStatus, updatedAt = :now',
    ConditionExpression: conditions,
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: attrValues,
    ReturnValues: 'ALL_NEW'
  };

  try {
    const result = await docClient.update(params).promise();
    return { success: true, order: result.Attributes };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return { success: false, reason: `Invalid status transition to ${newStatus}` };
    }
    throw error;
  }
}
```

## Handling ConditionalCheckFailedException

Always catch and handle the exception gracefully. The three common strategies are:

**1. Retry with fresh data:**
```javascript
async function safeUpdate(key, updateFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const item = await docClient.get({ TableName: 'T', Key: key }).promise();

    try {
      return await updateFn(item.Item);
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException' && attempt < maxRetries - 1) {
        console.log(`Retry ${attempt + 1}/${maxRetries}`);
        continue;
      }
      throw error;
    }
  }
}
```

**2. Return an error to the caller:**
```javascript
if (error.code === 'ConditionalCheckFailedException') {
  return { statusCode: 409, body: 'Conflict: item was modified' };
}
```

**3. Use ReturnValuesOnConditionCheckFailure** to see what the current value is:
```javascript
const params = {
  TableName: 'Products',
  Key: { productId: 'prod-001' },
  UpdateExpression: 'SET stock = stock - :qty',
  ConditionExpression: 'stock >= :qty',
  ExpressionAttributeValues: { ':qty': 5 },
  ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
};
```

## Monitoring Conditional Write Failures

A spike in `ConditionalCheckFailedException` errors can indicate contention problems. If many processes are fighting over the same items, consider redesigning your data model to reduce conflicts.

Track these errors with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alarms/view) to spot patterns. High contention on specific items usually points to a hot partition or a design that forces too many writers to touch the same record.

## Wrapping Up

Condition expressions are essential for safe writes in DynamoDB. Use `attribute_not_exists` to prevent duplicates, version checks for optimistic locking, and value comparisons to enforce business rules. They're evaluated atomically with the write, so there's no window for race conditions. Always handle `ConditionalCheckFailedException` gracefully, whether that means retrying, returning an error, or escalating. The small overhead of checking a condition is nothing compared to the cost of data corruption from unguarded writes.
