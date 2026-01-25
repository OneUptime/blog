# How to Use Elasticsearch with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Elasticsearch, Search, Full-Text Search, Backend

Description: Integrate Elasticsearch with Node.js applications for powerful full-text search, autocomplete, filtering, and aggregations with the official client library.

---

Elasticsearch is a distributed search engine built for speed and scale. When your application needs advanced search features like fuzzy matching, faceted search, autocomplete, or needs to search through millions of documents quickly, Elasticsearch is the go-to solution. Here is how to integrate it with Node.js.

## Installation and Setup

Install the official Elasticsearch client:

```bash
npm install @elastic/elasticsearch
```

Create a client connection:

```javascript
// src/elasticsearch.js
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    // For Elastic Cloud
    // cloud: { id: process.env.ELASTIC_CLOUD_ID },
    // auth: { apiKey: process.env.ELASTIC_API_KEY }
});

// Test connection
async function checkConnection() {
    try {
        const info = await client.info();
        console.log('Elasticsearch connected:', info.version.number);
        return true;
    } catch (error) {
        console.error('Elasticsearch connection failed:', error.message);
        return false;
    }
}

module.exports = { client, checkConnection };
```

## Creating an Index

Define index mappings (schema) for your data:

```javascript
async function createProductIndex() {
    const indexName = 'products';

    // Check if index exists
    const exists = await client.indices.exists({ index: indexName });

    if (exists) {
        console.log(`Index ${indexName} already exists`);
        return;
    }

    // Create index with mappings
    await client.indices.create({
        index: indexName,
        body: {
            settings: {
                number_of_shards: 1,
                number_of_replicas: 1,
                analysis: {
                    analyzer: {
                        autocomplete: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'autocomplete_filter']
                        }
                    },
                    filter: {
                        autocomplete_filter: {
                            type: 'edge_ngram',
                            min_gram: 1,
                            max_gram: 20
                        }
                    }
                }
            },
            mappings: {
                properties: {
                    name: {
                        type: 'text',
                        analyzer: 'standard',
                        fields: {
                            autocomplete: {
                                type: 'text',
                                analyzer: 'autocomplete',
                                search_analyzer: 'standard'
                            },
                            keyword: {
                                type: 'keyword'
                            }
                        }
                    },
                    description: { type: 'text' },
                    category: { type: 'keyword' },
                    price: { type: 'float' },
                    stock: { type: 'integer' },
                    tags: { type: 'keyword' },
                    createdAt: { type: 'date' }
                }
            }
        }
    });

    console.log(`Index ${indexName} created`);
}
```

## Indexing Documents

Add documents to the index:

```javascript
// Index single document
async function indexProduct(product) {
    const result = await client.index({
        index: 'products',
        id: product.id.toString(),  // Use your database ID
        body: {
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            stock: product.stock,
            tags: product.tags,
            createdAt: product.createdAt
        }
    });

    return result;
}

// Bulk index multiple documents
async function bulkIndexProducts(products) {
    const body = products.flatMap(product => [
        { index: { _index: 'products', _id: product.id.toString() } },
        {
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            stock: product.stock,
            tags: product.tags,
            createdAt: product.createdAt
        }
    ]);

    const result = await client.bulk({ body, refresh: true });

    if (result.errors) {
        const erroredDocs = result.items.filter(item => item.index.error);
        console.error('Bulk indexing errors:', erroredDocs);
    }

    return result;
}

// Sync from database
async function syncProductsToElasticsearch() {
    const batchSize = 1000;
    let offset = 0;
    let total = 0;

    while (true) {
        const products = await Product.find()
            .skip(offset)
            .limit(batchSize)
            .lean();

        if (products.length === 0) break;

        await bulkIndexProducts(products);
        total += products.length;
        offset += batchSize;

        console.log(`Indexed ${total} products`);
    }

    console.log(`Sync complete: ${total} products indexed`);
}
```

## Basic Search

```javascript
async function searchProducts(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const from = (page - 1) * limit;

    const result = await client.search({
        index: 'products',
        body: {
            from,
            size: limit,
            query: {
                multi_match: {
                    query,
                    fields: ['name^3', 'description', 'tags^2'],  // Boost name and tags
                    fuzziness: 'AUTO'  // Allow typos
                }
            }
        }
    });

    return {
        total: result.hits.total.value,
        data: result.hits.hits.map(hit => ({
            id: hit._id,
            score: hit._score,
            ...hit._source
        }))
    };
}
```

## Advanced Search with Filters

```javascript
async function advancedSearch(searchParams) {
    const {
        query,
        category,
        minPrice,
        maxPrice,
        inStock,
        tags,
        sortBy = '_score',
        sortOrder = 'desc',
        page = 1,
        limit = 10
    } = searchParams;

    // Build query
    const must = [];
    const filter = [];

    // Full-text search
    if (query) {
        must.push({
            multi_match: {
                query,
                fields: ['name^3', 'description', 'tags^2'],
                fuzziness: 'AUTO',
                operator: 'and'
            }
        });
    }

    // Filters
    if (category) {
        filter.push({ term: { category } });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        const range = { price: {} };
        if (minPrice !== undefined) range.price.gte = minPrice;
        if (maxPrice !== undefined) range.price.lte = maxPrice;
        filter.push({ range });
    }

    if (inStock) {
        filter.push({ range: { stock: { gt: 0 } } });
    }

    if (tags && tags.length > 0) {
        filter.push({ terms: { tags } });
    }

    // Build sort
    const sort = [];
    if (sortBy === '_score') {
        sort.push({ _score: sortOrder });
    } else {
        sort.push({ [sortBy]: sortOrder });
    }

    const result = await client.search({
        index: 'products',
        body: {
            from: (page - 1) * limit,
            size: limit,
            query: {
                bool: {
                    must: must.length > 0 ? must : [{ match_all: {} }],
                    filter
                }
            },
            sort
        }
    });

    return {
        total: result.hits.total.value,
        data: result.hits.hits.map(hit => ({
            id: hit._id,
            score: hit._score,
            ...hit._source
        })),
        pagination: {
            page,
            limit,
            total: result.hits.total.value,
            pages: Math.ceil(result.hits.total.value / limit)
        }
    };
}
```

