# How to Implement Wishlist and Favorites with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Wishlist, Favorites, User Preferences, Data Structures

Description: A comprehensive guide to implementing wishlist and favorites functionality with Redis for e-commerce applications including saved items, collections, and sharing features.

---

Wishlists and favorites are essential e-commerce features that improve user engagement and conversion rates. Redis provides the perfect data structures for implementing these features with fast reads, writes, and rich querying capabilities.

## Understanding Wishlist Requirements

A wishlist system typically needs:

- **Add/remove items**: Fast operations for user actions
- **List retrieval**: Quick fetch of all saved items
- **Metadata**: Notes, priority, date added
- **Collections**: Multiple lists per user
- **Sharing**: Public/private visibility
- **Notifications**: Price drop alerts

## Basic Wishlist Implementation

### Python Implementation

```python
import redis
import json
import time
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class WishlistService:
    def __init__(self, prefix='wishlist'):
        self.prefix = prefix

    def add_item(self, user_id, product_id, metadata=None):
        """Add an item to user's wishlist."""
        key = f"{self.prefix}:{user_id}"
        timestamp = time.time()

        item_data = {
            'product_id': product_id,
            'added_at': int(timestamp),
            'metadata': metadata or {}
        }

        # Use sorted set with timestamp for ordering
        member = json.dumps(item_data)
        r.zadd(key, {member: timestamp})

        # Track in product's wishlist count
        r.hincrby(f"{self.prefix}:product_stats", product_id, 1)

        return True

    def remove_item(self, user_id, product_id):
        """Remove an item from user's wishlist."""
        key = f"{self.prefix}:{user_id}"

        # Find and remove the item
        items = r.zrange(key, 0, -1)
        for item in items:
            data = json.loads(item)
            if data['product_id'] == product_id:
                r.zrem(key, item)
                r.hincrby(f"{self.prefix}:product_stats", product_id, -1)
                return True

        return False

    def get_wishlist(self, user_id, limit=50, offset=0):
        """Get user's wishlist items."""
        key = f"{self.prefix}:{user_id}"

        # Get items sorted by most recently added
        items = r.zrevrange(key, offset, offset + limit - 1, withscores=True)

        wishlist = []
        for member, score in items:
            data = json.loads(member)
            data['score'] = score
            wishlist.append(data)

        return wishlist

    def is_in_wishlist(self, user_id, product_id):
        """Check if a product is in user's wishlist."""
        key = f"{self.prefix}:{user_id}"
        items = r.zrange(key, 0, -1)

        for item in items:
            data = json.loads(item)
            if data['product_id'] == product_id:
                return True

        return False

    def get_wishlist_count(self, user_id):
        """Get count of items in wishlist."""
        key = f"{self.prefix}:{user_id}"
        return r.zcard(key)

    def get_product_wishlist_count(self, product_id):
        """Get how many users have this product wishlisted."""
        count = r.hget(f"{self.prefix}:product_stats", product_id)
        return int(count) if count else 0

    def clear_wishlist(self, user_id):
        """Clear all items from wishlist."""
        key = f"{self.prefix}:{user_id}"

        # Update product stats before clearing
        items = r.zrange(key, 0, -1)
        for item in items:
            data = json.loads(item)
            r.hincrby(f"{self.prefix}:product_stats", data['product_id'], -1)

        r.delete(key)

# Usage
wishlist = WishlistService()

# Add items
wishlist.add_item('user_123', 'prod_001', {'note': 'Birthday gift idea'})
wishlist.add_item('user_123', 'prod_002')
wishlist.add_item('user_123', 'prod_003', {'priority': 'high'})

# Get wishlist
items = wishlist.get_wishlist('user_123')
print(f"Wishlist: {items}")

# Check if item is wishlisted
is_saved = wishlist.is_in_wishlist('user_123', 'prod_001')
print(f"Is prod_001 in wishlist: {is_saved}")

# Get product popularity
popularity = wishlist.get_product_wishlist_count('prod_001')
print(f"Users who saved prod_001: {popularity}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class WishlistService {
  constructor(prefix = 'wishlist') {
    this.prefix = prefix;
  }

  async addItem(userId, productId, metadata = {}) {
    const key = `${this.prefix}:${userId}`;
    const timestamp = Date.now() / 1000;

    const itemData = {
      product_id: productId,
      added_at: Math.floor(timestamp),
      metadata
    };

    const member = JSON.stringify(itemData);

    await redis.pipeline()
      .zadd(key, timestamp, member)
      .hincrby(`${this.prefix}:product_stats`, productId, 1)
      .exec();

    return true;
  }

  async removeItem(userId, productId) {
    const key = `${this.prefix}:${userId}`;
    const items = await redis.zrange(key, 0, -1);

    for (const item of items) {
      const data = JSON.parse(item);
      if (data.product_id === productId) {
        await redis.pipeline()
          .zrem(key, item)
          .hincrby(`${this.prefix}:product_stats`, productId, -1)
          .exec();
        return true;
      }
    }

    return false;
  }

  async getWishlist(userId, limit = 50, offset = 0) {
    const key = `${this.prefix}:${userId}`;
    const items = await redis.zrevrange(
      key, offset, offset + limit - 1, 'WITHSCORES'
    );

    const wishlist = [];
    for (let i = 0; i < items.length; i += 2) {
      const data = JSON.parse(items[i]);
      data.score = parseFloat(items[i + 1]);
      wishlist.push(data);
    }

    return wishlist;
  }

  async isInWishlist(userId, productId) {
    const key = `${this.prefix}:${userId}`;
    const items = await redis.zrange(key, 0, -1);

    for (const item of items) {
      const data = JSON.parse(item);
      if (data.product_id === productId) {
        return true;
      }
    }

    return false;
  }

  async toggleItem(userId, productId, metadata = {}) {
    const isInList = await this.isInWishlist(userId, productId);

    if (isInList) {
      await this.removeItem(userId, productId);
      return { action: 'removed', inWishlist: false };
    } else {
      await this.addItem(userId, productId, metadata);
      return { action: 'added', inWishlist: true };
    }
  }
}

// Usage
async function example() {
  const wishlist = new WishlistService();

  await wishlist.addItem('user_123', 'prod_001', { note: 'Gift idea' });

  const items = await wishlist.getWishlist('user_123');
  console.log('Wishlist:', items);

  const result = await wishlist.toggleItem('user_123', 'prod_001');
  console.log('Toggle result:', result);
}

example().catch(console.error);
```

