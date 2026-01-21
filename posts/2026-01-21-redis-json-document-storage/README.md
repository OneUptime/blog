# How to Use Redis JSON for Document Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisJSON, Document Storage, JSON, NoSQL, Data Modeling

Description: A comprehensive guide to using RedisJSON for document storage, covering JSONPath queries, nested document operations, indexing with RediSearch, and best practices for building document-oriented applications.

---

Modern applications often work with JSON documents - from user profiles to product catalogs to event logs. RedisJSON brings native JSON support to Redis, allowing you to store, update, and query JSON documents with the speed Redis is known for. In this guide, we will explore how to use RedisJSON for document storage.

## What is RedisJSON?

RedisJSON is a Redis module that provides native JSON support. Key features include:

- **Native JSON storage**: Store JSON documents as first-class data types
- **JSONPath queries**: Query and manipulate nested structures
- **Atomic operations**: Update specific fields without fetching entire documents
- **RediSearch integration**: Full-text search on JSON documents
- **Memory efficiency**: Optimized binary format for JSON storage

## Getting Started

### Installation with Docker

The easiest way to get RedisJSON is with Redis Stack:

```bash
docker run -d --name redis-stack \
  -p 6379:6379 \
  -p 8001:8001 \
  redis/redis-stack:latest
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  redis:
    image: redis/redis-stack:latest
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - redis-data:/data
    command: >
      redis-server
      --loadmodule /opt/redis-stack/lib/rejson.so
      --loadmodule /opt/redis-stack/lib/redisearch.so
      --appendonly yes

volumes:
  redis-data:
```

### Verify Installation

```bash
redis-cli
127.0.0.1:6379> MODULE LIST
1) 1) "name"
   2) "ReJSON"
   3) "ver"
   4) (integer) 20609
```

## Basic Operations

### Storing JSON Documents

```bash
# Store a complete JSON document
JSON.SET user:1 $ '{"name": "John Doe", "email": "john@example.com", "age": 30, "address": {"city": "New York", "zip": "10001"}}'

# Store with root path
JSON.SET product:1 . '{"name": "Laptop", "price": 999.99, "specs": {"cpu": "Intel i7", "ram": "16GB"}}'
```

### Retrieving Documents

```bash
# Get entire document
JSON.GET user:1

# Get with formatting (indentation)
JSON.GET user:1 INDENT "\t" NEWLINE "\n" SPACE " "

# Get specific field
JSON.GET user:1 $.name

# Get nested field
JSON.GET user:1 $.address.city

# Get multiple fields
JSON.GET user:1 $.name $.email $.age
```

### Updating Documents

```bash
# Update a specific field
JSON.SET user:1 $.age 31

# Update nested field
JSON.SET user:1 $.address.city '"San Francisco"'

# Add new field
JSON.SET user:1 $.phone '"+1-555-0123"'
```

### Deleting Fields

```bash
# Delete a field
JSON.DEL user:1 $.phone

# Delete nested field
JSON.DEL user:1 $.address.zip
```

## JSONPath Query Syntax

RedisJSON supports JSONPath for querying documents:

### Basic Path Expressions

```bash
# Root
$

# Child
$.name

# Recursive descent
$..name

# Array index
$.items[0]

# Array slice
$.items[0:3]

# All array elements
$.items[*]

# Filter expression
$.items[?(@.price > 100)]
```

### Advanced JSONPath Examples

```bash
# Store a complex document
JSON.SET store:1 $ '{
  "name": "Tech Store",
  "products": [
    {"id": 1, "name": "Laptop", "price": 999, "category": "electronics", "inStock": true},
    {"id": 2, "name": "Mouse", "price": 29, "category": "electronics", "inStock": true},
    {"id": 3, "name": "Desk", "price": 299, "category": "furniture", "inStock": false},
    {"id": 4, "name": "Monitor", "price": 399, "category": "electronics", "inStock": true}
  ]
}'

# Get all product names
JSON.GET store:1 $.products[*].name
# ["Laptop", "Mouse", "Desk", "Monitor"]

# Get products over $100
JSON.GET store:1 '$.products[?(@.price > 100)]'

# Get in-stock electronics
JSON.GET store:1 '$.products[?(@.category == "electronics" && @.inStock == true)]'

# Get all prices
JSON.GET store:1 $.products[*].price
```

