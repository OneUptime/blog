# How to Implement Filtering and Sorting in REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, Filtering, Sorting, API Design, Backend, Pagination, Query Parameters

Description: A practical guide to implementing filtering and sorting in REST APIs with query parameters, covering common patterns, performance considerations, and real-world examples.

---

> Well-designed filtering and sorting capabilities transform your REST API from a basic data endpoint into a powerful query interface. This guide covers battle-tested patterns that scale from simple CRUD operations to complex data retrieval scenarios.

When building REST APIs, clients often need to retrieve specific subsets of data. Without proper filtering and sorting, clients must fetch all records and process them locally. This wastes bandwidth, increases latency, and puts unnecessary load on both client and server.

---

## The Basics: Query Parameter Syntax

REST APIs typically expose filtering and sorting through query parameters. Here is how the request flow works:

```mermaid
sequenceDiagram
    participant Client
    participant API Server
    participant Database

    Client->>API Server: GET /products?category=electronics&sort=-price
    API Server->>API Server: Parse query parameters
    API Server->>API Server: Build database query
    API Server->>Database: SELECT * FROM products WHERE category='electronics' ORDER BY price DESC
    Database-->>API Server: Return filtered results
    API Server-->>Client: JSON response with filtered data
```

### Common Query Parameter Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| Equality | `?status=active` | Exact match filtering |
| Comparison | `?price_gte=100` | Range queries |
| Contains | `?name_contains=phone` | Text search |
| In list | `?status_in=active,pending` | Multiple value matching |
| Sorting | `?sort=price` or `?sort=-price` | Ascending/descending order |

---

## Implementing Filtering in Node.js with Express

Let's build a reusable filtering system for an Express API:

```javascript
// filters.js
// Utility functions for parsing and applying filters to database queries

/**
 * Parses query parameters and extracts filter conditions
 * Supports operators: eq, ne, gt, gte, lt, lte, in, contains
 *
 * @param {Object} query - Express request query object
 * @param {Array} allowedFields - Fields that can be filtered
 * @returns {Object} Parsed filter conditions
 */
function parseFilters(query, allowedFields) {
    const filters = {};

    // Iterate through each query parameter
    for (const [key, value] of Object.entries(query)) {
        // Skip pagination and sorting params
        if (['page', 'limit', 'sort', 'fields'].includes(key)) {
            continue;
        }

        // Parse field name and operator
        // Format: field_operator (e.g., price_gte, status_in)
        const match = key.match(/^(\w+)(?:_(\w+))?$/);
        if (!match) continue;

        const [, field, operator = 'eq'] = match;

        // Security: only allow filtering on specified fields
        if (!allowedFields.includes(field)) {
            continue;
        }

        // Initialize filter for this field
        if (!filters[field]) {
            filters[field] = {};
        }

        // Handle different operators
        switch (operator) {
            case 'eq':
                filters[field].$eq = value;
                break;
            case 'ne':
                filters[field].$ne = value;
                break;
            case 'gt':
                filters[field].$gt = parseNumericValue(value);
                break;
            case 'gte':
                filters[field].$gte = parseNumericValue(value);
                break;
            case 'lt':
                filters[field].$lt = parseNumericValue(value);
                break;
            case 'lte':
                filters[field].$lte = parseNumericValue(value);
                break;
            case 'in':
                // Split comma-separated values into array
                filters[field].$in = value.split(',').map(v => v.trim());
                break;
            case 'contains':
                // Case-insensitive substring match
                filters[field].$contains = value;
                break;
            default:
                // Unknown operator, treat as equality
                filters[field].$eq = value;
        }
    }

    return filters;
}

/**
 * Safely parse numeric values, returning the original string if not a number
 */
function parseNumericValue(value) {
    const num = Number(value);
    return isNaN(num) ? value : num;
}

/**
 * Converts parsed filters to SQL WHERE clause
 * Uses parameterized queries to prevent SQL injection
 *
 * @param {Object} filters - Parsed filter conditions
 * @returns {Object} { whereClause: string, params: array }
 */
function filtersToSQL(filters) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    for (const [field, operators] of Object.entries(filters)) {
        for (const [op, value] of Object.entries(operators)) {
            switch (op) {
                case '$eq':
                    conditions.push(`${field} = $${paramIndex++}`);
                    params.push(value);
                    break;
                case '$ne':
                    conditions.push(`${field} != $${paramIndex++}`);
                    params.push(value);
                    break;
                case '$gt':
                    conditions.push(`${field} > $${paramIndex++}`);
                    params.push(value);
                    break;
                case '$gte':
                    conditions.push(`${field} >= $${paramIndex++}`);
                    params.push(value);
                    break;
                case '$lt':
                    conditions.push(`${field} < $${paramIndex++}`);
                    params.push(value);
                    break;
                case '$lte':
                    conditions.push(`${field} <= $${paramIndex++}`);
                    params.push(value);
                    break;
                case '$in':
                    const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
                    conditions.push(`${field} IN (${placeholders})`);
                    params.push(...value);
                    break;
                case '$contains':
                    conditions.push(`${field} ILIKE $${paramIndex++}`);
                    params.push(`%${value}%`);
                    break;
            }
        }
    }

    return {
        whereClause: conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ')
            : '',
        params
    };
}

module.exports = { parseFilters, filtersToSQL };
```

