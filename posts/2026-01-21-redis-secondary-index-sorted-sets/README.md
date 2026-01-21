# How to Build a Secondary Index with Redis Sorted Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Secondary Index, Sorted Sets, Database, Indexing, Query Optimization

Description: A comprehensive guide to building secondary indexes in Redis using Sorted Sets, enabling efficient queries on non-primary attributes for better query performance and flexibility.

---

Redis is often used as a key-value store where data is accessed by a primary key. However, many applications need to query data by other attributes - finding users by email, products by price range, or orders by date. This is where secondary indexes come in. In this guide, we will explore how to build efficient secondary indexes using Redis Sorted Sets.

## What is a Secondary Index?

A secondary index allows you to query data by attributes other than the primary key. For example:

- Primary key: `user:123`
- Secondary indexes:
  - By email: Find user with email `john@example.com`
  - By age: Find users between ages 25-35
  - By city: Find all users in "New York"

## Why Use Redis Sorted Sets for Indexing?

Redis Sorted Sets are ideal for secondary indexes because:

- **Ordered data**: Elements are automatically sorted by score
- **Range queries**: Efficient ZRANGEBYSCORE for numeric ranges
- **Lexicographic queries**: ZRANGEBYLEX for string prefix matching
- **O(log N) operations**: Fast insert, delete, and lookup
- **Atomic operations**: Thread-safe index updates

## Basic Secondary Index Patterns

### Pattern 1: Simple Attribute Index

Index users by their email:

```bash
# Store user data
HSET user:1 name "John Doe" email "john@example.com" age 30 city "New York"
HSET user:2 name "Jane Smith" email "jane@example.com" age 25 city "Boston"
HSET user:3 name "Bob Wilson" email "bob@example.com" age 35 city "New York"

# Create email index (SET for unique values)
SET idx:email:john@example.com user:1
SET idx:email:jane@example.com user:2
SET idx:email:bob@example.com user:3

# Lookup by email
GET idx:email:john@example.com
# Returns: "user:1"
```

### Pattern 2: Numeric Range Index with Sorted Sets

Index users by age for range queries:

```bash
# Create age index
ZADD idx:users:age 30 user:1
ZADD idx:users:age 25 user:2
ZADD idx:users:age 35 user:3

# Find users between ages 25-32
ZRANGEBYSCORE idx:users:age 25 32
# Returns: ["user:2", "user:1"]

# Find users older than 28
ZRANGEBYSCORE idx:users:age 28 +inf
# Returns: ["user:1", "user:3"]

# Find users younger than 30
ZRANGEBYSCORE idx:users:age -inf 30
# Returns: ["user:2", "user:1"]
```

### Pattern 3: Tag-Based Index with Sets

Index users by city (multiple users per city):

```bash
# Create city indexes
SADD idx:users:city:new_york user:1 user:3
SADD idx:users:city:boston user:2

# Find all users in New York
SMEMBERS idx:users:city:new_york
# Returns: ["user:1", "user:3"]
```

## Complete Python Implementation

Here's a comprehensive implementation of secondary indexes:

```python
import redis
import json
import time
from typing import List, Dict, Any, Optional, Tuple

class RedisSecondaryIndex:
    def __init__(self, host='localhost', port=6379, prefix=''):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)
        self.prefix = prefix

    def _key(self, *parts):
        """Build a Redis key with prefix."""
        return ':'.join([self.prefix] + list(parts)) if self.prefix else ':'.join(parts)

    # ==================== Entity Operations ====================

    def create_entity(self, entity_type: str, entity_id: str, data: Dict[str, Any],
                      indexes: Dict[str, dict] = None):
        """
        Create an entity and its indexes atomically.

        Args:
            entity_type: Type of entity (e.g., 'user', 'product')
            entity_id: Unique identifier
            data: Entity data as dictionary
            indexes: Index definitions {field: {'type': 'numeric|string|tag'}}
        """
        key = self._key(entity_type, entity_id)
        pipe = self.redis.pipeline()

        # Store entity data
        pipe.hset(key, mapping={k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
                                for k, v in data.items()})

        # Create indexes
        if indexes:
            for field, config in indexes.items():
                if field in data:
                    value = data[field]
                    index_type = config.get('type', 'string')

                    if index_type == 'numeric':
                        idx_key = self._key('idx', entity_type, field)
                        pipe.zadd(idx_key, {entity_id: float(value)})

                    elif index_type == 'string':
                        idx_key = self._key('idx', entity_type, field, str(value).lower())
                        pipe.set(idx_key, entity_id)

                    elif index_type == 'tag':
                        # Supports multiple tags
                        tags = value if isinstance(value, list) else [value]
                        for tag in tags:
                            idx_key = self._key('idx', entity_type, field, str(tag).lower())
                            pipe.sadd(idx_key, entity_id)

                    elif index_type == 'text':
                        # Lexicographic index for prefix search
                        idx_key = self._key('idx', entity_type, field)
                        pipe.zadd(idx_key, {f"{str(value).lower()}:{entity_id}": 0})

        pipe.execute()
        return entity_id

    def get_entity(self, entity_type: str, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get entity by ID."""
        key = self._key(entity_type, entity_id)
        data = self.redis.hgetall(key)
        return data if data else None

    def delete_entity(self, entity_type: str, entity_id: str, data: Dict[str, Any],
                      indexes: Dict[str, dict] = None):
        """Delete an entity and its indexes."""
        key = self._key(entity_type, entity_id)
        pipe = self.redis.pipeline()

        # Delete entity
        pipe.delete(key)

        # Remove from indexes
        if indexes and data:
            for field, config in indexes.items():
                if field in data:
                    value = data[field]
                    index_type = config.get('type', 'string')

                    if index_type == 'numeric':
                        idx_key = self._key('idx', entity_type, field)
                        pipe.zrem(idx_key, entity_id)

                    elif index_type == 'string':
                        idx_key = self._key('idx', entity_type, field, str(value).lower())
                        pipe.delete(idx_key)

                    elif index_type == 'tag':
                        tags = value if isinstance(value, list) else [value]
                        for tag in tags:
                            idx_key = self._key('idx', entity_type, field, str(tag).lower())
                            pipe.srem(idx_key, entity_id)

                    elif index_type == 'text':
                        idx_key = self._key('idx', entity_type, field)
                        pipe.zrem(idx_key, f"{str(value).lower()}:{entity_id}")

        pipe.execute()

    # ==================== Query Operations ====================

    def find_by_string(self, entity_type: str, field: str, value: str) -> Optional[str]:
        """Find entity by exact string match."""
        idx_key = self._key('idx', entity_type, field, value.lower())
        return self.redis.get(idx_key)

    def find_by_tag(self, entity_type: str, field: str, tag: str) -> List[str]:
        """Find all entities with a specific tag."""
        idx_key = self._key('idx', entity_type, field, tag.lower())
        return list(self.redis.smembers(idx_key))

    def find_by_tags(self, entity_type: str, field: str, tags: List[str],
                     operator: str = 'OR') -> List[str]:
        """Find entities matching multiple tags with AND/OR logic."""
        keys = [self._key('idx', entity_type, field, tag.lower()) for tag in tags]

        if operator.upper() == 'AND':
            return list(self.redis.sinter(keys))
        else:
            return list(self.redis.sunion(keys))

    def find_by_numeric_range(self, entity_type: str, field: str,
                               min_val: float = None, max_val: float = None,
                               limit: int = None, offset: int = 0,
                               descending: bool = False) -> List[str]:
        """Find entities within a numeric range."""
        idx_key = self._key('idx', entity_type, field)
        min_val = min_val if min_val is not None else '-inf'
        max_val = max_val if max_val is not None else '+inf'

        if descending:
            results = self.redis.zrevrangebyscore(
                idx_key, max_val, min_val,
                start=offset, num=limit if limit else -1
            )
        else:
            results = self.redis.zrangebyscore(
                idx_key, min_val, max_val,
                start=offset, num=limit if limit else -1
            )

        return results

    def find_by_prefix(self, entity_type: str, field: str, prefix: str,
                       limit: int = 10) -> List[Tuple[str, str]]:
        """Find entities by text prefix (lexicographic search)."""
        idx_key = self._key('idx', entity_type, field)
        prefix_lower = prefix.lower()

        results = self.redis.zrangebylex(
            idx_key,
            f"[{prefix_lower}",
            f"[{prefix_lower}\xff",
            start=0, num=limit
        )

        # Extract entity IDs from "value:entity_id" format
        parsed = []
        for item in results:
            parts = item.rsplit(':', 1)
            if len(parts) == 2:
                parsed.append((parts[0], parts[1]))

        return parsed

    # ==================== Compound Queries ====================

    def find_compound(self, entity_type: str, conditions: List[Dict],
                      operator: str = 'AND') -> List[str]:
        """
        Find entities matching multiple conditions.

        conditions: [
            {'field': 'age', 'type': 'numeric', 'min': 25, 'max': 35},
            {'field': 'city', 'type': 'tag', 'value': 'new york'},
        ]
        """
        result_sets = []

        for condition in conditions:
            field = condition['field']
            cond_type = condition['type']

            if cond_type == 'numeric':
                entities = self.find_by_numeric_range(
                    entity_type, field,
                    condition.get('min'),
                    condition.get('max')
                )
                result_sets.append(set(entities))

            elif cond_type == 'tag':
                entities = self.find_by_tag(entity_type, field, condition['value'])
                result_sets.append(set(entities))

            elif cond_type == 'string':
                entity = self.find_by_string(entity_type, field, condition['value'])
                result_sets.append({entity} if entity else set())

        if not result_sets:
            return []

        if operator.upper() == 'AND':
            return list(result_sets[0].intersection(*result_sets[1:]))
        else:
            return list(result_sets[0].union(*result_sets[1:]))


# ==================== Usage Example ====================

# Initialize
db = RedisSecondaryIndex(prefix='myapp')

# Define index schema
user_indexes = {
    'email': {'type': 'string'},
    'age': {'type': 'numeric'},
    'city': {'type': 'tag'},
    'skills': {'type': 'tag'},  # Supports arrays
    'name': {'type': 'text'},   # For prefix search
}

# Create users
users = [
    {'id': '1', 'name': 'John Doe', 'email': 'john@example.com', 'age': 30, 'city': 'new york', 'skills': ['python', 'redis']},
    {'id': '2', 'name': 'Jane Smith', 'email': 'jane@example.com', 'age': 25, 'city': 'boston', 'skills': ['java', 'kubernetes']},
    {'id': '3', 'name': 'Bob Wilson', 'email': 'bob@example.com', 'age': 35, 'city': 'new york', 'skills': ['python', 'aws']},
    {'id': '4', 'name': 'Alice Brown', 'email': 'alice@example.com', 'age': 28, 'city': 'chicago', 'skills': ['python', 'docker']},
    {'id': '5', 'name': 'Charlie Davis', 'email': 'charlie@example.com', 'age': 32, 'city': 'boston', 'skills': ['go', 'redis']},
]

for user in users:
    user_id = user.pop('id')
    db.create_entity('user', user_id, user, user_indexes)
    print(f"Created user {user_id}: {user['name']}")

# Query examples
print("\n--- Query Examples ---\n")

# 1. Find by email (exact match)
user_id = db.find_by_string('user', 'email', 'john@example.com')
print(f"User with email john@example.com: {user_id}")
if user_id:
    user = db.get_entity('user', user_id)
    print(f"  Data: {user}")

# 2. Find by age range
print(f"\nUsers aged 25-30:")
user_ids = db.find_by_numeric_range('user', 'age', 25, 30)
for uid in user_ids:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']} (age: {user['age']})")

# 3. Find by city (tag)
print(f"\nUsers in New York:")
user_ids = db.find_by_tag('user', 'city', 'new york')
for uid in user_ids:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']}")

# 4. Find by skill (tag)
print(f"\nUsers with Python skill:")
user_ids = db.find_by_tag('user', 'skills', 'python')
for uid in user_ids:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']}")

# 5. Find by multiple skills (OR)
print(f"\nUsers with Python OR Redis skills:")
user_ids = db.find_by_tags('user', 'skills', ['python', 'redis'], 'OR')
for uid in user_ids:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']}")

# 6. Find by multiple skills (AND)
print(f"\nUsers with Python AND Redis skills:")
user_ids = db.find_by_tags('user', 'skills', ['python', 'redis'], 'AND')
for uid in user_ids:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']}")

# 7. Compound query (age range AND city)
print(f"\nUsers in New York aged 28-40:")
user_ids = db.find_compound('user', [
    {'field': 'age', 'type': 'numeric', 'min': 28, 'max': 40},
    {'field': 'city', 'type': 'tag', 'value': 'new york'},
], 'AND')
for uid in user_ids:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']} (age: {user['age']})")

# 8. Find by name prefix
print(f"\nUsers whose name starts with 'Jo':")
results = db.find_by_prefix('user', 'name', 'jo')
for name, uid in results:
    user = db.get_entity('user', uid)
    print(f"  - {user['name']}")
```