## Autocomplete

```javascript
async function autocomplete(query, limit = 10) {
    const result = await client.search({
        index: 'products',
        body: {
            size: limit,
            query: {
                match: {
                    'name.autocomplete': {
                        query,
                        operator: 'and'
                    }
                }
            },
            _source: ['name']
        }
    });

    return result.hits.hits.map(hit => hit._source.name);
}

// Alternative: Using suggest
async function autocompleteSuggest(query) {
    const result = await client.search({
        index: 'products',
        body: {
            suggest: {
                product_suggest: {
                    prefix: query,
                    completion: {
                        field: 'name_suggest',
                        fuzzy: {
                            fuzziness: 'AUTO'
                        },
                        size: 10
                    }
                }
            }
        }
    });

    return result.suggest.product_suggest[0].options.map(opt => opt.text);
}
```

## Aggregations (Faceted Search)

Get counts for filtering:

```javascript
async function searchWithFacets(query, filters = {}) {
    const result = await client.search({
        index: 'products',
        body: {
            size: 20,
            query: {
                bool: {
                    must: query ? [{
                        multi_match: { query, fields: ['name', 'description'] }
                    }] : [{ match_all: {} }],
                    filter: Object.entries(filters).map(([field, value]) => ({
                        term: { [field]: value }
                    }))
                }
            },
            aggs: {
                categories: {
                    terms: { field: 'category', size: 20 }
                },
                price_ranges: {
                    range: {
                        field: 'price',
                        ranges: [
                            { to: 50, key: 'Under $50' },
                            { from: 50, to: 100, key: '$50-$100' },
                            { from: 100, to: 200, key: '$100-$200' },
                            { from: 200, key: 'Over $200' }
                        ]
                    }
                },
                tags: {
                    terms: { field: 'tags', size: 30 }
                },
                avg_price: {
                    avg: { field: 'price' }
                }
            }
        }
    });

    return {
        data: result.hits.hits.map(hit => ({ id: hit._id, ...hit._source })),
        total: result.hits.total.value,
        facets: {
            categories: result.aggregations.categories.buckets,
            priceRanges: result.aggregations.price_ranges.buckets,
            tags: result.aggregations.tags.buckets,
            avgPrice: result.aggregations.avg_price.value
        }
    };
}
```

## Keeping Elasticsearch in Sync

Sync changes from your database:

```javascript
// After database operations
async function onProductCreated(product) {
    await indexProduct(product);
}

async function onProductUpdated(product) {
    await client.update({
        index: 'products',
        id: product.id.toString(),
        body: {
            doc: {
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                stock: product.stock,
                tags: product.tags
            }
        }
    });
}

async function onProductDeleted(productId) {
    await client.delete({
        index: 'products',
        id: productId.toString()
    });
}

// With Mongoose middleware
productSchema.post('save', async function(doc) {
    await indexProduct(doc);
});

productSchema.post('findOneAndUpdate', async function(doc) {
    if (doc) await onProductUpdated(doc);
});

productSchema.post('findOneAndDelete', async function(doc) {
    if (doc) await onProductDeleted(doc._id);
});
```

## Express.js Integration

```javascript
const express = require('express');
const { client } = require('./elasticsearch');

const router = express.Router();

// Search endpoint
router.get('/search', async (req, res) => {
    try {
        const results = await advancedSearch({
            query: req.query.q,
            category: req.query.category,
            minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
            maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
            inStock: req.query.inStock === 'true',
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            sortBy: req.query.sort,
            sortOrder: req.query.order,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10
        });

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Autocomplete endpoint
router.get('/autocomplete', async (req, res) => {
    try {
        const suggestions = await autocomplete(req.query.q);
        res.json({ suggestions });
    } catch (error) {
        res.status(500).json({ error: 'Autocomplete failed' });
    }
});

module.exports = router;
```

## Error Handling

```javascript
async function safeSearch(query) {
    try {
        return await searchProducts(query);
    } catch (error) {
        if (error.meta?.statusCode === 404) {
            // Index does not exist
            await createProductIndex();
            return { total: 0, data: [] };
        }

        if (error.name === 'ConnectionError') {
            console.error('Elasticsearch unavailable');
            // Fall back to database search
            return await fallbackDatabaseSearch(query);
        }

        throw error;
    }
}
```

## Summary

Elasticsearch provides powerful search capabilities for Node.js applications. Set up proper index mappings for your data types, use multi-match queries for full-text search across fields, implement autocomplete with edge ngrams, add faceted search with aggregations, and keep your index in sync with database changes. For production, consider using Elastic Cloud or managing your own cluster with proper sharding and replication.
