# How to Build a Product Recommendation Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Recommendations, Caching, Machine Learning, Personalization

Description: A comprehensive guide to building a product recommendation cache with Redis for collaborative filtering results, personalized suggestions, and real-time recommendation serving.

---

Product recommendations drive significant revenue in e-commerce - typically 10-30% of sales come from recommendations. While ML models generate recommendations, serving them requires a fast, scalable cache layer. Redis excels at this with its rich data structures and sub-millisecond latency.

## Understanding Recommendation Caching

Recommendation systems typically generate:

- **User-based recommendations**: Products recommended for specific users
- **Item-based recommendations**: Similar products to a given product
- **Trending/popular items**: Global or category-specific trends
- **Recently viewed**: User's browsing history
- **Frequently bought together**: Association rules

## Basic Recommendation Cache

### Python Implementation

```python
import redis
import json
import time
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class RecommendationCache:
    def __init__(self, prefix='recommendations', default_ttl=3600):
        self.prefix = prefix
        self.default_ttl = default_ttl

    # User-based recommendations
    def cache_user_recommendations(self, user_id, recommendations, ttl=None):
        """
        Cache personalized recommendations for a user.

        recommendations: list of {product_id, score, reason}
        """
        key = f"{self.prefix}:user:{user_id}"
        ttl = ttl or self.default_ttl

        # Store as sorted set for score-based retrieval
        pipe = r.pipeline()
        pipe.delete(key)

        for rec in recommendations:
            # Store product_id with score
            member = json.dumps({
                'product_id': rec['product_id'],
                'reason': rec.get('reason', 'recommended'),
                'cached_at': int(time.time())
            })
            pipe.zadd(key, {member: rec['score']})

        pipe.expire(key, ttl)
        pipe.execute()

    def get_user_recommendations(self, user_id, limit=10, offset=0):
        """Get cached recommendations for a user."""
        key = f"{self.prefix}:user:{user_id}"

        # Get top recommendations by score (descending)
        results = r.zrevrange(key, offset, offset + limit - 1, withscores=True)

        recommendations = []
        for member, score in results:
            data = json.loads(member)
            data['score'] = score
            recommendations.append(data)

        return recommendations

    # Item-based recommendations (similar products)
    def cache_similar_products(self, product_id, similar_products, ttl=None):
        """Cache products similar to a given product."""
        key = f"{self.prefix}:similar:{product_id}"
        ttl = ttl or self.default_ttl * 24  # Longer TTL for item similarities

        pipe = r.pipeline()
        pipe.delete(key)

        for product in similar_products:
            member = json.dumps({
                'product_id': product['product_id'],
                'similarity_type': product.get('type', 'content'),
            })
            pipe.zadd(key, {member: product['similarity_score']})

        pipe.expire(key, ttl)
        pipe.execute()

    def get_similar_products(self, product_id, limit=10):
        """Get products similar to a given product."""
        key = f"{self.prefix}:similar:{product_id}"
        results = r.zrevrange(key, 0, limit - 1, withscores=True)

        return [
            {**json.loads(member), 'similarity_score': score}
            for member, score in results
        ]

    # Frequently bought together
    def cache_bought_together(self, product_id, products, ttl=None):
        """Cache frequently bought together products."""
        key = f"{self.prefix}:bought_together:{product_id}"
        ttl = ttl or self.default_ttl * 24

        pipe = r.pipeline()
        pipe.delete(key)

        for product in products:
            pipe.zadd(key, {product['product_id']: product['frequency']})

        pipe.expire(key, ttl)
        pipe.execute()

    def get_bought_together(self, product_id, limit=5):
        """Get frequently bought together products."""
        key = f"{self.prefix}:bought_together:{product_id}"
        results = r.zrevrange(key, 0, limit - 1, withscores=True)

        return [
            {'product_id': product_id, 'frequency': int(score)}
            for product_id, score in results
        ]

    # Category recommendations
    def cache_category_recommendations(self, category_id, products, ttl=None):
        """Cache top products in a category."""
        key = f"{self.prefix}:category:{category_id}"
        ttl = ttl or self.default_ttl

        pipe = r.pipeline()
        pipe.delete(key)

        for product in products:
            pipe.zadd(key, {product['product_id']: product['score']})

        pipe.expire(key, ttl)
        pipe.execute()

    def get_category_recommendations(self, category_id, limit=20):
        """Get top products in a category."""
        key = f"{self.prefix}:category:{category_id}"
        results = r.zrevrange(key, 0, limit - 1, withscores=True)

        return [
            {'product_id': pid, 'score': score}
            for pid, score in results
        ]

# Usage
cache = RecommendationCache()

# Cache user recommendations (from ML model)
user_recs = [
    {'product_id': 'prod_001', 'score': 0.95, 'reason': 'based on purchase history'},
    {'product_id': 'prod_002', 'score': 0.87, 'reason': 'similar users bought'},
    {'product_id': 'prod_003', 'score': 0.82, 'reason': 'trending in your category'},
]
cache.cache_user_recommendations('user_123', user_recs)

# Get recommendations
recs = cache.get_user_recommendations('user_123', limit=5)
print(f"User recommendations: {recs}")

# Cache similar products
similar = [
    {'product_id': 'prod_010', 'similarity_score': 0.92, 'type': 'content'},
    {'product_id': 'prod_011', 'similarity_score': 0.88, 'type': 'collaborative'},
]
cache.cache_similar_products('prod_001', similar)

# Get similar products
similar_prods = cache.get_similar_products('prod_001')
print(f"Similar products: {similar_prods}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class RecommendationCache {
  constructor(prefix = 'recommendations', defaultTTL = 3600) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  async cacheUserRecommendations(userId, recommendations, ttl = null) {
    const key = `${this.prefix}:user:${userId}`;
    const expiry = ttl || this.defaultTTL;

    const pipeline = redis.pipeline();
    pipeline.del(key);

    for (const rec of recommendations) {
      const member = JSON.stringify({
        product_id: rec.product_id,
        reason: rec.reason || 'recommended',
        cached_at: Math.floor(Date.now() / 1000)
      });
      pipeline.zadd(key, rec.score, member);
    }

    pipeline.expire(key, expiry);
    await pipeline.exec();
  }

  async getUserRecommendations(userId, limit = 10, offset = 0) {
    const key = `${this.prefix}:user:${userId}`;
    const results = await redis.zrevrange(
      key, offset, offset + limit - 1, 'WITHSCORES'
    );

    const recommendations = [];
    for (let i = 0; i < results.length; i += 2) {
      const data = JSON.parse(results[i]);
      data.score = parseFloat(results[i + 1]);
      recommendations.push(data);
    }

    return recommendations;
  }

  async cacheSimilarProducts(productId, similarProducts, ttl = null) {
    const key = `${this.prefix}:similar:${productId}`;
    const expiry = ttl || this.defaultTTL * 24;

    const pipeline = redis.pipeline();
    pipeline.del(key);

    for (const product of similarProducts) {
      const member = JSON.stringify({
        product_id: product.product_id,
        similarity_type: product.type || 'content'
      });
      pipeline.zadd(key, product.similarity_score, member);
    }

    pipeline.expire(key, expiry);
    await pipeline.exec();
  }

  async getSimilarProducts(productId, limit = 10) {
    const key = `${this.prefix}:similar:${productId}`;
    const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    const products = [];
    for (let i = 0; i < results.length; i += 2) {
      const data = JSON.parse(results[i]);
      data.similarity_score = parseFloat(results[i + 1]);
      products.push(data);
    }

    return products;
  }
}

// Usage
async function example() {
  const cache = new RecommendationCache();

  await cache.cacheUserRecommendations('user_123', [
    { product_id: 'prod_001', score: 0.95, reason: 'purchase history' },
    { product_id: 'prod_002', score: 0.87, reason: 'similar users' }
  ]);

  const recs = await cache.getUserRecommendations('user_123');
  console.log('Recommendations:', recs);
}

example().catch(console.error);
```