## Working with Arrays

### Array Operations

```bash
# Append to array
JSON.ARRAPPEND store:1 $.products '{"id": 5, "name": "Keyboard", "price": 79, "category": "electronics", "inStock": true}'

# Insert at index
JSON.ARRINSERT store:1 $.products 0 '{"id": 0, "name": "Special Item", "price": 199, "category": "special", "inStock": true}'

# Get array length
JSON.ARRLEN store:1 $.products

# Get array index of value
JSON.ARRINDEX store:1 $.tags '"electronics"'

# Pop from array
JSON.ARRPOP store:1 $.products -1

# Trim array
JSON.ARRTRIM store:1 $.products 0 4
```

## Numeric Operations

```bash
# Increment number
JSON.NUMINCRBY user:1 $.age 1

# Multiply number
JSON.NUMMULTBY product:1 $.price 0.9  # 10% discount

# Increment float
JSON.NUMINCRBY product:1 $.price 0.01
```

## String Operations

```bash
# Append to string
JSON.STRAPPEND user:1 $.name '" Jr."'

# Get string length
JSON.STRLEN user:1 $.name
```

## Python Implementation

Here's a comprehensive Python implementation:

```python
import redis
import json
from typing import Any, Dict, List, Optional, Union

class RedisJSONStore:
    def __init__(self, host='localhost', port=6379, prefix=''):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)
        self.prefix = prefix

    def _key(self, key: str) -> str:
        return f"{self.prefix}:{key}" if self.prefix else key

    # ==================== Basic Operations ====================

    def set(self, key: str, document: Dict, path: str = '$') -> bool:
        """Store a JSON document."""
        return self.redis.json().set(self._key(key), path, document)

    def get(self, key: str, *paths: str) -> Any:
        """Get a JSON document or specific paths."""
        if paths:
            return self.redis.json().get(self._key(key), *paths)
        return self.redis.json().get(self._key(key))

    def delete(self, key: str, path: str = '$') -> int:
        """Delete a document or path."""
        if path == '$':
            return self.redis.delete(self._key(key))
        return self.redis.json().delete(self._key(key), path)

    def exists(self, key: str) -> bool:
        """Check if document exists."""
        return self.redis.exists(self._key(key)) > 0

    # ==================== Path Operations ====================

    def set_field(self, key: str, path: str, value: Any) -> bool:
        """Set a specific field in the document."""
        return self.redis.json().set(self._key(key), path, value)

    def get_field(self, key: str, path: str) -> Any:
        """Get a specific field from the document."""
        result = self.redis.json().get(self._key(key), path)
        return result[0] if isinstance(result, list) and len(result) == 1 else result

    def delete_field(self, key: str, path: str) -> int:
        """Delete a specific field."""
        return self.redis.json().delete(self._key(key), path)

    def field_type(self, key: str, path: str = '$') -> str:
        """Get the type of a field."""
        return self.redis.json().type(self._key(key), path)

    # ==================== Array Operations ====================

    def array_append(self, key: str, path: str, *values: Any) -> int:
        """Append values to an array."""
        return self.redis.json().arrappend(self._key(key), path, *values)

    def array_insert(self, key: str, path: str, index: int, *values: Any) -> int:
        """Insert values at index."""
        return self.redis.json().arrinsert(self._key(key), path, index, *values)

    def array_pop(self, key: str, path: str, index: int = -1) -> Any:
        """Pop element from array."""
        return self.redis.json().arrpop(self._key(key), path, index)

    def array_length(self, key: str, path: str) -> int:
        """Get array length."""
        result = self.redis.json().arrlen(self._key(key), path)
        return result[0] if isinstance(result, list) else result

    def array_trim(self, key: str, path: str, start: int, stop: int) -> int:
        """Trim array to range."""
        return self.redis.json().arrtrim(self._key(key), path, start, stop)

    # ==================== Numeric Operations ====================

    def increment(self, key: str, path: str, value: Union[int, float] = 1) -> float:
        """Increment a numeric field."""
        return self.redis.json().numincrby(self._key(key), path, value)

    def multiply(self, key: str, path: str, value: Union[int, float]) -> float:
        """Multiply a numeric field."""
        return self.redis.json().nummultby(self._key(key), path, value)

    # ==================== Query Operations ====================

    def query(self, key: str, jsonpath: str) -> Any:
        """Execute a JSONPath query."""
        return self.redis.json().get(self._key(key), jsonpath)

    # ==================== Bulk Operations ====================

    def mset(self, documents: Dict[str, Dict]) -> bool:
        """Set multiple documents."""
        pipe = self.redis.pipeline()
        for key, doc in documents.items():
            pipe.json().set(self._key(key), '$', doc)
        results = pipe.execute()
        return all(results)

    def mget(self, *keys: str, path: str = '$') -> List[Any]:
        """Get multiple documents."""
        prefixed_keys = [self._key(k) for k in keys]
        return self.redis.json().mget(prefixed_keys, path)


# ==================== Usage Example ====================

store = RedisJSONStore(prefix='app')

# Create user document
user = {
    "id": "user:1",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "profile": {
        "bio": "Software developer",
        "avatar": "https://example.com/avatar.jpg",
        "social": {
            "twitter": "@johndoe",
            "github": "johndoe"
        }
    },
    "skills": ["Python", "Redis", "Docker"],
    "projects": [
        {"name": "Project A", "stars": 100, "active": True},
        {"name": "Project B", "stars": 50, "active": False}
    ],
    "metadata": {
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-20T15:30:00Z"
    }
}

# Store document
store.set("user:1", user)
print("User stored successfully")

# Get entire document
doc = store.get("user:1")
print(f"User: {doc['name']}")

# Get specific fields
name = store.get_field("user:1", "$.name")
print(f"Name: {name}")

email = store.get_field("user:1", "$.email")
print(f"Email: {email}")

# Get nested field
twitter = store.get_field("user:1", "$.profile.social.twitter")
print(f"Twitter: {twitter}")

# Update field
store.set_field("user:1", "$.age", 31)
print(f"Updated age: {store.get_field('user:1', '$.age')}")

# Increment numeric field
store.increment("user:1", "$.age", 1)
print(f"Incremented age: {store.get_field('user:1', '$.age')}")

# Array operations
store.array_append("user:1", "$.skills", "Kubernetes")
print(f"Skills: {store.get_field('user:1', '$.skills')}")

# Add new project
store.array_append("user:1", "$.projects", {
    "name": "Project C",
    "stars": 25,
    "active": True
})

# Query with JSONPath
print("\nActive projects:")
active_projects = store.query("user:1", '$.projects[?(@.active == true)]')
for project in active_projects:
    print(f"  - {project['name']}: {project['stars']} stars")

# Query projects with more than 30 stars
print("\nPopular projects (>30 stars):")
popular = store.query("user:1", '$.projects[?(@.stars > 30)]')
for project in popular:
    print(f"  - {project['name']}: {project['stars']} stars")
```

