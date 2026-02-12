# How to Write DynamoDB Update Expressions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Update Expressions, NoSQL

Description: A comprehensive guide to DynamoDB update expressions covering SET, REMOVE, ADD, and DELETE operations with practical examples for real-world scenarios.

---

Update expressions are how you modify existing items in DynamoDB without replacing them entirely. Instead of reading an item, changing a field, and writing the whole thing back, you tell DynamoDB exactly which attributes to change. This is more efficient, safer for concurrent access, and uses less write capacity.

The update expression language has four actions: SET, REMOVE, ADD, and DELETE. Each does something different, and you can combine multiple actions in a single update.

## The SET Action

SET is the most commonly used action. It creates or overwrites an attribute:

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Update a user's email and name
async function updateUserProfile(userId, name, email) {
  const params = {
    TableName: 'Users',
    Key: { userId },
    UpdateExpression: 'SET #name = :name, email = :email, updatedAt = :now',
    ExpressionAttributeNames: {
      '#name': 'name'  // 'name' is a reserved word
    },
    ExpressionAttributeValues: {
      ':name': name,
      ':email': email,
      ':now': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'  // Return the updated item
  };

  const result = await docClient.update(params).promise();
  return result.Attributes;
}
```

SET can also do arithmetic. You can increment or decrement numeric attributes:

```javascript
// Increment a counter
async function incrementViewCount(articleId) {
  const params = {
    TableName: 'Articles',
    Key: { articleId },
    UpdateExpression: 'SET viewCount = viewCount + :inc',
    ExpressionAttributeValues: {
      ':inc': 1
    }
  };

  await docClient.update(params).promise();
}

// Set an attribute only if it doesn't already exist
async function setDefaultPreferences(userId) {
  const params = {
    TableName: 'Users',
    Key: { userId },
    UpdateExpression: 'SET preferences = if_not_exists(preferences, :defaults)',
    ExpressionAttributeValues: {
      ':defaults': {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }
  };

  await docClient.update(params).promise();
}
```

The `if_not_exists` function is particularly useful. It sets the attribute only if it doesn't exist yet, making it safe to call repeatedly.

## The REMOVE Action

REMOVE deletes attributes from an item:

```javascript
// Remove optional attributes from a user profile
async function clearUserPhone(userId) {
  const params = {
    TableName: 'Users',
    Key: { userId },
    UpdateExpression: 'REMOVE phoneNumber, faxNumber'
  };

  await docClient.update(params).promise();
}

// Remove an element from a list by index
async function removeTagByIndex(articleId, tagIndex) {
  const params = {
    TableName: 'Articles',
    Key: { articleId },
    UpdateExpression: `REMOVE tags[${tagIndex}]`
  };

  await docClient.update(params).promise();
}
```

Removing a list element shifts the remaining elements. If you remove index 2 from a 5-element list, the list becomes 4 elements and the old index 3 becomes index 2.

## The ADD Action

ADD works differently depending on the data type:

For **numbers**, it adds the value (increment/decrement):
```javascript
// Add 5 to the stock count
async function addStock(productId, quantity) {
  const params = {
    TableName: 'Products',
    Key: { productId },
    UpdateExpression: 'ADD stock :qty',
    ExpressionAttributeValues: {
      ':qty': quantity  // positive to add, negative to subtract
    }
  };

  await docClient.update(params).promise();
}
```

For **sets** (String Set, Number Set, Binary Set), it adds elements:
```javascript
// Add tags to a String Set
async function addTags(articleId, newTags) {
  const params = {
    TableName: 'Articles',
    Key: { articleId },
    UpdateExpression: 'ADD tags :newTags',
    ExpressionAttributeValues: {
      ':newTags': docClient.createSet(newTags)
    }
  };

  await docClient.update(params).promise();
}

// Usage: addTags('art-001', ['aws', 'dynamodb', 'nosql'])
```

If the attribute doesn't exist, ADD creates it. For numbers, it creates the attribute with the given value. For sets, it creates a new set.

## The DELETE Action

DELETE removes elements from a set (not to be confused with REMOVE, which removes entire attributes):

```javascript
// Remove specific tags from a String Set
async function removeTags(articleId, tagsToRemove) {
  const params = {
    TableName: 'Articles',
    Key: { articleId },
    UpdateExpression: 'DELETE tags :tagsToRemove',
    ExpressionAttributeValues: {
      ':tagsToRemove': docClient.createSet(tagsToRemove)
    }
  };

  await docClient.update(params).promise();
}

// Usage: removeTags('art-001', ['outdated', 'deprecated'])
```

## Combining Multiple Actions

You can mix SET, REMOVE, ADD, and DELETE in a single update expression:

```javascript
// Complex update: set some fields, remove others, increment a counter
async function processOrderShipment(orderId, trackingNumber) {
  const params = {
    TableName: 'Orders',
    Key: { orderId },
    UpdateExpression: `
      SET #status = :shipped,
          trackingNumber = :tracking,
          shippedAt = :now,
          version = version + :one
      REMOVE estimatedDelivery
      ADD shipmentCount :one
    `,
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':shipped': 'shipped',
      ':tracking': trackingNumber,
      ':now': new Date().toISOString(),
      ':one': 1
    },
    ReturnValues: 'ALL_NEW'
  };

  const result = await docClient.update(params).promise();
  return result.Attributes;
}
```

Each action type appears once in the expression, but can operate on multiple attributes separated by commas.

## Working with Lists

Lists are a common data type and updates on them have a few quirks:

```javascript
// Append to a list
async function addComment(postId, comment) {
  const params = {
    TableName: 'Posts',
    Key: { postId },
    UpdateExpression: 'SET comments = list_append(if_not_exists(comments, :empty), :newComment)',
    ExpressionAttributeValues: {
      ':newComment': [comment],
      ':empty': []
    }
  };

  await docClient.update(params).promise();
}

// Prepend to a list (new item goes to the front)
async function prependNotification(userId, notification) {
  const params = {
    TableName: 'Users',
    Key: { userId },
    UpdateExpression: 'SET notifications = list_append(:new, if_not_exists(notifications, :empty))',
    ExpressionAttributeValues: {
      ':new': [notification],
      ':empty': []
    }
  };

  await docClient.update(params).promise();
}

// Update a specific list element by index
async function updateListItem(postId, commentIndex, newText) {
  const params = {
    TableName: 'Posts',
    Key: { postId },
    UpdateExpression: `SET comments[${commentIndex}].text = :newText`,
    ExpressionAttributeValues: {
      ':newText': newText
    }
  };

  await docClient.update(params).promise();
}
```

Notice the `if_not_exists` wrapped around the list in the append operations. Without it, the update fails if the list attribute doesn't exist yet.

## Working with Maps

You can update individual fields within a map without replacing the whole thing:

```javascript
// Update a nested map attribute
async function updateUserAddress(userId, city, state) {
  const params = {
    TableName: 'Users',
    Key: { userId },
    UpdateExpression: 'SET address.city = :city, address.#state = :state',
    ExpressionAttributeNames: {
      '#state': 'state'  // Reserved word
    },
    ExpressionAttributeValues: {
      ':city': city,
      ':state': state
    }
  };

  await docClient.update(params).promise();
}

// Add a new key to a map
async function addMetadata(itemId, key, value) {
  const params = {
    TableName: 'Items',
    Key: { itemId },
    UpdateExpression: 'SET metadata.#key = :value',
    ExpressionAttributeNames: { '#key': key },
    ExpressionAttributeValues: { ':value': value }
  };

  await docClient.update(params).promise();
}
```

If the parent map doesn't exist, DynamoDB throws an error. Create it first or use a conditional approach:

```javascript
// Safe map update - create the map if it doesn't exist
async function safeMapUpdate(itemId, key, value) {
  try {
    // Try to update the nested field
    await docClient.update({
      TableName: 'Items',
      Key: { itemId },
      UpdateExpression: 'SET metadata.#key = :value',
      ConditionExpression: 'attribute_exists(metadata)',
      ExpressionAttributeNames: { '#key': key },
      ExpressionAttributeValues: { ':value': value }
    }).promise();
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      // Map doesn't exist - create it
      await docClient.update({
        TableName: 'Items',
        Key: { itemId },
        UpdateExpression: 'SET metadata = :map',
        ExpressionAttributeValues: {
          ':map': { [key]: value }
        }
      }).promise();
    } else {
      throw error;
    }
  }
}
```

## ReturnValues Options

The `ReturnValues` parameter lets you see the item before or after the update:

```javascript
// NONE - returns nothing (default)
ReturnValues: 'NONE'