## Real-Time Trending Products

```python
class TrendingProductsCache:
    def __init__(self, prefix='trending'):
        self.prefix = prefix

    def record_view(self, product_id, category_id=None):
        """Record a product view for trending calculation."""
        now = int(time.time())
        hour_bucket = now // 3600
        day_bucket = now // 86400

        pipe = r.pipeline()

        # Hourly trending
        hourly_key = f"{self.prefix}:hourly:{hour_bucket}"
        pipe.zincrby(hourly_key, 1, product_id)
        pipe.expire(hourly_key, 7200)  # Keep 2 hours

        # Daily trending
        daily_key = f"{self.prefix}:daily:{day_bucket}"
        pipe.zincrby(daily_key, 1, product_id)
        pipe.expire(daily_key, 172800)  # Keep 2 days

        # Category trending (if provided)
        if category_id:
            cat_hourly = f"{self.prefix}:category:{category_id}:hourly:{hour_bucket}"
            pipe.zincrby(cat_hourly, 1, product_id)
            pipe.expire(cat_hourly, 7200)

        pipe.execute()

    def record_purchase(self, product_id, category_id=None):
        """Record a purchase (weighted higher than views)."""
        now = int(time.time())
        hour_bucket = now // 3600

        pipe = r.pipeline()

        # Purchases count more than views
        hourly_key = f"{self.prefix}:hourly:{hour_bucket}"
        pipe.zincrby(hourly_key, 10, product_id)

        if category_id:
            cat_key = f"{self.prefix}:category:{category_id}:hourly:{hour_bucket}"
            pipe.zincrby(cat_key, 10, product_id)

        pipe.execute()

    def get_trending(self, hours=1, limit=20, category_id=None):
        """Get trending products over the last N hours."""
        now = int(time.time())
        current_hour = now // 3600

        # Collect keys for the time range
        if category_id:
            keys = [
                f"{self.prefix}:category:{category_id}:hourly:{current_hour - i}"
                for i in range(hours)
            ]
        else:
            keys = [
                f"{self.prefix}:hourly:{current_hour - i}"
                for i in range(hours)
            ]

        # Union the hourly buckets with time decay
        temp_key = f"{self.prefix}:temp:{int(time.time())}"

        if len(keys) == 1:
            results = r.zrevrange(keys[0], 0, limit - 1, withscores=True)
        else:
            # Weight recent hours more heavily
            weights = [1.0 / (i + 1) for i in range(len(keys))]
            r.zunionstore(temp_key, dict(zip(keys, weights)))
            results = r.zrevrange(temp_key, 0, limit - 1, withscores=True)
            r.delete(temp_key)

        return [
            {'product_id': pid, 'trending_score': score}
            for pid, score in results
        ]

    def get_trending_by_category(self, category_ids, hours=1, limit=10):
        """Get trending products for multiple categories."""
        results = {}

        for cat_id in category_ids:
            results[cat_id] = self.get_trending(hours, limit, cat_id)

        return results

# Usage
trending = TrendingProductsCache()

# Record activity
for i in range(100):
    trending.record_view(f'prod_{i % 10:03d}', category_id='electronics')

trending.record_purchase('prod_003', category_id='electronics')
trending.record_purchase('prod_003', category_id='electronics')

# Get trending
hot_products = trending.get_trending(hours=1, limit=10)
print(f"Trending products: {hot_products}")

# Get by category
cat_trending = trending.get_trending(hours=1, limit=5, category_id='electronics')
print(f"Trending in electronics: {cat_trending}")
```

