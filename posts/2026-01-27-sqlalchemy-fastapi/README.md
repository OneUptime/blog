# How to Use SQLAlchemy with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, SQLAlchemy, Database, ORM, Async, Alembic, Testing

Description: Learn how to integrate SQLAlchemy 2.0 with FastAPI for building high-performance async database applications with proper session management, dependency injection, and migrations.

---

> SQLAlchemy 2.0 brings native async support, making it the perfect ORM companion for FastAPI. This combination delivers type-safe database operations with the performance benefits of async/await, while maintaining clean, testable code through dependency injection.

Modern web applications demand efficient database access. FastAPI's async nature combined with SQLAlchemy 2.0's native async support creates a powerful stack for building scalable APIs.

---

## Setting Up Async SQLAlchemy 2.0

SQLAlchemy 2.0 introduced a completely rewritten async engine. Here is how to configure it with FastAPI:

### Installation

```bash
# Install required packages
pip install fastapi sqlalchemy[asyncio] asyncpg alembic uvicorn
```

### Database Configuration

```python
# database.py
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

# Database URL for PostgreSQL with asyncpg driver
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

# Create async engine with connection pooling
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    pool_size=5,  # Number of connections to keep open
    max_overflow=10,  # Additional connections when pool is exhausted
    pool_timeout=30,  # Seconds to wait for a connection
    pool_recycle=1800,  # Recycle connections after 30 minutes
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevent lazy loading issues after commit
)


# Base class for all models
class Base(DeclarativeBase):
    """Base class for SQLAlchemy models"""
    pass


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides an async database session.
    Automatically handles commit/rollback and session cleanup.
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

## Defining Models

SQLAlchemy 2.0 uses a more Pythonic approach with type annotations:

```python
# models.py
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import List, Optional
from datetime import datetime
from database import Base


class User(Base):
    """User model representing application users"""
    __tablename__ = "users"

    # Primary key with auto-increment
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Required fields with constraints
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Optional fields with defaults
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps with server defaults
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship to posts (one-to-many)
    posts: Mapped[List["Post"]] = relationship(
        "Post", back_populates="author", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"


class Post(Base):
    """Post model representing blog posts"""
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    # Foreign key to users table
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship back to user
    author: Mapped["User"] = relationship("User", back_populates="posts")

    def __repr__(self) -> str:
        return f"<Post(id={self.id}, title={self.title})>"
```

---

## Session Management and Dependency Injection

FastAPI's dependency injection system integrates perfectly with SQLAlchemy sessions:

```python
# dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from database import get_async_session

# Type alias for cleaner dependency injection
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]


# Alternative: Session with transaction control
async def get_session_with_transaction() -> AsyncSession:
    """
    Provides a session that automatically begins a transaction.
    Useful when you need explicit transaction boundaries.
    """
    async with async_session_maker() as session:
        async with session.begin():
            yield session
```

### Using Sessions in Routes

```python
# main.py
from fastapi import FastAPI, HTTPException, status
from dependencies import AsyncSessionDep
from sqlalchemy import select
from models import User

app = FastAPI(title="SQLAlchemy FastAPI Demo")


@app.get("/users/{user_id}")
async def get_user(user_id: int, session: AsyncSessionDep):
    """
    Fetch a user by ID using dependency-injected session.
    The session is automatically managed by FastAPI.
    """
    # Execute async query
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    return user
```

---

## CRUD Operations

Create a repository pattern for clean, reusable database operations:

```python
# crud.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional, TypeVar, Generic, Type
from pydantic import BaseModel
from models import User, Post, Base

# Generic type for models
ModelType = TypeVar("ModelType", bound=Base)


