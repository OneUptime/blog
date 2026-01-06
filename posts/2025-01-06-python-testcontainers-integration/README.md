# How to Write Integration Tests for Python APIs with Testcontainers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Testing, Testcontainers, Docker, Integration Tests, PostgreSQL, Redis, pytest

Description: Learn how to write reliable integration tests for Python APIs using Testcontainers. This guide covers testing with real PostgreSQL, Redis, and other services in Docker without mocks.

---

> Integration tests that use real databases catch bugs that unit tests miss. Testcontainers spins up actual Docker containers for your tests, ensuring your code works with real services. No more "works in tests, breaks in production."

Mocking databases hides integration bugs. Testcontainers gives you real databases that start fast and clean up automatically.

---

## Why Testcontainers?

| Approach | Pros | Cons |
|----------|------|------|
| Mocks | Fast, no dependencies | Hides real bugs |
| Shared test DB | Real database | State leaks between tests |
| Local services | Real services | Manual setup, port conflicts |
| Testcontainers | Real, isolated, automatic | Requires Docker |

---

## Installation

```bash
pip install testcontainers[postgresql] testcontainers[redis] pytest pytest-asyncio
```

---

## PostgreSQL Integration Tests

### Basic Setup

```python
# tests/conftest.py
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def postgres_container():
    """Start PostgreSQL container for test session"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture(scope="session")
def db_engine(postgres_container):
    """Create SQLAlchemy engine"""
    engine = create_engine(postgres_container.get_connection_url())
    return engine

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create fresh database session for each test"""
    # Create tables
    from app.models import Base
    Base.metadata.create_all(db_engine)

    Session = sessionmaker(bind=db_engine)
    session = Session()

    yield session

    # Cleanup
    session.rollback()
    session.close()
    Base.metadata.drop_all(db_engine)
```

### Testing Repository Layer

```python
# tests/test_user_repository.py
import pytest
from app.repositories import UserRepository
from app.models import User

class TestUserRepository:
    def test_create_user(self, db_session):
        """Test creating a user in real PostgreSQL"""
        repo = UserRepository(db_session)

        user = repo.create(
            email="test@example.com",
            name="Test User"
        )

        assert user.id is not None
        assert user.email == "test@example.com"

        # Verify in database
        fetched = db_session.query(User).filter_by(id=user.id).first()
        assert fetched is not None
        assert fetched.email == "test@example.com"

    def test_find_by_email(self, db_session):
        """Test finding user by email"""
        repo = UserRepository(db_session)

        # Create user
        repo.create(email="find@example.com", name="Find Me")

        # Find user
        user = repo.find_by_email("find@example.com")

        assert user is not None
        assert user.name == "Find Me"

    def test_unique_email_constraint(self, db_session):
        """Test database enforces unique emails"""
        repo = UserRepository(db_session)

        repo.create(email="unique@example.com", name="First")

        with pytest.raises(Exception):  # IntegrityError
            repo.create(email="unique@example.com", name="Second")
```

---

## Redis Integration Tests

### Redis Fixture

```python
# tests/conftest.py
from testcontainers.redis import RedisContainer
import redis

@pytest.fixture(scope="session")
def redis_container():
    """Start Redis container"""
    with RedisContainer("redis:7") as container:
        yield container

@pytest.fixture(scope="function")
def redis_client(redis_container):
    """Create Redis client, flush between tests"""
    client = redis.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True
    )
    yield client
    client.flushall()
```

### Testing Cache Layer

```python
# tests/test_cache.py
import pytest
from app.cache import CacheService

class TestCacheService:
    def test_set_and_get(self, redis_client):
        """Test basic cache operations"""
        cache = CacheService(redis_client)

        cache.set("key", {"data": "value"}, ttl=300)
        result = cache.get("key")

        assert result == {"data": "value"}

    def test_cache_expiration(self, redis_client):
        """Test cache TTL"""
        cache = CacheService(redis_client)

        cache.set("expiring", "data", ttl=1)

        # Immediately available
        assert cache.get("expiring") == "data"

        # Wait for expiration
        import time
        time.sleep(1.5)

        assert cache.get("expiring") is None

    def test_cache_invalidation(self, redis_client):
        """Test cache invalidation patterns"""
        cache = CacheService(redis_client)

        # Set multiple related keys
        cache.set("user:1:profile", {"name": "Alice"})
        cache.set("user:1:settings", {"theme": "dark"})

        # Invalidate all user keys
        cache.invalidate_pattern("user:1:*")

        assert cache.get("user:1:profile") is None
        assert cache.get("user:1:settings") is None
```

