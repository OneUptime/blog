# How to Write Compound Queries with Multiple Where Clauses in Firestore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Queries, Compound Queries, NoSQL

Description: Learn how to build compound queries with multiple where clauses in Firestore, including equality filters, range queries, and required indexes.

---

Firestore's querying model is different from SQL. You cannot just throw arbitrary WHERE clauses together and expect them to work. Firestore requires indexes for compound queries, and there are rules about which combinations of filters are allowed. Understanding these rules saves you from frustrating "query requires an index" errors. In this post, I will walk through how to build effective compound queries in Firestore.

## Single-Field Queries

Let's start with the basics. Firestore automatically indexes every field, so single-field queries work out of the box:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

// Simple equality query - no special index needed
const activeUsers = await db.collection('users')
    .where('active', '==', true)
    .get();

// Range query on a single field - also automatic
const recentUsers = await db.collection('users')
    .where('createdAt', '>', new Date('2026-01-01'))
    .get();

// Array contains query
const admins = await db.collection('users')
    .where('roles', 'array-contains', 'admin')
    .get();
```

## Combining Multiple Equality Filters

You can often combine multiple equality (==) filters without defining a composite index yourself:

```javascript
// Simple equality filters can use index merging
const activeAdminUsers = await db.collection('users')
    .where('active', '==', true)
    .where('role', '==', 'admin')
    .get();
```

Wait, that is not entirely accurate. Firestore can merge single-field indexes for simple equality filters, but many multi-field queries still require composite indexes, especially when you add range filters or sorting. Firestore will tell you when you need one - the error message includes a direct link to create the required index.

## Equality Plus Range Queries

One of the most common compound query patterns is combining equality filters with a range filter:

```javascript
// Find active users created after a certain date
// This requires a composite index on (active, createdAt)
const results = await db.collection('users')
    .where('active', '==', true)
    .where('createdAt', '>', new Date('2026-01-01'))
    .orderBy('createdAt', 'desc')
    .get();
```

This query filters by an exact match on `active` and a range on `createdAt`. Firestore needs a composite index that covers both fields.

### Python Example

```python
from datetime import datetime

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

db = firestore.Client()

def get_active_recent_users():
    """Get active users created after January 1, 2026."""
    users_ref = db.collection('users')

    # Compound query: equality on active + range on createdAt
    query = (users_ref
        .where(filter=FieldFilter('active', '==', True))
        .where(filter=FieldFilter('createdAt', '>', datetime(2026, 1, 1)))
        .order_by('createdAt', direction=firestore.Query.DESCENDING))

    return [{'id': doc.id, **doc.to_dict()} for doc in query.stream()]
```

## The Range Filter Rule

Firestore has important rules for range filters and sorting: if you have a range comparison (`<`, `<=`, `>`, `>=`), your first explicit `orderBy` must be on a range field, and compound range queries usually need a composite index. Here is what works and what does not:

```javascript
// This works: equality on field A, range on field B
const query1 = db.collection('products')
    .where('category', '==', 'electronics')
    .where('price', '>', 100)
    .where('price', '<', 500);

// This works: range on one field with orderBy on the same field
const query2 = db.collection('products')
    .where('price', '>', 100)
    .orderBy('price');

// This does NOT work: range on field A, first orderBy on field B
// Firestore requires the first orderBy to match a range field
const query3 = db.collection('products')
    .where('price', '>', 100)
    .orderBy('createdAt', 'desc');

// This works with a composite index: range filters on two different fields
const query4 = db.collection('products')
    .where('price', '>', 100)
    .where('rating', '>', 4);
