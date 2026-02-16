# How to Implement Azure Table Storage Operations Using @azure/data-tables in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Table Storage, Node.js, data-tables, SDK, NoSQL, Cloud Storage, JavaScript

Description: Implement Azure Table Storage operations using the @azure/data-tables SDK in Node.js for lightweight structured data storage with efficient querying.

---

Azure Table Storage is the often-overlooked member of the Azure storage family. It is a NoSQL key-value store that is absurdly cheap and scales automatically. If you need to store structured data without the complexity of a full database, Table Storage is worth considering. It costs a fraction of what Cosmos DB does and handles millions of entities without breaking a sweat.

The `@azure/data-tables` package is the modern JavaScript SDK for Table Storage. It replaced the older `azure-storage` package and provides a cleaner, promise-based API with TypeScript support. In this post, we will go through all the common operations you need.

## When to Use Table Storage

Table Storage works well for:
- Application logs and telemetry data
- User settings and preferences
- IoT device state and readings
- Session storage
- Metadata for files stored in Blob Storage

It is less suitable when you need:
- Complex queries with joins
- Secondary indexes (Table Storage only supports PartitionKey and RowKey)
- Transactions across partitions
- Rich data types (Table Storage supports basic types only)

## Setup

```bash
npm install @azure/data-tables dotenv
```

## Understanding the Data Model

Table Storage has a simple data model. Every entity has:
- **PartitionKey**: Groups related entities together. Entities in the same partition are stored on the same server.
- **RowKey**: Uniquely identifies an entity within a partition.
- **Timestamp**: Automatically managed by the service.
- **Properties**: Up to 252 custom properties per entity.

The combination of PartitionKey and RowKey uniquely identifies an entity in a table.

## Initialize the Client

```javascript
// src/table-client.js
// Initialize the Azure Table Storage client
const { TableClient, TableServiceClient, AzureNamedKeyCredential } = require('@azure/data-tables');
require('dotenv').config();

const accountName = process.env.AZURE_STORAGE_ACCOUNT;
const accountKey = process.env.AZURE_STORAGE_KEY;

// Create a credential object
const credential = new AzureNamedKeyCredential(accountName, accountKey);

// Create a service client for table-level operations
const serviceClient = new TableServiceClient(
  `https://${accountName}.table.core.windows.net`,
  credential
);

// Create a table client for entity operations
function getTableClient(tableName) {
  return new TableClient(
    `https://${accountName}.table.core.windows.net`,
    tableName,
    credential
  );
}

// Ensure a table exists
async function ensureTable(tableName) {
  try {
    await serviceClient.createTable(tableName);
    console.log(`Table '${tableName}' created`);
  } catch (err) {
    if (err.statusCode === 409) {
      // Table already exists, that is fine
      console.log(`Table '${tableName}' already exists`);
    } else {
      throw err;
    }
  }
}

module.exports = { getTableClient, ensureTable, serviceClient };
```

## CRUD Operations

Here is a complete example for managing user settings in Table Storage.

```javascript
// src/user-settings.js
// CRUD operations for user settings stored in Azure Table Storage
const { getTableClient, ensureTable } = require('./table-client');

const TABLE_NAME = 'UserSettings';
let tableClient;

async function initialize() {
  await ensureTable(TABLE_NAME);
  tableClient = getTableClient(TABLE_NAME);
}

// CREATE - Save a user setting
async function saveSetting(userId, settingName, value) {
  const entity = {
    partitionKey: userId,          // Group settings by user
    rowKey: settingName,           // Each setting is a unique row
    value: JSON.stringify(value),  // Store complex values as JSON strings
    dataType: typeof value,
    updatedAt: new Date().toISOString(),
  };

  // Upsert - create or replace the entity
  await tableClient.upsertEntity(entity, 'Replace');
  console.log(`Saved setting ${settingName} for user ${userId}`);
  return entity;
}

// READ - Get a single setting
async function getSetting(userId, settingName) {
  try {
    const entity = await tableClient.getEntity(userId, settingName);
    return {
      name: entity.rowKey,
      value: JSON.parse(entity.value),
      dataType: entity.dataType,
      updatedAt: entity.updatedAt,
    };
  } catch (err) {
    if (err.statusCode === 404) {
      return null;  // Setting not found
    }
    throw err;
  }
}

// READ - Get all settings for a user
async function getAllSettings(userId) {
  const settings = {};

  // Query all entities with the given partition key
  const entities = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${userId}'`,
    },
  });

  for await (const entity of entities) {
    settings[entity.rowKey] = {
      value: JSON.parse(entity.value),
      dataType: entity.dataType,
      updatedAt: entity.updatedAt,
    };
  }

  return settings;
}

// UPDATE - Update a setting (merge, not replace)
async function updateSetting(userId, settingName, value) {
  // Merge only updates the specified properties, leaving others unchanged
  await tableClient.updateEntity(
    {
      partitionKey: userId,
      rowKey: settingName,
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    },
    'Merge'
  );
  console.log(`Updated setting ${settingName} for user ${userId}`);
}

// DELETE - Remove a setting
async function deleteSetting(userId, settingName) {
  try {
    await tableClient.deleteEntity(userId, settingName);
    console.log(`Deleted setting ${settingName} for user ${userId}`);
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;  // Already deleted
    }
    throw err;
  }
}

// DELETE - Remove all settings for a user
async function deleteAllSettings(userId) {
  const entities = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${userId}'`,
    },
  });

  let count = 0;
  for await (const entity of entities) {
    await tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
    count++;
  }

  console.log(`Deleted ${count} settings for user ${userId}`);
  return count;
}

