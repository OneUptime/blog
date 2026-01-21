# How to Use Redis for Social Media Feeds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Social Media, Feeds, Timeline, Fan-Out, Sorted Sets, Performance

Description: A comprehensive guide to building social media feeds and timelines with Redis, covering fan-out patterns, timeline generation, infinite scroll pagination, and production scaling strategies.

---

Social media feeds are one of the most challenging features to implement at scale. Every time a user posts content, potentially millions of followers need to see that update in their personalized timelines. Redis provides the speed and data structures necessary to build real-time social feeds that can handle massive scale.

In this guide, we will explore different approaches to building social media feeds with Redis, including fan-out strategies, timeline management, and production considerations.

## Why Redis for Social Feeds?

Redis excels at social feed implementations due to:

- **Sorted Sets**: Perfect for time-ordered feeds with O(log N) insertions
- **Lists**: Efficient for simple chronological feeds
- **Sub-millisecond Reads**: Essential for responsive user experience
- **Pub/Sub**: Real-time notifications for new content
- **Pipelining**: Batch operations for efficient fan-out

## Understanding Feed Architecture

There are two primary approaches to building social feeds:

1. **Pull Model (Fan-out on Read)**: Generate the feed when requested by querying followed users' posts
2. **Push Model (Fan-out on Write)**: Pre-compute feeds by pushing posts to followers' timelines when created

Most production systems use a hybrid approach, which we will explore in detail.

## Basic Feed Implementation

### Data Model

