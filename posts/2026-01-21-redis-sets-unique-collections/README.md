# How to Use Redis Sets for Unique Collections and Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sets, Data Structures, Tags, Unique Collections, SADD, SINTER, Set Operations

Description: A comprehensive guide to using Redis Sets for managing unique collections and tag systems, covering SADD, SMEMBERS, SINTER commands, set operations, and practical examples in Python, Node.js, and Go for tagging, tracking, and recommendation systems.

---

Redis Sets are unordered collections of unique strings. They provide O(1) time complexity for adding, removing, and checking membership, making them ideal for tracking unique items, implementing tagging systems, and performing set operations like intersections and unions.

In this guide, we will explore Redis Sets in depth, covering essential commands, set operations, and practical implementations for unique collections and tagging systems.

## Understanding Redis Sets

Redis Sets guarantee uniqueness - adding the same element multiple times results in a single entry. Key characteristics:

- All elements are unique strings
- Unordered (no guaranteed iteration order)
- O(1) add, remove, and membership check
- Maximum 2^32 - 1 members (over 4 billion)
- Support for set operations (union, intersection, difference)

Common use cases:
- Tag systems
- Tracking unique visitors/events
- Friend lists and social connections
- Finding common interests
- Deduplication

## Essential Set Commands

### Adding Elements

```bash
# Add single element
SADD myset "apple"

# Add multiple elements
SADD myset "banana" "cherry" "date"

# Returns number of elements actually added (not already present)
SADD myset "apple" "elderberry"
# Returns 1 (only elderberry was new)
```

### Retrieving Elements

```bash
# Get all members
SMEMBERS myset
# 1) "apple"
# 2) "banana"
# 3) "cherry"
# 4) "date"
# 5) "elderberry"

# Get set size
SCARD myset
# 5

# Check if element exists
SISMEMBER myset "apple"
# 1 (true)

SISMEMBER myset "fig"
# 0 (false)

# Check multiple elements (Redis 6.2+)
SMISMEMBER myset "apple" "fig" "banana"
# 1) 1
# 2) 0
# 3) 1

# Get random element(s)
SRANDMEMBER myset
# "cherry" (random)

SRANDMEMBER myset 2
# 1) "apple"
# 2) "date"
```

### Removing Elements

```bash
# Remove specific elements
SREM myset "apple"
# Returns 1

SREM myset "banana" "nonexistent"
# Returns 1 (only banana was present)

# Pop random element
SPOP myset
# Returns and removes a random element

SPOP myset 2
# Returns and removes 2 random elements
```

### Scanning Large Sets

```bash
# Iterate through set (for large sets)
SSCAN myset 0
# Returns cursor and batch of elements

SSCAN myset 0 MATCH "a*" COUNT 100
# Pattern matching with count hint
```

## Set Operations

### Union (Combine Sets)

```bash
# Create sets
SADD set1 "a" "b" "c"
SADD set2 "b" "c" "d"
SADD set3 "c" "d" "e"

# Get union
SUNION set1 set2
# 1) "a"
# 2) "b"
# 3) "c"
# 4) "d"

# Store union in new set
SUNIONSTORE result set1 set2 set3
# Returns size of result set
```

### Intersection (Common Elements)

```bash
# Get intersection
SINTER set1 set2
# 1) "b"
# 2) "c"

SINTER set1 set2 set3
# 1) "c"

# Store intersection
SINTERSTORE common set1 set2
# Returns size of result

# Get intersection cardinality (Redis 7.0+)
SINTERCARD 2 set1 set2
# Returns count without materializing result

SINTERCARD 2 set1 set2 LIMIT 100
# Stop counting at 100
```

### Difference (Elements Not in Other Sets)

```bash
# Elements in set1 not in set2
SDIFF set1 set2
# 1) "a"

# Elements in set1 not in set2 or set3
SDIFF set1 set2 set3
# 1) "a"

# Store difference
SDIFFSTORE unique set1 set2
```