## Node.js Implementation

```javascript
const redis = require('redis');

class RedisSecondaryIndex {
    constructor(options = {}) {
        this.prefix = options.prefix || '';
        this.client = redis.createClient(options);
    }

    async connect() {
        await this.client.connect();
    }

    _key(...parts) {
        return this.prefix
            ? [this.prefix, ...parts].join(':')
            : parts.join(':');
    }

    async createEntity(entityType, entityId, data, indexes = {}) {
        const key = this._key(entityType, entityId);
        const multi = this.client.multi();

        // Store entity data
        const flatData = {};
        for (const [k, v] of Object.entries(data)) {
            flatData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
        multi.hSet(key, flatData);

        // Create indexes
        for (const [field, config] of Object.entries(indexes)) {
            if (field in data) {
                const value = data[field];
                const indexType = config.type || 'string';

                if (indexType === 'numeric') {
                    const idxKey = this._key('idx', entityType, field);
                    multi.zAdd(idxKey, { score: parseFloat(value), value: entityId });
                } else if (indexType === 'string') {
                    const idxKey = this._key('idx', entityType, field, String(value).toLowerCase());
                    multi.set(idxKey, entityId);
                } else if (indexType === 'tag') {
                    const tags = Array.isArray(value) ? value : [value];
                    for (const tag of tags) {
                        const idxKey = this._key('idx', entityType, field, String(tag).toLowerCase());
                        multi.sAdd(idxKey, entityId);
                    }
                }
            }
        }

        await multi.exec();
        return entityId;
    }

    async getEntity(entityType, entityId) {
        const key = this._key(entityType, entityId);
        return await this.client.hGetAll(key);
    }

    async findByString(entityType, field, value) {
        const idxKey = this._key('idx', entityType, field, value.toLowerCase());
        return await this.client.get(idxKey);
    }

    async findByTag(entityType, field, tag) {
        const idxKey = this._key('idx', entityType, field, tag.toLowerCase());
        return await this.client.sMembers(idxKey);
    }

    async findByNumericRange(entityType, field, minVal, maxVal, options = {}) {
        const idxKey = this._key('idx', entityType, field);
        const min = minVal !== undefined ? minVal : '-inf';
        const max = maxVal !== undefined ? maxVal : '+inf';

        if (options.descending) {
            return await this.client.zRangeByScore(idxKey, max, min, {
                REV: true,
                LIMIT: options.limit ? { offset: options.offset || 0, count: options.limit } : undefined
            });
        }

        return await this.client.zRangeByScore(idxKey, min, max, {
            LIMIT: options.limit ? { offset: options.offset || 0, count: options.limit } : undefined
        });
    }

    async findByTagsOr(entityType, field, tags) {
        const keys = tags.map(tag =>
            this._key('idx', entityType, field, tag.toLowerCase())
        );
        return await this.client.sUnion(keys);
    }

    async findByTagsAnd(entityType, field, tags) {
        const keys = tags.map(tag =>
            this._key('idx', entityType, field, tag.toLowerCase())
        );
        return await this.client.sInter(keys);
    }

    async disconnect() {
        await this.client.quit();
    }
}

// Usage
async function main() {
    const db = new RedisSecondaryIndex({ prefix: 'myapp' });
    await db.connect();

    const userIndexes = {
        email: { type: 'string' },
        age: { type: 'numeric' },
        city: { type: 'tag' },
        skills: { type: 'tag' },
    };

    // Create users
    await db.createEntity('user', '1', {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        city: 'new york',
        skills: ['python', 'redis']
    }, userIndexes);

    await db.createEntity('user', '2', {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        city: 'boston',
        skills: ['java', 'kubernetes']
    }, userIndexes);

    // Query examples
    console.log('User by email:');
    const userId = await db.findByString('user', 'email', 'john@example.com');
    console.log('  ID:', userId);

    console.log('\nUsers aged 25-30:');
    const usersByAge = await db.findByNumericRange('user', 'age', 25, 30);
    console.log('  IDs:', usersByAge);

    console.log('\nUsers with Python skill:');
    const pythonUsers = await db.findByTag('user', 'skills', 'python');
    console.log('  IDs:', pythonUsers);

    await db.disconnect();
}

main().catch(console.error);
```