## Multiple Collections (Lists)

```python
class CollectionService:
    def __init__(self, prefix='collections'):
        self.prefix = prefix

    def create_collection(self, user_id, name, description=None, is_public=False):
        """Create a new collection/list."""
        import uuid
        collection_id = str(uuid.uuid4())

        collection_data = {
            'id': collection_id,
            'user_id': user_id,
            'name': name,
            'description': description or '',
            'is_public': is_public,
            'created_at': int(time.time()),
            'item_count': 0
        }

        # Store collection metadata
        r.hset(
            f"{self.prefix}:meta:{collection_id}",
            mapping=collection_data
        )

        # Add to user's collections list
        r.sadd(f"{self.prefix}:user:{user_id}", collection_id)

        return collection_id

    def add_to_collection(self, collection_id, product_id, metadata=None):
        """Add an item to a collection."""
        items_key = f"{self.prefix}:items:{collection_id}"
        timestamp = time.time()

        item_data = {
            'product_id': product_id,
            'added_at': int(timestamp),
            'metadata': metadata or {}
        }

        member = json.dumps(item_data)
        added = r.zadd(items_key, {member: timestamp}, nx=True)

        if added:
            r.hincrby(f"{self.prefix}:meta:{collection_id}", 'item_count', 1)

        return added > 0

    def remove_from_collection(self, collection_id, product_id):
        """Remove an item from a collection."""
        items_key = f"{self.prefix}:items:{collection_id}"
        items = r.zrange(items_key, 0, -1)

        for item in items:
            data = json.loads(item)
            if data['product_id'] == product_id:
                r.zrem(items_key, item)
                r.hincrby(f"{self.prefix}:meta:{collection_id}", 'item_count', -1)
                return True

        return False

    def get_collection(self, collection_id, include_items=True, limit=50):
        """Get collection with metadata and optionally items."""
        meta = r.hgetall(f"{self.prefix}:meta:{collection_id}")

        if not meta:
            return None

        collection = {
            'id': meta.get('id'),
            'name': meta.get('name'),
            'description': meta.get('description'),
            'is_public': meta.get('is_public') == 'True',
            'item_count': int(meta.get('item_count', 0)),
            'created_at': int(meta.get('created_at', 0))
        }

        if include_items:
            items_key = f"{self.prefix}:items:{collection_id}"
            items = r.zrevrange(items_key, 0, limit - 1, withscores=True)
            collection['items'] = [
                {**json.loads(item), 'score': score}
                for item, score in items
            ]

        return collection

    def get_user_collections(self, user_id):
        """Get all collections for a user."""
        collection_ids = r.smembers(f"{self.prefix}:user:{user_id}")

        collections = []
        for cid in collection_ids:
            collection = self.get_collection(cid, include_items=False)
            if collection:
                collections.append(collection)

        return sorted(collections, key=lambda x: x['created_at'], reverse=True)

    def delete_collection(self, collection_id, user_id):
        """Delete a collection."""
        # Verify ownership
        meta = r.hgetall(f"{self.prefix}:meta:{collection_id}")
        if not meta or meta.get('user_id') != user_id:
            return False

        pipe = r.pipeline()
        pipe.delete(f"{self.prefix}:meta:{collection_id}")
        pipe.delete(f"{self.prefix}:items:{collection_id}")
        pipe.srem(f"{self.prefix}:user:{user_id}", collection_id)
        pipe.execute()

        return True

    def move_item(self, product_id, from_collection, to_collection):
        """Move an item between collections."""
        # Get item data from source
        items_key = f"{self.prefix}:items:{from_collection}"
        items = r.zrange(items_key, 0, -1, withscores=True)

        for item, score in items:
            data = json.loads(item)
            if data['product_id'] == product_id:
                # Add to destination
                self.add_to_collection(to_collection, product_id, data.get('metadata'))
                # Remove from source
                self.remove_from_collection(from_collection, product_id)
                return True

        return False

# Usage
collections = CollectionService()

# Create collections
gift_list = collections.create_collection(
    'user_123',
    'Birthday Gifts',
    description='Ideas for mom\'s birthday',
    is_public=False
)

home_list = collections.create_collection(
    'user_123',
    'Home Decor',
    is_public=True
)

# Add items to collections
collections.add_to_collection(gift_list, 'prod_001', {'note': 'Her favorite color'})
collections.add_to_collection(gift_list, 'prod_002')
collections.add_to_collection(home_list, 'prod_003')

# Get collection with items
gift_collection = collections.get_collection(gift_list)
print(f"Gift list: {gift_collection}")

# Get all user collections
user_lists = collections.get_user_collections('user_123')
print(f"User has {len(user_lists)} collections")
```

