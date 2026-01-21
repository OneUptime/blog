# How to Build Inverted Indexes with Redis Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sets, Inverted Index, Search, Data Structures, Tagging, Filtering

Description: A comprehensive guide to building inverted indexes using Redis sets for efficient tag-based search, filtering, and faceted navigation without specialized search engines.

---

An inverted index maps attribute values to the items that contain them, enabling efficient "find all items with attribute X" queries. Redis sets are perfect for this pattern, providing O(1) membership testing, efficient intersection/union operations, and scalable storage for large datasets.

## Understanding Inverted Indexes

In a normal index, you look up an item to find its attributes:
- Item "product:123" -> tags: ["electronics", "wireless", "bluetooth"]

In an inverted index, you look up an attribute to find all items:
- Tag "electronics" -> items: ["product:123", "product:456", ...]
- Tag "wireless" -> items: ["product:123", "product:789", ...]

This enables queries like "find all products tagged 'electronics' AND 'wireless'" using set intersections.

## Basic Inverted Index Implementation

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class InvertedIndex:
    def __init__(self, index_name, redis_client):
        self.name = index_name
        self.redis = redis_client

    def _tag_key(self, tag):
        """Key for a specific tag's item set"""
        return f"idx:{self.name}:tag:{tag}"

    def _item_key(self, item_id):
        """Key for an item's tag set"""
        return f"idx:{self.name}:item:{item_id}"

    def _all_tags_key(self):
        """Key for set of all tags"""
        return f"idx:{self.name}:alltags"

    def add(self, item_id, tags):
        """Add item with tags to the index"""
        pipe = self.redis.pipeline()

        for tag in tags:
            # Add item to tag's set
            pipe.sadd(self._tag_key(tag), item_id)
            # Track all tags
            pipe.sadd(self._all_tags_key(), tag)

        # Store item's tags for retrieval
        pipe.sadd(self._item_key(item_id), *tags)

        pipe.execute()

    def remove(self, item_id):
        """Remove item from index"""
        # Get item's tags
        tags = self.redis.smembers(self._item_key(item_id))

        pipe = self.redis.pipeline()

        for tag in tags:
            pipe.srem(self._tag_key(tag), item_id)

        # Remove item's tag set
        pipe.delete(self._item_key(item_id))

        pipe.execute()

    def update_tags(self, item_id, new_tags):
        """Update an item's tags"""
        old_tags = self.redis.smembers(self._item_key(item_id))
        new_tags_set = set(new_tags)

        # Tags to remove
        to_remove = old_tags - new_tags_set
        # Tags to add
        to_add = new_tags_set - old_tags

        pipe = self.redis.pipeline()

        for tag in to_remove:
            pipe.srem(self._tag_key(tag), item_id)

        for tag in to_add:
            pipe.sadd(self._tag_key(tag), item_id)
            pipe.sadd(self._all_tags_key(), tag)

        # Update item's tags
        pipe.delete(self._item_key(item_id))
        if new_tags:
            pipe.sadd(self._item_key(item_id), *new_tags)

        pipe.execute()

    def find_by_tag(self, tag):
        """Find all items with a specific tag"""
        return self.redis.smembers(self._tag_key(tag))

    def find_by_all_tags(self, tags):
        """Find items that have ALL specified tags (AND)"""
        if not tags:
            return set()

        keys = [self._tag_key(tag) for tag in tags]
        return self.redis.sinter(*keys)

    def find_by_any_tag(self, tags):
        """Find items that have ANY of specified tags (OR)"""
        if not tags:
            return set()

        keys = [self._tag_key(tag) for tag in tags]
        return self.redis.sunion(*keys)

    def find_by_tags_excluding(self, include_tags, exclude_tags):
        """Find items with include_tags but NOT exclude_tags"""
        if not include_tags:
            return set()

        include_keys = [self._tag_key(tag) for tag in include_tags]
        included = self.redis.sinter(*include_keys)

        if not exclude_tags:
            return included

        exclude_keys = [self._tag_key(tag) for tag in exclude_tags]
        excluded = self.redis.sunion(*exclude_keys)

        return included - excluded

    def get_item_tags(self, item_id):
        """Get all tags for an item"""
        return self.redis.smembers(self._item_key(item_id))

    def get_all_tags(self):
        """Get all tags in the index"""
        return self.redis.smembers(self._all_tags_key())

    def count_by_tag(self, tag):
        """Count items with a specific tag"""
        return self.redis.scard(self._tag_key(tag))

    def get_tag_counts(self):
        """Get counts for all tags"""
        tags = self.get_all_tags()
        counts = {}
        for tag in tags:
            counts[tag] = self.count_by_tag(tag)
        return counts