// ALL_OLD - returns the item as it was before the update
ReturnValues: 'ALL_OLD'

// ALL_NEW - returns the item after the update
ReturnValues: 'ALL_NEW'

// UPDATED_OLD - returns only the updated attributes, with old values
ReturnValues: 'UPDATED_OLD'

// UPDATED_NEW - returns only the updated attributes, with new values
ReturnValues: 'UPDATED_NEW'
```

Using `ALL_NEW` is common when you want to return the updated item to the client without an extra read.

## Building Update Expressions Dynamically

When you don't know which fields need updating at compile time, build the expression dynamically:

```javascript
// Dynamic update builder
function buildUpdateExpression(updates) {
  const expressions = [];
  const names = {};
  const values = {};
  let counter = 0;

  for (const [key, value] of Object.entries(updates)) {
    const nameAlias = `#attr${counter}`;
    const valueAlias = `:val${counter}`;

    expressions.push(`${nameAlias} = ${valueAlias}`);
    names[nameAlias] = key;
    values[valueAlias] = value;
    counter++;
  }

  return {
    UpdateExpression: 'SET ' + expressions.join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  };
}

// Usage
async function updateItem(tableName, key, updates) {
  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
    buildUpdateExpression(updates);

  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  const result = await docClient.update(params).promise();
  return result.Attributes;
}

// Call it
await updateItem('Users', { userId: 'u1' }, {
  name: 'New Name',
  email: 'new@email.com',
  updatedAt: new Date().toISOString()
});
```

## Monitoring Update Performance

Track your update operations for latency and throttling. Frequent `ConditionalCheckFailedExceptions` combined with updates on the same keys can indicate contention. Monitor with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alarms/view) to catch these patterns early.

## Wrapping Up

Update expressions are the right way to modify DynamoDB items. They're more efficient than read-modify-write cycles, they reduce the risk of lost updates, and they support atomic operations like counters. Master the four actions - SET for creating and modifying, REMOVE for deleting attributes, ADD for incrementing and set unions, DELETE for set removals - and you'll have the tools to handle any update pattern. Combine them with condition expressions for safe concurrent writes, and you've got a solid foundation for your data layer.