## Shared Wishlists

```python
class SharedWishlistService:
    def __init__(self, prefix='shared_wishlist'):
        self.prefix = prefix

    def create_shared_list(self, owner_id, name, description=None):
        """Create a shared wishlist."""
        import uuid
        list_id = str(uuid.uuid4())
        share_code = secrets.token_urlsafe(8)

        list_data = {
            'id': list_id,
            'owner_id': owner_id,
            'name': name,
            'description': description or '',
            'share_code': share_code,
            'created_at': int(time.time()),
            'is_active': 'true'
        }

        pipe = r.pipeline()
        pipe.hset(f"{self.prefix}:{list_id}", mapping=list_data)
        pipe.set(f"{self.prefix}:code:{share_code}", list_id)
        pipe.sadd(f"{self.prefix}:owner:{owner_id}", list_id)
        pipe.execute()

        return {'list_id': list_id, 'share_code': share_code}

    def add_item(self, list_id, product_id, added_by, note=None):
        """Add an item to a shared list."""
        items_key = f"{self.prefix}:{list_id}:items"
        timestamp = time.time()

        item_data = {
            'product_id': product_id,
            'added_by': added_by,
            'added_at': int(timestamp),
            'note': note,
            'claimed_by': None
        }

        member = json.dumps(item_data)
        r.zadd(items_key, {member: timestamp})

        return True

    def claim_item(self, list_id, product_id, claimed_by):
        """Claim an item (mark as "I'll get this")."""
        items_key = f"{self.prefix}:{list_id}:items"
        items = r.zrange(items_key, 0, -1, withscores=True)

        for item, score in items:
            data = json.loads(item)
            if data['product_id'] == product_id:
                if data['claimed_by']:
                    return {'success': False, 'error': 'Already claimed'}

                # Update claim
                r.zrem(items_key, item)
                data['claimed_by'] = claimed_by
                data['claimed_at'] = int(time.time())
                r.zadd(items_key, {json.dumps(data): score})

                return {'success': True}

        return {'success': False, 'error': 'Item not found'}

    def unclaim_item(self, list_id, product_id, user_id):
        """Unclaim an item."""
        items_key = f"{self.prefix}:{list_id}:items"
        items = r.zrange(items_key, 0, -1, withscores=True)

        for item, score in items:
            data = json.loads(item)
            if data['product_id'] == product_id:
                if data['claimed_by'] != user_id:
                    return {'success': False, 'error': 'Not your claim'}

                r.zrem(items_key, item)
                data['claimed_by'] = None
                data['claimed_at'] = None
                r.zadd(items_key, {json.dumps(data): score})

                return {'success': True}

        return {'success': False, 'error': 'Item not found'}

    def get_list_by_code(self, share_code):
        """Get a shared list by its share code."""
        list_id = r.get(f"{self.prefix}:code:{share_code}")
        if not list_id:
            return None

        return self.get_list(list_id)

    def get_list(self, list_id, viewer_id=None):
        """Get a shared list with items."""
        list_data = r.hgetall(f"{self.prefix}:{list_id}")
        if not list_data:
            return None

        items_key = f"{self.prefix}:{list_id}:items"
        items = r.zrevrange(items_key, 0, -1, withscores=True)

        # If viewer is owner, show all claims
        # If viewer is not owner, hide who claimed what
        is_owner = viewer_id == list_data.get('owner_id')

        parsed_items = []
        for item, score in items:
            data = json.loads(item)
            if not is_owner and data['claimed_by'] and data['claimed_by'] != viewer_id:
                # Hide claim details from non-owners (but show it's claimed)
                data['claimed_by'] = 'someone'
            parsed_items.append(data)

        return {
            'id': list_data.get('id'),
            'name': list_data.get('name'),
            'description': list_data.get('description'),
            'owner_id': list_data.get('owner_id'),
            'share_code': list_data.get('share_code') if is_owner else None,
            'items': parsed_items,
            'is_owner': is_owner
        }

# Usage
shared = SharedWishlistService()

# Create shared list
result = shared.create_shared_list(
    'user_123',
    'My Birthday Wishlist',
    'Things I\'d love to receive!'
)
print(f"Share this code: {result['share_code']}")

# Add items
shared.add_item(result['list_id'], 'prod_001', 'user_123', 'Really want this one!')
shared.add_item(result['list_id'], 'prod_002', 'user_123')

# Friend accesses via share code
friend_view = shared.get_list_by_code(result['share_code'])
print(f"Friend sees: {friend_view}")

# Friend claims an item
shared.claim_item(result['list_id'], 'prod_001', 'friend_456')
```