# Usage
index = InvertedIndex('products', r)

# Add products with tags
index.add('product:1', ['electronics', 'wireless', 'bluetooth', 'headphones'])
index.add('product:2', ['electronics', 'wireless', 'speakers'])
index.add('product:3', ['electronics', 'wired', 'headphones'])
index.add('product:4', ['home', 'wireless', 'speakers'])

# Find products
wireless = index.find_by_tag('wireless')
print(f"Wireless products: {wireless}")

# Find wireless electronics
wireless_electronics = index.find_by_all_tags(['wireless', 'electronics'])
print(f"Wireless electronics: {wireless_electronics}")

# Find any headphones or speakers
audio = index.find_by_any_tag(['headphones', 'speakers'])
print(f"Audio products: {audio}")

# Get tag counts (facets)
counts = index.get_tag_counts()
print(f"Tag counts: {counts}")
```

## Multi-Attribute Product Search

Build a full product search with multiple attribute types:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ProductIndex:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.prefix = 'products'

    def _attr_key(self, attr_type, value):
        """Key for attribute value index"""
        return f"{self.prefix}:attr:{attr_type}:{value}"

    def _product_key(self, product_id):
        """Key for product data"""
        return f"{self.prefix}:data:{product_id}"

    def _product_attrs_key(self, product_id):
        """Key for product's attribute tracking"""
        return f"{self.prefix}:attrs:{product_id}"

    def index_product(self, product_id, data, attributes):
        """
        Index a product.

        attributes is dict like:
        {
            'category': ['electronics'],
            'brand': ['sony'],
            'color': ['black', 'silver'],
            'price_range': ['100-200']
        }
        """
        pipe = self.redis.pipeline()

        # Store product data
        pipe.hset(self._product_key(product_id), mapping=data)

        # Index each attribute
        for attr_type, values in attributes.items():
            for value in values:
                pipe.sadd(self._attr_key(attr_type, value), product_id)

        # Track product's attributes for deletion
        pipe.hset(
            self._product_attrs_key(product_id),
            mapping={k: json.dumps(v) for k, v in attributes.items()}
        )

        pipe.execute()

    def remove_product(self, product_id):
        """Remove product from index"""
        # Get stored attributes
        attrs = self.redis.hgetall(self._product_attrs_key(product_id))

        pipe = self.redis.pipeline()

        # Remove from attribute indexes
        for attr_type, values_json in attrs.items():
            values = json.loads(values_json)
            for value in values:
                pipe.srem(self._attr_key(attr_type, value), product_id)

        # Remove product data and attributes
        pipe.delete(self._product_key(product_id))
        pipe.delete(self._product_attrs_key(product_id))

        pipe.execute()

    def search(self, filters, page=1, page_size=20):
        """
        Search products with filters.

        filters is dict like:
        {
            'category': ['electronics'],
            'brand': ['sony', 'samsung'],  # OR within attribute
            'color': ['black']
        }
        """
        if not filters:
            return {'products': [], 'total': 0}

        sets_to_intersect = []

        for attr_type, values in filters.items():
            if len(values) == 1:
                # Single value - use directly
                sets_to_intersect.append(self._attr_key(attr_type, values[0]))
            else:
                # Multiple values - OR them first
                temp_key = f"{self.prefix}:temp:{attr_type}:{id(values)}"
                keys = [self._attr_key(attr_type, v) for v in values]
                self.redis.sunionstore(temp_key, *keys)
                self.redis.expire(temp_key, 60)  # Cleanup temp key
                sets_to_intersect.append(temp_key)

        # AND all attribute results
        if len(sets_to_intersect) == 1:
            product_ids = self.redis.smembers(sets_to_intersect[0])
        else:
            product_ids = self.redis.sinter(*sets_to_intersect)

        # Convert to list and paginate
        product_ids = list(product_ids)
        total = len(product_ids)

        start = (page - 1) * page_size
        end = start + page_size
        page_ids = product_ids[start:end]

        # Fetch product data
        products = []
        for pid in page_ids:
            data = self.redis.hgetall(self._product_key(pid))
            if data:
                data['id'] = pid
                products.append(data)

        return {
            'products': products,
            'total': total,
            'page': page,
            'pages': (total + page_size - 1) // page_size
        }

    def get_facets(self, base_filters=None):
        """
        Get facet counts for filtering UI.
        Optionally filter based on current selections.
        """
        # Define facet attributes
        facet_types = ['category', 'brand', 'color', 'price_range']

        if base_filters:
            # Get base set of products matching current filters
            base_products = self.search(base_filters, page_size=100000)['products']
            base_ids = {p['id'] for p in base_products}

        facets = {}

        for facet_type in facet_types:
            # Get all values for this facet type
            pattern = f"{self.prefix}:attr:{facet_type}:*"
            keys = self.redis.keys(pattern)

            facets[facet_type] = {}
            for key in keys:
                value = key.split(':')[-1]

                if base_filters and facet_type not in base_filters:
                    # Count intersection with base results
                    products = self.redis.smembers(key)
                    count = len(set(products) & base_ids)
                else:
                    count = self.redis.scard(key)

                if count > 0:
                    facets[facet_type][value] = count

        return facets

# Usage
idx = ProductIndex(r)

# Index products
idx.index_product('p1', {
    'name': 'Sony WH-1000XM5',
    'price': '349.99'
}, {
    'category': ['electronics', 'audio'],
    'brand': ['sony'],
    'color': ['black', 'silver'],
    'price_range': ['300-400']
})

idx.index_product('p2', {
    'name': 'Samsung Galaxy Buds',
    'price': '149.99'
}, {
    'category': ['electronics', 'audio'],
    'brand': ['samsung'],
    'color': ['black', 'white'],
    'price_range': ['100-200']
})

idx.index_product('p3', {
    'name': 'Sony TV 55"',
    'price': '899.99'
}, {
    'category': ['electronics', 'tv'],
    'brand': ['sony'],
    'color': ['black'],
    'price_range': ['800-1000']
})

# Search
results = idx.search({
    'category': ['electronics'],
    'brand': ['sony', 'samsung']
})
print(f"Found {results['total']} products")
for p in results['products']:
    print(f"  - {p['name']}")

# Get facets
facets = idx.get_facets({'category': ['electronics']})
print(f"Facets: {json.dumps(facets, indent=2)}")
```