### Move Between Sets

```bash
# Move element from one set to another
SMOVE source destination "element"
# Returns 1 if moved, 0 if element not in source
```

## Practical Examples

### Python Implementation

```python
import redis
from datetime import datetime, timedelta
from typing import Set, List, Dict, Optional
import json

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Tagging System
# =============================================================================

class TagSystem:
    def __init__(self, namespace: str = "tags"):
        self.namespace = namespace

    def _item_tags_key(self, item_type: str, item_id: str) -> str:
        return f"{self.namespace}:{item_type}:{item_id}:tags"

    def _tag_items_key(self, item_type: str, tag: str) -> str:
        return f"{self.namespace}:{item_type}:tag:{tag}"

    def add_tags(self, item_type: str, item_id: str, tags: List[str]) -> None:
        """Add tags to an item."""
        pipe = client.pipeline()

        # Add tags to item's tag set
        item_key = self._item_tags_key(item_type, item_id)
        pipe.sadd(item_key, *tags)

        # Add item to each tag's item set
        for tag in tags:
            tag_key = self._tag_items_key(item_type, tag)
            pipe.sadd(tag_key, item_id)

        pipe.execute()

    def remove_tags(self, item_type: str, item_id: str, tags: List[str]) -> None:
        """Remove tags from an item."""
        pipe = client.pipeline()

        item_key = self._item_tags_key(item_type, item_id)
        pipe.srem(item_key, *tags)

        for tag in tags:
            tag_key = self._tag_items_key(item_type, tag)
            pipe.srem(tag_key, item_id)

        pipe.execute()

    def get_tags(self, item_type: str, item_id: str) -> Set[str]:
        """Get all tags for an item."""
        key = self._item_tags_key(item_type, item_id)
        return client.smembers(key)

    def get_items_by_tag(self, item_type: str, tag: str) -> Set[str]:
        """Get all items with a specific tag."""
        key = self._tag_items_key(item_type, tag)
        return client.smembers(key)

    def get_items_by_all_tags(self, item_type: str, tags: List[str]) -> Set[str]:
        """Get items that have ALL specified tags."""
        keys = [self._tag_items_key(item_type, tag) for tag in tags]
        return client.sinter(*keys)

    def get_items_by_any_tag(self, item_type: str, tags: List[str]) -> Set[str]:
        """Get items that have ANY of the specified tags."""
        keys = [self._tag_items_key(item_type, tag) for tag in tags]
        return client.sunion(*keys)

    def get_related_tags(self, item_type: str, tag: str, limit: int = 10) -> List[str]:
        """Get tags that frequently appear with the given tag."""
        items = self.get_items_by_tag(item_type, tag)
        tag_counts: Dict[str, int] = {}

        for item_id in items:
            item_tags = self.get_tags(item_type, item_id)
            for t in item_tags:
                if t != tag:
                    tag_counts[t] = tag_counts.get(t, 0) + 1

        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
        return [t for t, _ in sorted_tags[:limit]]


# =============================================================================
# Unique Visitor Tracking
# =============================================================================

class UniqueVisitorTracker:
    def __init__(self, namespace: str = "visitors"):
        self.namespace = namespace

    def _daily_key(self, date: datetime) -> str:
        return f"{self.namespace}:daily:{date.strftime('%Y-%m-%d')}"

    def _hourly_key(self, date: datetime) -> str:
        return f"{self.namespace}:hourly:{date.strftime('%Y-%m-%d-%H')}"

    def track_visit(self, visitor_id: str, timestamp: datetime = None) -> None:
        """Track a visitor."""
        if timestamp is None:
            timestamp = datetime.now()

        pipe = client.pipeline()
        pipe.sadd(self._daily_key(timestamp), visitor_id)
        pipe.sadd(self._hourly_key(timestamp), visitor_id)
        pipe.execute()

    def get_daily_unique_count(self, date: datetime) -> int:
        """Get unique visitor count for a day."""
        return client.scard(self._daily_key(date))

    def get_hourly_unique_count(self, date: datetime) -> int:
        """Get unique visitor count for an hour."""
        return client.scard(self._hourly_key(date))

    def get_unique_visitors_range(self, start: datetime, end: datetime) -> Set[str]:
        """Get unique visitors across a date range."""
        keys = []
        current = start
        while current <= end:
            keys.append(self._daily_key(current))
            current += timedelta(days=1)

        return client.sunion(*keys) if keys else set()

    def get_returning_visitors(self, date1: datetime, date2: datetime) -> Set[str]:
        """Get visitors who visited on both days."""
        return client.sinter(self._daily_key(date1), self._daily_key(date2))

    def get_new_visitors(self, date: datetime, previous_date: datetime) -> Set[str]:
        """Get visitors who are new (visited today but not yesterday)."""
        return client.sdiff(self._daily_key(date), self._daily_key(previous_date))


# =============================================================================
# Social Connections (Friends/Followers)
# =============================================================================

class SocialGraph:
    def __init__(self):
        pass

    def _friends_key(self, user_id: str) -> str:
        return f"user:{user_id}:friends"

    def _followers_key(self, user_id: str) -> str:
        return f"user:{user_id}:followers"

    def _following_key(self, user_id: str) -> str:
        return f"user:{user_id}:following"

    def add_friend(self, user_id: str, friend_id: str) -> None:
        """Add bidirectional friendship."""
        pipe = client.pipeline()
        pipe.sadd(self._friends_key(user_id), friend_id)
        pipe.sadd(self._friends_key(friend_id), user_id)
        pipe.execute()

    def remove_friend(self, user_id: str, friend_id: str) -> None:
        """Remove bidirectional friendship."""
        pipe = client.pipeline()
        pipe.srem(self._friends_key(user_id), friend_id)
        pipe.srem(self._friends_key(friend_id), user_id)
        pipe.execute()

    def follow(self, user_id: str, target_id: str) -> None:
        """Follow a user."""
        pipe = client.pipeline()
        pipe.sadd(self._following_key(user_id), target_id)
        pipe.sadd(self._followers_key(target_id), user_id)
        pipe.execute()

    def unfollow(self, user_id: str, target_id: str) -> None:
        """Unfollow a user."""
        pipe = client.pipeline()
        pipe.srem(self._following_key(user_id), target_id)
        pipe.srem(self._followers_key(target_id), user_id)
        pipe.execute()

    def get_friends(self, user_id: str) -> Set[str]:
        """Get user's friends."""
        return client.smembers(self._friends_key(user_id))

    def get_followers(self, user_id: str) -> Set[str]:
        """Get user's followers."""
        return client.smembers(self._followers_key(user_id))

    def get_following(self, user_id: str) -> Set[str]:
        """Get users this user follows."""
        return client.smembers(self._following_key(user_id))

    def get_mutual_friends(self, user1: str, user2: str) -> Set[str]:
        """Get mutual friends between two users."""
        return client.sinter(self._friends_key(user1), self._friends_key(user2))

    def get_friend_suggestions(self, user_id: str, limit: int = 10) -> List[str]:
        """Suggest friends based on mutual connections."""
        friends = self.get_friends(user_id)
        suggestions: Dict[str, int] = {}

        for friend in friends:
            friend_of_friends = self.get_friends(friend)
            for fof in friend_of_friends:
                if fof != user_id and fof not in friends:
                    suggestions[fof] = suggestions.get(fof, 0) + 1

        sorted_suggestions = sorted(suggestions.items(), key=lambda x: x[1], reverse=True)
        return [user for user, _ in sorted_suggestions[:limit]]

    def are_friends(self, user1: str, user2: str) -> bool:
        """Check if two users are friends."""
        return client.sismember(self._friends_key(user1), user2)

    def get_friends_count(self, user_id: str) -> int:
        """Get friend count."""
        return client.scard(self._friends_key(user_id))


# =============================================================================
# Product Recommendations
# =============================================================================

class ProductRecommendations:
    def __init__(self):
        pass

    def _user_interests_key(self, user_id: str) -> str:
        return f"user:{user_id}:interests"

    def _user_purchases_key(self, user_id: str) -> str:
        return f"user:{user_id}:purchases"

    def _product_buyers_key(self, product_id: str) -> str:
        return f"product:{product_id}:buyers"

    def _category_products_key(self, category: str) -> str:
        return f"category:{category}:products"

    def add_interest(self, user_id: str, categories: List[str]) -> None:
        """Add user interests."""
        client.sadd(self._user_interests_key(user_id), *categories)

    def record_purchase(self, user_id: str, product_id: str) -> None:
        """Record a purchase."""
        pipe = client.pipeline()
        pipe.sadd(self._user_purchases_key(user_id), product_id)
        pipe.sadd(self._product_buyers_key(product_id), user_id)
        pipe.execute()

    def add_product_to_category(self, product_id: str, category: str) -> None:
        """Add product to category."""
        client.sadd(self._category_products_key(category), product_id)

    def get_products_by_interests(self, user_id: str) -> Set[str]:
        """Get products matching user interests."""
        interests = client.smembers(self._user_interests_key(user_id))
        if not interests:
            return set()

        keys = [self._category_products_key(cat) for cat in interests]
        return client.sunion(*keys)

    def get_also_bought(self, product_id: str, limit: int = 5) -> List[str]:
        """Get products also bought by buyers of this product."""
        buyers = client.smembers(self._product_buyers_key(product_id))
        product_counts: Dict[str, int] = {}

        for buyer in buyers:
            purchases = client.smembers(self._user_purchases_key(buyer))
            for p in purchases:
                if p != product_id:
                    product_counts[p] = product_counts.get(p, 0) + 1

        sorted_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)
        return [p for p, _ in sorted_products[:limit]]

    def get_recommendations(self, user_id: str, limit: int = 10) -> List[str]:
        """Get personalized recommendations."""
        # Products in user's interest categories
        interest_products = self.get_products_by_interests(user_id)

        # Products user already bought
        purchased = client.smembers(self._user_purchases_key(user_id))

        # Remove already purchased
        recommendations = interest_products - purchased

        return list(recommendations)[:limit]


# =============================================================================
# Usage Examples
# =============================================================================

# Tagging System
tags = TagSystem()
tags.add_tags("article", "123", ["python", "redis", "tutorial"])
tags.add_tags("article", "124", ["python", "django", "web"])
tags.add_tags("article", "125", ["redis", "caching", "performance"])

print("Tags for article 123:", tags.get_tags("article", "123"))
print("Articles with python tag:", tags.get_items_by_tag("article", "python"))
print("Articles with python AND redis:", tags.get_items_by_all_tags("article", ["python", "redis"]))
print("Related tags to python:", tags.get_related_tags("article", "python"))

# Unique Visitor Tracking
tracker = UniqueVisitorTracker()
today = datetime.now()
yesterday = today - timedelta(days=1)

tracker.track_visit("user1", today)
tracker.track_visit("user2", today)
tracker.track_visit("user1", today)  # Duplicate - won't increase count
tracker.track_visit("user3", yesterday)
tracker.track_visit("user1", yesterday)

print(f"Today's unique visitors: {tracker.get_daily_unique_count(today)}")
print(f"Returning visitors: {tracker.get_returning_visitors(yesterday, today)}")

# Social Graph
social = SocialGraph()
social.add_friend("alice", "bob")
social.add_friend("alice", "charlie")
social.add_friend("bob", "charlie")
social.add_friend("bob", "dave")

print("Alice's friends:", social.get_friends("alice"))
print("Mutual friends (alice, bob):", social.get_mutual_friends("alice", "bob"))
print("Friend suggestions for alice:", social.get_friend_suggestions("alice"))
print("Are alice and bob friends?", social.are_friends("alice", "bob"))

# Product Recommendations
recs = ProductRecommendations()
recs.add_interest("user1", ["electronics", "books"])
recs.add_product_to_category("laptop1", "electronics")
recs.add_product_to_category("phone1", "electronics")
recs.add_product_to_category("book1", "books")
recs.record_purchase("user1", "laptop1")
recs.record_purchase("user2", "laptop1")
recs.record_purchase("user2", "phone1")

print("Products by user1 interests:", recs.get_products_by_interests("user1"))
print("Also bought with laptop1:", recs.get_also_bought("laptop1"))
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Tagging System
// =============================================================================

class TagSystem {
  constructor(namespace = 'tags') {
    this.namespace = namespace;
  }

  _itemTagsKey(itemType, itemId) {
    return `${this.namespace}:${itemType}:${itemId}:tags`;
  }

  _tagItemsKey(itemType, tag) {
    return `${this.namespace}:${itemType}:tag:${tag}`;
  }

  async addTags(itemType, itemId, tags) {
    const pipeline = redis.pipeline();

    const itemKey = this._itemTagsKey(itemType, itemId);
    pipeline.sadd(itemKey, ...tags);

    for (const tag of tags) {
      const tagKey = this._tagItemsKey(itemType, tag);
      pipeline.sadd(tagKey, itemId);
    }

    await pipeline.exec();
  }

  async removeTags(itemType, itemId, tags) {
    const pipeline = redis.pipeline();

    const itemKey = this._itemTagsKey(itemType, itemId);
    pipeline.srem(itemKey, ...tags);

    for (const tag of tags) {
      const tagKey = this._tagItemsKey(itemType, tag);
      pipeline.srem(tagKey, itemId);
    }

    await pipeline.exec();
  }

  async getTags(itemType, itemId) {
    const key = this._itemTagsKey(itemType, itemId);
    return await redis.smembers(key);
  }

  async getItemsByTag(itemType, tag) {
    const key = this._tagItemsKey(itemType, tag);
    return await redis.smembers(key);
  }

  async getItemsByAllTags(itemType, tags) {
    const keys = tags.map((tag) => this._tagItemsKey(itemType, tag));
    return await redis.sinter(...keys);
  }

  async getItemsByAnyTag(itemType, tags) {
    const keys = tags.map((tag) => this._tagItemsKey(itemType, tag));
    return await redis.sunion(...keys);
  }
}

// =============================================================================
// Unique Visitor Tracking
// =============================================================================

class UniqueVisitorTracker {
  constructor(namespace = 'visitors') {
    this.namespace = namespace;
  }

  _dailyKey(date) {
    return `${this.namespace}:daily:${date.toISOString().split('T')[0]}`;
  }

  async trackVisit(visitorId, timestamp = new Date()) {
    await redis.sadd(this._dailyKey(timestamp), visitorId);
  }

  async getDailyUniqueCount(date) {
    return await redis.scard(this._dailyKey(date));
  }

  async getReturningVisitors(date1, date2) {
    return await redis.sinter(this._dailyKey(date1), this._dailyKey(date2));
  }

  async getNewVisitors(date, previousDate) {
    return await redis.sdiff(this._dailyKey(date), this._dailyKey(previousDate));
  }
}

// =============================================================================
// Social Graph
// =============================================================================

class SocialGraph {
  _friendsKey(userId) {
    return `user:${userId}:friends`;
  }

  _followersKey(userId) {
    return `user:${userId}:followers`;
  }

  _followingKey(userId) {
    return `user:${userId}:following`;
  }

  async addFriend(userId, friendId) {
    const pipeline = redis.pipeline();
    pipeline.sadd(this._friendsKey(userId), friendId);
    pipeline.sadd(this._friendsKey(friendId), userId);
    await pipeline.exec();
  }

  async removeFriend(userId, friendId) {
    const pipeline = redis.pipeline();
    pipeline.srem(this._friendsKey(userId), friendId);
    pipeline.srem(this._friendsKey(friendId), userId);
    await pipeline.exec();
  }

  async follow(userId, targetId) {
    const pipeline = redis.pipeline();
    pipeline.sadd(this._followingKey(userId), targetId);
    pipeline.sadd(this._followersKey(targetId), userId);
    await pipeline.exec();
  }

  async getFriends(userId) {
    return await redis.smembers(this._friendsKey(userId));
  }

  async getMutualFriends(user1, user2) {
    return await redis.sinter(this._friendsKey(user1), this._friendsKey(user2));
  }

  async areFriends(user1, user2) {
    return (await redis.sismember(this._friendsKey(user1), user2)) === 1;
  }

  async getFriendsCount(userId) {
    return await redis.scard(this._friendsKey(userId));
  }

  async getFriendSuggestions(userId, limit = 10) {
    const friends = await this.getFriends(userId);
    const suggestions = new Map();

    for (const friend of friends) {
      const friendOfFriends = await this.getFriends(friend);
      for (const fof of friendOfFriends) {
        if (fof !== userId && !friends.includes(fof)) {
          suggestions.set(fof, (suggestions.get(fof) || 0) + 1);
        }
      }
    }

    return [...suggestions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([user]) => user);
  }
}

// =============================================================================
// Online Users Tracking
// =============================================================================

class OnlineUsers {
  constructor(namespace = 'online') {
    this.namespace = namespace;
  }

  _key() {
    return `${this.namespace}:users`;
  }

  async setOnline(userId) {
    await redis.sadd(this._key(), userId);
  }

  async setOffline(userId) {
    await redis.srem(this._key(), userId);
  }

  async isOnline(userId) {
    return (await redis.sismember(this._key(), userId)) === 1;
  }

  async getOnlineCount() {
    return await redis.scard(this._key());
  }

  async getOnlineUsers() {
    return await redis.smembers(this._key());
  }

  async getOnlineFriends(userId, socialGraph) {
    const friends = await socialGraph.getFriends(userId);
    const online = await this.getOnlineUsers();
    return friends.filter((f) => online.includes(f));
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // Tagging System
  const tags = new TagSystem();
  await tags.addTags('article', '123', ['python', 'redis', 'tutorial']);
  await tags.addTags('article', '124', ['python', 'django', 'web']);

  console.log('Tags for article 123:', await tags.getTags('article', '123'));
  console.log('Articles with python:', await tags.getItemsByTag('article', 'python'));
  console.log(
    'Articles with python AND redis:',
    await tags.getItemsByAllTags('article', ['python', 'redis'])
  );

  // Unique Visitor Tracking
  const tracker = new UniqueVisitorTracker();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await tracker.trackVisit('user1', today);
  await tracker.trackVisit('user2', today);
  await tracker.trackVisit('user1', yesterday);

  console.log(`Today's unique visitors: ${await tracker.getDailyUniqueCount(today)}`);
  console.log('Returning visitors:', await tracker.getReturningVisitors(yesterday, today));

  // Social Graph
  const social = new SocialGraph();
  await social.addFriend('alice', 'bob');
  await social.addFriend('alice', 'charlie');
  await social.addFriend('bob', 'charlie');
  await social.addFriend('bob', 'dave');

  console.log("Alice's friends:", await social.getFriends('alice'));
  console.log('Mutual friends:', await social.getMutualFriends('alice', 'bob'));
  console.log('Friend suggestions:', await social.getFriendSuggestions('alice'));

  // Online Users
  const online = new OnlineUsers();
  await online.setOnline('alice');
  await online.setOnline('bob');

  console.log('Online count:', await online.getOnlineCount());
  console.log('Is alice online?', await online.isOnline('alice'));

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "fmt"
    "sort"
    "time"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Tagging System