## Advanced Patterns

### Composite Index for Multi-Field Queries

```python
class CompositeIndex:
    """Index on multiple fields for efficient compound queries."""

    def __init__(self, redis_client, prefix=''):
        self.redis = redis_client
        self.prefix = prefix

    def create_composite_index(self, entity_type: str, entity_id: str,
                                fields: Dict[str, Any]):
        """
        Create a composite index key from multiple fields.
        Example: idx:product:category:electronics:price_range:100-200
        """
        # Build composite key parts
        parts = [self.prefix, 'idx', entity_type] if self.prefix else ['idx', entity_type]

        for field, value in sorted(fields.items()):
            parts.extend([field, str(value).lower()])

        key = ':'.join(parts)
        self.redis.sadd(key, entity_id)

    def query_composite(self, entity_type: str, fields: Dict[str, Any]) -> List[str]:
        """Query using composite index."""
        parts = [self.prefix, 'idx', entity_type] if self.prefix else ['idx', entity_type]

        for field, value in sorted(fields.items()):
            parts.extend([field, str(value).lower()])

        key = ':'.join(parts)
        return list(self.redis.smembers(key))


# Usage
composite = CompositeIndex(redis_client)

# Create composite indexes for products
composite.create_composite_index('product', 'p1', {
    'category': 'electronics',
    'brand': 'apple'
})
composite.create_composite_index('product', 'p2', {
    'category': 'electronics',
    'brand': 'samsung'
})
composite.create_composite_index('product', 'p3', {
    'category': 'electronics',
    'brand': 'apple'
})

# Query: all Apple electronics
results = composite.query_composite('product', {
    'category': 'electronics',
    'brand': 'apple'
})
print(f"Apple electronics: {results}")  # ['p1', 'p3']
```

