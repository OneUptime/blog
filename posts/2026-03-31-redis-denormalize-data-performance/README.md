# How to Denormalize Data for Redis Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Denormalization, Data Modeling, Performance, Caching

Description: Improve Redis read performance by denormalizing data - storing precomputed, query-ready copies instead of normalized relational structures.

---

Redis is optimized for reads, not joins. If you model your data in a normalized relational style, you will end up making multiple round trips to assemble a result. Denormalization - duplicating data into query-ready shapes - trades storage for speed and is the right approach for Redis.

## Why Normalization Hurts Redis

In a relational database you might store:
- `users` table
- `orders` table with a `user_id` foreign key

In Redis, that would require separate HGET calls and client-side joining. Instead, embed the user info you need directly in the order:

```bash
# Normalized - requires two lookups
HGET user:1001 name
HGET order:5001 amount

# Denormalized - single lookup
HGETALL order:5001
# Returns: user_id, user_name, amount, status
```

## Example: Order with Embedded User Data

When creating an order, copy the relevant user fields into the order Hash:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def create_order(order_id: str, user_id: str, amount: float):
    user = r.hgetall(f"user:{user_id}")
    order_key = f"order:{order_id}"
    r.hset(order_key, mapping={
        "order_id": order_id,
        "user_id": user_id,
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "amount": amount,
        "status": "pending",
    })
    r.expire(order_key, 86400 * 30)
```

Now a single `HGETALL order:5001` returns everything needed to display the order.

## Precomputed Sorted Sets for Leaderboards

Instead of computing rankings at query time, maintain a sorted set as data changes:

```bash
# Update score on every point event
ZADD leaderboard:global 150 user:1001
ZADD leaderboard:global 200 user:1002

# Read top 10 instantly
ZRANGE leaderboard:global 0 9 REV WITHSCORES
```

## Fan-Out on Write for Feeds

For activity feeds, denormalize by writing to each follower's timeline on post creation:

```python
def publish_post(author_id: str, post_id: str, content: str):
    # Store the post
    r.hset(f"post:{post_id}", mapping={
        "author_id": author_id,
        "content": content,
        "created_at": "2024-03-01T10:00:00Z"
    })
    # Fan-out to followers
    followers = r.smembers(f"user:{author_id}:followers")
    pipe = r.pipeline(transaction=False)
    for follower_id in followers:
        pipe.lpush(f"feed:{follower_id}", post_id)
        pipe.ltrim(f"feed:{follower_id}", 0, 499)  # Keep last 500
    pipe.execute()
```

## Managing Stale Denormalized Data

The trade-off with denormalization is consistency. When source data changes, you must update copies:

```python
def update_user_name(user_id: str, new_name: str):
    # Update canonical record
    r.hset(f"user:{user_id}", "name", new_name)

    # Update denormalized copies in recent orders
    order_ids = r.smembers(f"user:{user_id}:orders")
    pipe = r.pipeline(transaction=False)
    for order_id in order_ids:
        pipe.hset(f"order:{order_id}", "user_name", new_name)
    pipe.execute()
```

For high-cardinality denormalized copies, consider using short TTLs and accepting eventual staleness rather than synchronous fan-out updates.

## When Not to Denormalize

Denormalization increases write complexity. Avoid it when:
- Data changes very frequently and the write fan-out cost exceeds the read gain.
- The source data is only needed in a few edge-case queries.
- You have an existing cache layer (like CDN) handling the read load.

## Summary

Denormalization is the standard Redis data modeling pattern - embed the fields you need for each query directly in the key where the query lands. Use fan-out writes for activity feeds, precomputed sorted sets for rankings, and embedded Hashes for entity relationships. Track denormalized copies and update them on source changes, or use short TTLs to accept controlled staleness.