## Node.js Implementation

```javascript
const redis = require('redis');

class RedisJSONStore {
    constructor(options = {}) {
        this.prefix = options.prefix || '';
        this.client = redis.createClient(options);
    }

    async connect() {
        await this.client.connect();
    }

    _key(key) {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }

    async set(key, document, path = '$') {
        return await this.client.json.set(this._key(key), path, document);
    }

    async get(key, ...paths) {
        if (paths.length > 0) {
            return await this.client.json.get(this._key(key), { path: paths });
        }
        return await this.client.json.get(this._key(key));
    }

    async getField(key, path) {
        const result = await this.client.json.get(this._key(key), { path });
        return Array.isArray(result) && result.length === 1 ? result[0] : result;
    }

    async setField(key, path, value) {
        return await this.client.json.set(this._key(key), path, value);
    }

    async deleteField(key, path) {
        return await this.client.json.del(this._key(key), path);
    }

    async increment(key, path, value = 1) {
        return await this.client.json.numIncrBy(this._key(key), path, value);
    }

    async arrayAppend(key, path, ...values) {
        return await this.client.json.arrAppend(this._key(key), path, ...values);
    }

    async arrayPop(key, path, index = -1) {
        return await this.client.json.arrPop(this._key(key), path, index);
    }

    async arrayLength(key, path) {
        return await this.client.json.arrLen(this._key(key), path);
    }

    async disconnect() {
        await this.client.quit();
    }
}

// Usage
async function main() {
    const store = new RedisJSONStore({ prefix: 'app' });
    await store.connect();

    // Create product document
    const product = {
        id: 'prod:1',
        name: 'Gaming Laptop',
        price: 1499.99,
        specs: {
            cpu: 'Intel i9',
            ram: '32GB',
            storage: '1TB SSD',
            gpu: 'RTX 4080'
        },
        tags: ['gaming', 'laptop', 'high-performance'],
        reviews: [
            { user: 'user1', rating: 5, comment: 'Excellent!' },
            { user: 'user2', rating: 4, comment: 'Great value' }
        ],
        inventory: {
            quantity: 50,
            warehouse: 'WH-01'
        }
    };

    // Store
    await store.set('product:1', product);
    console.log('Product stored');

    // Get entire document
    const doc = await store.get('product:1');
    console.log('Product:', doc.name);

    // Get specific field
    const price = await store.getField('product:1', '$.price');
    console.log('Price:', price);

    // Update price (10% discount)
    await store.setField('product:1', '$.price', price * 0.9);
    console.log('Discounted price:', await store.getField('product:1', '$.price'));

    // Decrement inventory
    await store.increment('product:1', '$.inventory.quantity', -1);
    console.log('Inventory:', await store.getField('product:1', '$.inventory.quantity'));

    // Add review
    await store.arrayAppend('product:1', '$.reviews', {
        user: 'user3',
        rating: 5,
        comment: 'Amazing performance!'
    });
    console.log('Reviews count:', await store.arrayLength('product:1', '$.reviews'));

    await store.disconnect();
}

main().catch(console.error);
```