### Time-Based Index with Score Expiration

```python
class TimeBasedIndex:
    """Index for time-series data with automatic cleanup."""

    def __init__(self, redis_client, prefix=''):
        self.redis = redis_client
        self.prefix = prefix

    def add_event(self, entity_type: str, entity_id: str, timestamp: float = None):
        """Add an event with timestamp score."""
        timestamp = timestamp or time.time()
        key = f"{self.prefix}:idx:{entity_type}:timeline" if self.prefix else f"idx:{entity_type}:timeline"
        self.redis.zadd(key, {entity_id: timestamp})

    def get_events_in_range(self, entity_type: str, start_time: float, end_time: float) -> List[str]:
        """Get events within a time range."""
        key = f"{self.prefix}:idx:{entity_type}:timeline" if self.prefix else f"idx:{entity_type}:timeline"
        return self.redis.zrangebyscore(key, start_time, end_time)

    def get_recent_events(self, entity_type: str, seconds: int, limit: int = 100) -> List[str]:
        """Get events from the last N seconds."""
        key = f"{self.prefix}:idx:{entity_type}:timeline" if self.prefix else f"idx:{entity_type}:timeline"
        cutoff = time.time() - seconds
        return self.redis.zrevrangebyscore(key, '+inf', cutoff, start=0, num=limit)

    def cleanup_old_events(self, entity_type: str, max_age_seconds: int) -> int:
        """Remove events older than max_age_seconds."""
        key = f"{self.prefix}:idx:{entity_type}:timeline" if self.prefix else f"idx:{entity_type}:timeline"
        cutoff = time.time() - max_age_seconds
        return self.redis.zremrangebyscore(key, '-inf', cutoff)


# Usage
timeline = TimeBasedIndex(redis_client)

# Add events
for i in range(10):
    timeline.add_event('login', f'user:{i}', time.time() - i * 60)

# Get logins in the last 5 minutes
recent = timeline.get_recent_events('login', 300)
print(f"Recent logins: {recent}")

# Cleanup old events
removed = timeline.cleanup_old_events('login', 3600)  # 1 hour
print(f"Removed {removed} old events")
```

### Geospatial Index

```python
class GeoIndex:
    """Geographic index using Redis Geo commands."""

    def __init__(self, redis_client, prefix=''):
        self.redis = redis_client
        self.prefix = prefix

    def add_location(self, entity_type: str, entity_id: str, longitude: float, latitude: float):
        """Add a location."""
        key = f"{self.prefix}:idx:{entity_type}:geo" if self.prefix else f"idx:{entity_type}:geo"
        self.redis.geoadd(key, (longitude, latitude, entity_id))

    def find_nearby(self, entity_type: str, longitude: float, latitude: float,
                    radius: float, unit: str = 'km', limit: int = 10) -> List[Dict]:
        """Find entities within radius."""
        key = f"{self.prefix}:idx:{entity_type}:geo" if self.prefix else f"idx:{entity_type}:geo"
        results = self.redis.georadius(
            key, longitude, latitude, radius, unit=unit,
            withdist=True, withcoord=True, count=limit, sort='ASC'
        )

        return [
            {
                'entity_id': item[0],
                'distance': item[1],
                'longitude': item[2][0],
                'latitude': item[2][1]
            }
            for item in results
        ]


# Usage
geo = GeoIndex(redis_client)

# Add store locations
stores = [
    ('store:1', -73.985428, 40.748817),  # NYC - Empire State
    ('store:2', -73.968285, 40.785091),  # NYC - Central Park
    ('store:3', -74.044502, 40.689247),  # NYC - Statue of Liberty
]

for store_id, lon, lat in stores:
    geo.add_location('store', store_id, lon, lat)

# Find stores within 5km of Times Square
nearby = geo.find_nearby('store', -73.985130, 40.758896, 5, 'km')
for store in nearby:
    print(f"  {store['entity_id']}: {store['distance']:.2f} km away")
```