```python
import redis
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class Post:
    def __init__(self, post_id: str, user_id: str, content: str,
                 media_urls: List[str] = None, created_at: datetime = None):
        self.post_id = post_id
        self.user_id = user_id
        self.content = content
        self.media_urls = media_urls or []
        self.created_at = created_at or datetime.now()

    def to_dict(self) -> dict:
        return {
            "post_id": self.post_id,
            "user_id": self.user_id,
            "content": self.content,
            "media_urls": json.dumps(self.media_urls),
            "created_at": self.created_at.isoformat(),
            "likes_count": 0,
            "comments_count": 0,
            "shares_count": 0
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Post':
        return cls(
            post_id=data["post_id"],
            user_id=data["user_id"],
            content=data["content"],
            media_urls=json.loads(data.get("media_urls", "[]")),
            created_at=datetime.fromisoformat(data["created_at"])
        )


class SocialFeedManager:
    # Configuration
    MAX_FEED_SIZE = 1000  # Maximum posts in a user's feed
    POSTS_PER_PAGE = 20

    def follow_user(self, follower_id: str, followee_id: str) -> bool:
        """Create a follow relationship."""
        pipe = r.pipeline()

        # Add to follower's following set
        pipe.sadd(f"user:{follower_id}:following", followee_id)

        # Add to followee's followers set
        pipe.sadd(f"user:{followee_id}:followers", follower_id)

        # Update counts
        pipe.hincrby(f"user:{follower_id}:stats", "following_count", 1)
        pipe.hincrby(f"user:{followee_id}:stats", "followers_count", 1)

        results = pipe.execute()
        return results[0] == 1  # Returns 1 if newly added

    def unfollow_user(self, follower_id: str, followee_id: str) -> bool:
        """Remove a follow relationship."""
        pipe = r.pipeline()

        pipe.srem(f"user:{follower_id}:following", followee_id)
        pipe.srem(f"user:{followee_id}:followers", follower_id)
        pipe.hincrby(f"user:{follower_id}:stats", "following_count", -1)
        pipe.hincrby(f"user:{followee_id}:stats", "followers_count", -1)

        results = pipe.execute()
        return results[0] == 1

    def get_followers(self, user_id: str) -> Set[str]:
        """Get all followers of a user."""
        return r.smembers(f"user:{user_id}:followers")

    def get_following(self, user_id: str) -> Set[str]:
        """Get all users that a user follows."""
        return r.smembers(f"user:{user_id}:following")

    def get_follower_count(self, user_id: str) -> int:
        """Get the number of followers."""
        return r.scard(f"user:{user_id}:followers")

    def create_post(self, user_id: str, content: str,
                    media_urls: List[str] = None) -> Post:
        """Create a new post."""
        post_id = str(uuid.uuid4())
        post = Post(
            post_id=post_id,
            user_id=user_id,
            content=content,
            media_urls=media_urls
        )

        # Store post data
        r.hset(f"post:{post_id}", mapping=post.to_dict())

        # Add to user's posts timeline
        timestamp = post.created_at.timestamp()
        r.zadd(f"user:{user_id}:posts", {post_id: timestamp})

        # Fan out to followers (discussed in detail below)
        self._fan_out_post(post)

        return post

    def get_post(self, post_id: str) -> Optional[Post]:
        """Get a single post by ID."""
        post_data = r.hgetall(f"post:{post_id}")
        if not post_data:
            return None
        return Post.from_dict(post_data)

    def delete_post(self, post_id: str, user_id: str) -> bool:
        """Delete a post."""
        post = self.get_post(post_id)
        if not post or post.user_id != user_id:
            return False

        pipe = r.pipeline()

        # Remove post data
        pipe.delete(f"post:{post_id}")

        # Remove from user's posts
        pipe.zrem(f"user:{user_id}:posts", post_id)

        # Remove from followers' feeds
        followers = self.get_followers(user_id)
        for follower_id in followers:
            pipe.zrem(f"feed:{follower_id}", post_id)

        pipe.execute()
        return True

    def _fan_out_post(self, post: Post) -> None:
        """Fan out post to all followers' feeds."""
        followers = self.get_followers(post.user_id)
        timestamp = post.created_at.timestamp()

        if not followers:
            return

        # Use pipelining for efficiency
        pipe = r.pipeline()

        for follower_id in followers:
            # Add to follower's feed
            pipe.zadd(f"feed:{follower_id}", {post.post_id: timestamp})
            # Trim feed to max size
            pipe.zremrangebyrank(f"feed:{follower_id}", 0, -(self.MAX_FEED_SIZE + 1))

        # Also add to author's own feed
        pipe.zadd(f"feed:{post.user_id}", {post.post_id: timestamp})
        pipe.zremrangebyrank(f"feed:{post.user_id}", 0, -(self.MAX_FEED_SIZE + 1))

        pipe.execute()

    def get_feed(self, user_id: str, page: int = 1,
                 limit: int = None) -> List[Dict]:
        """Get a user's feed with pagination."""
        if limit is None:
            limit = self.POSTS_PER_PAGE

        start = (page - 1) * limit
        end = start + limit - 1

        # Get post IDs from feed sorted set
        post_ids = r.zrevrange(f"feed:{user_id}", start, end)

        if not post_ids:
            return []

        # Fetch post data in batch
        pipe = r.pipeline()
        for post_id in post_ids:
            pipe.hgetall(f"post:{post_id}")

        posts_data = pipe.execute()

        # Combine and return
        posts = []
        for post_id, post_data in zip(post_ids, posts_data):
            if post_data:
                post_data["post_id"] = post_id
                posts.append(post_data)

        return posts

    def get_feed_cursor(self, user_id: str, cursor: float = None,
                        limit: int = None) -> Dict:
        """Get feed using cursor-based pagination (for infinite scroll)."""
        if limit is None:
            limit = self.POSTS_PER_PAGE

        if cursor is None:
            cursor = datetime.now().timestamp() + 1  # Start from now

        # Get posts older than cursor
        post_ids_with_scores = r.zrevrangebyscore(
            f"feed:{user_id}",
            cursor,
            "-inf",
            start=0,
            num=limit + 1,  # Get one extra to check if there are more
            withscores=True
        )

        has_more = len(post_ids_with_scores) > limit
        if has_more:
            post_ids_with_scores = post_ids_with_scores[:limit]

        if not post_ids_with_scores:
            return {"posts": [], "next_cursor": None, "has_more": False}

        # Fetch post data
        post_ids = [pid for pid, _ in post_ids_with_scores]
        pipe = r.pipeline()
        for post_id in post_ids:
            pipe.hgetall(f"post:{post_id}")

        posts_data = pipe.execute()

        posts = []
        for (post_id, score), post_data in zip(post_ids_with_scores, posts_data):
            if post_data:
                post_data["post_id"] = post_id
                post_data["score"] = score
                posts.append(post_data)

        next_cursor = post_ids_with_scores[-1][1] if post_ids_with_scores else None

        return {
            "posts": posts,
            "next_cursor": next_cursor,
            "has_more": has_more
        }


# Usage
feed_manager = SocialFeedManager()

# Create follow relationships
feed_manager.follow_user("user_alice", "user_bob")
feed_manager.follow_user("user_alice", "user_charlie")
feed_manager.follow_user("user_bob", "user_charlie")

# Create posts
post1 = feed_manager.create_post(
    "user_bob",
    "Hello from Bob!",
    media_urls=["https://example.com/image1.jpg"]
)

post2 = feed_manager.create_post(
    "user_charlie",
    "Charlie here with an update!"
)

# Get Alice's feed (should see posts from Bob and Charlie)
feed = feed_manager.get_feed("user_alice")
print(f"Alice's feed: {len(feed)} posts")
for post in feed:
    print(f"  - {post['content'][:50]}...")
```

