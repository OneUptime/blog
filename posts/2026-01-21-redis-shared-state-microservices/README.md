# How to Share State Across Microservices with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Microservices, Distributed State, Shared State, Session Management, Configuration

Description: A comprehensive guide to sharing state across microservices using Redis, including session management, distributed configuration, feature flags, and coordination patterns.

---

Microservices architectures often need to share state across service boundaries. Redis provides fast, reliable shared state management with atomic operations and flexible data structures.

## Why Share State with Redis?

Redis excels at distributed state management because of:

- **Low latency**: Sub-millisecond access to shared data
- **Rich data structures**: Hashes, sets, sorted sets for different use cases
- **Atomic operations**: Safe concurrent updates
- **TTL support**: Automatic cleanup of temporary state
- **Pub/Sub**: Real-time notifications for state changes

## Pattern 1: Distributed Session Management

Share user sessions across multiple service instances:

```python
import redis
import json
import uuid
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
import hashlib
import logging

logger = logging.getLogger(__name__)

@dataclass
class Session:
    session_id: str
    user_id: str
    data: Dict[str, Any]
    created_at: float
    expires_at: float
    last_accessed: float

class DistributedSessionStore:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600):
        self.redis = redis_client
        self.ttl = ttl  # Session TTL in seconds
        self._prefix = "session"

    def _session_key(self, session_id: str) -> str:
        return f"{self._prefix}:{session_id}"

    def _user_sessions_key(self, user_id: str) -> str:
        return f"{self._prefix}:user:{user_id}"

    def create_session(self, user_id: str,
                       data: Optional[Dict[str, Any]] = None) -> Session:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        now = time.time()

        session = Session(
            session_id=session_id,
            user_id=user_id,
            data=data or {},
            created_at=now,
            expires_at=now + self.ttl,
            last_accessed=now
        )

        session_key = self._session_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)

        pipe = self.redis.pipeline()

        # Store session data
        pipe.setex(session_key, self.ttl, json.dumps(asdict(session)))

        # Add to user's session set
        pipe.sadd(user_sessions_key, session_id)
        pipe.expire(user_sessions_key, self.ttl * 2)

        pipe.execute()

        logger.info(f"Created session {session_id} for user {user_id}")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        session_key = self._session_key(session_id)
        data = self.redis.get(session_key)

        if not data:
            return None

        session_data = json.loads(data)
        session = Session(**session_data)

        # Update last accessed time
        session.last_accessed = time.time()
        self.redis.setex(session_key, self.ttl, json.dumps(asdict(session)))

        return session

    def update_session(self, session_id: str,
                       data: Dict[str, Any]) -> Optional[Session]:
        """Update session data."""
        session = self.get_session(session_id)
        if not session:
            return None

        session.data.update(data)
        session.last_accessed = time.time()

        session_key = self._session_key(session_id)
        self.redis.setex(session_key, self.ttl, json.dumps(asdict(session)))

        return session

    def delete_session(self, session_id: str, user_id: str):
        """Delete a session."""
        session_key = self._session_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)

        pipe = self.redis.pipeline()
        pipe.delete(session_key)
        pipe.srem(user_sessions_key, session_id)
        pipe.execute()

        logger.info(f"Deleted session {session_id}")

    def get_user_sessions(self, user_id: str) -> list:
        """Get all active sessions for a user."""
        user_sessions_key = self._user_sessions_key(user_id)
        session_ids = self.redis.smembers(user_sessions_key)

        sessions = []
        stale_ids = []

        for session_id in session_ids:
            if isinstance(session_id, bytes):
                session_id = session_id.decode()

            session = self.get_session(session_id)
            if session:
                sessions.append(session)
            else:
                stale_ids.append(session_id)

        # Clean up stale session IDs
        if stale_ids:
            self.redis.srem(user_sessions_key, *stale_ids)

        return sessions

    def invalidate_all_user_sessions(self, user_id: str):
        """Invalidate all sessions for a user."""
        sessions = self.get_user_sessions(user_id)
        for session in sessions:
            self.delete_session(session.session_id, user_id)

        logger.info(f"Invalidated all sessions for user {user_id}")

# Flask middleware example
from flask import Flask, request, g
from functools import wraps

app = Flask(__name__)
redis_client = redis.Redis()
session_store = DistributedSessionStore(redis_client)

def require_session(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return {'error': 'Session required'}, 401

        session = session_store.get_session(session_id)
        if not session:
            return {'error': 'Invalid session'}, 401

        g.session = session
        return f(*args, **kwargs)
    return decorated
```

