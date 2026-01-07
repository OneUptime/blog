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

Install the testcontainers package with the modules you need. The package supports PostgreSQL, Redis, Kafka, and many other services.

```bash
pip install testcontainers[postgresql] testcontainers[redis] pytest pytest-asyncio
```

---

## PostgreSQL Integration Tests

### Basic Setup

This fixture configuration creates a PostgreSQL container once per test session (for speed) and provides a fresh database session for each test (for isolation). The session fixture handles table creation and cleanup.

```python
# tests/conftest.py
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def postgres_container():
    """Start PostgreSQL container for test session - reused across all tests"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres  # Container stays up for entire session

@pytest.fixture(scope="session")
def db_engine(postgres_container):
    """Create SQLAlchemy engine from container connection"""
    engine = create_engine(postgres_container.get_connection_url())
    return engine

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create fresh database session for each test"""
    # Create tables before test
    from app.models import Base
    Base.metadata.create_all(db_engine)

    Session = sessionmaker(bind=db_engine)
    session = Session()

    yield session  # Run test with this session

    # Cleanup after test
    session.rollback()  # Discard uncommitted changes
    session.close()
    Base.metadata.drop_all(db_engine)  # Clean slate for next test
```

### Testing Repository Layer

With real PostgreSQL, you can test actual SQL behavior, constraints, and transactions. These tests verify that your repository code works correctly with the database.

```python
# tests/test_user_repository.py
import pytest
from app.repositories import UserRepository
from app.models import User

class TestUserRepository:
    def test_create_user(self, db_session):
        """Test creating a user in real PostgreSQL"""
        repo = UserRepository(db_session)

        # Create user through repository
        user = repo.create(
            email="test@example.com",
            name="Test User"
        )

        # Verify returned object
        assert user.id is not None  # ID assigned by database
        assert user.email == "test@example.com"

        # Verify persisted in database
        fetched = db_session.query(User).filter_by(id=user.id).first()
        assert fetched is not None
        assert fetched.email == "test@example.com"

    def test_find_by_email(self, db_session):
        """Test finding user by email"""
        repo = UserRepository(db_session)

        # Create user first
        repo.create(email="find@example.com", name="Find Me")

        # Find user by email
        user = repo.find_by_email("find@example.com")

        assert user is not None
        assert user.name == "Find Me"

    def test_unique_email_constraint(self, db_session):
        """Test database enforces unique emails - catches constraint violations"""
        repo = UserRepository(db_session)

        repo.create(email="unique@example.com", name="First")

        # Second create with same email should fail
        with pytest.raises(Exception):  # IntegrityError from database
            repo.create(email="unique@example.com", name="Second")
```

---

## Redis Integration Tests

### Redis Fixture

Redis fixtures follow the same pattern: session-scoped container for performance, function-scoped client with automatic cleanup between tests.

```python
# tests/conftest.py
from testcontainers.redis import RedisContainer
import redis

@pytest.fixture(scope="session")
def redis_container():
    """Start Redis container - reused across session"""
    with RedisContainer("redis:7") as container:
        yield container

@pytest.fixture(scope="function")
def redis_client(redis_container):
    """Create Redis client, flush between tests for isolation"""
    client = redis.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True  # Return strings instead of bytes
    )
    yield client
    client.flushall()  # Clean all data after each test
```

### Testing Cache Layer

Real Redis tests verify that caching logic works correctly, including TTL expiration and pattern-based invalidation.

```python
# tests/test_cache.py
import pytest
from app.cache import CacheService

class TestCacheService:
    def test_set_and_get(self, redis_client):
        """Test basic cache operations with real Redis"""
        cache = CacheService(redis_client)

        cache.set("key", {"data": "value"}, ttl=300)
        result = cache.get("key")

        assert result == {"data": "value"}

    def test_cache_expiration(self, redis_client):
        """Test cache TTL with real Redis timing"""
        cache = CacheService(redis_client)

        cache.set("expiring", "data", ttl=1)  # 1 second TTL

        # Immediately available
        assert cache.get("expiring") == "data"

        # Wait for expiration
        import time
        time.sleep(1.5)  # Wait past TTL

        # Should be gone
        assert cache.get("expiring") is None

    def test_cache_invalidation(self, redis_client):
        """Test cache invalidation patterns with real Redis"""
        cache = CacheService(redis_client)

        # Set multiple related keys
        cache.set("user:1:profile", {"name": "Alice"})
        cache.set("user:1:settings", {"theme": "dark"})

        # Invalidate all user keys with pattern
        cache.invalidate_pattern("user:1:*")

        # Both should be gone
        assert cache.get("user:1:profile") is None
        assert cache.get("user:1:settings") is None
```

