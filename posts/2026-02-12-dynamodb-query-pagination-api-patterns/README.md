# How to Implement Pagination in DynamoDB Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Pagination, API Design

Description: Implement efficient pagination in DynamoDB using LastEvaluatedKey cursors, with patterns for API endpoints, frontend integration, and common pitfalls.

---

DynamoDB doesn't return all results at once. It caps each Query or Scan at 1MB of data. If your result set is larger, you get a `LastEvaluatedKey` that you pass back in the next call to continue where you left off. This is cursor-based pagination, and it's the only pagination model DynamoDB supports natively.

There's no "skip to page 5" or "offset 100." If you need page 5, you have to read through pages 1-4 first. Understanding this limitation is important for designing your APIs and UIs.

## Basic Pagination

Here's the fundamental pattern:

```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Fetch one page of results
async function getPage(customerId, pageSize, startKey) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: { ':cid': customerId },
    Limit: pageSize
  };

  // If we have a cursor from a previous page, continue from there
  if (startKey) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await docClient.query(params).promise();

  return {
    items: result.Items,
    nextKey: result.LastEvaluatedKey || null,  // null means no more pages
    count: result.Count
  };
}

// Usage
const page1 = await getPage('cust-001', 20, null);
console.log('Page 1:', page1.items.length, 'items');

if (page1.nextKey) {
  const page2 = await getPage('cust-001', 20, page1.nextKey);
  console.log('Page 2:', page2.items.length, 'items');
}
```

The `Limit` parameter controls how many items DynamoDB evaluates (before filtering), not necessarily how many it returns. If you have a `FilterExpression`, you might get fewer items than the limit.

## Fetching All Results

When you need everything, paginate in a loop:

```javascript
// Fetch all items across all pages
async function getAllItems(customerId) {
  const allItems = [];
  let lastKey = undefined;

  do {
    const params = {
      TableName: 'Orders',
      KeyConditionExpression: 'customerId = :cid',
      ExpressionAttributeValues: { ':cid': customerId },
      ExclusiveStartKey: lastKey
    };

    const result = await docClient.query(params).promise();
    allItems.push(...result.Items);
    lastKey = result.LastEvaluatedKey;

    console.log(`Fetched ${result.Items.length} items (total: ${allItems.length})`);
  } while (lastKey);

  return allItems;
}
```

Be careful with this pattern on large datasets. If a customer has a million orders, you're going to be reading for a while and consuming a lot of memory.

## Cursor-Based API Pagination

For REST APIs, encode the cursor as a base64 string so it's URL-safe:

```javascript
// Encode LastEvaluatedKey to a URL-safe cursor string
function encodeCursor(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return null;
  return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
}

// Decode cursor back to a DynamoDB key
function decodeCursor(cursor) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
}

// API endpoint handler
async function handleListOrders(req, res) {
  const { customerId } = req.params;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const cursor = req.query.cursor || null;

  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: { ':cid': customerId },
    Limit: pageSize,
    ExclusiveStartKey: decodeCursor(cursor)
  };

  const result = await docClient.query(params).promise();

  res.json({
    items: result.Items,
    nextCursor: encodeCursor(result.LastEvaluatedKey),
    hasMore: !!result.LastEvaluatedKey
  });
}
```

The client passes the cursor from the previous response to get the next page:

```
GET /api/customers/cust-001/orders?pageSize=20
GET /api/customers/cust-001/orders?pageSize=20&cursor=eyJjdXN0b21lcklkIjoiY3Vz...
```

## Security: Validating Cursors

The cursor contains your DynamoDB key attributes. A malicious user could craft a cursor to access another customer's data. Always validate:

```javascript
function decodeCursorSafe(cursor, expectedCustomerId) {
  if (!cursor) return undefined;

  try {
    const key = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));

    // Validate that the cursor belongs to the expected customer
    if (key.customerId !== expectedCustomerId) {
      throw new Error('Invalid cursor: customer ID mismatch');
    }

    return key;
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}
```

Alternatively, encrypt the cursor or use HMAC signing to prevent tampering:

```javascript
const crypto = require('crypto');
const SECRET = process.env.CURSOR_SECRET;

function signCursor(key) {
  const payload = JSON.stringify(key);
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const signed = JSON.stringify({ payload, hmac });
  return Buffer.from(signed).toString('base64');
}

function verifyCursor(cursor) {
  const { payload, hmac } = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

  if (hmac !== expected) {
    throw new Error('Cursor has been tampered with');
  }

  return JSON.parse(payload);
}
```

## Pagination with FilterExpressions

This is where things get tricky. If you use `Limit: 20` with a `FilterExpression`, DynamoDB reads 20 items, filters them, and might return fewer than 20 (or even zero). But `LastEvaluatedKey` still indicates there's more data.

