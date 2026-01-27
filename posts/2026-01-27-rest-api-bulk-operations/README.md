# How to Implement Bulk Operations in REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, Bulk Operations, API Design, Performance, Batch Processing

Description: Learn how to design and implement bulk operations in REST APIs for creating, updating, and deleting multiple resources efficiently.

---

> Processing resources one at a time creates unnecessary network overhead and degrades user experience. Bulk operations let clients create, update, or delete multiple resources in a single request - reducing latency, simplifying error handling, and improving throughput.

When your API only supports single-resource operations, clients making 100 changes must make 100 requests. With bulk operations, the same work completes in one round trip.

---

## Why Bulk Operations Matter

| Single Operations | Bulk Operations |
|-------------------|-----------------|
| 100 requests for 100 items | 1 request for 100 items |
| 100x network latency | 1x network latency |
| Complex client-side retry logic | Server handles partial failures |
| Hard to maintain consistency | Can use transactions |

Common use cases:
- Importing CSV or spreadsheet data
- Syncing offline changes
- Batch status updates
- Deleting multiple selected items
- Initial data seeding

---

## Endpoint Design Patterns

There are several approaches to designing bulk endpoints:

### Pattern 1: Dedicated Bulk Endpoint

```
POST /api/v1/users/bulk
POST /api/v1/users/bulk-create
POST /api/v1/users/bulk-update
DELETE /api/v1/users/bulk-delete
```

### Pattern 2: Array Body on Collection Endpoint

```
POST /api/v1/users        # Single: {name: "John"}
POST /api/v1/users        # Bulk: [{name: "John"}, {name: "Jane"}]
```

### Pattern 3: Generic Batch Endpoint

```
POST /api/v1/batch
{
  "operations": [
    {"method": "POST", "path": "/users", "body": {...}},
    {"method": "PATCH", "path": "/users/123", "body": {...}},
    {"method": "DELETE", "path": "/users/456"}
  ]
}
```

**Recommendation**: Pattern 1 is clearest. It avoids ambiguity and makes API documentation straightforward.

---

## Request Payload Structure

### Basic Bulk Create