// =============================================================================

type TagSystem struct {
    Namespace string
}

func NewTagSystem(namespace string) *TagSystem {
    return &TagSystem{Namespace: namespace}
}

func (t *TagSystem) itemTagsKey(itemType, itemID string) string {
    return fmt.Sprintf("%s:%s:%s:tags", t.Namespace, itemType, itemID)
}

func (t *TagSystem) tagItemsKey(itemType, tag string) string {
    return fmt.Sprintf("%s:%s:tag:%s", t.Namespace, itemType, tag)
}

func (t *TagSystem) AddTags(itemType, itemID string, tags []string) error {
    pipe := client.Pipeline()

    itemKey := t.itemTagsKey(itemType, itemID)
    pipe.SAdd(ctx, itemKey, stringsToInterfaces(tags)...)

    for _, tag := range tags {
        tagKey := t.tagItemsKey(itemType, tag)
        pipe.SAdd(ctx, tagKey, itemID)
    }

    _, err := pipe.Exec(ctx)
    return err
}

func (t *TagSystem) GetTags(itemType, itemID string) ([]string, error) {
    key := t.itemTagsKey(itemType, itemID)
    return client.SMembers(ctx, key).Result()
}

func (t *TagSystem) GetItemsByTag(itemType, tag string) ([]string, error) {
    key := t.tagItemsKey(itemType, tag)
    return client.SMembers(ctx, key).Result()
}

