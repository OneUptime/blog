# How to Create Search Functionality in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Search, MongoDB, Database, Backend

Description: Implement search functionality in Node.js applications using database text search, fuzzy matching, and full-text search with practical examples for REST APIs.

---

Every application eventually needs search. From simple text matching to complex full-text search, here are the approaches for implementing search in Node.js applications, starting simple and progressing to more advanced solutions.

## Basic String Matching

The simplest search uses string methods:

```javascript
const express = require('express');
const router = express.Router();

// In-memory data
const products = [
    { id: 1, name: 'iPhone 15 Pro', description: 'Latest Apple smartphone' },
    { id: 2, name: 'Samsung Galaxy S24', description: 'Android flagship phone' },
    { id: 3, name: 'MacBook Pro', description: 'Professional laptop from Apple' }
];

router.get('/search', (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query too short' });
    }

    const query = q.toLowerCase();

    const results = products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
    );

    res.json({
        query: q,
        count: results.length,
        data: results
    });
});
```

## MongoDB Text Search

MongoDB has built-in text search capabilities:

```javascript
const mongoose = require('mongoose');

// Create schema with text index
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    category: String,
    price: Number,
    tags: [String]
});

// Create text index on multiple fields
productSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text'
}, {
    weights: {
        name: 10,        // Name matches are most important
        tags: 5,         // Tag matches are important
        description: 1   // Description matches are least important
    },
    name: 'TextIndex'
});

const Product = mongoose.model('Product', productSchema);

// Search endpoint
router.get('/products/search', async (req, res) => {
    const { q, category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query required' });
    }

    // Build query
    const query = {
        $text: { $search: q }
    };

    // Add filters
    if (category) query.category = category;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
        Product.find(query)
            .select({ score: { $meta: 'textScore' } })  // Include relevance score
            .sort({ score: { $meta: 'textScore' } })     // Sort by relevance
            .skip(skip)
            .limit(parseInt(limit)),
        Product.countDocuments(query)
    ]);

    res.json({
        query: q,
        data: products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});
```

## Regex Search for Partial Matching

When text search is not flexible enough:

```javascript
router.get('/products/search', async (req, res) => {
    const { q, field = 'all' } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Search query required' });
    }

    // Escape special regex characters
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build regex query
    let searchQuery;

    if (field === 'all') {
        searchQuery = {
            $or: [
                { name: { $regex: escapedQuery, $options: 'i' } },
                { description: { $regex: escapedQuery, $options: 'i' } },
                { tags: { $regex: escapedQuery, $options: 'i' } }
            ]
        };
    } else {
        searchQuery = {
            [field]: { $regex: escapedQuery, $options: 'i' }
        };
    }

    const products = await Product.find(searchQuery).limit(50);

    res.json({ data: products });
});
```

## SQL Full-Text Search (PostgreSQL)

With Knex.js and PostgreSQL:

```javascript
const knex = require('knex');

// Create full-text search column
await knex.raw(`
    ALTER TABLE products ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(tags::text, '')), 'C')
    ) STORED
`);

// Create index
await knex.raw(`
    CREATE INDEX products_search_idx ON products USING GIN(search_vector)
`);

// Search function
async function searchProducts(query, options = {}) {
    const { limit = 10, offset = 0 } = options;

    // Convert query to tsquery format
    const searchTerms = query.trim().split(/\s+/).join(' & ');

    const results = await knex('products')
        .select('*')
        .select(knex.raw('ts_rank(search_vector, plainto_tsquery(?)) as rank', [query]))
        .whereRaw('search_vector @@ plainto_tsquery(?)', [query])
        .orderBy('rank', 'desc')
        .limit(limit)
        .offset(offset);

    return results;
}
```

## Autocomplete/Typeahead Search

For search-as-you-type functionality:

```javascript
// MongoDB autocomplete with prefix matching
router.get('/autocomplete', async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 1) {
        return res.json({ suggestions: [] });
    }

    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const suggestions = await Product.find({
        name: { $regex: `^${escapedQuery}`, $options: 'i' }  // Starts with
    })
    .select('name')
    .limit(10)
    .lean();

    res.json({
        query: q,
        suggestions: suggestions.map(p => p.name)
    });
});

// With caching for performance
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

router.get('/autocomplete', async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 1) {
        return res.json({ suggestions: [] });
    }

    const cacheKey = `autocomplete:${q.toLowerCase()}`;
    let suggestions = cache.get(cacheKey);

    if (!suggestions) {
        const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const results = await Product.find({
            name: { $regex: `^${escapedQuery}`, $options: 'i' }
        })
        .select('name')
        .limit(10)
        .lean();

        suggestions = results.map(p => p.name);
        cache.set(cacheKey, suggestions);
    }

    res.json({ query: q, suggestions });
});
```

## Fuzzy Search with Fuse.js

For client-side or small dataset fuzzy matching:

```bash
npm install fuse.js
```

```javascript
const Fuse = require('fuse.js');

// Configure Fuse
const fuseOptions = {
    keys: [
        { name: 'name', weight: 0.7 },
        { name: 'description', weight: 0.2 },
        { name: 'tags', weight: 0.1 }
    ],
    threshold: 0.4,         // 0.0 = perfect match, 1.0 = match anything
    distance: 100,          // How far to search for matches
    includeScore: true,
    minMatchCharLength: 2
};

let fuse;
let products = [];

// Initialize search index
async function initializeSearchIndex() {
    products = await Product.find().lean();
    fuse = new Fuse(products, fuseOptions);
    console.log(`Search index built with ${products.length} products`);
}

// Rebuild periodically or on data changes
setInterval(initializeSearchIndex, 60000);  // Every minute

router.get('/search/fuzzy', (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query too short' });
    }

    const results = fuse.search(q, { limit: 20 });

    res.json({
        query: q,
        count: results.length,
        data: results.map(r => ({
            ...r.item,
            score: r.score
        }))
    });
});
```

## Search API with Multiple Features

Complete search endpoint with filters, sorting, and pagination:

```javascript
router.get('/api/search', async (req, res) => {
    const {
        q,                          // Search query
        category,                   // Filter by category
        minPrice,                   // Minimum price
        maxPrice,                   // Maximum price
        inStock,                    // Only show in-stock items
        sort = 'relevance',         // Sort by: relevance, price, name, date
        order = 'desc',             // Sort order: asc, desc
        page = 1,
        limit = 20
    } = req.query;

    // Build base query
    const query = {};

    // Text search
    if (q && q.length >= 2) {
        query.$text = { $search: q };
    }

    // Filters
    if (category) query.category = category;
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
        case 'relevance':
            if (q) {
                sortQuery = { score: { $meta: 'textScore' } };
            } else {
                sortQuery = { createdAt: -1 };
            }
            break;
        case 'price':
            sortQuery = { price: order === 'asc' ? 1 : -1 };
            break;
        case 'name':
            sortQuery = { name: order === 'asc' ? 1 : -1 };
            break;
        case 'date':
            sortQuery = { createdAt: order === 'asc' ? 1 : -1 };
            break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    let queryBuilder = Product.find(query);

    if (q) {
        queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
    }

    const [products, total, categories] = await Promise.all([
        queryBuilder
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Product.countDocuments(query),
        // Get facets for filtering
        Product.aggregate([
            { $match: query },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])
    ]);

    res.json({
        query: q,
        filters: { category, minPrice, maxPrice, inStock },
        sort: { field: sort, order },
        data: products,
        facets: {
            categories: categories.map(c => ({
                name: c._id,
                count: c.count
            }))
        },
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});
```

## Search Highlighting

Highlight matching terms in results:

```javascript
function highlightMatches(text, query) {
    if (!text || !query) return text;

    const terms = query.toLowerCase().split(/\s+/);
    let highlighted = text;

    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
}

// In your search endpoint
const products = await Product.find({ $text: { $search: q } }).lean();

const highlightedProducts = products.map(product => ({
    ...product,
    nameHighlighted: highlightMatches(product.name, q),
    descriptionHighlighted: highlightMatches(product.description, q)
}));

res.json({ data: highlightedProducts });
```

## Summary

Start with simple string matching for basic needs. Use MongoDB text indexes for scalable full-text search with relevance scoring. Add regex for partial matching and Fuse.js for fuzzy search on smaller datasets. For production applications, combine text search with filters, sorting, pagination, and faceted navigation to create a complete search experience. Consider Elasticsearch for very large datasets or complex search requirements.