---

## FastAPI Integration Tests

### Full API Testing

This configuration starts all required services and creates a properly configured FastAPI test client. Environment variables point the app to test containers instead of production services.

```python
# tests/conftest.py
from fastapi.testclient import TestClient
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer
import pytest

@pytest.fixture(scope="session")
def services():
    """Start all required services for integration tests"""
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

    # Point app to test containers via environment variables
    os.environ["DATABASE_URL"] = services["postgres"].get_connection_url()
    os.environ["REDIS_URL"] = f"redis://{services['redis'].get_container_host_ip()}:{services['redis'].get_exposed_port(6379)}"

    # Import app after setting environment (important!)
    from app.main import create_app
    app = create_app()

    # Create tables for this test
    from app.database import engine
    from app.models import Base
    Base.metadata.create_all(engine)

    yield app

    # Cleanup tables
    Base.metadata.drop_all(engine)

@pytest.fixture(scope="function")
def client(app):
    """Create test client for making HTTP requests"""
    return TestClient(app)
```

### Testing API Endpoints

Full integration tests verify the entire request/response cycle including database operations, validation, and error handling.

```python
# tests/test_api.py
import pytest

class TestUserAPI:
    def test_create_user(self, client):
        """Test user creation endpoint with real database"""
        response = client.post(
            "/api/users",
            json={"email": "new@example.com", "name": "New User"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert "id" in data  # Database-generated ID

    def test_get_user(self, client):
        """Test user retrieval after creation"""
        # Create user first
        create_response = client.post(
            "/api/users",
            json={"email": "get@example.com", "name": "Get User"}
        )
        user_id = create_response.json()["id"]

        # Get the created user
        response = client.get(f"/api/users/{user_id}")

        assert response.status_code == 200
        assert response.json()["email"] == "get@example.com"

    def test_user_not_found(self, client):
        """Test 404 for non-existent user"""
        response = client.get("/api/users/99999")

        assert response.status_code == 404

    def test_duplicate_email(self, client):
        """Test unique email validation at API level"""
        # Create first user
        client.post(
            "/api/users",
            json={"email": "dup@example.com", "name": "First"}
        )

        # Try to create second with same email
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

For async applications using asyncpg, create an async-compatible fixture that provides a connection pool for concurrent database operations.

```python
# tests/conftest.py
import pytest
import asyncio
from testcontainers.postgres import PostgresContainer
import asyncpg

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests - required by pytest-asyncio"""
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
    """Create asyncpg connection pool for async database operations"""
    pool = await asyncpg.create_pool(
        host=async_postgres.get_container_host_ip(),
        port=int(async_postgres.get_exposed_port(5432)),
        user=async_postgres.username,
        password=async_postgres.password,
        database=async_postgres.dbname
    )

    # Create schema for tests
    async with pool.acquire() as conn:
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL
            )
        ''')

    yield pool

    # Cleanup after test
    async with pool.acquire() as conn:
        await conn.execute('DROP TABLE IF EXISTS users')
    await pool.close()
```

### Async Repository Tests

Async tests can verify concurrent database operations, which is important for high-throughput applications.

```python
# tests/test_async_repository.py
import pytest
from app.repositories import AsyncUserRepository

@pytest.mark.asyncio
class TestAsyncUserRepository:
    async def test_create_user(self, async_pool):
        """Test async user creation with real database"""
        repo = AsyncUserRepository(async_pool)

        user = await repo.create(
            email="async@example.com",
            name="Async User"
        )

        assert user["id"] is not None
        assert user["email"] == "async@example.com"

    async def test_concurrent_operations(self, async_pool):
        """Test concurrent database operations don't conflict"""
        repo = AsyncUserRepository(async_pool)

        # Create multiple users concurrently
        import asyncio
        tasks = [
            repo.create(email=f"user{i}@example.com", name=f"User {i}")
            for i in range(10)
        ]

        # All should succeed without conflicts
        users = await asyncio.gather(*tasks)

        assert len(users) == 10
        assert len(set(u["id"] for u in users)) == 10  # All unique IDs