## Integrating with RediSearch

Combine RedisJSON with RediSearch for powerful document search:

```bash
# Create a search index on JSON documents
FT.CREATE product_idx
  ON JSON
  PREFIX 1 product:
  SCHEMA
    $.name AS name TEXT WEIGHT 5.0
    $.description AS description TEXT
    $.category AS category TAG
    $.price AS price NUMERIC SORTABLE
    $.specs.brand AS brand TAG
    $.tags[*] AS tags TAG
    $.inventory.quantity AS quantity NUMERIC

# Store products
JSON.SET product:1 $ '{
  "name": "Gaming Laptop",
  "description": "High-performance gaming laptop with RTX graphics",
  "category": "electronics",
  "price": 1499.99,
  "specs": {"brand": "ASUS", "model": "ROG"},
  "tags": ["gaming", "laptop", "rtx"],
  "inventory": {"quantity": 50}
}'

JSON.SET product:2 $ '{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse for productivity",
  "category": "electronics",
  "price": 49.99,
  "specs": {"brand": "Logitech", "model": "MX Master"},
  "tags": ["wireless", "mouse", "ergonomic"],
  "inventory": {"quantity": 200}
}'

# Search products
FT.SEARCH product_idx "gaming"

# Search with filters
FT.SEARCH product_idx "@category:{electronics} @price:[0 100]"

# Search with tag filter
FT.SEARCH product_idx "@tags:{wireless}"
```

### Python with RediSearch and JSON