## Full-Text Search with Word Index

Build a simple full-text search using word tokenization:

```python
import redis
import re
from collections import Counter

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class TextIndex:
    def __init__(self, index_name, redis_client):
        self.name = index_name
        self.redis = redis_client
        self.stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be',
                          'been', 'being', 'have', 'has', 'had', 'do', 'does',
                          'did', 'will', 'would', 'could', 'should', 'may',
                          'might', 'must', 'shall', 'can', 'of', 'at', 'by',
                          'for', 'with', 'about', 'to', 'from', 'in', 'on'}

    def _word_key(self, word):
        return f"txt:{self.name}:word:{word}"

    def _doc_key(self, doc_id):
        return f"txt:{self.name}:doc:{doc_id}"

    def tokenize(self, text):
        """Tokenize text into searchable words"""
        # Lowercase and extract words
        words = re.findall(r'\b[a-z0-9]+\b', text.lower())
        # Remove stop words and short words
        words = [w for w in words if w not in self.stop_words and len(w) > 2]
        return words

    def index_document(self, doc_id, text, metadata=None):
        """Index a document"""
        words = self.tokenize(text)
        word_counts = Counter(words)

        pipe = self.redis.pipeline()

        # Store document
        doc_data = {
            'text': text,
            'word_count': len(words),
            **(metadata or {})
        }
        pipe.hset(self._doc_key(doc_id), mapping=doc_data)

        # Index each word
        for word in set(words):
            pipe.sadd(self._word_key(word), doc_id)

        pipe.execute()

    def search(self, query, match_all=True):
        """
        Search for documents.
        match_all=True requires all words (AND)
        match_all=False requires any word (OR)
        """
        words = self.tokenize(query)

        if not words:
            return []

        keys = [self._word_key(word) for word in words]

        if match_all:
            doc_ids = self.redis.sinter(*keys)
        else:
            doc_ids = self.redis.sunion(*keys)

        # Fetch documents
        docs = []
        for doc_id in doc_ids:
            data = self.redis.hgetall(self._doc_key(doc_id))
            if data:
                docs.append({
                    'id': doc_id,
                    **data
                })

        # Simple relevance: count matching words
        for doc in docs:
            text_words = set(self.tokenize(doc.get('text', '')))
            query_words = set(words)
            doc['relevance'] = len(text_words & query_words)

        # Sort by relevance
        docs.sort(key=lambda x: x['relevance'], reverse=True)

        return docs

    def suggest(self, prefix, limit=10):
        """Get word suggestions based on prefix"""
        # This is a simple implementation - for production, use sorted sets
        pattern = f"txt:{self.name}:word:{prefix}*"
        keys = self.redis.keys(pattern)

        suggestions = []
        for key in keys[:limit]:
            word = key.split(':')[-1]
            count = self.redis.scard(key)
            suggestions.append({'word': word, 'count': count})

        suggestions.sort(key=lambda x: x['count'], reverse=True)
        return suggestions

# Usage
search = TextIndex('articles', r)

# Index articles
search.index_document('article:1',
    'Redis is an open source in-memory data structure store used as database cache and message broker',
    {'title': 'Introduction to Redis', 'author': 'John'}
)

search.index_document('article:2',
    'PostgreSQL is a powerful open source relational database management system',
    {'title': 'PostgreSQL Guide', 'author': 'Jane'}
)

search.index_document('article:3',
    'Using Redis as a cache for PostgreSQL queries can significantly improve performance',
    {'title': 'Redis Caching', 'author': 'John'}
)

# Search
results = search.search('redis cache')
print("Search results for 'redis cache':")
for doc in results:
    print(f"  - {doc.get('title')} (relevance: {doc['relevance']})")

# Suggestions
suggestions = search.suggest('red')
print(f"Suggestions for 'red': {suggestions}")
```