## Recently Viewed Products

```python
class RecentlyViewedCache:
    def __init__(self, prefix='recently_viewed', max_items=50):
        self.prefix = prefix
        self.max_items = max_items

    def add_view(self, user_id, product_id, metadata=None):
        """Add a product to user's recently viewed list."""
        key = f"{self.prefix}:{user_id}"
        timestamp = time.time()

        # Store with timestamp as score
        member = json.dumps({
            'product_id': product_id,
            'metadata': metadata or {}
        })

        pipe = r.pipeline()

        # Remove old entry for this product (if exists)
        # This ensures the product moves to the front
        pipe.zrem(key, member)

        # Add with current timestamp
        pipe.zadd(key, {member: timestamp})

        # Trim to max items
        pipe.zremrangebyrank(key, 0, -self.max_items - 1)

        # Set TTL
        pipe.expire(key, 86400 * 30)  # 30 days

        pipe.execute()

    def get_recently_viewed(self, user_id, limit=10, exclude_product=None):
        """Get user's recently viewed products."""
        key = f"{self.prefix}:{user_id}"

        # Get more than needed in case we need to exclude
        fetch_limit = limit + 1 if exclude_product else limit
        results = r.zrevrange(key, 0, fetch_limit - 1, withscores=True)

        products = []
        for member, score in results:
            data = json.loads(member)
            if exclude_product and data['product_id'] == exclude_product:
                continue
            data['viewed_at'] = int(score)
            products.append(data)
            if len(products) >= limit:
                break

        return products

    def clear_history(self, user_id):
        """Clear user's viewing history."""
        key = f"{self.prefix}:{user_id}"
        r.delete(key)

    def get_cross_user_popular(self, product_ids, limit=10):
        """
        Find products that users who viewed these products also viewed.
        Useful for "customers also viewed" recommendations.
        """
        # This would typically query across user histories
        # Simplified implementation
        pass

# Usage
recently_viewed = RecentlyViewedCache()

# User browses products
recently_viewed.add_view('user_123', 'prod_001', {'category': 'electronics'})
recently_viewed.add_view('user_123', 'prod_002', {'category': 'electronics'})
recently_viewed.add_view('user_123', 'prod_003', {'category': 'clothing'})
recently_viewed.add_view('user_123', 'prod_001')  # View again - moves to front

# Get history
history = recently_viewed.get_recently_viewed('user_123', limit=10)
print(f"Recently viewed: {history}")

# Get excluding current product (for "you also viewed" on product page)
others = recently_viewed.get_recently_viewed('user_123', limit=5, exclude_product='prod_001')
print(f"Also viewed: {others}")
```