---

## Implementing Sorting

Sorting follows a simple convention: prefix field names with `-` for descending order:

```javascript
// sorting.js
// Utility functions for parsing and applying sort parameters

/**
 * Parses sort parameter and returns SQL ORDER BY clause
 * Format: field1,-field2,field3 (- prefix means descending)
 *
 * @param {string} sortParam - Comma-separated sort fields
 * @param {Array} allowedFields - Fields that can be sorted
 * @returns {string} SQL ORDER BY clause
 */
function parseSortParam(sortParam, allowedFields) {
    if (!sortParam) {
        return '';
    }

    const sortFields = sortParam.split(',').map(field => field.trim());
    const orderClauses = [];

    for (const field of sortFields) {
        // Check for descending prefix
        const isDescending = field.startsWith('-');
        const fieldName = isDescending ? field.slice(1) : field;

        // Security: only allow sorting on specified fields
        if (!allowedFields.includes(fieldName)) {
            continue;
        }

        const direction = isDescending ? 'DESC' : 'ASC';
        orderClauses.push(`${fieldName} ${direction}`);
    }

    return orderClauses.length > 0
        ? 'ORDER BY ' + orderClauses.join(', ')
        : '';
}

/**
 * Parse sort for MongoDB-style queries
 * Returns object like { price: -1, name: 1 }
 */
function parseSortForMongo(sortParam, allowedFields) {
    if (!sortParam) {
        return {};
    }

    const sort = {};
    const sortFields = sortParam.split(',').map(field => field.trim());

    for (const field of sortFields) {
        const isDescending = field.startsWith('-');
        const fieldName = isDescending ? field.slice(1) : field;

        if (allowedFields.includes(fieldName)) {
            sort[fieldName] = isDescending ? -1 : 1;
        }
    }

    return sort;
}

module.exports = { parseSortParam, parseSortForMongo };
```

---

## Complete Express API Example

Here is a full implementation bringing filtering, sorting, and pagination together:

```javascript
// products.routes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { parseFilters, filtersToSQL } = require('./filters');
const { parseSortParam } = require('./sorting');

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Define which fields can be filtered and sorted
// This prevents SQL injection and limits query complexity
const ALLOWED_FILTER_FIELDS = [
    'category',
    'brand',
    'price',
    'status',
    'created_at',
    'stock_quantity'
];

const ALLOWED_SORT_FIELDS = [
    'name',
    'price',
    'created_at',
    'stock_quantity'
];

/**
 * GET /products
 *
 * Query parameters:
 * - Filtering: category=electronics, price_gte=100, status_in=active,pending
 * - Sorting: sort=-price,name (descending price, ascending name)
 * - Pagination: page=1, limit=20
 *
 * Example: GET /products?category=electronics&price_gte=50&price_lte=500&sort=-price&page=1&limit=10
 */
router.get('/products', async (req, res) => {
    try {
        // Parse pagination parameters with defaults
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        // Parse filters from query parameters
        const filters = parseFilters(req.query, ALLOWED_FILTER_FIELDS);
        const { whereClause, params } = filtersToSQL(filters);

        // Parse sort parameter
        const orderClause = parseSortParam(req.query.sort, ALLOWED_SORT_FIELDS);

        // Build the complete query
        // Note: Always use parameterized queries for security
        const dataQuery = `
            SELECT id, name, category, brand, price, status, stock_quantity, created_at
            FROM products
            ${whereClause}
            ${orderClause || 'ORDER BY created_at DESC'}
            LIMIT $${params.length + 1}
            OFFSET $${params.length + 2}
        `;

        // Count query for pagination metadata
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products
            ${whereClause}
        `;

        // Execute both queries in parallel
        const [dataResult, countResult] = await Promise.all([
            pool.query(dataQuery, [...params, limit, offset]),
            pool.query(countQuery, params)
        ]);

        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        // Return response with pagination metadata
        res.json({
            data: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            // Include applied filters in response for debugging
            appliedFilters: filters,
            appliedSort: req.query.sort || 'created_at (default)'
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            error: 'Failed to fetch products',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
```

---

## Python Implementation with FastAPI

Here is the same pattern implemented in FastAPI:

```python
# main.py
from fastapi import FastAPI, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum
import databases
import sqlalchemy

# Database setup
DATABASE_URL = "postgresql://user:password@localhost/shop"
database = databases.Database(DATABASE_URL)

app = FastAPI()

# Define allowed filter and sort fields as enums for validation
class ProductSortField(str, Enum):
    name = "name"
    price = "price"
    created_at = "created_at"
    stock_quantity = "stock_quantity"

class ProductCategory(str, Enum):
    electronics = "electronics"
    clothing = "clothing"
    home = "home"
    sports = "sports"

class ProductStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    pending = "pending"

# Response models
class Product(BaseModel):
    id: int
    name: str
    category: str
    brand: str
    price: float
    status: str
    stock_quantity: int

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next_page: bool
    has_prev_page: bool

class ProductListResponse(BaseModel):
    data: List[Product]
    pagination: PaginationMeta


def parse_sort_param(sort: str, allowed_fields: List[str]) -> str:
    """
    Parse sort parameter into SQL ORDER BY clause.
    Prefix with - for descending order.

    Example: "-price,name" -> "price DESC, name ASC"
    """
    if not sort:
        return ""

    order_clauses = []
    for field in sort.split(","):
        field = field.strip()
        is_desc = field.startswith("-")
        field_name = field[1:] if is_desc else field

        # Validate field is allowed
        if field_name not in allowed_fields:
            continue

        direction = "DESC" if is_desc else "ASC"
        order_clauses.append(f"{field_name} {direction}")

    return ", ".join(order_clauses)


@app.get("/products", response_model=ProductListResponse)
async def get_products(
    # Pagination parameters
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),

    # Filter parameters with validation
    category: Optional[ProductCategory] = Query(default=None, description="Filter by category"),
    status: Optional[ProductStatus] = Query(default=None, description="Filter by status"),
    brand: Optional[str] = Query(default=None, max_length=100, description="Filter by brand"),

    # Range filters for price
    price_gte: Optional[float] = Query(default=None, ge=0, description="Minimum price"),
    price_lte: Optional[float] = Query(default=None, ge=0, description="Maximum price"),

    # Range filters for stock
    stock_gte: Optional[int] = Query(default=None, ge=0, description="Minimum stock"),
    stock_lte: Optional[int] = Query(default=None, ge=0, description="Maximum stock"),

    # Text search
    name_contains: Optional[str] = Query(default=None, max_length=100, description="Search in name"),

    # Sorting
    sort: Optional[str] = Query(
        default="-created_at",
        description="Sort fields (prefix with - for descending). Example: -price,name"
    )
):
    """
    Retrieve products with filtering, sorting, and pagination.

    Filtering examples:
    - /products?category=electronics
    - /products?price_gte=100&price_lte=500
    - /products?status=active&brand=Apple

    Sorting examples:
    - /products?sort=price (ascending by price)
    - /products?sort=-price (descending by price)
    - /products?sort=-price,name (descending price, then ascending name)
    """

    # Build WHERE conditions
    conditions = []
    params = {}

    if category:
        conditions.append("category = :category")
        params["category"] = category.value

    if status:
        conditions.append("status = :status")
        params["status"] = status.value

    if brand:
        conditions.append("brand = :brand")
        params["brand"] = brand

    if price_gte is not None:
        conditions.append("price >= :price_gte")
        params["price_gte"] = price_gte

    if price_lte is not None:
        conditions.append("price <= :price_lte")
        params["price_lte"] = price_lte

    if stock_gte is not None:
        conditions.append("stock_quantity >= :stock_gte")
        params["stock_gte"] = stock_gte

    if stock_lte is not None:
        conditions.append("stock_quantity <= :stock_lte")
        params["stock_lte"] = stock_lte

    if name_contains:
        conditions.append("name ILIKE :name_pattern")
        params["name_pattern"] = f"%{name_contains}%"

    # Build WHERE clause
    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Parse and validate sort parameter
    allowed_sort_fields = ["name", "price", "created_at", "stock_quantity"]
    order_clause = parse_sort_param(sort, allowed_sort_fields)
    if not order_clause:
        order_clause = "created_at DESC"

    # Calculate offset
    offset = (page - 1) * limit

    # Execute count query
    count_query = f"SELECT COUNT(*) FROM products WHERE {where_clause}"
    total = await database.fetch_val(count_query, params)

    # Execute data query
    data_query = f"""
        SELECT id, name, category, brand, price, status, stock_quantity
        FROM products
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
    """
    params["limit"] = limit
    params["offset"] = offset

    rows = await database.fetch_all(data_query, params)

    # Build response
    total_pages = (total + limit - 1) // limit

    return ProductListResponse(
        data=[Product(**dict(row)) for row in rows],
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
            has_next_page=page < total_pages,
            has_prev_page=page > 1
        )
    )
