# How to Use Redis Hashes Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hashes, Data Structures, Performance, Data Modeling

Description: Master Redis hashes for efficient object storage. Learn memory optimization, partial updates, and practical patterns for user profiles, sessions, and configuration management.

---

Redis hashes store field-value pairs under a single key, making them ideal for representing objects. They are more memory-efficient than separate string keys and allow partial updates without retrieving the entire object. This guide covers hash operations and best practices.

## Basic Hash Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Set a single field
r.hset('user:1', 'name', 'Alice')

# Set multiple fields at once
r.hset('user:1', mapping={
    'email': 'alice@example.com',
    'age': 30,
    'city': 'New York',
    'active': 'true'
})

# Get a single field
name = r.hget('user:1', 'name')
print(f"Name: {name}")  # Alice

# Get multiple fields
fields = r.hmget('user:1', ['name', 'email', 'age'])
print(f"Fields: {fields}")  # ['Alice', 'alice@example.com', '30']

# Get all fields
user = r.hgetall('user:1')
print(f"User: {user}")
# {'name': 'Alice', 'email': 'alice@example.com', 'age': '30', ...}

# Check if field exists
exists = r.hexists('user:1', 'name')
print(f"Has name: {exists}")  # True

# Get field count
count = r.hlen('user:1')
print(f"Field count: {count}")  # 5

# Delete specific fields
r.hdel('user:1', 'city')

# Get all field names
keys = r.hkeys('user:1')
print(f"Fields: {keys}")

# Get all values
values = r.hvals('user:1')
print(f"Values: {values}")
```

## Numeric Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Integer increment
r.hset('stats', 'views', 0)
r.hincrby('stats', 'views', 1)
r.hincrby('stats', 'views', 10)
print(f"Views: {r.hget('stats', 'views')}")  # 11

# Float increment
r.hset('stats', 'score', 0.0)
r.hincrbyfloat('stats', 'score', 0.5)
r.hincrbyfloat('stats', 'score', 1.25)
print(f"Score: {r.hget('stats', 'score')}")  # 1.75

# Practical example: view counter
def track_page_view(page_id, user_id=None):
    """Track page views with detailed stats"""
    key = f'page:{page_id}:stats'

    pipe = r.pipeline()
    pipe.hincrby(key, 'total_views', 1)
    pipe.hincrby(key, 'today_views', 1)
    if user_id:
        pipe.hincrby(key, 'logged_in_views', 1)
    else:
        pipe.hincrby(key, 'anonymous_views', 1)
    pipe.execute()

track_page_view('home', user_id='user:123')
track_page_view('home')
print(r.hgetall('page:home:stats'))
```

## User Profile Management

```python
import redis
import json
from datetime import datetime
from typing import Optional, Dict, Any

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class UserProfile:
    """User profile management using Redis hashes"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.key = f'user:{user_id}'

    def create(self, data: Dict[str, Any]) -> bool:
        """Create new user profile"""
        # Check if already exists
        if r.exists(self.key):
            return False

        profile = {
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            **data
        }

        # Handle nested objects by JSON encoding
        for key, value in profile.items():
            if isinstance(value, (dict, list)):
                profile[key] = json.dumps(value)

        r.hset(self.key, mapping=profile)
        return True

    def get(self, fields: list = None) -> Optional[Dict[str, Any]]:
        """Get user profile or specific fields"""
        if fields:
            values = r.hmget(self.key, fields)
            if not any(values):
                return None
            return dict(zip(fields, values))

        data = r.hgetall(self.key)
        if not data:
            return None

        # Decode JSON fields
        for key, value in data.items():
            if value.startswith('{') or value.startswith('['):
                try:
                    data[key] = json.loads(value)
                except json.JSONDecodeError:
                    pass

        return data

    def update(self, data: Dict[str, Any]) -> bool:
        """Update specific fields"""
        if not r.exists(self.key):
            return False

        data['updated_at'] = datetime.utcnow().isoformat()

        for key, value in data.items():
            if isinstance(value, (dict, list)):
                data[key] = json.dumps(value)

        r.hset(self.key, mapping=data)
        return True

    def delete_fields(self, *fields) -> int:
        """Delete specific fields from profile"""
        return r.hdel(self.key, *fields)

    def increment_counter(self, field: str, amount: int = 1) -> int:
        """Increment a numeric field"""
        return r.hincrby(self.key, field, amount)

    def delete(self) -> bool:
        """Delete entire profile"""
        return r.delete(self.key) > 0

# Usage
profile = UserProfile('alice123')

profile.create({
    'name': 'Alice',
    'email': 'alice@example.com',
    'preferences': {'theme': 'dark', 'notifications': True},
    'login_count': 0
})

# Get full profile
print(profile.get())

# Get specific fields
print(profile.get(['name', 'email']))

# Update fields
profile.update({'city': 'San Francisco'})

# Increment counter
profile.increment_counter('login_count')
print(f"Login count: {profile.get(['login_count'])}")
```

## Session Storage