## Hybrid Fan-Out Strategy

For users with many followers (celebrities), pure push model is inefficient. Implement a hybrid approach:

```python
class HybridFeedManager(SocialFeedManager):
    # Threshold for switching from push to pull model
    CELEBRITY_THRESHOLD = 10000

    def is_celebrity(self, user_id: str) -> bool:
        """Check if user has celebrity-level followers."""
        count = self.get_follower_count(user_id)
        return count >= self.CELEBRITY_THRESHOLD

    def _fan_out_post(self, post: Post) -> None:
        """Hybrid fan-out: push to regular users, skip celebrities."""
        if self.is_celebrity(post.user_id):
            # For celebrities, just store in their posts timeline
            # Followers will pull when needed
            r.sadd("celebrity_users", post.user_id)
            return

        # Normal fan-out for regular users
        super()._fan_out_post(post)

    def get_feed(self, user_id: str, page: int = 1,
                 limit: int = None) -> List[Dict]:
        """Get feed with hybrid approach - merge pushed and pulled content."""
        if limit is None:
            limit = self.POSTS_PER_PAGE

        # Get pre-computed feed posts
        start = (page - 1) * limit
        end = start + limit - 1

        pushed_posts = r.zrevrange(
            f"feed:{user_id}",
            start,
            end,
            withscores=True
        )

        # Get celebrities the user follows
        following = self.get_following(user_id)
        celebrities = r.sinter("celebrity_users", f"user:{user_id}:following")

        # Pull recent posts from celebrities
        pulled_posts = []
        if celebrities:
            pipe = r.pipeline()
            for celeb_id in celebrities:
                pipe.zrevrange(
                    f"user:{celeb_id}:posts",
                    0,
                    limit - 1,
                    withscores=True
                )

            celeb_posts = pipe.execute()
            for posts in celeb_posts:
                pulled_posts.extend(posts)

        # Merge and sort all posts
        all_posts = list(pushed_posts) + pulled_posts
        all_posts.sort(key=lambda x: x[1], reverse=True)

        # Remove duplicates while preserving order
        seen = set()
        unique_posts = []
        for post_id, score in all_posts:
            if post_id not in seen:
                seen.add(post_id)
                unique_posts.append((post_id, score))

        # Limit results
        unique_posts = unique_posts[:limit]

        # Fetch full post data
        if not unique_posts:
            return []

        pipe = r.pipeline()
        for post_id, _ in unique_posts:
            pipe.hgetall(f"post:{post_id}")

        posts_data = pipe.execute()

        posts = []
        for (post_id, score), post_data in zip(unique_posts, posts_data):
            if post_data:
                post_data["post_id"] = post_id
                posts.append(post_data)

        return posts
```

## Engagement Features

Add likes, comments, and shares:

```python
class EngagementManager:
    def like_post(self, user_id: str, post_id: str) -> Dict:
        """Like a post."""
        # Check if already liked
        already_liked = r.sismember(f"post:{post_id}:likes", user_id)

        if already_liked:
            return {"success": False, "message": "Already liked"}

        pipe = r.pipeline()

        # Add to post's likes set
        pipe.sadd(f"post:{post_id}:likes", user_id)

        # Increment post's like count
        pipe.hincrby(f"post:{post_id}", "likes_count", 1)

        # Add to user's liked posts
        pipe.zadd(
            f"user:{user_id}:likes",
            {post_id: datetime.now().timestamp()}
        )

        # Get post author for notification
        pipe.hget(f"post:{post_id}", "user_id")

        results = pipe.execute()
        author_id = results[3]

        # Create notification for post author
        if author_id and author_id != user_id:
            self._create_notification(
                author_id,
                "like",
                {"user_id": user_id, "post_id": post_id}
            )

        return {"success": True, "likes_count": r.hget(f"post:{post_id}", "likes_count")}

    def unlike_post(self, user_id: str, post_id: str) -> Dict:
        """Unlike a post."""
        was_liked = r.sismember(f"post:{post_id}:likes", user_id)

        if not was_liked:
            return {"success": False, "message": "Not liked"}

        pipe = r.pipeline()

        pipe.srem(f"post:{post_id}:likes", user_id)
        pipe.hincrby(f"post:{post_id}", "likes_count", -1)
        pipe.zrem(f"user:{user_id}:likes", post_id)

        pipe.execute()

        return {"success": True}

    def add_comment(self, user_id: str, post_id: str,
                    content: str) -> Dict:
        """Add a comment to a post."""
        comment_id = str(uuid.uuid4())
        timestamp = datetime.now()

        comment_data = {
            "comment_id": comment_id,
            "user_id": user_id,
            "post_id": post_id,
            "content": content,
            "created_at": timestamp.isoformat(),
            "likes_count": 0
        }

        pipe = r.pipeline()

        # Store comment data
        pipe.hset(f"comment:{comment_id}", mapping=comment_data)

        # Add to post's comments sorted set
        pipe.zadd(
            f"post:{post_id}:comments",
            {comment_id: timestamp.timestamp()}
        )

        # Increment post's comment count
        pipe.hincrby(f"post:{post_id}", "comments_count", 1)

        # Get post author
        pipe.hget(f"post:{post_id}", "user_id")

        results = pipe.execute()
        author_id = results[3]

        # Notify post author
        if author_id and author_id != user_id:
            self._create_notification(
                author_id,
                "comment",
                {"user_id": user_id, "post_id": post_id, "comment_id": comment_id}
            )

        return {
            "success": True,
            "comment_id": comment_id,
            "comment": comment_data
        }

    def get_comments(self, post_id: str, page: int = 1,
                    limit: int = 20) -> List[Dict]:
        """Get comments for a post."""
        start = (page - 1) * limit
        end = start + limit - 1

        comment_ids = r.zrange(f"post:{post_id}:comments", start, end)

        if not comment_ids:
            return []

        pipe = r.pipeline()
        for comment_id in comment_ids:
            pipe.hgetall(f"comment:{comment_id}")

        return [c for c in pipe.execute() if c]

    def share_post(self, user_id: str, post_id: str,
                   comment: str = None) -> Dict:
        """Share/repost a post."""
        original_post = r.hgetall(f"post:{post_id}")
        if not original_post:
            return {"success": False, "message": "Post not found"}

        share_id = str(uuid.uuid4())
        timestamp = datetime.now()

        share_data = {
            "post_id": share_id,
            "user_id": user_id,
            "original_post_id": post_id,
            "original_author_id": original_post["user_id"],
            "content": comment or "",
            "is_share": "true",
            "created_at": timestamp.isoformat()
        }

        pipe = r.pipeline()

        # Store share as a post
        pipe.hset(f"post:{share_id}", mapping=share_data)

        # Add to user's posts
        pipe.zadd(f"user:{user_id}:posts", {share_id: timestamp.timestamp()})

        # Increment original post's share count
        pipe.hincrby(f"post:{post_id}", "shares_count", 1)

        # Track who shared
        pipe.sadd(f"post:{post_id}:shares", user_id)

        pipe.execute()

        # Fan out the share to followers
        feed_manager = SocialFeedManager()
        share_post = Post(
            post_id=share_id,
            user_id=user_id,
            content=comment or "",
            created_at=timestamp
        )
        feed_manager._fan_out_post(share_post)

        return {"success": True, "share_id": share_id}

    def _create_notification(self, user_id: str, notification_type: str,
                            data: Dict) -> None:
        """Create a notification for a user."""
        notification = {
            "id": str(uuid.uuid4()),
            "type": notification_type,
            "data": json.dumps(data),
            "created_at": datetime.now().isoformat(),
            "read": "false"
        }

        pipe = r.pipeline()

        # Add to notifications list
        pipe.lpush(f"user:{user_id}:notifications", json.dumps(notification))

        # Trim to keep last 100 notifications
        pipe.ltrim(f"user:{user_id}:notifications", 0, 99)

        # Increment unread count
        pipe.incr(f"user:{user_id}:unread_notifications")

        # Publish for real-time delivery
        pipe.publish(f"notifications:{user_id}", json.dumps(notification))

        pipe.execute()


# Usage
engagement = EngagementManager()

# Like a post
engagement.like_post("user_alice", post1.post_id)

# Add a comment
engagement.add_comment("user_alice", post1.post_id, "Great post!")

# Share a post
engagement.share_post("user_alice", post1.post_id, "Check this out!")
```