```

The last example is supported, but it requires the right index and can be more expensive than a single-range query because Firestore scans index entries. Cloud Firestore supports up to 10 range or inequality fields in a query.

## Optimizing Multiple Range Filters

When you need to filter on ranges of two fields, here are your options:

### Option 1: Query Both Fields with a Composite Index

```javascript
async function getAffordableHighRatedProducts() {
    // Range filters on price and rating in the query
    const snapshot = await db.collection('products')
        .where('price', '>', 100)
        .where('price', '<', 500)
        .where('rating', '>', 4)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

This keeps filtering on the server, but it needs a composite index and may read index entries as well as documents. Put the most selective range field first in your ordering and index when you add explicit ordering.

### Option 2: Create a Composite Field

```javascript
// When storing the document, create a derived field
async function addProduct(product) {
    // Create a price bracket field to convert a range into equality
    let priceBracket;
    if (product.price < 50) priceBracket = 'budget';
    else if (product.price < 200) priceBracket = 'mid';
    else priceBracket = 'premium';

    await db.collection('products').add({
        ...product,
        priceBracket: priceBracket
    });
}

// Now you can use equality on priceBracket and range on rating
const results = await db.collection('products')
    .where('priceBracket', '==', 'mid')
    .where('rating', '>', 4)
    .get();
```

## OrderBy Requirements

When using range filters, you must include an `orderBy` on the range field if you also want to order by another field:

```javascript
// Correct: orderBy on the range field first, then additional orderBy
const results = await db.collection('products')
    .where('category', '==', 'electronics')
    .where('price', '>', 100)
    .orderBy('price')          // Required: range field comes first
    .orderBy('createdAt', 'desc')  // Additional sort
    .get();
```

The first `orderBy` must match the range filter field. Additional `orderBy` clauses can sort on other fields but require a composite index.

## Composite Index Requirements

Here is a decision tree for when you need composite indexes:

```mermaid
flowchart TD
    A[Query has multiple where clauses?] -->|No| B[Single-field auto-index is enough]
    A -->|Yes| C{All equality filters?}
    C -->|Yes| D{Plus orderBy on a different field?}
    C -->|No| F[Composite index required]
    D -->|No| E[May need composite index - check if auto-indexes cover it]
    D -->|Yes| F
    F --> G[Create composite index manually or follow the error link]
```

## Creating Composite Indexes

You can create composite indexes through the console, the CLI, or a configuration file:

### Through the Error Link

The easiest way. Run your query, get the error message, click the link. Firestore creates the index for you.

### Using gcloud

```bash
# Create a composite index for querying by category and price

gcloud firestore indexes composite create \
    --collection-group=products \
    --field-config=field-path=category,order=ascending \
    --field-config=field-path=price,order=ascending
```

### Using a Configuration File

```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy the indexes:

```bash
# Deploy Firestore indexes from the configuration file
firebase deploy --only firestore
```

## Practical Query Patterns

### E-Commerce Product Search

```javascript
// Find active electronics under $500, sorted by rating
const products = await db.collection('products')
    .where('active', '==', true)
    .where('category', '==', 'electronics')
    .where('price', '<', 500)
    .orderBy('price')
    .limit(20)
    .get();
```

Index needed: `active ASC, category ASC, price ASC`

### Task Management

```javascript
// Find incomplete tasks for a specific project, ordered by due date
const tasks = await db.collection('tasks')
    .where('projectId', '==', 'project-123')
    .where('completed', '==', false)
    .orderBy('dueDate', 'asc')
    .get();
```

Index needed: `projectId ASC, completed ASC, dueDate ASC`

### Content Feed

```javascript
// Get published posts in a category, most recent first
const posts = await db.collection('posts')
    .where('status', '==', 'published')
    .where('category', '==', 'technology')
    .orderBy('publishedAt', 'desc')
    .limit(10)
    .get();
```

Index needed: `status ASC, category ASC, publishedAt DESC`

## Pagination with Compound Queries

Compound queries support cursor-based pagination:

```javascript
async function getProductsPage(category, lastDoc, pageSize = 20) {
    let query = db.collection('products')
        .where('category', '==', category)
        .where('active', '==', true)
        .orderBy('price', 'asc')
        .limit(pageSize);

    if (lastDoc) {
        // Start after the last document from the previous page
        query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    return {
        products: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === pageSize
    };
}
```

## Wrapping Up

Compound queries in Firestore require a bit more planning than SQL queries, but once you understand the rules they become second nature. The key principles are: simple equality filters can often use index merging, range filters and sorting must follow Firestore's ordering rules, and more complex compound queries usually require a composite index. When Firestore tells you an index is needed, the error message makes it one click to create it. Design your data model and indexes around your query patterns, and Firestore will serve those queries efficiently at any scale.
