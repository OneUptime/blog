# How to Use Aggregation Queries in Firestore for Count Sum and Average Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Aggregation Queries, NoSQL, Database

Description: Learn how to use Firestore's native aggregation queries to perform count, sum, and average operations without downloading entire collections to the client.

---

For a long time, one of Firestore's biggest pain points was aggregation. If you wanted to count documents in a collection, sum a field, or calculate an average, you had to fetch every single document and do the math on the client side. That meant reading (and paying for) potentially millions of documents just to get a single number. Firestore now supports server-side aggregation queries that return results without transferring document data, saving you both bandwidth and read costs.

## The Problem Before Aggregation Queries

Let me illustrate why this matters. Say you have a collection of orders and want to know how many there are. Before aggregation queries, this was your only option:

```javascript
// The OLD way: fetch every document just to count them
// This reads (and bills for) every document in the collection
const snapshot = await db.collection('orders').get();
const count = snapshot.size;
console.log(`Total orders: ${count}`);
// If you have 1 million orders, this downloads 1 million documents
```

With aggregation queries, you get the count without downloading any documents:

```javascript
// The NEW way: server-side count
// This returns a single number without transferring document data
const snapshot = await db.collection('orders').count().get();
const count = snapshot.data().count;
console.log(`Total orders: ${count}`);
// Billed as a single aggregation read, regardless of collection size
```

## Count Queries

Count is the most commonly used aggregation. It counts documents matching your query criteria.

### Basic Count

```javascript
// Count all documents in the 'products' collection
const { getCountFromServer, collection } = require('firebase/firestore');

const productsRef = collection(db, 'products');
const snapshot = await getCountFromServer(productsRef);
console.log('Total products:', snapshot.data().count);
```

### Count with Filters

You can combine count with any standard Firestore query filters:

```javascript
// Count only active products in a specific category
const { query, where, getCountFromServer, collection } = require('firebase/firestore');

const activeElectronicsQuery = query(
  collection(db, 'products'),
  where('category', '==', 'electronics'),
  where('status', '==', 'active')
);

const snapshot = await getCountFromServer(activeElectronicsQuery);
console.log('Active electronics:', snapshot.data().count);
```

### Count with the Admin SDK

Using the Firebase Admin SDK (Node.js), the syntax is slightly different:

```javascript
// Server-side count using the Firebase Admin SDK
const admin = require('firebase-admin');
const db = admin.firestore();

// Count orders placed in the last 7 days
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const recentOrdersQuery = db.collection('orders')
  .where('createdAt', '>=', sevenDaysAgo);

const snapshot = await recentOrdersQuery.count().get();
console.log('Orders in last 7 days:', snapshot.data().count);
```

## Sum Queries

Sum lets you add up numeric field values across documents without fetching them:

```javascript
// Sum the total revenue from all completed orders
const { getAggregateFromServer, sum, query, where, collection } = require('firebase/firestore');

const completedOrders = query(
  collection(db, 'orders'),
  where('status', '==', 'completed')
);

// Sum the 'totalAmount' field across all matching documents
const snapshot = await getAggregateFromServer(completedOrders, {
  totalRevenue: sum('totalAmount')
});

console.log('Total revenue:', snapshot.data().totalRevenue);
```

With the Admin SDK:

```python
# Python Admin SDK: sum the quantity field for a specific product
from google.cloud import firestore
from google.cloud.firestore_v1.aggregation import SumAggregation

db = firestore.Client()

# Build the query for a specific product's order items
query = db.collection('order_items').where('product_id', '==', 'prod-123')

# Create the aggregation query with a sum on the quantity field
aggregation_query = query.sum('quantity', alias='total_sold')
results = aggregation_query.get()

for result in results:
    print(f"Total units sold: {result[0].value}")
```

## Average Queries

Average computes the arithmetic mean of a numeric field:

```javascript
// Calculate the average order value for completed orders
const { getAggregateFromServer, average, query, where, collection } = require('firebase/firestore');

const completedOrders = query(
  collection(db, 'orders'),
  where('status', '==', 'completed')
);

// Average the 'totalAmount' field
const snapshot = await getAggregateFromServer(completedOrders, {
  avgOrderValue: average('totalAmount')
});

console.log('Average order value:', snapshot.data().avgOrderValue);
```

## Combining Multiple Aggregations

You can run multiple aggregations in a single query, which is more efficient than making separate calls:

```javascript
// Run count, sum, and average in a single aggregation query
// This is billed as one operation, not three
const { getAggregateFromServer, count, sum, average, query, where, collection } = require('firebase/firestore');

const ordersQuery = query(
  collection(db, 'orders'),
  where('status', '==', 'completed'),
  where('region', '==', 'us-west')
);

const snapshot = await getAggregateFromServer(ordersQuery, {
  orderCount: count(),
  totalRevenue: sum('totalAmount'),
  avgOrderValue: average('totalAmount')
});

const data = snapshot.data();
console.log(`Region: us-west`);
console.log(`Orders: ${data.orderCount}`);
console.log(`Revenue: $${data.totalRevenue}`);
console.log(`Avg Order: $${data.avgOrderValue}`);
```

This is significantly more efficient than running three separate aggregation queries. All three results come back in a single round trip.

## Aggregations on Subcollections

Aggregation queries work on subcollections too. If you have a users collection where each user document has an orders subcollection:

```javascript
// Count orders for a specific user from their subcollection
const userOrdersRef = collection(db, 'users', 'user-123', 'orders');
const snapshot = await getCountFromServer(userOrdersRef);
console.log('User order count:', snapshot.data().count);
```

## Collection Group Aggregations

You can also aggregate across collection groups. If every user has an orders subcollection and you want the total count across all users:

```javascript
// Count all orders across all users using a collection group query
const { collectionGroup, getCountFromServer } = require('firebase/firestore');

const allOrdersGroup = collectionGroup(db, 'orders');
const snapshot = await getCountFromServer(allOrdersGroup);
console.log('Total orders across all users:', snapshot.data().count);
```

This counts every document in every subcollection named "orders" across your entire database.

## Practical Example: Dashboard Metrics

Here is a real-world example of building a dashboard summary using aggregation queries:

```javascript
// Build a dashboard summary with multiple metrics in parallel
// Each aggregation runs independently, so we can parallelize them
async function getDashboardMetrics() {
  const ordersRef = collection(db, 'orders');
  const productsRef = collection(db, 'products');
  const usersRef = collection(db, 'users');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Run all aggregation queries in parallel for speed
  const [orderStats, todayOrders, activeProducts, totalUsers] = await Promise.all([
    // Overall order statistics
    getAggregateFromServer(
      query(ordersRef, where('status', '==', 'completed')),
      { count: count(), revenue: sum('totalAmount'), avgValue: average('totalAmount') }
    ),
    // Today's order count
    getCountFromServer(
      query(ordersRef, where('createdAt', '>=', today))
    ),
    // Active product count
    getCountFromServer(
      query(productsRef, where('status', '==', 'active'))
    ),
    // Total registered users
    getCountFromServer(usersRef)
  ]);

  return {
    totalOrders: orderStats.data().count,
    totalRevenue: orderStats.data().revenue,
    averageOrderValue: orderStats.data().avgValue,
    ordersToday: todayOrders.data().count,
    activeProducts: activeProducts.data().count,
    registeredUsers: totalUsers.data().count,
  };
}
```

## Cost and Performance

Aggregation queries are billed differently from regular document reads. A count query is billed based on the number of index entries scanned, not the number of documents. Specifically, every 1000 index entries scanned counts as one document read. So counting a collection of 100,000 documents costs about 100 document reads instead of 100,000.

Sum and average queries follow the same billing model. They scan index entries rather than fetching full documents, which makes them dramatically cheaper for large collections.

Performance-wise, aggregation queries are also faster because they do not need to deserialize and transfer document data over the network. The computation happens server-side, and only the result is returned.

## Limitations to Know About

There are a few limitations to keep in mind. Aggregation queries have a 60-second timeout. If your query needs to scan a very large dataset and cannot complete within that window, it will fail. For extremely large collections, you might need to break the aggregation into smaller ranges.

Only numeric fields (integers and floating-point) can be used with sum and average. If a document's field contains a non-numeric value, that document is skipped in the aggregation.

Aggregation queries require the same indexes that a regular query with the same filters would need. If your query uses composite filters, make sure the corresponding composite index exists.

## Wrapping Up

Server-side aggregation queries solve one of Firestore's longest-standing usability gaps. Instead of downloading entire collections to compute a count, sum, or average, you get the answer directly from the server at a fraction of the cost. Combined with Firestore's real-time capabilities and flexible data modeling, aggregation queries make it practical to build dashboards, analytics features, and summary views without introducing a separate analytics database.