```json
{
  "items": [
    {
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

### Bulk Update with IDs

```json
{
  "items": [
    {
      "id": "user-123",
      "name": "John Updated"
    },
    {
      "id": "user-456",
      "status": "active"
    }
  ]
}
```

### Bulk Delete

```json
{
  "ids": ["user-123", "user-456", "user-789"]
}
```

---

## Implementation Example - Node.js/Express

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

// Maximum items allowed in a single bulk request
const MAX_BULK_SIZE = 100;

// POST /api/v1/users/bulk - Create multiple users
router.post('/bulk', async (req, res) => {
  const { items } = req.body;

  // Validate request structure
  if (!Array.isArray(items)) {
    return res.status(400).json({
      error: 'Request body must contain an items array'
    });
  }

  // Enforce size limits
  if (items.length > MAX_BULK_SIZE) {
    return res.status(400).json({
      error: `Maximum ${MAX_BULK_SIZE} items allowed per request`,
      received: items.length
    });
  }

  if (items.length === 0) {
    return res.status(400).json({
      error: 'Items array cannot be empty'
    });
  }

  // Process each item and collect results
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      // Validate individual item
      const validation = validateUser(item);
      if (!validation.valid) {
        results.push({
          index: i,
          status: 'failed',
          error: validation.errors
        });
        continue;
      }

      // Create the user
      const user = await UserService.create(item);

      results.push({
        index: i,
        status: 'success',
        data: user
      });
    } catch (error) {
      results.push({
        index: i,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Determine overall response status
  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status === 'failed').length;

  // 207 Multi-Status when partial success
  // 201 Created when all succeed
  // 400 Bad Request when all fail
  let httpStatus;
  if (failureCount === 0) {
    httpStatus = 201;
  } else if (successCount === 0) {
    httpStatus = 400;
  } else {
    httpStatus = 207; // Multi-Status
  }

  res.status(httpStatus).json({
    summary: {
      total: items.length,
      successful: successCount,
      failed: failureCount
    },
    results
  });
});

function validateUser(user) {
  const errors = [];

  if (!user.name || typeof user.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!user.email || !isValidEmail(user.email)) {
    errors.push('valid email is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Response Format with Individual Statuses

Always return status for each item so clients know what succeeded and what failed:

```json
{
  "summary": {
    "total": 5,
    "successful": 3,
    "failed": 2
  },
  "results": [
    {
      "index": 0,
      "status": "success",
      "data": {
        "id": "user-001",
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "index": 1,
      "status": "failed",
      "error": "Email already exists"
    },
    {
      "index": 2,
      "status": "success",
      "data": {
        "id": "user-002",
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    },
    {
      "index": 3,
      "status": "failed",
      "error": "Invalid email format"
    },
    {
      "index": 4,
      "status": "success",
      "data": {
        "id": "user-003",
        "name": "Bob Wilson",
        "email": "bob@example.com"
      }
    }
  ]
}
```

### HTTP Status Codes for Bulk Operations

| Scenario | Status Code | Description |
|----------|-------------|-------------|
| All succeeded | 200/201 | OK/Created |
| Partial success | 207 | Multi-Status |
| All failed (client error) | 400 | Bad Request |
| All failed (validation) | 422 | Unprocessable Entity |
| Bulk not supported | 501 | Not Implemented |

---

## Transactional vs Non-Transactional Bulk

### Non-Transactional (Default)

Each item is processed independently. Failures do not affect other items.

```javascript
// Non-transactional bulk update
router.patch('/bulk', async (req, res) => {
  const { items } = req.body;
  const results = [];

  // Process each item independently
  for (const item of items) {
    try {
      const updated = await UserService.update(item.id, item);
      results.push({ id: item.id, status: 'success', data: updated });
    } catch (error) {
      // Failure here does not stop other items
      results.push({ id: item.id, status: 'failed', error: error.message });
    }
  }

  return res.status(207).json({ results });
});
```

### Transactional (All-or-Nothing)

All items succeed or all items fail. Use database transactions.

```javascript
// Transactional bulk create - all or nothing
router.post('/bulk-transactional', async (req, res) => {
  const { items } = req.body;

  // Start database transaction
  const transaction = await db.beginTransaction();

  try {
    const createdUsers = [];

    for (const item of items) {
      // Validate first - fail fast before any writes
      const validation = validateUser(item);
      if (!validation.valid) {
        throw new ValidationError(`Item validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // All validations passed - now create
    for (const item of items) {
      const user = await UserService.create(item, { transaction });
      createdUsers.push(user);
    }

    // Commit all changes
    await transaction.commit();

    res.status(201).json({
      summary: { total: items.length, successful: items.length, failed: 0 },
      results: createdUsers.map((user, index) => ({
        index,
        status: 'success',
        data: user
      }))
    });
  } catch (error) {
    // Rollback all changes on any failure
    await transaction.rollback();

    res.status(400).json({
      error: 'Bulk operation failed - all changes rolled back',
      message: error.message
    });
  }
});
```

Let clients choose the behavior:

```json
{
  "transactional": true,
  "items": [...]
}
```

---

## Pagination and Limits

Always enforce limits to prevent abuse and server overload:

```javascript
// Configuration
const BULK_LIMITS = {
  maxItems: 100,           // Maximum items per request
  maxPayloadSize: 5242880, // 5MB max payload
  maxConcurrent: 10        // Max concurrent bulk operations per user
};

// Middleware to enforce limits
function bulkLimitsMiddleware(req, res, next) {
  const { items } = req.body;

  // Check item count
  if (items && items.length > BULK_LIMITS.maxItems) {
    return res.status(400).json({
      error: 'Too many items',
      maxAllowed: BULK_LIMITS.maxItems,
      received: items.length,
      suggestion: `Split your request into batches of ${BULK_LIMITS.maxItems} items`
    });
  }

  next();
}

// Apply to bulk routes
router.use('/bulk*', bulkLimitsMiddleware);
```

For very large datasets, provide pagination info in the response:

```json
{
  "summary": {
    "total": 100,
    "successful": 100,
    "failed": 0
  },
  "pagination": {
    "processedInThisRequest": 100,
    "remaining": 400,
    "nextBatchUrl": "/api/v1/users/bulk?offset=100"
  }
}
```

---

## Async Bulk Operations for Large Datasets

For operations that take more than a few seconds, use async processing:

```javascript
// POST /api/v1/users/bulk-async
router.post('/bulk-async', async (req, res) => {
  const { items } = req.body;

  // Validate basic structure
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array required' });
  }

  // Create a job for async processing
  const job = await BulkJobService.create({
    type: 'user_bulk_create',
    payload: items,
    userId: req.user.id,
    status: 'pending'
  });

  // Queue the job for background processing
  await jobQueue.add('bulk-create-users', {
    jobId: job.id,
    items
  });

  // Return 202 Accepted with job tracking info
  res.status(202).json({
    jobId: job.id,
    status: 'pending',
    message: 'Bulk operation queued for processing',
    statusUrl: `/api/v1/jobs/${job.id}`,
    estimatedCompletionTime: calculateEstimatedTime(items.length)
  });
});

// GET /api/v1/jobs/:jobId - Check job status
router.get('/jobs/:jobId', async (req, res) => {
  const job = await BulkJobService.findById(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.id,
    status: job.status, // pending, processing, completed, failed
    progress: {
      total: job.totalItems,
      processed: job.processedItems,
      successful: job.successfulItems,
      failed: job.failedItems,
      percentComplete: Math.round((job.processedItems / job.totalItems) * 100)
    },
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    resultsUrl: job.status === 'completed' ? `/api/v1/jobs/${job.id}/results` : null
  });
});

// Background job processor
async function processBulkCreateJob(job) {
  const { jobId, items } = job.data;

  await BulkJobService.updateStatus(jobId, 'processing');

  for (let i = 0; i < items.length; i++) {
    try {
      await UserService.create(items[i]);
      await BulkJobService.incrementSuccess(jobId);
    } catch (error) {
      await BulkJobService.incrementFailure(jobId, {
        index: i,
        error: error.message
      });
    }
    await BulkJobService.incrementProcessed(jobId);
  }

  await BulkJobService.updateStatus(jobId, 'completed');
}
```

---

## Idempotency Considerations

Bulk operations should be idempotent when possible to safely handle retries:

```javascript
// Client sends idempotency key
// POST /api/v1/users/bulk
// Headers: Idempotency-Key: abc-123-unique-key

const idempotencyCache = new Map(); // Use Redis in production

router.post('/bulk', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];

  // Check if we have a cached response for this key
  if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
    const cachedResponse = idempotencyCache.get(idempotencyKey);
    return res.status(cachedResponse.status).json(cachedResponse.body);
  }

  // Process the bulk operation
  const result = await processBulkCreate(req.body.items);

  // Cache the response for idempotent retries
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, {
      status: result.httpStatus,
      body: result.response,
      createdAt: Date.now()
    });

    // Clean up old keys after 24 hours
    setTimeout(() => {
      idempotencyCache.delete(idempotencyKey);
    }, 24 * 60 * 60 * 1000);
  }

  res.status(result.httpStatus).json(result.response);
});
```

### Client-Provided IDs for Idempotent Creates

Allow clients to specify IDs to make creates idempotent:

```json
{
  "items": [
    {
      "clientId": "client-uuid-1",
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "clientId": "client-uuid-2",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

```javascript
// Server uses clientId as idempotency key per item
async function processBulkCreateWithClientIds(items) {
  const results = [];

  for (const item of items) {
    // Check if item with this clientId already exists
    const existing = await UserService.findByClientId(item.clientId);

    if (existing) {
      // Already created - return existing (idempotent)
      results.push({
        clientId: item.clientId,
        status: 'success',
        data: existing,
        note: 'Already existed'
      });
    } else {
      // Create new
      const user = await UserService.create(item);
      results.push({
        clientId: item.clientId,
        status: 'success',
        data: user
      });
    }
  }

  return results;
}
```

---

## Complete Implementation Example

Here is a full bulk operations controller:

```javascript
// controllers/bulkUsersController.js
const express = require('express');
const router = express.Router();

const BULK_CONFIG = {
  maxItems: 100,
  maxPayloadBytes: 5 * 1024 * 1024 // 5MB
};

// Validation middleware
function validateBulkRequest(req, res, next) {
  const { items } = req.body;

  if (!items) {
    return res.status(400).json({ error: 'Missing items array' });
  }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'items array cannot be empty' });
  }

  if (items.length > BULK_CONFIG.maxItems) {
    return res.status(400).json({
      error: `Maximum ${BULK_CONFIG.maxItems} items allowed`,
      received: items.length
    });
  }

  next();
}

// Bulk create users
router.post('/bulk', validateBulkRequest, async (req, res) => {
  const { items, transactional = false } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  if (transactional) {
    return handleTransactionalBulk(items, res);
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = { index: i };

    try {
      // Validate
      const errors = validateUserInput(item);
      if (errors.length > 0) {
        result.status = 'failed';
        result.error = errors;
        failureCount++;
        results.push(result);
        continue;
      }

      // Check for duplicate email
      const existingUser = await UserService.findByEmail(item.email);
      if (existingUser) {
        result.status = 'failed';
        result.error = 'Email already registered';
        failureCount++;
        results.push(result);
        continue;
      }

      // Create user
      const user = await UserService.create({
        name: item.name,
        email: item.email,
        role: item.role || 'user'
      });

      result.status = 'success';
      result.data = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      };
      successCount++;
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      failureCount++;
    }

    results.push(result);
  }

  const httpStatus = getHttpStatus(successCount, failureCount);

  res.status(httpStatus).json({
    summary: {
      total: items.length,
      successful: successCount,
      failed: failureCount
    },
    results
  });
});

// Bulk update users
router.patch('/bulk', validateBulkRequest, async (req, res) => {
  const { items } = req.body;
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = { index: i, id: item.id };

    if (!item.id) {
      result.status = 'failed';
      result.error = 'id is required for update';
      failureCount++;
      results.push(result);
      continue;
    }

    try {
      const user = await UserService.findById(item.id);
      if (!user) {
        result.status = 'failed';
        result.error = 'User not found';
        failureCount++;
        results.push(result);
        continue;
      }

      // Build update payload
      const updates = {};
      if (item.name) updates.name = item.name;
      if (item.email) updates.email = item.email;
      if (item.role) updates.role = item.role;
      if (item.status) updates.status = item.status;

      const updated = await UserService.update(item.id, updates);

      result.status = 'success';
      result.data = updated;
      successCount++;
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      failureCount++;
    }

    results.push(result);
  }

  const httpStatus = getHttpStatus(successCount, failureCount);

  res.status(httpStatus).json({
    summary: {
      total: items.length,
      successful: successCount,
      failed: failureCount
    },
    results
  });
});

// Bulk delete users
router.delete('/bulk', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids array cannot be empty' });
  }

  if (ids.length > BULK_CONFIG.maxItems) {
    return res.status(400).json({
      error: `Maximum ${BULK_CONFIG.maxItems} deletions allowed`,
      received: ids.length
    });
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const id of ids) {
    const result = { id };

    try {
      const user = await UserService.findById(id);
      if (!user) {
        result.status = 'failed';
        result.error = 'User not found';
        failureCount++;
        results.push(result);
        continue;
      }

      await UserService.delete(id);
      result.status = 'success';
      successCount++;
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      failureCount++;
    }

    results.push(result);
  }

  const httpStatus = getHttpStatus(successCount, failureCount);

  res.status(httpStatus).json({
    summary: {
      total: ids.length,
      successful: successCount,
      failed: failureCount
    },
    results
  });
});

// Helper functions
function validateUserInput(user) {
  const errors = [];

  if (!user.name || typeof user.name !== 'string' || user.name.trim() === '') {
    errors.push('name is required');
  }

  if (!user.email || !isValidEmail(user.email)) {
    errors.push('valid email is required');
  }

  if (user.role && !['admin', 'user', 'guest'].includes(user.role)) {
    errors.push('role must be admin, user, or guest');
  }

  return errors;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getHttpStatus(successCount, failureCount) {
  if (failureCount === 0) return 201;
  if (successCount === 0) return 400;
  return 207; // Multi-Status for partial success
}

async function handleTransactionalBulk(items, res) {
  const transaction = await db.beginTransaction();

  try {
    const createdUsers = [];

    // Validate all first
    for (let i = 0; i < items.length; i++) {
      const errors = validateUserInput(items[i]);
      if (errors.length > 0) {
        throw new Error(`Item ${i}: ${errors.join(', ')}`);
      }
    }

    // Create all
    for (const item of items) {
      const user = await UserService.create(item, { transaction });
      createdUsers.push(user);
    }

    await transaction.commit();

    res.status(201).json({
      summary: {
        total: items.length,
        successful: items.length,
        failed: 0
      },
      results: createdUsers.map((user, index) => ({
        index,
        status: 'success',
        data: user
      }))
    });
  } catch (error) {
    await transaction.rollback();

    res.status(400).json({
      error: 'Transaction failed - all changes rolled back',
      message: error.message
    });
  }
}

module.exports = router;
```

---

## Best Practices Summary

1. **Use dedicated endpoints** - `/resource/bulk` is clearer than overloading the collection endpoint
2. **Enforce size limits** - Prevent abuse with max item counts and payload sizes
3. **Return individual statuses** - Tell clients exactly what succeeded and what failed
4. **Use 207 Multi-Status** - For partial success scenarios
5. **Support both modes** - Offer transactional and non-transactional options
6. **Implement idempotency** - Allow safe retries with idempotency keys
7. **Go async for large batches** - Return 202 Accepted and process in background
8. **Validate early** - Fail fast before processing any items in transactional mode
9. **Include the index** - Reference items by position so clients can match results
10. **Document limits clearly** - Make maximum batch sizes discoverable in API docs

---

*Need to monitor your API bulk operations in production? [OneUptime](https://oneuptime.com) provides comprehensive API monitoring, performance tracking, and alerting to help you catch issues before your users do.*