```

---

## Multiple Services

### Compose-Like Setup

For applications requiring multiple services, start all containers in one fixture. This provides a consistent test environment that mirrors production.

```python
# tests/conftest.py
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer
from testcontainers.kafka import KafkaContainer
import pytest

@pytest.fixture(scope="session")
def test_infrastructure():
    """Start all infrastructure services - like docker-compose for tests"""
    # Create containers (not started yet)
    postgres = PostgresContainer("postgres:15")
    redis = RedisContainer("redis:7")
    kafka = KafkaContainer("confluentinc/cp-kafka:7.4.0")

    # Start all containers
    postgres.start()
    redis.start()
    kafka.start()

    yield {
        "postgres": postgres,
        "redis": redis,
        "kafka": kafka
    }

    # Stop in reverse order
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

When you need custom extensions or initialization scripts, create a custom container class. This allows you to test with the exact database configuration you use in production.

```python
# tests/conftest.py
from testcontainers.core.container import DockerContainer
from testcontainers.core.waiting_utils import wait_for_logs

class CustomPostgresContainer(DockerContainer):
    """PostgreSQL with custom extensions and initialization"""

    def __init__(self):
        super().__init__("postgres:15")
        # Set environment variables for PostgreSQL
        self.with_env("POSTGRES_USER", "test")
        self.with_env("POSTGRES_PASSWORD", "test")
        self.with_env("POSTGRES_DB", "testdb")
        self.with_exposed_ports(5432)
        # Mount custom initialization SQL
        self.with_volume_mapping(
            "./tests/init.sql",
            "/docker-entrypoint-initdb.d/init.sql"
        )

    def start(self):
        super().start()
        # Wait for database to be ready before returning
        wait_for_logs(self, "database system is ready to accept connections")
        return self

    def get_connection_url(self):
        """Build connection URL from container settings"""
        host = self.get_container_host_ip()
        port = self.get_exposed_port(5432)
        return f"postgresql://test:test@{host}:{port}/testdb"

@pytest.fixture(scope="session")
def custom_postgres():
    """Use custom Postgres container with extensions"""
    container = CustomPostgresContainer()
    container.start()
    yield container
    container.stop()
```

---

## Test Data Factories

### Using factory_boy with Testcontainers

Factory_boy creates realistic test data without manual object construction. Combined with Testcontainers, you get realistic data in a real database.

```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.models import User, Order

class UserFactory(SQLAlchemyModelFactory):
    """Factory for creating User test objects"""
    class Meta:
        model = User
        sqlalchemy_session = None  # Set dynamically per test

    email = factory.Sequence(lambda n: f"user{n}@example.com")  # Unique emails
    name = factory.Faker("name")  # Random realistic names

class OrderFactory(SQLAlchemyModelFactory):
    """Factory for creating Order test objects with associated User"""
    class Meta:
        model = Order
        sqlalchemy_session = None

    user = factory.SubFactory(UserFactory)  # Auto-create related user
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
        # Create user and orders using factories
        user = factories["user"].create()
        factories["order"].create_batch(3, user=user, total=100)

        service = OrderService(db_session)
        total = service.get_user_total(user.id)

        assert total == 300
```

---

## Performance Considerations

### Container Reuse

Module-scoped fixtures balance isolation with performance. TRUNCATE is faster than dropping/recreating tables.

```python
# tests/conftest.py
import pytest
from testcontainers.postgres import PostgresContainer

# Module-scoped for better performance - container reused within module
@pytest.fixture(scope="module")
def postgres():
    """Reuse container across module"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture(scope="function")
def clean_db(postgres, db_engine):
    """Reset database state between tests using TRUNCATE"""
    from app.models import Base

    # Fast cleanup with TRUNCATE (faster than DROP/CREATE)
    with db_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(f'TRUNCATE TABLE {table.name} CASCADE')
        conn.commit()

    yield
```

### Parallel Test Execution

For parallel tests with pytest-xdist, each worker needs its own container to prevent conflicts.

```python
# pytest.ini
[pytest]
addopts = -n auto  # pytest-xdist for parallel tests

# tests/conftest.py
@pytest.fixture(scope="session")
def postgres(worker_id):
    """Separate container per test worker for parallel execution"""
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