```

---

## Request Flow Architecture

Understanding how filtering and sorting fits into the overall request lifecycle helps with debugging and optimization:

```mermaid
flowchart TD
    A[Client Request] --> B[Parse Query Parameters]
    B --> C{Validate Parameters}
    C -->|Invalid| D[Return 400 Bad Request]
    C -->|Valid| E[Build Filter Conditions]
    E --> F[Build Sort Clause]
    F --> G[Add Pagination]
    G --> H[Generate SQL Query]
    H --> I{Check Query Complexity}
    I -->|Too Complex| J[Return 400 Query Too Complex]
    I -->|OK| K[Execute Query]
    K --> L[Format Response]
    L --> M[Add Pagination Metadata]
    M --> N[Return Response]
```

---

## Handling Complex Filter Scenarios

### Nested Resource Filtering

When resources have relationships, you may need to filter by related data:

```javascript
// Filtering products by related category attributes
// GET /products?category.name=Electronics&category.featured=true

function parseNestedFilters(query, allowedPaths) {
    const filters = {};

    for (const [key, value] of Object.entries(query)) {
        // Handle nested paths like "category.name"
        const parts = key.split('.');

        if (parts.length === 2) {
            const [relation, field] = parts;
            const path = `${relation}.${field}`;

            // Validate the nested path is allowed
            if (!allowedPaths.includes(path)) {
                continue;
            }

            if (!filters[relation]) {
                filters[relation] = {};
            }
            filters[relation][field] = value;
        }
    }

    return filters;
}

// Convert to SQL JOIN
function nestedFiltersToSQL(filters) {
    const joins = [];
    const conditions = [];
    const params = [];

    if (filters.category) {
        joins.push('LEFT JOIN categories c ON products.category_id = c.id');

        for (const [field, value] of Object.entries(filters.category)) {
            conditions.push(`c.${field} = $${params.length + 1}`);
            params.push(value);
        }
    }

    return {
        joinClause: joins.join(' '),
        whereClause: conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '',
        params
    };
}
```

### OR Conditions

By default, multiple filters use AND logic. To support OR:

```javascript
// GET /products?or[0][category]=electronics&or[0][category]=clothing
// GET /products?category_in=electronics,clothing (simpler alternative)

