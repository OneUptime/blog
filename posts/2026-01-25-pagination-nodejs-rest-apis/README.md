# How to Create Pagination in Node.js REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, REST API, Pagination, Express, Backend

Description: Implement efficient pagination in Node.js REST APIs using offset-based and cursor-based approaches with proper response formatting and database optimization.

---

Returning thousands of records in a single API response is a recipe for slow applications and crashed browsers. Pagination breaks large datasets into manageable chunks. Here are two approaches: offset-based (simple but has issues at scale) and cursor-based (more complex but performs better).

## Offset-Based Pagination

The traditional approach using page numbers:

```javascript
// GET /api/users?page=2&limit=10

const express = require('express');
const router = express.Router();

router.get('/users', async (req, res) => {
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    try {
        // Get paginated results and total count
        const [users, total] = await Promise.all([
            User.find()
                .skip(offset)
                .limit(limit)
                .sort({ createdAt: -1 }),
            User.countDocuments()
        ]);

        res.json({
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

With SQL (using Knex.js):

```javascript
router.get('/users', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
        knex('users')
            .select('*')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset),
        knex('users').count('id as count').first()
    ]);

    const total = parseInt(countResult.count);

    res.json({
        data: users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    });
});
```

### Problems with Offset Pagination

1. **Performance degrades**: `OFFSET 10000` still scans 10,000 rows
2. **Inconsistent results**: If data changes between requests, items can be skipped or duplicated
3. **No random access**: Jumping to page 500 is slow

## Cursor-Based Pagination

Uses a pointer to the last item instead of page numbers. Better for large datasets and real-time data:

```javascript
// GET /api/users?cursor=abc123&limit=10

router.get('/users', async (req, res) => {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const cursor = req.query.cursor;

    // Build query
    let query = User.find();

    if (cursor) {
        // Decode cursor (base64 encoded ID or timestamp)
        const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
        query = query.where('_id').lt(decodedCursor);
    }

    const users = await query
        .sort({ _id: -1 })
        .limit(limit + 1);  // Fetch one extra to check if there are more

    // Check if there are more results
    const hasMore = users.length > limit;
    if (hasMore) {
        users.pop();  // Remove the extra item
    }

    // Generate next cursor
    const nextCursor = hasMore
        ? Buffer.from(users[users.length - 1]._id.toString()).toString('base64')
        : null;

    res.json({
        data: users,
        pagination: {
            limit,
            hasMore,
            nextCursor
        }
    });
});
```

### Cursor with Timestamp Ordering

When ordering by a field other than ID:

```javascript
router.get('/posts', async (req, res) => {
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const cursor = req.query.cursor;

    let query = {};

    if (cursor) {
        // Cursor contains both timestamp and ID for uniqueness
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
        query = {
            $or: [
                { createdAt: { $lt: new Date(decoded.createdAt) } },
                {
                    createdAt: new Date(decoded.createdAt),
                    _id: { $lt: decoded.id }
                }
            ]
        };
    }

    const posts = await Post.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1);

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const nextCursor = hasMore
        ? Buffer.from(JSON.stringify({
            createdAt: posts[posts.length - 1].createdAt.toISOString(),
            id: posts[posts.length - 1]._id.toString()
        })).toString('base64')
        : null;

    res.json({
        data: posts,
        pagination: { limit, hasMore, nextCursor }
    });
});
```

## Pagination Utility Class

Create a reusable pagination helper:

```javascript
// utils/pagination.js

class Paginator {
    constructor(options = {}) {
        this.defaultLimit = options.defaultLimit || 10;
        this.maxLimit = options.maxLimit || 100;
    }

