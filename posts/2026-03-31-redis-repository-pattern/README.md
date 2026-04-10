# How to Implement the Repository Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Repository, Pattern, Cache, Architecture

Description: Implement the repository pattern on top of Redis to encapsulate all data access logic, enforce serialization contracts, and make Redis entities testable and swappable.

---

The repository pattern places all data access logic for a given entity type behind a clean interface. Applied to Redis, it encapsulates key construction, serialization, TTL policies, and cache invalidation in one place - preventing the key-string chaos that creeps into applications that access Redis ad hoc.

## The Repository Interface

Define the contract your repository must fulfill:

```python
from abc import ABC, abstractmethod
from typing import Optional

class UserRepository(ABC):
    @abstractmethod
    def find(self, user_id: str) -> Optional[dict]:
        pass

    @abstractmethod
    def save(self, user: dict) -> None:
        pass

    @abstractmethod
    def delete(self, user_id: str) -> None:
        pass
```

## Redis Implementation

Implement the interface using Redis strings with JSON serialization:

```python
import redis
import json

class RedisUserRepository(UserRepository):
    TTL = 3600

    def __init__(self, redis_client: redis.Redis):
        self._r = redis_client

    def _key(self, user_id: str) -> str:
        return f"user:{user_id}"

    def find(self, user_id: str) -> Optional[dict]:
        raw = self._r.get(self._key(user_id))
        return json.loads(raw) if raw else None

    def save(self, user: dict) -> None:
        user_id = user["id"]
        self._r.set(self._key(user_id), json.dumps(user), ex=self.TTL)

    def delete(self, user_id: str) -> None:
        self._r.delete(self._key(user_id))

    def find_many(self, user_ids: list) -> list:
        pipe = self._r.pipeline()
        for uid in user_ids:
            pipe.get(self._key(uid))
        results = pipe.execute()
        return [json.loads(r) for r in results if r]
```

## Read-Through Repository

Extend the repository to fall back to a primary database on cache miss:

```python
class CachingUserRepository(UserRepository):
    def __init__(self, redis_client, db_repo):
        self._cache = RedisUserRepository(redis_client)
        self._db = db_repo

    def find(self, user_id: str) -> Optional[dict]:
        user = self._cache.find(user_id)
        if user:
            return user
        user = self._db.find(user_id)
        if user:
            self._cache.save(user)
        return user

    def save(self, user: dict) -> None:
        self._db.save(user)
        self._cache.save(user)

    def delete(self, user_id: str) -> None:
        self._db.delete(user_id)
        self._cache.delete(user_id)
```

## In-Memory Repository for Testing

Swap Redis for an in-memory implementation in tests:

```python
class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._store = {}

    def find(self, user_id: str) -> Optional[dict]:
        return self._store.get(user_id)

    def save(self, user: dict) -> None:
        self._store[user["id"]] = user

    def delete(self, user_id: str) -> None:
        self._store.pop(user_id, None)
```

Unit tests use `InMemoryUserRepository` - no Redis required.

## Index Repositories

For querying by non-primary fields, add a secondary index repository:

```python
class RedisUserIndexRepository:
    def __init__(self, redis_client: redis.Redis):
        self._r = redis_client

    def add_to_email_index(self, email: str, user_id: str):
        self._r.set(f"idx:user:email:{email}", user_id, ex=3600)

    def find_by_email(self, email: str) -> Optional[str]:
        uid = self._r.get(f"idx:user:email:{email}")
        return uid.decode() if uid else None
```

## Dependency Injection

Wire repositories through a container:

```python
r = redis.Redis()
user_repo = CachingUserRepository(r, PostgresUserRepository(db_conn))

def get_user(user_id):
    return user_repo.find(user_id)
```

## Summary

The repository pattern tames Redis access by centralizing key construction, TTL management, and serialization in typed classes. Composable read-through and in-memory implementations make caching logic reusable and testable without a live Redis instance, while secondary index repositories handle non-primary lookups cleanly.