function parseOrFilters(query) {
    const orGroups = [];

    // Parse or[index][field]=value pattern
    for (const [key, value] of Object.entries(query)) {
        const match = key.match(/^or\[(\d+)\]\[(\w+)\]$/);
        if (match) {
            const [, index, field] = match;
            const idx = parseInt(index);

            if (!orGroups[idx]) {
                orGroups[idx] = {};
            }
            orGroups[idx][field] = value;
        }
    }

    return orGroups.filter(Boolean);
}

function orFiltersToSQL(orGroups, allowedFields) {
    if (orGroups.length === 0) return { clause: '', params: [] };

    const groupClauses = [];
    const params = [];

    for (const group of orGroups) {
        const conditions = [];
        for (const [field, value] of Object.entries(group)) {
            if (allowedFields.includes(field)) {
                conditions.push(`${field} = $${params.length + 1}`);
                params.push(value);
            }
        }
        if (conditions.length > 0) {
            groupClauses.push(`(${conditions.join(' AND ')})`);
        }
    }

    return {
        clause: groupClauses.length > 0 ? `(${groupClauses.join(' OR ')})` : '',
        params
    };
}
```

---

## Performance Considerations

### Database Indexing

Filtering and sorting are only as fast as your database indexes:

```sql
-- Create indexes for commonly filtered fields
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);

-- Composite index for common filter combinations
CREATE INDEX idx_products_category_status ON products(category, status);

-- Index for sorting
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Composite index for filtering AND sorting
-- This index supports: WHERE category = ? ORDER BY price
CREATE INDEX idx_products_category_price ON products(category, price);
```

### Query Complexity Limits

Prevent abuse by limiting query complexity:

```javascript
// middleware/queryComplexity.js

const MAX_FILTER_COUNT = 10;
const MAX_SORT_FIELDS = 3;
const MAX_IN_VALUES = 50;

function validateQueryComplexity(req, res, next) {
    const { query } = req;

    // Count filter parameters
    const filterParams = Object.keys(query).filter(
        key => !['page', 'limit', 'sort', 'fields'].includes(key)
    );

    if (filterParams.length > MAX_FILTER_COUNT) {
        return res.status(400).json({
            error: 'Query too complex',
            message: `Maximum ${MAX_FILTER_COUNT} filter parameters allowed`
        });
    }

    // Check sort field count
    if (query.sort) {
        const sortFields = query.sort.split(',');
        if (sortFields.length > MAX_SORT_FIELDS) {
            return res.status(400).json({
                error: 'Query too complex',
                message: `Maximum ${MAX_SORT_FIELDS} sort fields allowed`
            });
        }
    }

    // Check IN clause values
    for (const [key, value] of Object.entries(query)) {
        if (key.endsWith('_in') && typeof value === 'string') {
            const values = value.split(',');
            if (values.length > MAX_IN_VALUES) {
                return res.status(400).json({
                    error: 'Query too complex',
                    message: `Maximum ${MAX_IN_VALUES} values in IN clause`
                });
            }
        }
    }

    next();
}

module.exports = validateQueryComplexity;
```

### Caching Strategies

For frequently used filter combinations:

```javascript
// cache/filterCache.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const CACHE_TTL = 300; // 5 minutes

async function getCachedOrFetch(cacheKey, fetchFn) {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));

    return data;
}

function buildCacheKey(baseKey, filters, sort, page, limit) {
    // Create deterministic cache key from query parameters
    const filterStr = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
        .join('|');

    return `${baseKey}:${filterStr}:${sort}:${page}:${limit}`;
}

module.exports = { getCachedOrFetch, buildCacheKey };
```

---

## API Design Best Practices

### Consistent Parameter Naming

Pick a convention and stick to it across all endpoints:

```
# Recommended conventions

# Filtering
?field=value           # Equality
?field_ne=value        # Not equal
?field_gt=value        # Greater than
?field_gte=value       # Greater than or equal
?field_lt=value        # Less than
?field_lte=value       # Less than or equal
?field_in=a,b,c        # In list
?field_contains=value  # Contains substring

# Sorting
?sort=field            # Ascending
?sort=-field           # Descending
?sort=-price,name      # Multiple fields