```javascript
// Reliable pagination with filters
async function getFilteredPage(customerId, minAmount, pageSize, cursor) {
  let items = [];
  let lastKey = decodeCursor(cursor);
  let scannedCount = 0;

  // Keep querying until we have enough items or run out of data
  while (items.length < pageSize) {
    const params = {
      TableName: 'Orders',
      KeyConditionExpression: 'customerId = :cid',
      FilterExpression: 'orderAmount >= :min',
      ExpressionAttributeValues: {
        ':cid': customerId,
        ':min': minAmount
      },
      // Read more than we need to account for filtered items
      Limit: pageSize * 3,
      ExclusiveStartKey: lastKey
    };

    const result = await docClient.query(params).promise();
    items.push(...result.Items);
    scannedCount += result.ScannedCount;
    lastKey = result.LastEvaluatedKey;

    // No more data to read
    if (!lastKey) break;
  }

  // Trim to page size and return
  const pageItems = items.slice(0, pageSize);
  const hasMore = items.length > pageSize || !!lastKey;

  return {
    items: pageItems,
    nextCursor: hasMore ? encodeCursor(lastKey) : null,
    hasMore
  };
}
```

## Reverse Pagination (Newest First)

DynamoDB sorts by sort key ascending by default. For newest-first pagination:

```javascript
// Get the latest orders first
async function getLatestOrders(customerId, pageSize, cursor) {
  const params = {
    TableName: 'Orders',
    KeyConditionExpression: 'customerId = :cid',
    ExpressionAttributeValues: { ':cid': customerId },
    ScanIndexForward: false,  // Reverse sort order
    Limit: pageSize,
    ExclusiveStartKey: decodeCursor(cursor)
  };

  const result = await docClient.query(params).promise();

  return {
    items: result.Items,
    nextCursor: encodeCursor(result.LastEvaluatedKey),
    hasMore: !!result.LastEvaluatedKey
  };
}
```

## Implementing "Page Numbers" (Offset Pagination)

True offset pagination isn't supported by DynamoDB. But you can simulate it by caching cursors for each page:

```javascript
// Cache page cursors for a browsing session
const pageCache = new Map();

async function getPageByNumber(customerId, pageSize, pageNumber) {
  const cacheKey = `${customerId}:${pageSize}`;

  // Initialize cache for page 1
  if (!pageCache.has(cacheKey)) {
    pageCache.set(cacheKey, { 1: null });  // Page 1 has no cursor
  }

  const cursors = pageCache.get(cacheKey);

  // If we have the cursor for this page, use it
  if (cursors[pageNumber] !== undefined) {
    const result = await getPage(customerId, pageSize, cursors[pageNumber]);

    // Cache the cursor for the next page
    if (result.nextKey) {
      cursors[pageNumber + 1] = result.nextKey;
    }

    return {
      ...result,
      pageNumber,
      hasNextPage: !!result.nextKey
    };
  }

  // Otherwise, we need to read through previous pages to get here
  // This is expensive - consider if offset pagination is really needed
  let currentPage = Math.max(...Object.keys(cursors).map(Number));
  let cursor = cursors[currentPage];

  while (currentPage < pageNumber) {
    const result = await getPage(customerId, pageSize, cursor);
    currentPage++;
    cursor = result.nextKey;
    cursors[currentPage] = cursor;

    if (!cursor) break;
  }

  return getPageByNumber(customerId, pageSize, pageNumber);
}
```

This works but is expensive for jumping to distant pages. If you need true offset pagination, consider whether DynamoDB is the right choice for that particular access pattern.

## Frontend Integration

Here's how a React frontend might consume paginated results:

```javascript
import { useState, useCallback } from 'react';

function useOrderPagination(customerId) {
  const [orders, setOrders] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const url = `/api/customers/${customerId}/orders?pageSize=20${
        cursor ? `&cursor=${cursor}` : ''
      }`;

      const response = await fetch(url);
      const data = await response.json();

      setOrders(prev => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, [customerId, cursor, hasMore, loading]);

  const reset = useCallback(() => {
    setOrders([]);
    setCursor(null);
    setHasMore(true);
  }, []);

  return { orders, loadMore, hasMore, loading, reset };
}
```

## Monitoring Pagination Performance

Track how many pages users typically traverse. If most users never go past page 1, you might be over-engineering your pagination. If they frequently page deep, consider whether a different access pattern (like search or date filtering) would serve them better.

Monitor your DynamoDB query latency across pages with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to ensure consistent performance as data grows.

## Wrapping Up

DynamoDB pagination is cursor-based: you get a `LastEvaluatedKey` and pass it back to continue. There's no way to skip pages or count total results without reading through them. Encode cursors as base64 for API transport, validate them for security, and handle the edge cases with FilterExpressions carefully. For most applications, infinite scroll or "load more" UIs are a natural fit for cursor-based pagination. If you truly need page numbers, cache the cursors per session. Design your API around the cursor model and you'll have fast, scalable pagination that works at any data size.