```python
import redis
import json
import secrets
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class SessionManager:
    """Session management using Redis hashes"""

    def __init__(self, prefix='session', ttl=3600):
        self.prefix = prefix
        self.ttl = ttl

    def _key(self, session_id):
        return f'{self.prefix}:{session_id}'

    def create(self, user_id: str, data: dict = None) -> str:
        """Create new session"""
        session_id = secrets.token_urlsafe(32)
        key = self._key(session_id)

        session_data = {
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'last_activity': datetime.utcnow().isoformat(),
            'data': json.dumps(data or {})
        }

        r.hset(key, mapping=session_data)
        r.expire(key, self.ttl)

        return session_id

    def get(self, session_id: str) -> Optional[dict]:
        """Get session data and refresh TTL"""
        key = self._key(session_id)

        data = r.hgetall(key)
        if not data:
            return None

        # Refresh TTL and update last activity
        pipe = r.pipeline()
        pipe.hset(key, 'last_activity', datetime.utcnow().isoformat())
        pipe.expire(key, self.ttl)
        pipe.execute()

        data['data'] = json.loads(data.get('data', '{}'))
        return data

    def update(self, session_id: str, data: dict):
        """Update session data"""
        key = self._key(session_id)

        current = r.hget(key, 'data')
        if current is None:
            return False

        current_data = json.loads(current)
        current_data.update(data)

        r.hset(key, mapping={
            'data': json.dumps(current_data),
            'last_activity': datetime.utcnow().isoformat()
        })
        r.expire(key, self.ttl)

        return True

    def destroy(self, session_id: str) -> bool:
        """Destroy session"""
        return r.delete(self._key(session_id)) > 0

    def get_user_sessions(self, user_id: str) -> list:
        """Get all sessions for a user"""
        sessions = []
        cursor = 0

        while True:
            cursor, keys = r.scan(cursor, match=f'{self.prefix}:*', count=100)

            for key in keys:
                data = r.hgetall(key)
                if data.get('user_id') == user_id:
                    sessions.append({
                        'session_id': key.replace(f'{self.prefix}:', ''),
                        **data
                    })

            if cursor == 0:
                break

        return sessions

# Usage
sessions = SessionManager(ttl=86400)

# Create session on login
session_id = sessions.create('user:123', {'cart': []})
print(f"Session: {session_id}")

# Get session
session = sessions.get(session_id)
print(f"Session data: {session}")

# Update session
sessions.update(session_id, {'cart': ['item1', 'item2']})
```

## Memory Optimization

Redis hashes use special encoding for small hashes:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Check encoding of a hash
def check_encoding(key):
    encoding = r.object('encoding', key)
    memory = r.memory_usage(key)
    return encoding.decode(), memory

# Small hash uses ziplist/listpack (memory efficient)
r.hset('small_hash', mapping={f'f{i}': f'v{i}' for i in range(10)})
print(f"Small hash: {check_encoding('small_hash')}")

# Large hash uses hashtable
r.hset('large_hash', mapping={f'f{i}': f'v{i}' for i in range(1000)})
print(f"Large hash: {check_encoding('large_hash')}")

# Configure thresholds in redis.conf:
# hash-max-ziplist-entries 512
# hash-max-ziplist-value 64

# Compare memory: separate keys vs hash
# Separate keys
for i in range(100):
    r.set(f'separate:{i}', f'value{i}')

separate_memory = sum(r.memory_usage(f'separate:{i}') for i in range(100))

# Single hash
r.hset('combined', mapping={f'{i}': f'value{i}' for i in range(100)})
hash_memory = r.memory_usage('combined')

print(f"Separate keys: {separate_memory} bytes")
print(f"Single hash: {hash_memory} bytes")
print(f"Savings: {(1 - hash_memory/separate_memory)*100:.0f}%")
```

## Hash vs String Trade-offs

| Aspect | Hash | Separate Strings |
|--------|------|------------------|
| Memory (small objects) | More efficient | Less efficient |
| Partial read/write | Yes | No |
| TTL per field | No | Yes |
| Cluster slot | One key, one slot | Keys can spread |
| Pipelining | Fewer commands | More commands |

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# When to use hashes:
# 1. Object with multiple fields
r.hset('product:1', mapping={
    'name': 'Widget',
    'price': '19.99',
    'category': 'tools',
    'stock': '100'
})

# 2. When you need partial updates
r.hincrby('product:1', 'stock', -1)  # Decrement stock

# 3. When you query multiple fields together
product = r.hgetall('product:1')

# When to use separate strings:
# 1. Each field needs different TTL
r.setex('cache:page:home', 300, 'html...')
r.setex('cache:page:about', 3600, 'html...')

# 2. Fields are accessed independently
r.set('counter:visits', 0)
r.incr('counter:visits')
```

## Summary

| Operation | Command | Complexity |
|-----------|---------|------------|
| Set field | HSET | O(1) |
| Get field | HGET | O(1) |
| Get all | HGETALL | O(N) |
| Delete field | HDEL | O(N) |
| Increment | HINCRBY | O(1) |
| Field exists | HEXISTS | O(1) |
| Field count | HLEN | O(1) |

Best practices:
- Use hashes for object-like data with multiple fields
- Take advantage of partial updates to reduce bandwidth
- Keep field values reasonably small for ziplist encoding
- Use HMGET/HMSET for batch operations
- Consider hashes for memory optimization over multiple keys