module.exports = {
  initialize,
  saveSetting,
  getSetting,
  getAllSettings,
  updateSetting,
  deleteSetting,
  deleteAllSettings,
};
```

## Batch Operations

Table Storage supports batch operations within a single partition. This is useful for transactional writes.

```javascript
// src/batch-operations.js
// Batch operations for Azure Table Storage
const { getTableClient } = require('./table-client');

async function batchInsert(tableName, partitionKey, entities) {
  /**
   * Insert multiple entities in a single transaction.
   * All entities must be in the same partition.
   * Maximum 100 entities per batch.
   */
  const tableClient = getTableClient(tableName);
  const actions = [];

  for (const entity of entities) {
    actions.push(['create', { partitionKey, rowKey: entity.rowKey, ...entity }]);
  }

  // Execute the batch - all operations succeed or all fail
  const result = await tableClient.submitTransaction(actions);
  console.log(`Batch inserted ${result.subResponses.length} entities`);
  return result;
}

async function batchMixedOperations(tableName, partitionKey) {
  /**
   * A batch can contain a mix of create, update, and delete operations.
   */
  const tableClient = getTableClient(tableName);

  const actions = [
    // Create a new entity
    ['create', { partitionKey, rowKey: 'new-item', data: 'hello' }],

    // Update an existing entity (merge)
    ['update', { partitionKey, rowKey: 'existing-item', data: 'updated' }, 'Merge'],

    // Upsert (create or replace)
    ['upsert', { partitionKey, rowKey: 'maybe-exists', data: 'upserted' }, 'Replace'],

    // Delete an entity
    ['delete', { partitionKey, rowKey: 'old-item' }],
  ];

  return await tableClient.submitTransaction(actions);
}
```

## Querying with Filters

Table Storage supports OData filter expressions for querying entities.

```javascript
// src/queries.js
// Query patterns for Azure Table Storage
const { getTableClient } = require('./table-client');

async function queryByDateRange(tableName, partitionKey, startDate, endDate) {
  /**
   * Query entities within a date range.
   * The Timestamp property is automatically maintained.
   */
  const tableClient = getTableClient(tableName);

  const entities = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}' and Timestamp ge datetime'${startDate}' and Timestamp le datetime'${endDate}'`,
    },
  });

  const results = [];
  for await (const entity of entities) {
    results.push(entity);
  }
  return results;
}

async function queryWithSelect(tableName, partitionKey, selectFields) {
  /**
   * Query entities but only return specific properties.
   * Reduces bandwidth and improves performance.
   */
  const tableClient = getTableClient(tableName);

  const entities = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}'`,
      select: selectFields,  // e.g., ['rowKey', 'value', 'updatedAt']
    },
  });

  const results = [];
  for await (const entity of entities) {
    results.push(entity);
  }
  return results;
}

async function queryWithPagination(tableName, partitionKey, pageSize = 100) {
  /**
   * Query with manual pagination using the byPage() iterator.
   */
  const tableClient = getTableClient(tableName);

  const pages = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}'`,
    },
  }).byPage({ maxPageSize: pageSize });

  const allPages = [];
  for await (const page of pages) {
    allPages.push(page);
    console.log(`Page with ${page.length} entities`);

    // You can also get the continuation token for the next page
    // This is useful for building API pagination
  }

  return allPages;
}

async function queryTopN(tableName, partitionKey, n) {
  /**
   * Get the first N entities matching a filter.
   * Note: Table Storage does not support ORDER BY, so results
   * are ordered by PartitionKey then RowKey.
   */
  const tableClient = getTableClient(tableName);

  const entities = tableClient.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}'`,
    },
  });

  const results = [];
  for await (const entity of entities) {
    results.push(entity);
    if (results.length >= n) break;
  }
  return results;
}
```

## Express.js Integration

Putting it together in an Express.js API.

```javascript
// src/api.js
// Express API for user settings backed by Azure Table Storage
const express = require('express');
const settings = require('./user-settings');

const router = express.Router();

// Get all settings for a user
router.get('/users/:userId/settings', async (req, res, next) => {
  try {
    const allSettings = await settings.getAllSettings(req.params.userId);
    res.json(allSettings);
  } catch (err) {
    next(err);
  }
});

// Get a specific setting
router.get('/users/:userId/settings/:name', async (req, res, next) => {
  try {
    const setting = await settings.getSetting(req.params.userId, req.params.name);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (err) {
    next(err);
  }
});

// Create or update a setting
router.put('/users/:userId/settings/:name', async (req, res, next) => {
  try {
    const entity = await settings.saveSetting(
      req.params.userId,
      req.params.name,
      req.body.value
    );
    res.json(entity);
  } catch (err) {
    next(err);
  }
});

// Delete a setting
router.delete('/users/:userId/settings/:name', async (req, res, next) => {
  try {
    await settings.deleteSetting(req.params.userId, req.params.name);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

## Performance Tips

- **Partition key design**: Choose a partition key that distributes data evenly. Using the user ID as the partition key works well for user-scoped data.
- **Point queries**: Reading an entity by PartitionKey + RowKey is the fastest operation (single server lookup).
- **Avoid full table scans**: Always include the PartitionKey in your filter. Queries without it scan the entire table.
- **Batch within partitions**: Batch operations are atomic within a partition. Use them for related writes.
- **Use Select to limit properties**: If you only need a few fields, specify them in the select option to reduce bandwidth.

## Summary

Azure Table Storage with the `@azure/data-tables` SDK gives you a cheap, scalable NoSQL store for structured data. The API is straightforward - you have entities with partition keys and row keys, and you can query them with OData filters. The main limitations are the lack of secondary indexes and the simple query language. But for many use cases - user settings, telemetry, device state, metadata - Table Storage is the right tool at a fraction of the cost of a full database service.