func (t *TagSystem) GetItemsByAllTags(itemType string, tags []string) ([]string, error) {
    keys := make([]string, len(tags))
    for i, tag := range tags {
        keys[i] = t.tagItemsKey(itemType, tag)
    }
    return client.SInter(ctx, keys...).Result()
}

// =============================================================================
// Social Graph
// =============================================================================

type SocialGraph struct{}

func NewSocialGraph() *SocialGraph {
    return &SocialGraph{}
}

func (s *SocialGraph) friendsKey(userID string) string {
    return fmt.Sprintf("user:%s:friends", userID)
}

func (s *SocialGraph) AddFriend(userID, friendID string) error {
    pipe := client.Pipeline()
    pipe.SAdd(ctx, s.friendsKey(userID), friendID)
    pipe.SAdd(ctx, s.friendsKey(friendID), userID)
    _, err := pipe.Exec(ctx)
    return err
}

func (s *SocialGraph) GetFriends(userID string) ([]string, error) {
    return client.SMembers(ctx, s.friendsKey(userID)).Result()
}

func (s *SocialGraph) GetMutualFriends(user1, user2 string) ([]string, error) {
    return client.SInter(ctx, s.friendsKey(user1), s.friendsKey(user2)).Result()
}

func (s *SocialGraph) AreFriends(user1, user2 string) (bool, error) {
    return client.SIsMember(ctx, s.friendsKey(user1), user2).Result()
}

