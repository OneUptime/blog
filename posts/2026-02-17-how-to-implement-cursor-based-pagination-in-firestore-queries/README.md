# How to Implement Cursor-Based Pagination in Firestore Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Pagination, Queries, Firebase

Description: Step-by-step guide to implementing efficient cursor-based pagination in Firestore using startAfter, endBefore, and limit for scalable data loading.

---

Firestore does not support traditional offset-based pagination. There is no `OFFSET 100` clause like in SQL. Instead, Firestore uses cursor-based pagination, where you tell it to start fetching results after a specific document. This approach is actually better for most use cases - it is consistent, efficient, and does not break when data is inserted or deleted between pages.

Let me show you how to build a complete pagination system with Firestore cursors.

## Why Cursor-Based Pagination

With offset-based pagination, if someone inserts a new row at position 5 and you are on page 2 (offset 10), you might see the same item twice or skip one entirely. Cursor-based pagination avoids this because you are always saying "give me items after this specific document," regardless of what happens to the data around it.

Firestore also has a practical reason. Offset pagination would still read and discard all the skipped documents, meaning fetching page 100 with 20 items per page would read 2,000 documents. With cursor pagination, you only read the 20 documents you actually need.

## Basic Forward Pagination

The core of cursor-based pagination in Firestore uses `startAfter()` and `limit()`. Here is the basic pattern.

First, fetch the first page:

```javascript
// Fetch the first page of results
// We limit to the page size and order by our pagination field
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const PAGE_SIZE = 20;

async function getFirstPage() {
  const q = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  );

  const snapshot = await getDocs(q);
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Save the last document for the next page cursor
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];

  return { products, lastDoc, hasMore: snapshot.docs.length === PAGE_SIZE };
}
```

Then fetch subsequent pages using the last document as a cursor:

```javascript
// Fetch the next page using the last document from the previous page as a cursor
// startAfter tells Firestore to begin results after this specific document
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

async function getNextPage(lastDoc) {
  const q = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    startAfter(lastDoc),  // Start after the last document from the previous page
    limit(PAGE_SIZE)
  );

  const snapshot = await getDocs(q);
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1];

  return { products, lastDoc: newLastDoc, hasMore: snapshot.docs.length === PAGE_SIZE };
}
```

## Backward Pagination (Previous Page)

Going backward requires `endBefore()` and `limitToLast()`. You also need to keep track of the first document on each page.

```javascript
// Fetch the previous page using the first document as a cursor
// endBefore tells Firestore to end results before this document
// limitToLast gets the last N results from the query range
import { collection, query, orderBy, limitToLast, endBefore, getDocs } from 'firebase/firestore';

async function getPreviousPage(firstDoc) {
  const q = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    endBefore(firstDoc),     // End before the first document of the current page
    limitToLast(PAGE_SIZE)   // Get the last PAGE_SIZE documents before the cursor
  );

  const snapshot = await getDocs(q);
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    products,
    firstDoc: snapshot.docs[0],
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
}
```

## Building a Complete Pagination Manager

In practice, you want a class or set of functions that manages the pagination state. Here is a complete implementation:

```javascript
// A reusable pagination manager for Firestore queries
// Tracks cursors for both forward and backward navigation
import {
  collection, query, orderBy, limit, limitToLast,
  startAfter, endBefore, getDocs
} from 'firebase/firestore';

class FirestorePaginator {
  constructor(db, collectionPath, orderField, pageSize = 20) {
    this.db = db;
    this.collectionPath = collectionPath;
    this.orderField = orderField;
    this.pageSize = pageSize;
    this.pageStack = [];  // Stack of first-doc cursors for each visited page
    this.lastDoc = null;
    this.currentPage = 0;
  }

  // Build the base query with any additional filters
  buildBaseQuery(...filters) {
    return [
      collection(this.db, this.collectionPath),
      ...filters,
      orderBy(this.orderField, 'desc')
    ];
  }

  async getFirstPage(...filters) {
    const q = query(
      ...this.buildBaseQuery(...filters),
      limit(this.pageSize)
    );

    const snapshot = await getDocs(q);
    this.currentPage = 1;
    this.pageStack = [null];  // First page has no preceding cursor
    this.lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return this.formatResult(snapshot);
  }

  async getNextPage(...filters) {
    if (!this.lastDoc) return null;

    const q = query(
      ...this.buildBaseQuery(...filters),
      startAfter(this.lastDoc),
      limit(this.pageSize)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    this.currentPage++;
    this.pageStack.push(snapshot.docs[0]);
    this.lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return this.formatResult(snapshot);
  }

  async getPreviousPage(...filters) {
    if (this.currentPage <= 1) return null;

    this.pageStack.pop();
    this.currentPage--;

    const cursor = this.pageStack[this.pageStack.length - 1];
    let q;

    if (cursor) {
      q = query(
        ...this.buildBaseQuery(...filters),
        startAfter(cursor),
        limit(this.pageSize)
      );
    } else {
      // Going back to the first page
      q = query(
        ...this.buildBaseQuery(...filters),
        limit(this.pageSize)
      );
    }

    const snapshot = await getDocs(q);
    this.lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return this.formatResult(snapshot);
  }

  formatResult(snapshot) {
    return {
      items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      page: this.currentPage,
      hasMore: snapshot.docs.length === this.pageSize,
      hasPrevious: this.currentPage > 1
    };
  }
}
```

Usage of the paginator:

```javascript
// Using the paginator to navigate through products
const paginator = new FirestorePaginator(db, 'products', 'createdAt', 20);

// Get first page
const page1 = await paginator.getFirstPage();
console.log('Page 1:', page1.items.length, 'items');

// Get next page
const page2 = await paginator.getNextPage();
console.log('Page 2:', page2.items.length, 'items');

// Go back
const backToPage1 = await paginator.getPreviousPage();
console.log('Back to page 1:', backToPage1.items.length, 'items');
```

## Using Field Values Instead of Document Snapshots

Sometimes you do not have the document snapshot handy - maybe the cursor was serialized and stored in a URL parameter. You can use field values directly with `startAfter()`.

```javascript
// Use a field value as a cursor instead of a document snapshot
// Useful when the cursor comes from a URL parameter or API response
import { collection, query, orderBy, startAfter, limit, getDocs, Timestamp } from 'firebase/firestore';

async function getPageAfterTimestamp(timestampString) {
  // Convert the string back to a Firestore Timestamp
  const cursorTimestamp = Timestamp.fromDate(new Date(timestampString));

  const q = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    startAfter(cursorTimestamp),  // Use the timestamp value directly
    limit(PAGE_SIZE)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

When using field values, make sure the values match the `orderBy` fields exactly. If you order by two fields, you need to pass two values to `startAfter()`.

## Pagination with Multiple Order Fields

If your query orders by multiple fields, the cursor must account for all of them:

```javascript
// Pagination with compound ordering
// Both fields must be represented in the cursor
import { collection, query, orderBy, startAfter, limit, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'products'),
  orderBy('category'),
  orderBy('price', 'desc'),
  startAfter('electronics', 999),  // category cursor, then price cursor
  limit(PAGE_SIZE)
);
```

## Knowing When You Have Reached the End

A simple trick: request one more item than your page size. If you get that extra item, there are more results. If not, you are on the last page.

```javascript
// Fetch one extra document to check if there are more pages
// This avoids a separate count query
async function getPageWithHasMore(cursor) {
  const q = query(
    collection(db, 'products'),
    orderBy('createdAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE + 1)  // Request one extra
  );

  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > PAGE_SIZE;

  // Only return PAGE_SIZE items, discard the extra one
  const docs = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;
  const items = docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastDoc = docs[docs.length - 1];

  return { items, lastDoc, hasMore };
}
```

## Wrapping Up

Cursor-based pagination in Firestore is straightforward once you understand the pattern. Use `startAfter` with the last document to go forward, `endBefore` with the first document to go backward, and always keep track of your cursor documents. The key advantage over offset pagination is consistency and efficiency - you always read exactly the documents you need, and the results are stable even as data changes around you.

For most applications, wrapping this logic in a reusable paginator class (like the one above) saves a lot of repetitive code and makes pagination a one-line operation in your UI components.