## Personalized Recommendations with Fallbacks

```python
class PersonalizedRecommendationService:
    def __init__(self):
        self.user_cache = RecommendationCache()
        self.trending = TrendingProductsCache()
        self.recently_viewed = RecentlyViewedCache()

    def get_homepage_recommendations(self, user_id, limit=20):
        """
        Get personalized homepage recommendations with fallbacks.
        """
        recommendations = []

        # 1. Try personalized recommendations
        personalized = self.user_cache.get_user_recommendations(user_id, limit=limit)
        if personalized:
            for rec in personalized:
                rec['source'] = 'personalized'
            recommendations.extend(personalized)

        # 2. If not enough, add from recently viewed similar products
        if len(recommendations) < limit:
            recent = self.recently_viewed.get_recently_viewed(user_id, limit=3)
            for item in recent:
                similar = self.user_cache.get_similar_products(
                    item['product_id'],
                    limit=5
                )
                for s in similar:
                    s['source'] = 'similar_to_viewed'
                recommendations.extend(similar)

        # 3. Fill remaining with trending
        if len(recommendations) < limit:
            needed = limit - len(recommendations)
            trending = self.trending.get_trending(hours=24, limit=needed)
            for t in trending:
                t['source'] = 'trending'
            recommendations.extend(trending)

        # Deduplicate while preserving order
        seen = set()
        unique_recs = []
        for rec in recommendations:
            pid = rec.get('product_id')
            if pid not in seen:
                seen.add(pid)
                unique_recs.append(rec)
                if len(unique_recs) >= limit:
                    break

        return unique_recs

    def get_product_page_recommendations(self, user_id, product_id, category_id=None):
        """Get recommendations for a product detail page."""
        result = {
            'similar_products': [],
            'bought_together': [],
            'you_may_also_like': []
        }

        # Similar products
        result['similar_products'] = self.user_cache.get_similar_products(
            product_id, limit=8
        )

        # Frequently bought together
        result['bought_together'] = self.user_cache.get_bought_together(
            product_id, limit=4
        )

        # Personalized "you may also like"
        personalized = self.user_cache.get_user_recommendations(user_id, limit=8)
        # Filter out current product and similar products
        similar_ids = {p['product_id'] for p in result['similar_products']}
        result['you_may_also_like'] = [
            p for p in personalized
            if p['product_id'] != product_id and p['product_id'] not in similar_ids
        ][:6]

        return result

# Usage
service = PersonalizedRecommendationService()

# Get homepage recommendations
homepage_recs = service.get_homepage_recommendations('user_123', limit=20)
print(f"Homepage recommendations: {len(homepage_recs)} items")

# Get product page recommendations
product_recs = service.get_product_page_recommendations(
    'user_123',
    'prod_001',
    category_id='electronics'
)
print(f"Product page recommendations: {product_recs}")
```

## Best Practices

### 1. Use Appropriate TTLs

```python
# User recommendations - refresh frequently
user_rec_ttl = 3600  # 1 hour

# Similar products - more stable
similar_ttl = 86400 * 7  # 1 week

# Trending - very short
trending_ttl = 900  # 15 minutes
```

### 2. Implement Cache Warming

```python
def warm_recommendation_cache(user_ids, recommendation_model):
    """Pre-warm cache for active users."""
    for user_id in user_ids:
        try:
            recs = recommendation_model.generate(user_id)
            cache.cache_user_recommendations(user_id, recs)
        except Exception as e:
            print(f"Failed to warm cache for {user_id}: {e}")
```

### 3. Monitor Cache Performance

```python
def get_cache_stats():
    """Get recommendation cache statistics."""
    info = r.info('stats')

    return {
        'hit_rate': calculate_hit_rate(),
        'memory_used': r.info('memory')['used_memory_human'],
        'keys_count': r.dbsize()
    }
```

## Conclusion

Building a product recommendation cache with Redis enables fast, personalized experiences for e-commerce users. Key takeaways:

- Use sorted sets for score-based recommendation storage
- Implement multiple recommendation types (personal, similar, trending)
- Build fallback chains for new users
- Track real-time trending with time-bucketed counters
- Set appropriate TTLs for different recommendation types
- Pre-warm caches for active users

Redis's sorted sets and fast operations make it ideal for serving recommendations at scale, ensuring your users get personalized suggestions with minimal latency.