class CRUDBase(Generic[ModelType]):
    """
    Generic CRUD operations for any SQLAlchemy model.
    Provides reusable create, read, update, delete methods.
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(
        self, session: AsyncSession, id: int
    ) -> Optional[ModelType]:
        """Fetch a single record by ID"""
        result = await session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ModelType]:
        """Fetch multiple records with pagination"""
        result = await session.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(
        self, session: AsyncSession, obj_in: dict
    ) -> ModelType:
        """Create a new record"""
        db_obj = self.model(**obj_in)
        session.add(db_obj)
        await session.flush()  # Flush to get the ID
        await session.refresh(db_obj)  # Refresh to load relationships
        return db_obj

    async def update(
        self,
        session: AsyncSession,
        id: int,
        obj_in: dict,
    ) -> Optional[ModelType]:
        """Update an existing record"""
        await session.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**obj_in)
        )
        return await self.get(session, id)

    async def delete(
        self, session: AsyncSession, id: int
    ) -> bool:
        """Delete a record by ID"""
        result = await session.execute(
            delete(self.model).where(self.model.id == id)
        )
        return result.rowcount > 0


class CRUDUser(CRUDBase[User]):
    """User-specific CRUD operations"""

    async def get_by_email(
        self, session: AsyncSession, email: str
    ) -> Optional[User]:
        """Fetch user by email address"""
        result = await session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_username(
        self, session: AsyncSession, username: str
    ) -> Optional[User]:
        """Fetch user by username"""
        result = await session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def get_with_posts(
        self, session: AsyncSession, user_id: int
    ) -> Optional[User]:
        """Fetch user with all their posts eagerly loaded"""
        result = await session.execute(
            select(User)
            .options(selectinload(User.posts))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()


class CRUDPost(CRUDBase[Post]):
    """Post-specific CRUD operations"""

    async def get_by_author(
        self,
        session: AsyncSession,
        author_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Post]:
        """Fetch all posts by a specific author"""
        result = await session.execute(
            select(Post)
            .where(Post.author_id == author_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_published(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Post]:
        """Fetch all published posts"""
        result = await session.execute(
            select(Post)
            .where(Post.is_published == True)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())


# Create CRUD instances
crud_user = CRUDUser(User)
crud_post = CRUDPost(Post)
```

---

## Working with Relationships

SQLAlchemy 2.0 handles relationships efficiently with async loading strategies:

```python
# relationships.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload, lazyload
from models import User, Post


async def get_user_with_posts_selectin(
    session: AsyncSession, user_id: int
) -> User:
    """
    Use selectinload for one-to-many relationships.
    Executes a separate SELECT IN query for related objects.
    Best for: Loading many related objects.
    """
    result = await session.execute(
        select(User)
        .options(selectinload(User.posts))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_post_with_author_joined(
    session: AsyncSession, post_id: int
) -> Post:
    """
    Use joinedload for many-to-one relationships.
    Executes a single JOIN query.
    Best for: Loading a single related object.
    """
    result = await session.execute(
        select(Post)
        .options(joinedload(Post.author))
        .where(Post.id == post_id)
    )
    return result.scalar_one_or_none()


async def get_users_with_post_count(session: AsyncSession):
    """
    Complex query with aggregation.
    Returns users with their post counts.
    """
    from sqlalchemy import func

    result = await session.execute(
        select(
            User.id,
            User.username,
            func.count(Post.id).label("post_count")
        )
        .outerjoin(Post, User.id == Post.author_id)
        .group_by(User.id, User.username)
    )
    return result.all()
```

---

## Database Migrations with Alembic

Alembic handles database schema migrations for SQLAlchemy:

### Initialize Alembic

```bash
# Initialize Alembic in your project
alembic init alembic
```

### Configure Alembic for Async

```python
# alembic/env.py
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Import your models and Base
from models import Base
from database import DATABASE_URL

# Alembic Config object
config = context.config

# Set the database URL
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Generates SQL script without connecting to database.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Execute migrations with the given connection"""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in 'online' mode with async engine.
    Creates an async Engine and associates a connection with the context.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run async migrations"""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Create and Apply Migrations

```bash
# Generate a new migration based on model changes
alembic revision --autogenerate -m "Add users and posts tables"

# Apply all pending migrations
alembic upgrade head

# Downgrade one migration
alembic downgrade -1

# View migration history
alembic history --verbose

# Show current revision
alembic current
```

### Example Migration File

```python
# alembic/versions/001_add_users_and_posts.py
"""Add users and posts tables