# Pagination
?page=1&limit=20       # Offset-based
?cursor=abc123&limit=20 # Cursor-based
```

### Documentation in OpenAPI

Document your filtering capabilities clearly:

```yaml
# openapi.yaml
paths:
  /products:
    get:
      summary: List products
      parameters:
        - name: category
          in: query
          schema:
            type: string
            enum: [electronics, clothing, home]
          description: Filter by product category

        - name: price_gte
          in: query
          schema:
            type: number
            minimum: 0
          description: Minimum price filter

        - name: price_lte
          in: query
          schema:
            type: number
            minimum: 0
          description: Maximum price filter

        - name: sort
          in: query
          schema:
            type: string
            pattern: '^-?[a-z_]+(,-?[a-z_]+)*$'
          description: |
            Sort field(s). Prefix with - for descending.
            Examples: price, -price, -price,name
          example: "-price,name"

        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1

        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
```

### Error Responses

Provide helpful error messages:

```javascript
// Example error responses for invalid filters

// Invalid filter field
{
    "error": "Invalid filter",
    "message": "Field 'secret_field' is not filterable",
    "allowedFields": ["category", "brand", "price", "status"]
}

// Invalid filter value
{
    "error": "Invalid filter value",
    "message": "price_gte must be a number",
    "field": "price_gte",
    "providedValue": "not-a-number"
}

// Invalid sort field
{
    "error": "Invalid sort field",
    "message": "Cannot sort by 'password'",
    "allowedSortFields": ["name", "price", "created_at"]
}
```

---

## Testing Your Filtering Implementation

```javascript
// tests/filters.test.js
const request = require('supertest');
const app = require('../app');

describe('Product Filtering', () => {
    describe('equality filters', () => {
        it('filters by exact category match', async () => {
            const res = await request(app)
                .get('/products?category=electronics')
                .expect(200);

            // All returned products should have category=electronics
            for (const product of res.body.data) {
                expect(product.category).toBe('electronics');
            }
        });
    });

    describe('range filters', () => {
        it('filters by price range', async () => {
            const res = await request(app)
                .get('/products?price_gte=100&price_lte=500')
                .expect(200);

            for (const product of res.body.data) {
                expect(product.price).toBeGreaterThanOrEqual(100);
                expect(product.price).toBeLessThanOrEqual(500);
            }
        });
    });

    describe('sorting', () => {
        it('sorts by price ascending', async () => {
            const res = await request(app)
                .get('/products?sort=price')
                .expect(200);

            const prices = res.body.data.map(p => p.price);
            const sortedPrices = [...prices].sort((a, b) => a - b);
            expect(prices).toEqual(sortedPrices);
        });

        it('sorts by price descending', async () => {
            const res = await request(app)
                .get('/products?sort=-price')
                .expect(200);

            const prices = res.body.data.map(p => p.price);
            const sortedPrices = [...prices].sort((a, b) => b - a);
            expect(prices).toEqual(sortedPrices);
        });
    });

    describe('security', () => {
        it('ignores non-whitelisted filter fields', async () => {
            const res = await request(app)
                .get('/products?secret_field=hack')
                .expect(200);

            // Should return results without applying the invalid filter
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('prevents SQL injection in filter values', async () => {
            const res = await request(app)
                .get('/products?category=electronics%27%3B%20DROP%20TABLE%20products%3B--')
                .expect(200);

            // Should safely handle the malicious input
            expect(res.body.data).toBeDefined();
        });
    });
});
```

---

## Conclusion

Implementing filtering and sorting properly requires attention to:

1. **Security** - Always whitelist allowed fields and use parameterized queries
2. **Consistency** - Use the same parameter naming conventions across all endpoints
3. **Performance** - Index your database columns and consider caching
4. **Documentation** - Clearly document available filters and their syntax
5. **Error handling** - Provide helpful error messages for invalid queries

These patterns scale from simple CRUD APIs to complex data platforms. Start with basic equality filters and add complexity as your use cases require.

---

*Building APIs that need monitoring? [OneUptime](https://oneuptime.com) provides comprehensive API monitoring with response time tracking, error alerting, and uptime dashboards.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI Without External Services](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [How to Build Production-Ready REST APIs with Django REST Framework](https://oneuptime.com/blog/post/2025-01-06-django-rest-framework-api/view)