func (s *SocialGraph) GetFriendSuggestions(userID string, limit int) ([]string, error) {
    friends, err := s.GetFriends(userID)
    if err != nil {
        return nil, err
    }

    friendSet := make(map[string]bool)
    for _, f := range friends {
        friendSet[f] = true
    }

    suggestions := make(map[string]int)
    for _, friend := range friends {
        fof, err := s.GetFriends(friend)
        if err != nil {
            continue
        }
        for _, f := range fof {
            if f != userID && !friendSet[f] {
                suggestions[f]++
            }
        }
    }

    // Sort by count
    type kv struct {
        Key   string
        Value int
    }
    var sorted []kv
    for k, v := range suggestions {
        sorted = append(sorted, kv{k, v})
    }
    sort.Slice(sorted, func(i, j int) bool {
        return sorted[i].Value > sorted[j].Value
    })

    result := make([]string, 0, limit)
    for i := 0; i < len(sorted) && i < limit; i++ {
        result = append(result, sorted[i].Key)
    }
    return result, nil
}

// =============================================================================
// Unique Visitor Tracking
// =============================================================================

type UniqueVisitorTracker struct {
    Namespace string
}

func NewUniqueVisitorTracker(namespace string) *UniqueVisitorTracker {
    return &UniqueVisitorTracker{Namespace: namespace}
}