Revision ID: 001
Revises:
Create Date: 2026-01-27 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users and posts tables"""
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("is_superuser", sa.Boolean(), default=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Create indexes for users
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    # Create posts table
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_published", sa.Boolean(), default=False),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    """Drop posts and users tables"""
    op.drop_table("posts")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
```

---

## Testing with SQLAlchemy

Create isolated test fixtures using pytest and an in-memory database:

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from typing import AsyncGenerator

from database import Base, get_async_session
from main import app
from models import User, Post

# Use SQLite for testing (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_engine():
    """Create a test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session"""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(async_session) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency"""

    async def override_get_session():
        yield async_session

    # Override the database dependency
    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_user(async_session) -> User:
    """Create a sample user for testing"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashedpassword123",
        full_name="Test User",
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def sample_post(async_session, sample_user) -> Post:
    """Create a sample post for testing"""
    post = Post(
        title="Test Post",
        content="This is test content",
        is_published=True,
        author_id=sample_user.id,
    )
    async_session.add(post)
    await async_session.commit()
    await async_session.refresh(post)
    return post
```

### Writing Tests

```python
# tests/test_users.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import User
from crud import crud_user


@pytest.mark.asyncio
async def test_create_user(async_session: AsyncSession):
    """Test creating a new user"""
    user_data = {
        "email": "new@example.com",
        "username": "newuser",
        "hashed_password": "hashedpass",
    }

    user = await crud_user.create(async_session, user_data)

    assert user.id is not None
    assert user.email == "new@example.com"
    assert user.username == "newuser"


@pytest.mark.asyncio
async def test_get_user_by_email(
    async_session: AsyncSession, sample_user: User
):
    """Test fetching user by email"""
    user = await crud_user.get_by_email(
        async_session, sample_user.email
    )

    assert user is not None
    assert user.id == sample_user.id


@pytest.mark.asyncio
async def test_get_user_not_found(async_session: AsyncSession):
    """Test fetching non-existent user returns None"""
    user = await crud_user.get(async_session, 99999)

    assert user is None


@pytest.mark.asyncio
async def test_update_user(
    async_session: AsyncSession, sample_user: User
):
    """Test updating user data"""
    updated = await crud_user.update(
        async_session,
        sample_user.id,
        {"full_name": "Updated Name"},
    )

    assert updated.full_name == "Updated Name"


@pytest.mark.asyncio
async def test_delete_user(
    async_session: AsyncSession, sample_user: User
):
    """Test deleting a user"""
    deleted = await crud_user.delete(async_session, sample_user.id)

    assert deleted is True

    # Verify user is deleted
    user = await crud_user.get(async_session, sample_user.id)
    assert user is None


@pytest.mark.asyncio
async def test_get_user_endpoint(
    client: AsyncClient, sample_user: User
):
    """Test GET /users/{user_id} endpoint"""
    response = await client.get(f"/users/{sample_user.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == sample_user.email


@pytest.mark.asyncio
async def test_get_user_not_found_endpoint(client: AsyncClient):
    """Test GET /users/{user_id} returns 404 for non-existent user"""
    response = await client.get("/users/99999")

    assert response.status_code == 404
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Use async sessions** | Always use `AsyncSession` with FastAPI for non-blocking database access |
| **Dependency injection** | Inject sessions via FastAPI's `Depends()` for clean, testable code |
| **Repository pattern** | Create CRUD classes for reusable database operations |
| **Eager loading** | Use `selectinload` or `joinedload` to avoid N+1 query problems |
| **Connection pooling** | Configure pool size based on expected concurrent connections |
| **Expire on commit** | Set `expire_on_commit=False` to prevent lazy loading issues |
| **Transaction boundaries** | Let FastAPI handle transactions via the session dependency |
| **Migration discipline** | Always use Alembic for schema changes, never modify directly |
| **Test isolation** | Use separate test databases with fixture-based cleanup |
| **Type hints** | Use `Mapped[]` annotations for better IDE support and type safety |

### Performance Tips

```python
# 1. Bulk inserts for better performance
async def bulk_create_users(session: AsyncSession, users: list[dict]):
    """Use add_all for bulk inserts"""
    db_users = [User(**u) for u in users]
    session.add_all(db_users)
    await session.flush()

# 2. Use streaming for large result sets
async def stream_all_users(session: AsyncSession):
    """Stream results to reduce memory usage"""
    result = await session.stream(select(User))
    async for user in result.scalars():
        yield user

# 3. Use execute for raw SQL when needed
async def execute_raw_query(session: AsyncSession):
    """Execute raw SQL for complex queries"""
    from sqlalchemy import text
    result = await session.execute(
        text("SELECT * FROM users WHERE created_at > :date"),
        {"date": "2026-01-01"},
    )
    return result.fetchall()
```

---

## Conclusion

SQLAlchemy 2.0 and FastAPI form a powerful combination for building modern async APIs. Key takeaways:

- **Async-first**: Use `create_async_engine` and `AsyncSession` for non-blocking database access
- **Clean architecture**: Implement dependency injection for sessions and repository pattern for CRUD
- **Type safety**: Leverage SQLAlchemy 2.0's `Mapped` types for better code quality
- **Migration workflow**: Always use Alembic to manage schema changes
- **Testability**: Override dependencies in tests for isolated, reliable test suites

With these patterns, you can build scalable, maintainable database-driven applications.

---

*Need to monitor your FastAPI application's database performance? [OneUptime](https://oneuptime.com) provides comprehensive observability for Python applications, including query performance tracking and error monitoring.*