    // Offset-based pagination
    async paginate(model, query, options = {}) {
        const page = Math.max(1, parseInt(options.page) || 1);
        const limit = Math.min(this.maxLimit, Math.max(1, parseInt(options.limit) || this.defaultLimit));
        const offset = (page - 1) * limit;

        const [data, total] = await Promise.all([
            model.find(query)
                .sort(options.sort || { createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .select(options.select)
                .populate(options.populate),
            model.countDocuments(query)
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        };
    }

    // Cursor-based pagination
    async cursorPaginate(model, query, options = {}) {
        const limit = Math.min(this.maxLimit, Math.max(1, parseInt(options.limit) || this.defaultLimit));
        const cursor = options.cursor;
        const sortField = options.sortField || '_id';
        const sortOrder = options.sortOrder || -1;

        let cursorQuery = { ...query };

        if (cursor) {
            const decoded = this.decodeCursor(cursor);
            const operator = sortOrder === -1 ? '$lt' : '$gt';
            cursorQuery[sortField] = { [operator]: decoded };
        }

        const data = await model.find(cursorQuery)
            .sort({ [sortField]: sortOrder })
            .limit(limit + 1)
            .select(options.select)
            .populate(options.populate);

        const hasMore = data.length > limit;
        if (hasMore) data.pop();

        const nextCursor = hasMore
            ? this.encodeCursor(data[data.length - 1][sortField])
            : null;

        return {
            data,
            pagination: {
                limit,
                hasMore,
                nextCursor
            }
        };
    }

    encodeCursor(value) {
        const str = value instanceof Date ? value.toISOString() : String(value);
        return Buffer.from(str).toString('base64');
    }

    decodeCursor(cursor) {
        return Buffer.from(cursor, 'base64').toString('utf-8');
    }
}

module.exports = new Paginator();
```

Usage:

```javascript
const paginator = require('./utils/pagination');

router.get('/users', async (req, res) => {
    const result = await paginator.paginate(User, { active: true }, {
        page: req.query.page,
        limit: req.query.limit,
        sort: { name: 1 },
        select: 'name email createdAt'
    });

    res.json(result);
});

router.get('/posts', async (req, res) => {
    const result = await paginator.cursorPaginate(Post, { published: true }, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        sortField: 'createdAt',
        sortOrder: -1
    });

    res.json(result);
});
```

## Adding Filtering and Sorting

Combine pagination with filters:

```javascript
router.get('/products', async (req, res) => {
    const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        category,
        minPrice,
        maxPrice,
        search
    } = req.query;

    // Build filter
    const filter = {};

    if (category) {
        filter.category = category;
    }

    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
        filter.$text = { $search: search };
    }

    // Parse sort string: "-price" means descending, "price" means ascending
    const sortObj = {};
    if (sort.startsWith('-')) {
        sortObj[sort.substring(1)] = -1;
    } else {
        sortObj[sort] = 1;
    }

    const result = await paginator.paginate(Product, filter, {
        page,
        limit,
        sort: sortObj
    });

    res.json(result);
});
```

## Response Headers for Pagination

Some APIs use headers instead of response body:

```javascript
router.get('/items', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { data, pagination } = await paginator.paginate(Item, {}, { page, limit });

    // Set pagination headers
    res.set({
        'X-Total-Count': pagination.total,
        'X-Page': pagination.page,
        'X-Per-Page': pagination.limit,
        'X-Total-Pages': pagination.pages
    });

    // Link header (RFC 5988)
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const links = [];

    if (pagination.hasPrev) {
        links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
    }
    if (pagination.hasNext) {
        links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
    }
    links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
    links.push(`<${baseUrl}?page=${pagination.pages}&limit=${limit}>; rel="last"`);

    res.set('Link', links.join(', '));

    res.json(data);
});
```

## Database Optimization

Ensure indexes exist for paginated queries:

```javascript
// MongoDB indexes
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 1, createdAt: -1 });
postSchema.index({ published: 1, createdAt: -1 });

// For text search
productSchema.index({ name: 'text', description: 'text' });
```

SQL indexes:

```sql
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_posts_published_created ON posts(published, created_at DESC);
```

## Summary

Use offset-based pagination for smaller datasets where page numbers make sense (admin panels, reports). Use cursor-based pagination for large datasets, infinite scrolling, or real-time data where consistency matters. Always validate and limit query parameters, include useful pagination metadata in responses, and ensure your database has proper indexes for paginated queries.