---

## FastAPI Integration Tests

### Full API Testing

```python
# tests/conftest.py
from fastapi.testclient import TestClient
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer
import pytest

@pytest.fixture(scope="session")
def services():
    """Start all required services"""
    with PostgresContainer("postgres:15") as postgres:
        with RedisContainer("redis:7") as redis_container:
            yield {
                "postgres": postgres,
                "redis": redis_container
            }

@pytest.fixture(scope="function")
def app(services):
    """Create FastAPI app with test configuration"""
    import os

    # Set environment for test services
    os.environ["DATABASE_URL"] = services["postgres"].get_connection_url()
    os.environ["REDIS_URL"] = f"redis://{services['redis'].get_container_host_ip()}:{services['redis'].get_exposed_port(6379)}"

    # Import app after setting environment
    from app.main import create_app
    app = create_app()

    # Create tables
    from app.database import engine
    from app.models import Base
    Base.metadata.create_all(engine)

    yield app

    # Cleanup
    Base.metadata.drop_all(engine)

@pytest.fixture(scope="function")
def client(app):
    """Create test client"""
    return TestClient(app)
```

### Testing API Endpoints

```python
# tests/test_api.py
import pytest

class TestUserAPI:
    def test_create_user(self, client):
        """Test user creation endpoint"""
        response = client.post(
            "/api/users",
            json={"email": "new@example.com", "name": "New User"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert "id" in data

    def test_get_user(self, client):
        """Test user retrieval"""
        # Create user
        create_response = client.post(
            "/api/users",
            json={"email": "get@example.com", "name": "Get User"}
        )
        user_id = create_response.json()["id"]

        # Get user
        response = client.get(f"/api/users/{user_id}")

        assert response.status_code == 200
        assert response.json()["email"] == "get@example.com"

    def test_user_not_found(self, client):
        """Test 404 for non-existent user"""
        response = client.get("/api/users/99999")

        assert response.status_code == 404

    def test_duplicate_email(self, client):
        """Test unique email validation"""
        client.post(
            "/api/users",
            json={"email": "dup@example.com", "name": "First"}
        )

        response = client.post(
            "/api/users",
            json={"email": "dup@example.com", "name": "Second"}
        )

        assert response.status_code == 400
        assert "email" in response.json()["detail"].lower()
```

---

## Async Database Testing

### AsyncPG with Testcontainers

```python
# tests/conftest.py
import pytest
import asyncio
from testcontainers.postgres import PostgresContainer
import asyncpg

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def async_postgres():
    """Start PostgreSQL for async tests"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture(scope="function")
async def async_pool(async_postgres):
    """Create asyncpg connection pool"""
    pool = await asyncpg.create_pool(
        host=async_postgres.get_container_host_ip(),
        port=int(async_postgres.get_exposed_port(5432)),
        user=async_postgres.username,
        password=async_postgres.password,
        database=async_postgres.dbname
    )

    # Create schema
    async with pool.acquire() as conn:
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL
            )
        ''')

    yield pool

    # Cleanup
    async with pool.acquire() as conn:
        await conn.execute('DROP TABLE IF EXISTS users')
    await pool.close()
```

### Async Repository Tests

```python
# tests/test_async_repository.py
import pytest
from app.repositories import AsyncUserRepository

@pytest.mark.asyncio
class TestAsyncUserRepository:
    async def test_create_user(self, async_pool):
        """Test async user creation"""
        repo = AsyncUserRepository(async_pool)

        user = await repo.create(
            email="async@example.com",
            name="Async User"
        )

        assert user["id"] is not None
        assert user["email"] == "async@example.com"

    async def test_concurrent_operations(self, async_pool):
        """Test concurrent database operations"""
        repo = AsyncUserRepository(async_pool)

        # Create multiple users concurrently
        import asyncio
        tasks = [
            repo.create(email=f"user{i}@example.com", name=f"User {i}")
            for i in range(10)
        ]

        users = await asyncio.gather(*tasks)

        assert len(users) == 10
        assert len(set(u["id"] for u in users)) == 10  # All unique IDs
```

---

## Multiple Services

### Compose-Like Setup