## Geospatial Filtering with Sets

Combine inverted indexes with geospatial data:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class GeoIndex:
    def __init__(self, index_name, redis_client):
        self.name = index_name
        self.redis = redis_client

    def _geo_key(self):
        return f"geo:{self.name}:locations"

    def _attr_key(self, attr, value):
        return f"geo:{self.name}:attr:{attr}:{value}"

    def _item_key(self, item_id):
        return f"geo:{self.name}:item:{item_id}"

    def add_location(self, item_id, lat, lng, attributes=None):
        """Add a location with attributes"""
        pipe = self.redis.pipeline()

        # Add to geo index
        pipe.geoadd(self._geo_key(), (lng, lat, item_id))

        # Index attributes
        if attributes:
            for attr, values in attributes.items():
                for value in (values if isinstance(values, list) else [values]):
                    pipe.sadd(self._attr_key(attr, value), item_id)

            # Store attributes for item
            pipe.hset(self._item_key(item_id), mapping={
                'lat': lat,
                'lng': lng,
                **{k: ','.join(v) if isinstance(v, list) else v for k, v in attributes.items()}
            })

        pipe.execute()

    def search_nearby(self, lat, lng, radius_km, filters=None):
        """Search locations within radius, optionally filtered by attributes"""

        # Get all items within radius
        nearby = self.redis.geosearch(
            self._geo_key(),
            longitude=lng,
            latitude=lat,
            radius=radius_km,
            unit='km',
            withdist=True
        )

        nearby_ids = {item[0] for item in nearby}
        distances = {item[0]: item[1] for item in nearby}

        # Apply attribute filters
        if filters:
            for attr, values in filters.items():
                if isinstance(values, list) and len(values) > 1:
                    # OR within attribute
                    attr_items = set()
                    for value in values:
                        attr_items |= self.redis.smembers(self._attr_key(attr, value))
                else:
                    value = values[0] if isinstance(values, list) else values
                    attr_items = self.redis.smembers(self._attr_key(attr, value))

                nearby_ids &= attr_items

        # Fetch item data
        results = []
        for item_id in nearby_ids:
            data = self.redis.hgetall(self._item_key(item_id))
            if data:
                results.append({
                    'id': item_id,
                    'distance_km': distances[item_id],
                    **data
                })

        # Sort by distance
        results.sort(key=lambda x: x['distance_km'])

        return results