## Pattern 2: Distributed Configuration

Share configuration across services with real-time updates:

```python
import redis
import json
import threading
from typing import Dict, Any, Optional, Callable, List
import logging

logger = logging.getLogger(__name__)

class DistributedConfig:
    def __init__(self, redis_client: redis.Redis, namespace: str = "config"):
        self.redis = redis_client
        self.namespace = namespace
        self._local_cache: Dict[str, Any] = {}
        self._listeners: List[Callable] = []
        self._subscriber = None
        self._running = False

    def _config_key(self, key: str) -> str:
        return f"{self.namespace}:{key}"

    def _channel(self) -> str:
        return f"{self.namespace}:updates"

    def set(self, key: str, value: Any, notify: bool = True):
        """Set a configuration value."""
        config_key = self._config_key(key)
        self.redis.set(config_key, json.dumps(value))

        # Update local cache
        self._local_cache[key] = value

        # Notify other instances
        if notify:
            self.redis.publish(self._channel(), json.dumps({
                "action": "set",
                "key": key,
                "value": value
            }))

        logger.info(f"Config set: {key}")

    def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value."""
        # Try local cache first
        if key in self._local_cache:
            return self._local_cache[key]

        config_key = self._config_key(key)
        value = self.redis.get(config_key)

        if value:
            parsed = json.loads(value)
            self._local_cache[key] = parsed
            return parsed

        return default

    def delete(self, key: str, notify: bool = True):
        """Delete a configuration value."""
        config_key = self._config_key(key)
        self.redis.delete(config_key)

        if key in self._local_cache:
            del self._local_cache[key]

        if notify:
            self.redis.publish(self._channel(), json.dumps({
                "action": "delete",
                "key": key
            }))

    def get_all(self) -> Dict[str, Any]:
        """Get all configuration values."""
        pattern = f"{self.namespace}:*"
        config = {}

        cursor = 0
        while True:
            cursor, keys = self.redis.scan(cursor=cursor, match=pattern)
            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                short_key = key_str.replace(f"{self.namespace}:", "", 1)
                config[short_key] = self.get(short_key)

            if cursor == 0:
                break

        return config

    def add_listener(self, callback: Callable[[str, str, Any], None]):
        """Add listener for configuration changes."""
        self._listeners.append(callback)

    def start_watching(self):
        """Start watching for configuration changes."""
        self._running = True
        self._subscriber = self.redis.pubsub()
        self._subscriber.subscribe(self._channel())

        thread = threading.Thread(target=self._watch_loop)
        thread.daemon = True
        thread.start()

        logger.info("Started watching configuration changes")

    def stop_watching(self):
        """Stop watching for changes."""
        self._running = False
        if self._subscriber:
            self._subscriber.unsubscribe()
            self._subscriber.close()

    def _watch_loop(self):
        """Background loop for watching changes."""
        for message in self._subscriber.listen():
            if not self._running:
                break

            if message["type"] != "message":
                continue

            try:
                data = json.loads(message["data"])
                action = data["action"]
                key = data["key"]
                value = data.get("value")

                # Update local cache
                if action == "set":
                    self._local_cache[key] = value
                elif action == "delete" and key in self._local_cache:
                    del self._local_cache[key]

                # Notify listeners
                for listener in self._listeners:
                    try:
                        listener(action, key, value)
                    except Exception as e:
                        logger.error(f"Listener error: {e}")

            except Exception as e:
                logger.error(f"Error processing config update: {e}")

# Usage
r = redis.Redis()
config = DistributedConfig(r, "myapp")

# Set configuration
config.set("feature.new_ui", True)
config.set("rate_limit.requests_per_minute", 100)
config.set("database.pool_size", 10)

# Listen for changes
def on_config_change(action: str, key: str, value: Any):
    print(f"Config {action}: {key} = {value}")

config.add_listener(on_config_change)
config.start_watching()
```

## Pattern 3: Feature Flags

Implement distributed feature flags:

```python
import redis
import json
import hashlib
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class RolloutStrategy(Enum):
    ALL = "all"
    NONE = "none"
    PERCENTAGE = "percentage"
    USER_LIST = "user_list"
    GROUP = "group"

@dataclass
class FeatureFlag:
    name: str
    enabled: bool
    strategy: str
    percentage: float = 0.0
    user_list: List[str] = None
    groups: List[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        self.user_list = self.user_list or []
        self.groups = self.groups or []
        self.metadata = self.metadata or {}

class FeatureFlagService:
    def __init__(self, redis_client: redis.Redis, namespace: str = "features"):
        self.redis = redis_client
        self.namespace = namespace
        self._cache: Dict[str, FeatureFlag] = {}
        self._cache_ttl = 60  # Local cache TTL

    def _flag_key(self, name: str) -> str:
        return f"{self.namespace}:{name}"

    def _user_hash(self, user_id: str, flag_name: str) -> float:
        """Generate consistent hash for user/flag combination."""
        hash_input = f"{user_id}:{flag_name}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        return (hash_value % 100) / 100.0

    def create_flag(self, flag: FeatureFlag):
        """Create or update a feature flag."""
        key = self._flag_key(flag.name)
        data = asdict(flag)
        self.redis.set(key, json.dumps(data))

        # Add to flag set
        self.redis.sadd(f"{self.namespace}:all", flag.name)

        # Publish update
        self.redis.publish(
            f"{self.namespace}:updates",
            json.dumps({"action": "update", "flag": flag.name})
        )

        logger.info(f"Created/updated flag: {flag.name}")

    def get_flag(self, name: str) -> Optional[FeatureFlag]:
        """Get a feature flag."""
        key = self._flag_key(name)
        data = self.redis.get(key)

        if data:
            flag_data = json.loads(data)
            return FeatureFlag(**flag_data)
        return None

    def is_enabled(self, name: str, user_id: Optional[str] = None,
                   user_groups: Optional[List[str]] = None) -> bool:
        """Check if feature is enabled for user."""
        flag = self.get_flag(name)

        if not flag:
            return False

        if not flag.enabled:
            return False

        strategy = RolloutStrategy(flag.strategy)

        if strategy == RolloutStrategy.ALL:
            return True

        if strategy == RolloutStrategy.NONE:
            return False

        if strategy == RolloutStrategy.USER_LIST:
            return user_id in flag.user_list if user_id else False

        if strategy == RolloutStrategy.PERCENTAGE:
            if not user_id:
                return False
            user_hash = self._user_hash(user_id, name)
            return user_hash < flag.percentage

        if strategy == RolloutStrategy.GROUP:
            if not user_groups:
                return False
            return bool(set(user_groups) & set(flag.groups))

        return False

    def get_all_flags(self) -> List[FeatureFlag]:
        """Get all feature flags."""
        flag_names = self.redis.smembers(f"{self.namespace}:all")
        flags = []

        for name in flag_names:
            if isinstance(name, bytes):
                name = name.decode()
            flag = self.get_flag(name)
            if flag:
                flags.append(flag)

        return flags

    def delete_flag(self, name: str):
        """Delete a feature flag."""
        key = self._flag_key(name)
        self.redis.delete(key)
        self.redis.srem(f"{self.namespace}:all", name)

        logger.info(f"Deleted flag: {name}")

# Usage
r = redis.Redis()
flags = FeatureFlagService(r)

# Create flags
flags.create_flag(FeatureFlag(
    name="new_checkout",
    enabled=True,
    strategy="percentage",
    percentage=0.10  # 10% rollout
))

flags.create_flag(FeatureFlag(
    name="beta_features",
    enabled=True,
    strategy="group",
    groups=["beta_testers", "employees"]
))

# Check flags
if flags.is_enabled("new_checkout", user_id="user123"):
    # Show new checkout
    pass

if flags.is_enabled("beta_features", user_groups=["beta_testers"]):
    # Show beta features
    pass
```

## Pattern 4: Distributed Counters and Limits

Share counters and enforce limits across services:

```python
import redis
import time
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DistributedCounter:
    def __init__(self, redis_client: redis.Redis, name: str):
        self.redis = redis_client
        self.name = name
        self._key = f"counter:{name}"

    def increment(self, amount: int = 1) -> int:
        """Increment counter and return new value."""
        return self.redis.incrby(self._key, amount)

    def decrement(self, amount: int = 1) -> int:
        """Decrement counter and return new value."""
        return self.redis.decrby(self._key, amount)

    def get(self) -> int:
        """Get current counter value."""
        value = self.redis.get(self._key)
        return int(value) if value else 0

    def reset(self):
        """Reset counter to zero."""
        self.redis.set(self._key, 0)

class DistributedRateLimiter:
    def __init__(self, redis_client: redis.Redis, name: str,
                 limit: int, window: int):
        self.redis = redis_client
        self.name = name
        self.limit = limit
        self.window = window  # Window in seconds

    def _key(self, identifier: str) -> str:
        return f"ratelimit:{self.name}:{identifier}"

    def is_allowed(self, identifier: str) -> Tuple[bool, int]:
        """Check if request is allowed, returns (allowed, remaining)."""
        key = self._key(identifier)
        now = time.time()
        window_start = now - self.window

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, "-inf", window_start)

        # Count current entries
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, self.window)

        results = pipe.execute()
        current_count = results[1]

        remaining = max(0, self.limit - current_count - 1)
        allowed = current_count < self.limit

        return allowed, remaining

    def get_usage(self, identifier: str) -> dict:
        """Get current usage stats."""
        key = self._key(identifier)
        now = time.time()
        window_start = now - self.window

        # Remove old and count
        self.redis.zremrangebyscore(key, "-inf", window_start)
        count = self.redis.zcard(key)

        return {
            "used": count,
            "limit": self.limit,
            "remaining": max(0, self.limit - count),
            "window_seconds": self.window
        }

class DistributedQuota:
    def __init__(self, redis_client: redis.Redis, name: str):
        self.redis = redis_client
        self.name = name

    def _quota_key(self, identifier: str, period: str) -> str:
        return f"quota:{self.name}:{identifier}:{period}"

    def _get_period_key(self, period: str) -> str:
        """Get period identifier (daily, monthly, etc.)."""
        now = time.localtime()
        if period == "daily":
            return time.strftime("%Y-%m-%d", now)
        elif period == "monthly":
            return time.strftime("%Y-%m", now)
        elif period == "yearly":
            return time.strftime("%Y", now)
        return "all"

    def use_quota(self, identifier: str, amount: int = 1,
                  period: str = "daily") -> Tuple[bool, int]:
        """Use quota and return (success, remaining)."""
        period_key = self._get_period_key(period)
        key = self._quota_key(identifier, period_key)
        limit_key = f"quota:{self.name}:{identifier}:limit:{period}"

        # Get limit
        limit = self.redis.get(limit_key)
        if not limit:
            return True, -1  # No limit set

        limit = int(limit)
        current = self.redis.incrby(key, amount)

        # Set expiry based on period
        if period == "daily":
            self.redis.expire(key, 86400 * 2)
        elif period == "monthly":
            self.redis.expire(key, 86400 * 35)

        remaining = max(0, limit - current)
        return current <= limit, remaining

    def set_limit(self, identifier: str, limit: int, period: str = "daily"):
        """Set quota limit for identifier."""
        limit_key = f"quota:{self.name}:{identifier}:limit:{period}"
        self.redis.set(limit_key, limit)

    def get_usage(self, identifier: str, period: str = "daily") -> dict:
        """Get quota usage."""
        period_key = self._get_period_key(period)
        key = self._quota_key(identifier, period_key)
        limit_key = f"quota:{self.name}:{identifier}:limit:{period}"

        used = self.redis.get(key)
        limit = self.redis.get(limit_key)

        used = int(used) if used else 0
        limit = int(limit) if limit else None

        return {
            "used": used,
            "limit": limit,
            "remaining": limit - used if limit else None,
            "period": period
        }
```

## Pattern 5: Shared Application State

Share complex application state across services:

```python
import redis
import json
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict, field
import threading
import logging

logger = logging.getLogger(__name__)

@dataclass
class SharedState:
    key: str
    data: Dict[str, Any]
    version: int
    updated_at: float
    updated_by: str

class DistributedStateManager:
    def __init__(self, redis_client: redis.Redis, namespace: str,
                 instance_id: str):
        self.redis = redis_client
        self.namespace = namespace
        self.instance_id = instance_id
        self._local_state: Dict[str, SharedState] = {}
        self._watchers: Dict[str, List[callable]] = {}

    def _state_key(self, key: str) -> str:
        return f"state:{self.namespace}:{key}"

    def _version_key(self, key: str) -> str:
        return f"state:{self.namespace}:{key}:version"

    def _lock_key(self, key: str) -> str:
        return f"state:{self.namespace}:{key}:lock"

    def get(self, key: str) -> Optional[SharedState]:
        """Get shared state."""
        state_key = self._state_key(key)
        data = self.redis.get(state_key)

        if data:
            state_data = json.loads(data)
            return SharedState(**state_data)
        return None

    def set(self, key: str, data: Dict[str, Any],
            expected_version: Optional[int] = None) -> SharedState:
        """Set shared state with optimistic locking."""
        state_key = self._state_key(key)
        version_key = self._version_key(key)

        # Use WATCH for optimistic locking
        pipe = self.redis.pipeline(True)

        try:
            pipe.watch(version_key)

            current_version = self.redis.get(version_key)
            current_version = int(current_version) if current_version else 0

            if expected_version is not None and current_version != expected_version:
                pipe.unwatch()
                raise OptimisticLockError(
                    f"Version mismatch: expected {expected_version}, "
                    f"got {current_version}"
                )

            new_version = current_version + 1
            now = time.time()

            state = SharedState(
                key=key,
                data=data,
                version=new_version,
                updated_at=now,
                updated_by=self.instance_id
            )

            pipe.multi()
            pipe.set(state_key, json.dumps(asdict(state)))
            pipe.set(version_key, new_version)
            pipe.publish(
                f"state:{self.namespace}:updates",
                json.dumps({"key": key, "version": new_version})
            )
            pipe.execute()

            # Update local cache
            self._local_state[key] = state

            return state

        except redis.WatchError:
            raise OptimisticLockError("Concurrent modification detected")

    def update(self, key: str, updates: Dict[str, Any]) -> SharedState:
        """Update specific fields in shared state."""
        current = self.get(key)
        if not current:
            raise KeyError(f"State not found: {key}")

        new_data = {**current.data, **updates}
        return self.set(key, new_data, expected_version=current.version)

    def delete(self, key: str):
        """Delete shared state."""
        state_key = self._state_key(key)
        version_key = self._version_key(key)

        pipe = self.redis.pipeline()
        pipe.delete(state_key)
        pipe.delete(version_key)
        pipe.publish(
            f"state:{self.namespace}:updates",
            json.dumps({"key": key, "deleted": True})
        )
        pipe.execute()

        if key in self._local_state:
            del self._local_state[key]

    def with_lock(self, key: str, timeout: int = 10):
        """Context manager for exclusive access."""
        return StateLock(self.redis, self._lock_key(key), timeout)

    def watch(self, key: str, callback: callable):
        """Watch for state changes."""
        if key not in self._watchers:
            self._watchers[key] = []
        self._watchers[key].append(callback)

class StateLock:
    def __init__(self, redis_client: redis.Redis, key: str, timeout: int):
        self.redis = redis_client
        self.key = key
        self.timeout = timeout
        self.token = None

    def __enter__(self):
        import uuid
        self.token = str(uuid.uuid4())

        end_time = time.time() + self.timeout
        while time.time() < end_time:
            if self.redis.set(self.key, self.token, nx=True, ex=self.timeout):
                return self
            time.sleep(0.1)

        raise LockAcquisitionError(f"Could not acquire lock: {self.key}")

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Only release if we hold the lock
        current = self.redis.get(self.key)
        if current and current.decode() == self.token:
            self.redis.delete(self.key)
        return False

class OptimisticLockError(Exception):
    pass

class LockAcquisitionError(Exception):
    pass

# Usage example
r = redis.Redis()
state_manager = DistributedStateManager(r, "myapp", "instance-1")

# Set shared state
state = state_manager.set("order:123", {
    "status": "pending",
    "items": [{"id": 1, "qty": 2}],
    "total": 99.99
})

# Update with optimistic locking
try:
    state = state_manager.update("order:123", {"status": "processing"})
except OptimisticLockError:
    # Handle concurrent modification
    pass

# Use exclusive lock for critical operations
with state_manager.with_lock("order:123"):
    current = state_manager.get("order:123")
    # Perform critical operation
    state_manager.set("order:123", {**current.data, "status": "completed"})
```

## Best Practices

1. **Use appropriate data structures** - Hashes for objects, sets for membership, sorted sets for rankings
2. **Set TTLs on temporary state** - Prevent memory leaks
3. **Implement versioning** - Use optimistic locking for concurrent updates
4. **Cache locally with invalidation** - Reduce Redis calls
5. **Handle Redis failures gracefully** - Implement fallbacks
6. **Monitor memory usage** - Track state size growth
7. **Use namespaces** - Organize keys by service/feature

## Conclusion

Redis provides excellent primitives for sharing state across microservices. The combination of atomic operations, pub/sub for notifications, and rich data structures makes it ideal for session management, configuration, feature flags, and general distributed state. Always consider consistency requirements and failure modes when designing your shared state architecture.