## Real-Time Feed Updates

Push new posts to connected clients:

```python
import threading
import json

class RealTimeFeed:
    def __init__(self, feed_manager: SocialFeedManager):
        self.feed_manager = feed_manager

    def subscribe_to_feed(self, user_id: str, callback) -> None:
        """Subscribe to real-time feed updates."""
        def listener():
            pubsub = r.pubsub()

            # Subscribe to own feed channel
            pubsub.subscribe(f"feed:updates:{user_id}")

            # Subscribe to followed users' posts
            following = self.feed_manager.get_following(user_id)
            for followee_id in following:
                pubsub.subscribe(f"user:posts:{followee_id}")

            for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    callback(data)

        thread = threading.Thread(target=listener, daemon=True)
        thread.start()

    def publish_post(self, post: Post) -> None:
        """Publish a new post to subscribers."""
        message = {
            "type": "new_post",
            "post": post.to_dict()
        }

        # Publish to author's channel
        r.publish(f"user:posts:{post.user_id}", json.dumps(message))

        # Also push to each follower's feed channel
        followers = self.feed_manager.get_followers(post.user_id)
        for follower_id in followers:
            r.publish(f"feed:updates:{follower_id}", json.dumps(message))


# WebSocket integration example (using Flask-SocketIO)
"""
from flask import Flask
from flask_socketio import SocketIO, join_room

app = Flask(__name__)
socketio = SocketIO(app)

real_time = RealTimeFeed(feed_manager)

@socketio.on('connect')
def handle_connect():
    user_id = get_current_user_id()  # Your auth logic
    join_room(f"user:{user_id}")

    def send_update(data):
        socketio.emit('feed_update', data, room=f"user:{user_id}")

    real_time.subscribe_to_feed(user_id, send_update)

@socketio.on('new_post')
def handle_new_post(data):
    user_id = get_current_user_id()
    post = feed_manager.create_post(user_id, data['content'])
    real_time.publish_post(post)
"""
```

## Activity Feed (Aggregated Notifications)

Build an activity feed showing aggregated actions:

```python
class ActivityFeed:
    def record_activity(self, actor_id: str, action: str,
                       target_type: str, target_id: str,
                       extra_data: Dict = None) -> None:
        """Record an activity for aggregation."""
        timestamp = datetime.now()

        activity = {
            "id": str(uuid.uuid4()),
            "actor_id": actor_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "extra_data": json.dumps(extra_data or {}),
            "timestamp": timestamp.isoformat()
        }

        # Store activity
        r.hset(f"activity:{activity['id']}", mapping=activity)

        # Add to target's activity feed
        r.zadd(
            f"activity_feed:{target_type}:{target_id}",
            {activity["id"]: timestamp.timestamp()}
        )

        # Trim old activities
        r.zremrangebyrank(f"activity_feed:{target_type}:{target_id}", 0, -101)

    def get_activity_feed(self, target_type: str, target_id: str,
                         limit: int = 20) -> List[Dict]:
        """Get aggregated activity feed."""
        activity_ids = r.zrevrange(
            f"activity_feed:{target_type}:{target_id}",
            0,
            limit - 1
        )

        if not activity_ids:
            return []

        pipe = r.pipeline()
        for aid in activity_ids:
            pipe.hgetall(f"activity:{aid}")

        activities = pipe.execute()

        # Aggregate similar activities
        return self._aggregate_activities(activities)

    def _aggregate_activities(self, activities: List[Dict]) -> List[Dict]:
        """Aggregate similar activities (e.g., '3 people liked your post')."""
        aggregated = {}

        for activity in activities:
            if not activity:
                continue

            # Create aggregation key
            key = f"{activity['action']}:{activity['target_type']}:{activity['target_id']}"

            if key not in aggregated:
                aggregated[key] = {
                    "action": activity["action"],
                    "target_type": activity["target_type"],
                    "target_id": activity["target_id"],
                    "actors": [],
                    "count": 0,
                    "latest_timestamp": activity["timestamp"]
                }

            aggregated[key]["actors"].append(activity["actor_id"])
            aggregated[key]["count"] += 1

            if activity["timestamp"] > aggregated[key]["latest_timestamp"]:
                aggregated[key]["latest_timestamp"] = activity["timestamp"]

        # Convert to list and sort by latest timestamp
        result = list(aggregated.values())
        result.sort(key=lambda x: x["latest_timestamp"], reverse=True)

        # Limit actors shown
        for item in result:
            item["actors"] = item["actors"][:3]  # Show max 3 actors

        return result


# Usage
activity_feed = ActivityFeed()

# Record activities
activity_feed.record_activity(
    actor_id="user_bob",
    action="like",
    target_type="post",
    target_id="post_123"
)

activity_feed.record_activity(
    actor_id="user_charlie",
    action="like",
    target_type="post",
    target_id="post_123"
)

# Get activity feed
activities = activity_feed.get_activity_feed("post", "post_123")
# Returns: [{"action": "like", "count": 2, "actors": ["user_bob", "user_charlie"], ...}]
```

## Performance Optimization

### Batch User Data Loading

```python
def enrich_feed_with_user_data(posts: List[Dict]) -> List[Dict]:
    """Add user profile data to posts efficiently."""
    # Collect unique user IDs
    user_ids = set()
    for post in posts:
        user_ids.add(post["user_id"])

    # Batch load user data
    pipe = r.pipeline()
    for user_id in user_ids:
        pipe.hgetall(f"user:{user_id}:profile")

    user_data = pipe.execute()

    # Create user lookup
    users = {}
    for user_id, data in zip(user_ids, user_data):
        users[user_id] = data

    # Enrich posts
    for post in posts:
        user = users.get(post["user_id"], {})
        post["author"] = {
            "user_id": post["user_id"],
            "username": user.get("username", "Unknown"),
            "avatar_url": user.get("avatar_url", ""),
            "display_name": user.get("display_name", "")
        }

    return posts
```

### Feed Caching

```python
class CachedFeedManager(SocialFeedManager):
    CACHE_TTL = 60  # 1 minute cache

    def get_feed_cached(self, user_id: str, page: int = 1) -> List[Dict]:
        """Get feed with caching."""
        cache_key = f"feed:cache:{user_id}:{page}"

        # Try cache first
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        # Generate feed
        feed = self.get_feed(user_id, page)

        # Cache the result
        r.setex(cache_key, self.CACHE_TTL, json.dumps(feed))

        return feed

    def invalidate_feed_cache(self, user_id: str) -> None:
        """Invalidate a user's feed cache."""
        # Delete all pages
        cursor = 0
        while True:
            cursor, keys = r.scan(
                cursor,
                match=f"feed:cache:{user_id}:*",
                count=100
            )
            if keys:
                r.delete(*keys)
            if cursor == 0:
                break
```

## Conclusion

Building social media feeds with Redis requires careful consideration of fan-out strategies and scale requirements. Key takeaways:

- Use **sorted sets** for time-ordered feeds with efficient pagination
- Implement **hybrid fan-out** for handling celebrity users
- Use **pipelining** for batch operations during fan-out
- Implement **cursor-based pagination** for infinite scroll
- Use **Pub/Sub** for real-time feed updates
- **Cache computed feeds** for frequently accessed users
- **Aggregate activities** for cleaner notification feeds

With these patterns, you can build social feed systems that handle millions of users while maintaining sub-second response times.

## Related Resources

- [Redis Sorted Set Commands](https://redis.io/commands/?group=sorted-set)
- [Redis Pub/Sub](https://redis.io/docs/interact/pubsub/)
- [Designing Data-Intensive Applications - Chapter 11](https://dataintensive.net/)