# Usage
geo = GeoIndex('restaurants', r)

# Add restaurants
geo.add_location('rest:1', 40.7128, -74.0060, {
    'cuisine': ['italian', 'pizza'],
    'price': 'medium',
    'rating': '4star'
})

geo.add_location('rest:2', 40.7580, -73.9855, {
    'cuisine': ['japanese', 'sushi'],
    'price': 'expensive',
    'rating': '5star'
})

geo.add_location('rest:3', 40.7489, -73.9680, {
    'cuisine': ['italian'],
    'price': 'cheap',
    'rating': '3star'
})

# Find Italian restaurants within 5km
results = geo.search_nearby(
    40.7500, -73.9900, 10,
    filters={'cuisine': ['italian']}
)

print("Italian restaurants nearby:")
for r in results:
    print(f"  - {r['id']}: {r['distance_km']:.2f}km away")
```

## Best Practices

### 1. Key Naming Convention
```python
# Good: Consistent, hierarchical naming
"idx:products:attr:color:red"
"idx:products:item:123"

# Include version for schema changes
"idx:v2:products:attr:color:red"
```

### 2. Use Pipelines for Bulk Operations
```python
def bulk_index(items):
    pipe = r.pipeline()
    for item_id, tags in items:
        for tag in tags:
            pipe.sadd(f"idx:tag:{tag}", item_id)
    pipe.execute()
```

### 3. Handle Tag Cleanup
```python
def cleanup_empty_tags():
    """Remove tag sets with no members"""
    pattern = "idx:tag:*"
    for key in r.scan_iter(match=pattern):
        if r.scard(key) == 0:
            r.delete(key)
```

### 4. Use SSCAN for Large Sets
```python
def get_items_iter(tag, batch_size=1000):
    """Iterate over large tag sets without blocking"""
    cursor = 0
    while True:
        cursor, items = r.sscan(f"idx:tag:{tag}", cursor, count=batch_size)
        yield from items
        if cursor == 0:
            break
```

## Conclusion

Redis sets provide an excellent foundation for building inverted indexes. Key benefits include:

- **O(1) membership testing** - Check if item has tag instantly
- **Efficient set operations** - AND/OR queries with SINTER/SUNION
- **Scalable** - Handle millions of items and tags
- **Simple** - No need for dedicated search infrastructure

For simple filtering and faceted search, Redis set-based inverted indexes are often sufficient and much simpler to operate than full search engines like Elasticsearch. When you need more advanced features like fuzzy matching or relevance scoring, consider Redis Search or a dedicated search engine.