## Price Drop Notifications

```python
class WishlistNotificationService:
    def __init__(self, prefix='wishlist_notify'):
        self.prefix = prefix

    def subscribe_to_price_drop(self, user_id, product_id, target_price=None):
        """Subscribe to price drop notifications."""
        key = f"{self.prefix}:subscriptions:{product_id}"

        subscription = {
            'user_id': user_id,
            'target_price': target_price,
            'subscribed_at': int(time.time())
        }

        r.hset(key, user_id, json.dumps(subscription))

        # Track user's subscriptions
        r.sadd(f"{self.prefix}:user:{user_id}", product_id)

        return True

    def unsubscribe_from_price_drop(self, user_id, product_id):
        """Unsubscribe from price notifications."""
        r.hdel(f"{self.prefix}:subscriptions:{product_id}", user_id)
        r.srem(f"{self.prefix}:user:{user_id}", product_id)

    def notify_price_change(self, product_id, old_price, new_price):
        """
        Process price change and queue notifications.
        Call this when product prices are updated.
        """
        if new_price >= old_price:
            return []  # Only notify on price drops

        key = f"{self.prefix}:subscriptions:{product_id}"
        subscriptions = r.hgetall(key)

        users_to_notify = []

        for user_id, sub_data in subscriptions.items():
            subscription = json.loads(sub_data)
            target = subscription.get('target_price')

            # Notify if no target or price is at/below target
            if target is None or new_price <= target:
                users_to_notify.append({
                    'user_id': user_id,
                    'product_id': product_id,
                    'old_price': old_price,
                    'new_price': new_price,
                    'target_price': target
                })

                # Queue notification
                notification = {
                    'type': 'price_drop',
                    'user_id': user_id,
                    'product_id': product_id,
                    'old_price': old_price,
                    'new_price': new_price,
                    'created_at': int(time.time())
                }
                r.lpush(f"notifications:queue:{user_id}", json.dumps(notification))

        return users_to_notify

    def get_user_subscriptions(self, user_id):
        """Get all products a user is subscribed to."""
        return list(r.smembers(f"{self.prefix}:user:{user_id}"))

# Usage
notifications = WishlistNotificationService()

# User subscribes to price drops
notifications.subscribe_to_price_drop('user_123', 'prod_001', target_price=99.99)
notifications.subscribe_to_price_drop('user_123', 'prod_002')  # Any drop

# When price changes (called by price update service)
users = notifications.notify_price_change('prod_001', old_price=149.99, new_price=89.99)
print(f"Users to notify: {users}")
```