```python
# tests/conftest.py
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer
from testcontainers.kafka import KafkaContainer
import pytest

@pytest.fixture(scope="session")
def test_infrastructure():
    """Start all infrastructure services"""
    postgres = PostgresContainer("postgres:15")
    redis = RedisContainer("redis:7")
    kafka = KafkaContainer("confluentinc/cp-kafka:7.4.0")

    postgres.start()
    redis.start()
    kafka.start()

    yield {
        "postgres": postgres,
        "redis": redis,
        "kafka": kafka
    }

    kafka.stop()
    redis.stop()
    postgres.stop()

@pytest.fixture(scope="function")
def app_config(test_infrastructure):
    """Generate app config from test infrastructure"""
    return {
        "database_url": test_infrastructure["postgres"].get_connection_url(),
        "redis_url": f"redis://{test_infrastructure['redis'].get_container_host_ip()}:{test_infrastructure['redis'].get_exposed_port(6379)}",
        "kafka_bootstrap_servers": test_infrastructure["kafka"].get_bootstrap_server()
    }
```

---

## Custom Container Images

### Testing with Custom Postgres

```python
# tests/conftest.py
from testcontainers.core.container import DockerContainer
from testcontainers.core.waiting_utils import wait_for_logs

class CustomPostgresContainer(DockerContainer):
    """PostgreSQL with custom extensions"""

    def __init__(self):
        super().__init__("postgres:15")
        self.with_env("POSTGRES_USER", "test")
        self.with_env("POSTGRES_PASSWORD", "test")
        self.with_env("POSTGRES_DB", "testdb")
        self.with_exposed_ports(5432)
        # Add custom initialization
        self.with_volume_mapping(
            "./tests/init.sql",
            "/docker-entrypoint-initdb.d/init.sql"
        )

    def start(self):
        super().start()
        wait_for_logs(self, "database system is ready to accept connections")
        return self

    def get_connection_url(self):
        host = self.get_container_host_ip()
        port = self.get_exposed_port(5432)
        return f"postgresql://test:test@{host}:{port}/testdb"

@pytest.fixture(scope="session")
def custom_postgres():
    """Use custom Postgres container"""
    container = CustomPostgresContainer()
    container.start()
    yield container
    container.stop()
```

---

## Test Data Factories

### Using factory_boy with Testcontainers

```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.models import User, Order

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session = None  # Set dynamically

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")

class OrderFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session = None

    user = factory.SubFactory(UserFactory)
    total = factory.Faker("pydecimal", left_digits=3, right_digits=2, positive=True)
    status = "pending"

# tests/conftest.py
@pytest.fixture(scope="function")
def factories(db_session):
    """Configure factories with test session"""
    UserFactory._meta.sqlalchemy_session = db_session
    OrderFactory._meta.sqlalchemy_session = db_session

    return {
        "user": UserFactory,
        "order": OrderFactory
    }

# tests/test_orders.py
class TestOrderService:
    def test_calculate_user_total(self, db_session, factories):
        """Test calculating user's total orders"""
        user = factories["user"].create()
        factories["order"].create_batch(3, user=user, total=100)

        service = OrderService(db_session)
        total = service.get_user_total(user.id)

        assert total == 300
```

---

## Performance Considerations

### Container Reuse

```python
# tests/conftest.py
import pytest
from testcontainers.postgres import PostgresContainer

# Module-scoped for better performance
@pytest.fixture(scope="module")
def postgres():
    """Reuse container across module"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture(scope="function")
def clean_db(postgres, db_engine):
    """Reset database state between tests"""
    from app.models import Base

    # Fast cleanup with TRUNCATE
    with db_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(f'TRUNCATE TABLE {table.name} CASCADE')
        conn.commit()

    yield
```

### Parallel Test Execution

```python
# pytest.ini
[pytest]
addopts = -n auto  # pytest-xdist for parallel tests

# tests/conftest.py
@pytest.fixture(scope="session")
def postgres(worker_id):
    """Separate container per test worker"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres
```

---

## Best Practices

1. **Scope fixtures appropriately** - session for containers, function for data
2. **Clean state between tests** - use TRUNCATE or recreate tables
3. **Use factories** for test data generation
4. **Test edge cases** - nulls, constraints, concurrent access
5. **Keep tests focused** - one behavior per test
6. **Parallel execution** - separate containers per worker

---

## Conclusion

Testcontainers eliminates the gap between tests and production. Key takeaways:

- **Real databases** catch real bugs
- **Isolation** prevents test interference
- **Automatic cleanup** keeps tests reliable
- **Session-scoped containers** balance speed and isolation

---

*Need to monitor your integration tests? [OneUptime](https://oneuptime.com) provides test monitoring and alerts for your CI/CD pipelines.*
