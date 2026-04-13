# How to Use Mongoose Cursor-Based Pagination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Pagination, Cursor, Performance

Description: Learn how to implement cursor-based pagination with Mongoose to efficiently paginate large MongoDB collections without the pitfalls of skip-based pagination.

---

## Why Cursor-Based Pagination?

Skip-based pagination (`skip(n).limit(20)`) is simple but scans and discards `n` documents on every page request. At page 100 of 20 results, MongoDB scans 2000 documents before returning 20.

Cursor-based pagination uses a "pointer" - typically the last `_id` or sort field value from the previous page - and queries `{ field: { $gt: cursor } }`. MongoDB uses the index directly without scanning skipped documents.

## Basic Cursor Pagination by _id

```javascript
async function getPostsPage(cursor = null, limit = 20) {
  const filter = cursor
    ? { _id: { $gt: new mongoose.Types.ObjectId(cursor) } }
    : {};

  const posts = await Post.find(filter)
    .sort({ _id: 1 })
    .limit(limit + 1)  // fetch one extra to detect if there is a next page
    .lean();

  const hasNextPage = posts.length > limit;
  if (hasNextPage) posts.pop(); // remove the extra document

  return {
    data: posts,
    nextCursor: hasNextPage ? posts[posts.length - 1]._id.toString() : null
  };
}

// First page
const page1 = await getPostsPage();

// Next page
const page2 = await getPostsPage(page1.nextCursor);
```

## Cursor Pagination with a Sort Field

When sorting by a non-unique field like `createdAt`, combine with `_id` to break ties:

```javascript
async function getPostsByCursor(cursor, limit = 20) {
  let filter = { published: true };

  if (cursor) {
    const { createdAt, _id } = cursor;
    // Documents created earlier, OR same createdAt with smaller _id
    filter.$or = [
      { createdAt: { $lt: new Date(createdAt) } },
      { createdAt: new Date(createdAt), _id: { $lt: new mongoose.Types.ObjectId(_id) } }
    ];
  }

  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .select('title slug createdAt')
    .lean();

  const hasNext = posts.length > limit;
  if (hasNext) posts.pop();

  const lastDoc = posts[posts.length - 1];
  return {
    data: posts,
    nextCursor: hasNext
      ? { createdAt: lastDoc.createdAt, _id: lastDoc._id.toString() }
      : null
  };
}
```

## Encoding the Cursor as a Token

Encode the cursor as a Base64 string to keep the API opaque:

```javascript
function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function decodeCursor(token) {
  return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
}

// In the paginate function:
const nextCursorToken = hasNext ? encodeCursor({
  createdAt: lastDoc.createdAt,
  _id: lastDoc._id.toString()
}) : null;
```

Clients receive an opaque string and pass it back in the next request.

## Using Mongoose Streams for Cursor Iteration

For processing all documents in a large collection without pagination, use a Mongoose cursor:

```javascript
const cursor = Post.find({ published: true }).cursor();

for await (const post of cursor) {
  await processPost(post);
}
```

This streams documents one at a time without loading the entire collection into memory.

## Adding the Pagination Function as a Schema Static

Encapsulate the logic in a static method for reuse:

```javascript
postSchema.statics.paginate = async function (query, { limit = 20, cursor } = {}) {
  const filter = { ...query };
  if (cursor) {
    filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
  }

  const docs = await this.find(filter).sort({ _id: 1 }).limit(limit + 1).lean();
  const hasNext = docs.length > limit;
  if (hasNext) docs.pop();

  return {
    data: docs,
    nextCursor: hasNext ? docs[docs.length - 1]._id.toString() : null
  };
};
```

## Summary

Cursor-based pagination with Mongoose uses the last document's `_id` or sort key as a pointer instead of `skip()`, allowing MongoDB to use indexes efficiently regardless of page depth. Return `limit + 1` documents to detect if more pages exist, then return a cursor token pointing to the last document. For multi-field sort orders, combine all sort fields in the cursor to produce stable, consistent pages. Implement cursor pagination as a schema static or plugin for clean, reusable pagination across all your models.