## Best Practices

### 1. Use Efficient Lookups for "Is in Wishlist"

```python
# For fast lookup, maintain a separate set
def add_item_optimized(user_id, product_id):
    pipe = r.pipeline()
    # Main wishlist with full data
    pipe.zadd(f"wishlist:{user_id}", {json.dumps(data): timestamp})
    # Fast lookup set
    pipe.sadd(f"wishlist:lookup:{user_id}", product_id)
    pipe.execute()

def is_in_wishlist_fast(user_id, product_id):
    return r.sismember(f"wishlist:lookup:{user_id}", product_id)
```

### 2. Batch Operations for Performance

```python
def check_wishlist_bulk(user_id, product_ids):
    """Check multiple products at once."""
    key = f"wishlist:lookup:{user_id}"
    pipe = r.pipeline()
    for pid in product_ids:
        pipe.sismember(key, pid)
    results = pipe.execute()
    return dict(zip(product_ids, results))
```

### 3. Limit List Size

```python
MAX_WISHLIST_SIZE = 500

def add_with_limit(user_id, product_id):
    key = f"wishlist:{user_id}"
    current_size = r.zcard(key)

    if current_size >= MAX_WISHLIST_SIZE:
        return {'success': False, 'error': 'Wishlist full'}

    # Add item...
```

## Conclusion

Implementing wishlists and favorites with Redis provides the performance and flexibility needed for engaging e-commerce experiences. Key takeaways:

- Use sorted sets for ordered wishlists with timestamps
- Implement multiple collections for user organization
- Support shared lists with claim functionality
- Enable price drop notifications with subscriptions
- Optimize lookups with separate index sets
- Set appropriate size limits

Redis's rich data structures make it ideal for wishlist features, enabling fast operations while supporting complex functionality like sharing and notifications.