```python
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query

class SearchableJSONStore(RedisJSONStore):
    def create_index(self, index_name: str, prefix: str, schema: dict):
        """Create a search index on JSON documents."""
        fields = []
        for json_path, config in schema.items():
            field_type = config.get('type', 'text')
            alias = config.get('alias', json_path.replace('$.', '').replace('.', '_'))

            if field_type == 'text':
                fields.append(TextField(
                    f"{json_path}",
                    as_name=alias,
                    weight=config.get('weight', 1.0)
                ))
            elif field_type == 'numeric':
                fields.append(NumericField(
                    f"{json_path}",
                    as_name=alias,
                    sortable=config.get('sortable', False)
                ))
            elif field_type == 'tag':
                fields.append(TagField(
                    f"{json_path}",
                    as_name=alias
                ))

        try:
            self.redis.ft(index_name).create_index(
                fields,
                definition=IndexDefinition(
                    prefix=[prefix],
                    index_type=IndexType.JSON
                )
            )
            return True
        except Exception as e:
            print(f"Index creation error: {e}")
            return False

    def search(self, index_name: str, query_string: str,
               sort_by: str = None, limit: int = 10) -> list:
        """Search JSON documents."""
        query = Query(query_string).paging(0, limit)

        if sort_by:
            query.sort_by(sort_by)

        results = self.redis.ft(index_name).search(query)
        documents = []

        for doc in results.docs:
            # Parse JSON from search result
            doc_data = json.loads(doc.json) if hasattr(doc, 'json') else doc.__dict__
            documents.append({
                'id': doc.id,
                'data': doc_data
            })

        return documents


# Usage
store = SearchableJSONStore(prefix='app')

# Define schema
product_schema = {
    '$.name': {'type': 'text', 'alias': 'name', 'weight': 5.0},
    '$.description': {'type': 'text', 'alias': 'description'},
    '$.category': {'type': 'tag', 'alias': 'category'},
    '$.price': {'type': 'numeric', 'alias': 'price', 'sortable': True},
    '$.specs.brand': {'type': 'tag', 'alias': 'brand'},
    '$.inventory.quantity': {'type': 'numeric', 'alias': 'quantity'},
}

# Create index
store.create_index('product_idx', 'app:product:', product_schema)

# Add products
products = [
    {
        "name": "Gaming Laptop",
        "description": "High-performance gaming laptop with RTX graphics",
        "category": "electronics",
        "price": 1499.99,
        "specs": {"brand": "ASUS", "model": "ROG"},
        "inventory": {"quantity": 50}
    },
    {
        "name": "Wireless Mouse",
        "description": "Ergonomic wireless mouse for productivity",
        "category": "electronics",
        "price": 49.99,
        "specs": {"brand": "Logitech", "model": "MX Master"},
        "inventory": {"quantity": 200}
    },
    {
        "name": "Mechanical Keyboard",
        "description": "RGB mechanical keyboard with Cherry MX switches",
        "category": "electronics",
        "price": 129.99,
        "specs": {"brand": "Ducky", "model": "One 2"},
        "inventory": {"quantity": 75}
    }
]

for i, product in enumerate(products, 1):
    store.set(f"product:{i}", product)

# Search
print("Search for 'gaming':")
results = store.search('product_idx', 'gaming')
for r in results:
    print(f"  - {r['id']}")

print("\nElectronics under $100:")
results = store.search('product_idx', '@category:{electronics} @price:[0 100]')
for r in results:
    print(f"  - {r['id']}")
```

## Document Patterns

### Embedded Documents vs References

```python
# Pattern 1: Embedded documents (denormalized)
# Best for: Data that's always accessed together
user_embedded = {
    "id": "user:1",
    "name": "John",
    "address": {
        "street": "123 Main St",
        "city": "New York",
        "zip": "10001"
    },
    "orders": [
        {"id": "order:1", "total": 99.99, "items": [...]},
        {"id": "order:2", "total": 149.99, "items": [...]}
    ]
}

# Pattern 2: References (normalized)
# Best for: Data that changes frequently or is shared
user_normalized = {
    "id": "user:1",
    "name": "John",
    "address_id": "address:1",
    "order_ids": ["order:1", "order:2"]
}

address = {
    "id": "address:1",
    "user_id": "user:1",
    "street": "123 Main St",
    "city": "New York"
}
```

### Versioning Pattern