func (t *UniqueVisitorTracker) dailyKey(date time.Time) string {
    return fmt.Sprintf("%s:daily:%s", t.Namespace, date.Format("2006-01-02"))
}

func (t *UniqueVisitorTracker) TrackVisit(visitorID string, timestamp time.Time) error {
    return client.SAdd(ctx, t.dailyKey(timestamp), visitorID).Err()
}

func (t *UniqueVisitorTracker) GetDailyUniqueCount(date time.Time) (int64, error) {
    return client.SCard(ctx, t.dailyKey(date)).Result()
}

func (t *UniqueVisitorTracker) GetReturningVisitors(date1, date2 time.Time) ([]string, error) {
    return client.SInter(ctx, t.dailyKey(date1), t.dailyKey(date2)).Result()
}

// Helper function
func stringsToInterfaces(strs []string) []interface{} {
    result := make([]interface{}, len(strs))
    for i, s := range strs {
        result[i] = s
    }
    return result
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // Tagging System
    tags := NewTagSystem("tags")
    tags.AddTags("article", "123", []string{"python", "redis", "tutorial"})
    tags.AddTags("article", "124", []string{"python", "django", "web"})

    articleTags, _ := tags.GetTags("article", "123")
    fmt.Println("Tags for article 123:", articleTags)

    pythonArticles, _ := tags.GetItemsByTag("article", "python")
    fmt.Println("Articles with python:", pythonArticles)

    // Social Graph
    social := NewSocialGraph()
    social.AddFriend("alice", "bob")
    social.AddFriend("alice", "charlie")
    social.AddFriend("bob", "charlie")
    social.AddFriend("bob", "dave")

    friends, _ := social.GetFriends("alice")
    fmt.Println("Alice's friends:", friends)

    mutual, _ := social.GetMutualFriends("alice", "bob")
    fmt.Println("Mutual friends:", mutual)

    suggestions, _ := social.GetFriendSuggestions("alice", 5)
    fmt.Println("Friend suggestions:", suggestions)

    // Unique Visitor Tracking
    tracker := NewUniqueVisitorTracker("visitors")
    today := time.Now()
    yesterday := today.AddDate(0, 0, -1)

    tracker.TrackVisit("user1", today)
    tracker.TrackVisit("user2", today)
    tracker.TrackVisit("user1", yesterday)

    count, _ := tracker.GetDailyUniqueCount(today)
    fmt.Printf("Today's unique visitors: %d\n", count)

    returning, _ := tracker.GetReturningVisitors(yesterday, today)
    fmt.Println("Returning visitors:", returning)
}
```

## Best Practices

1. **Use SINTER for filtering** - More efficient than fetching all and filtering in app
2. **Avoid SMEMBERS on large sets** - Use SSCAN for iteration
3. **Consider memory** - Sets with many small values use listpack encoding
4. **Use pipelines** - Batch operations for better performance
5. **Set appropriate TTL** - For temporary sets like daily visitors

## Conclusion

Redis Sets provide powerful primitives for managing unique collections and implementing features like tagging, social graphs, and visitor tracking. Key takeaways:

- Use sets for unique collections where order doesn't matter
- Leverage set operations (SINTER, SUNION, SDIFF) for filtering
- Combine sets with pipelines for efficient batch operations
- Use SSCAN for iterating large sets
- Consider HyperLogLog for cardinality when exact members aren't needed

Redis Sets' O(1) membership checks and efficient set operations make them ideal for tags, relationships, and deduplication use cases.