## Index Maintenance

### Keeping Indexes in Sync

Always update indexes atomically with data:

```python
def update_user(self, user_id: str, updates: Dict[str, Any],
                old_data: Dict[str, Any], indexes: Dict[str, dict]):
    """Update user and maintain index consistency."""
    pipe = self.redis.pipeline()

    # Update entity data
    key = self._key('user', user_id)
    pipe.hset(key, mapping=updates)

    # Update affected indexes
    for field, config in indexes.items():
        if field in updates and field in old_data:
            old_value = old_data[field]
            new_value = updates[field]

            if old_value != new_value:
                index_type = config.get('type', 'string')

                if index_type == 'numeric':
                    idx_key = self._key('idx', 'user', field)
                    pipe.zadd(idx_key, {user_id: float(new_value)})

                elif index_type == 'tag':
                    # Remove from old index
                    old_idx = self._key('idx', 'user', field, str(old_value).lower())
                    pipe.srem(old_idx, user_id)
                    # Add to new index
                    new_idx = self._key('idx', 'user', field, str(new_value).lower())
                    pipe.sadd(new_idx, user_id)

    pipe.execute()
```

### Index Rebuilding

```python
def rebuild_index(self, entity_type: str, field: str, index_config: dict):
    """Rebuild an index from scratch."""
    # Get all entity keys
    pattern = self._key(entity_type, '*')
    cursor = 0
    pipe = self.redis.pipeline()
    count = 0

    while True:
        cursor, keys = self.redis.scan(cursor, match=pattern, count=100)

        for key in keys:
            data = self.redis.hgetall(key)
            if field in data:
                entity_id = key.split(':')[-1]
                value = data[field]
                index_type = index_config.get('type', 'string')

                if index_type == 'numeric':
                    idx_key = self._key('idx', entity_type, field)
                    pipe.zadd(idx_key, {entity_id: float(value)})
                elif index_type == 'tag':
                    idx_key = self._key('idx', entity_type, field, str(value).lower())
                    pipe.sadd(idx_key, entity_id)

                count += 1

        if cursor == 0:
            break

    pipe.execute()
    print(f"Rebuilt index for {count} entities")
```

## Performance Considerations

### 1. Index Selectivity

Choose high-selectivity fields for indexing:

```python
# Good: email (unique per user)
# Good: user_id foreign keys
# Moderate: city, category
# Poor: boolean fields (low cardinality)
```

### 2. Memory Usage

Monitor index memory:

```bash
# Check memory usage of index keys
redis-cli MEMORY USAGE idx:users:age
redis-cli DEBUG OBJECT idx:users:city:new_york
```

### 3. Use Pipelining for Batch Operations

```python
def bulk_index(self, entities: List[Dict], entity_type: str, indexes: dict):
    """Index multiple entities efficiently."""
    pipe = self.redis.pipeline()

    for entity in entities:
        entity_id = entity['id']
        # Add indexing commands to pipeline
        for field, config in indexes.items():
            if field in entity:
                # Add to appropriate index
                pass

        # Execute in batches
        if len(pipe) >= 1000:
            pipe.execute()
            pipe = self.redis.pipeline()

    pipe.execute()
```

## Conclusion

Secondary indexes in Redis enable powerful query capabilities while maintaining sub-millisecond performance. Key takeaways:

1. **Choose the right data structure**: Sorted Sets for numeric ranges, Sets for tags, Strings for unique lookups
2. **Maintain index consistency**: Always update indexes atomically with data changes
3. **Design for your queries**: Create indexes based on actual query patterns
4. **Monitor performance**: Track memory usage and query latency
5. **Consider RediSearch**: For complex search requirements, RediSearch provides built-in indexing

With proper secondary index design, Redis can serve as a highly performant data store supporting complex queries beyond simple key-value access.