```python
class VersionedJSONStore(RedisJSONStore):
    def set_versioned(self, key: str, document: Dict) -> int:
        """Store document with version tracking."""
        # Get current version
        current = self.get(key)
        version = current.get('_version', 0) + 1 if current else 1

        # Add version metadata
        document['_version'] = version
        document['_updated_at'] = datetime.utcnow().isoformat()

        # Store current version
        self.set(key, document)

        # Store version history
        history_key = f"{key}:history:{version}"
        self.set(history_key, document)

        return version

    def get_version(self, key: str, version: int) -> Optional[Dict]:
        """Get a specific version of a document."""
        history_key = f"{key}:history:{version}"
        return self.get(history_key)

    def get_history(self, key: str, limit: int = 10) -> List[Dict]:
        """Get version history."""
        current = self.get(key)
        if not current:
            return []

        current_version = current.get('_version', 1)
        history = []

        for v in range(current_version, max(0, current_version - limit), -1):
            doc = self.get_version(key, v)
            if doc:
                history.append(doc)

        return history
```

### Partial Updates Pattern

```python
class PartialUpdateStore(RedisJSONStore):
    def partial_update(self, key: str, updates: Dict[str, Any]) -> bool:
        """
        Update specific fields without replacing the entire document.

        updates: {'field.nested': value, 'array[0]': value}
        """
        pipe = self.redis.pipeline()

        for path, value in updates.items():
            # Convert dot notation to JSONPath
            json_path = '$.' + path.replace('[', '.[')
            pipe.json().set(self._key(key), json_path, value)

        results = pipe.execute()
        return all(results)


# Usage
store = PartialUpdateStore(prefix='app')

# Initial document
store.set('user:1', {
    "name": "John",
    "profile": {
        "bio": "Developer",
        "settings": {
            "theme": "dark",
            "notifications": True
        }
    },
    "scores": [100, 90, 85]
})

# Partial update
store.partial_update('user:1', {
    'profile.settings.theme': 'light',
    'scores[0]': 105
})
```

## Performance Best Practices

### 1. Use Specific Paths

```python
# Bad: Fetch entire document to read one field
doc = store.get('user:1')
name = doc['name']

# Good: Fetch only what you need
name = store.get_field('user:1', '$.name')
```

### 2. Batch Operations with Pipelining

```python
def batch_update(store, updates):
    """Update multiple documents efficiently."""
    pipe = store.redis.pipeline()

    for key, field_updates in updates.items():
        for path, value in field_updates.items():
            pipe.json().set(store._key(key), path, value)

    return pipe.execute()

# Usage
updates = {
    'product:1': {'$.price': 899.99, '$.inventory.quantity': 45},
    'product:2': {'$.price': 39.99, '$.inventory.quantity': 180},
    'product:3': {'$.price': 119.99, '$.inventory.quantity': 60},
}
batch_update(store, updates)
```

### 3. Index Design

```python
# Only index fields you'll query
schema = {
    '$.name': {'type': 'text'},           # Full-text search
    '$.category': {'type': 'tag'},         # Exact match filter
    '$.price': {'type': 'numeric', 'sortable': True},  # Range queries + sorting
    # Don't index: description if you won't search it
    # Don't index: internal fields like _version
}
```

### 4. Document Size

```python
# Keep documents reasonably sized
# If arrays grow unbounded, consider separate storage

# Instead of:
{
    "user_id": "1",
    "logs": [...]  # Could grow to millions
}

# Use:
{
    "user_id": "1",
    "log_count": 1000000,
    "recent_logs": [...]  # Last 100 only
}
# Store full logs in: user:1:logs (using Streams or Lists)
```

## Conclusion

RedisJSON provides a powerful way to store and manipulate JSON documents with Redis performance. Key takeaways:

1. **Native JSON support**: Store complex nested structures without serialization
2. **JSONPath queries**: Efficiently access and modify specific fields
3. **RediSearch integration**: Full-text search and filtering on JSON documents
4. **Atomic operations**: Update fields without race conditions
5. **Memory efficiency**: Optimized storage format

By combining RedisJSON with RediSearch, you can build document-oriented applications that rival dedicated document databases while benefiting from Redis's speed and simplicity.
