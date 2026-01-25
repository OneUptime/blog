# How to Work with SQLAlchemy ORM in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, SQLAlchemy, ORM, Database, PostgreSQL, MySQL, SQL

Description: Learn how to use SQLAlchemy ORM for database operations in Python. This guide covers models, relationships, queries, sessions, and best practices for production applications.

---

> SQLAlchemy is Python's most powerful and flexible ORM (Object-Relational Mapping) library. It lets you work with databases using Python objects instead of writing raw SQL, while still giving you full control when you need it.

This guide covers SQLAlchemy 2.0 patterns, showing you how to define models, create relationships, and perform efficient queries.

---

## Getting Started

### Installation

```bash
# Core SQLAlchemy
pip install sqlalchemy

# Database drivers
pip install psycopg2-binary  # PostgreSQL
pip install pymysql          # MySQL
pip install aiosqlite        # Async SQLite
```

### Basic Setup

```python
# database.py
# Database connection and session setup
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database URL format: dialect+driver://user:password@host:port/database
DATABASE_URL = "postgresql://user:password@localhost/mydb"

# For SQLite (file-based)
# DATABASE_URL = "sqlite:///./app.db"

# Create the engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Log SQL statements (disable in production)
    pool_size=5,  # Connection pool size
    max_overflow=10  # Extra connections when pool is full
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for getting database sessions
def get_db():
    """Yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Defining Models

```python
# models.py
# SQLAlchemy model definitions
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    """User model representing application users."""
    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Required fields
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Optional fields with defaults
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship to posts (one-to-many)
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"


class Post(Base):
    """Blog post model."""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    published = Column(Boolean, default=False)

    # Foreign key to users
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="posts")
    tags = relationship("Tag", secondary="post_tags", back_populates="posts")


class Tag(Base):
    """Tag model for categorizing posts."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)

    # Many-to-many relationship with posts
    posts = relationship("Post", secondary="post_tags", back_populates="tags")


# Association table for many-to-many relationship
from sqlalchemy import Table

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True)
)
```

---

## Creating Tables

```python
# create_tables.py
# Create all tables in the database
from database import engine, Base
from models import User, Post, Tag  # Import models to register them

def create_tables():
    """Create all tables defined in models."""
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully")

def drop_tables():
    """Drop all tables (use with caution!)."""
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped")

if __name__ == "__main__":
    create_tables()
```

---

## CRUD Operations

### Create

```python
# crud.py
# Database operations
from sqlalchemy.orm import Session
from models import User, Post, Tag

def create_user(db: Session, email: str, username: str, hashed_password: str) -> User:
    """Create a new user."""
    user = User(
        email=email,
        username=username,
        hashed_password=hashed_password
    )
    db.add(user)
    db.commit()
    db.refresh(user)  # Refresh to get generated values (id, created_at)
    return user

def create_post(db: Session, title: str, content: str, author_id: int) -> Post:
    """Create a new post."""
    post = Post(
        title=title,
        content=content,
        author_id=author_id
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

def create_post_with_tags(db: Session, title: str, content: str, author_id: int, tag_names: list) -> Post:
    """Create a post with tags, creating tags if they do not exist."""
    # Get or create tags
    tags = []
    for name in tag_names:
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
        tags.append(tag)

    # Create post with tags
    post = Post(
        title=title,
        content=content,
        author_id=author_id,
        tags=tags
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
```

### Read

```python
# queries.py
# Query examples
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, and_, or_, func
from models import User, Post, Tag

def get_user_by_id(db: Session, user_id: int) -> User:
    """Get a user by ID."""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> User:
    """Get a user by email."""
    return db.query(User).filter(User.email == email).first()

def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list:
    """Get all users with pagination."""
    return db.query(User).offset(skip).limit(limit).all()

def get_active_users(db: Session) -> list:
    """Get only active users."""
    return db.query(User).filter(User.is_active == True).all()

def search_users(db: Session, query: str) -> list:
    """Search users by username or email."""
    search_pattern = f"%{query}%"
    return db.query(User).filter(
        or_(
            User.username.ilike(search_pattern),
            User.email.ilike(search_pattern)
        )
    ).all()

def get_user_with_posts(db: Session, user_id: int) -> User:
    """Get a user with their posts eagerly loaded."""
    return db.query(User)\
        .options(joinedload(User.posts))\
        .filter(User.id == user_id)\
        .first()

def get_posts_with_tags(db: Session) -> list:
    """Get all posts with their tags eagerly loaded."""
    return db.query(Post)\
        .options(selectinload(Post.tags))\
        .all()

def get_posts_by_tag(db: Session, tag_name: str) -> list:
    """Get all posts with a specific tag."""
    return db.query(Post)\
        .join(Post.tags)\
        .filter(Tag.name == tag_name)\
        .all()

def count_posts_by_user(db: Session) -> list:
    """Get post count for each user."""
    return db.query(
        User.username,
        func.count(Post.id).label('post_count')
    ).outerjoin(Post).group_by(User.id).all()
```

### Update

```python
def update_user(db: Session, user_id: int, **kwargs) -> User:
    """Update a user's attributes."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # Update only provided fields
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user

def bulk_update_users(db: Session, user_ids: list, is_active: bool):
    """Update multiple users at once."""
    db.query(User)\
        .filter(User.id.in_(user_ids))\
        .update({User.is_active: is_active}, synchronize_session='fetch')
    db.commit()

def publish_post(db: Session, post_id: int) -> Post:
    """Publish a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        post.published = True
        db.commit()
        db.refresh(post)
    return post
```

### Delete

```python
def delete_user(db: Session, user_id: int) -> bool:
    """Delete a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    db.delete(user)
    db.commit()
    return True

def delete_old_posts(db: Session, days: int = 30):
    """Delete posts older than specified days."""
    from datetime import datetime, timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    deleted_count = db.query(Post)\
        .filter(Post.created_at < cutoff_date)\
        .filter(Post.published == False)\
        .delete(synchronize_session='fetch')

    db.commit()
    return deleted_count
```

---

## Advanced Queries

### Using SQLAlchemy 2.0 Style

```python
# sqlalchemy2_queries.py
# Modern SQLAlchemy 2.0 query syntax
from sqlalchemy import select, insert, update, delete
from sqlalchemy.orm import Session

def get_user_by_id_v2(db: Session, user_id: int) -> User:
    """Get user using SQLAlchemy 2.0 select statement."""
    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    return result.scalar_one_or_none()

def get_users_ordered(db: Session) -> list:
    """Get users ordered by creation date."""
    stmt = select(User).order_by(User.created_at.desc())
    result = db.execute(stmt)
    return result.scalars().all()

def complex_query(db: Session):
    """Complex query with joins and aggregations."""
    stmt = (
        select(
            User.username,
            func.count(Post.id).label('total_posts'),
            func.count(Post.id).filter(Post.published == True).label('published_posts')
        )
        .outerjoin(Post, User.id == Post.author_id)
        .group_by(User.id)
        .having(func.count(Post.id) > 0)
        .order_by(func.count(Post.id).desc())
    )
    result = db.execute(stmt)
    return result.all()
```

### Transactions

```python
# transactions.py
# Managing database transactions
from sqlalchemy.orm import Session
from contextlib import contextmanager

@contextmanager
def transaction(db: Session):
    """Context manager for database transactions."""
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise

def transfer_posts(db: Session, from_user_id: int, to_user_id: int):
    """Transfer all posts from one user to another."""
    with transaction(db):
        # Update all posts from the source user
        db.query(Post)\
            .filter(Post.author_id == from_user_id)\
            .update({Post.author_id: to_user_id})

        # This commit happens automatically if no exception

def create_user_with_welcome_post(db: Session, email: str, username: str, password_hash: str):
    """Create a user and their welcome post atomically."""
    try:
        # Create user
        user = User(email=email, username=username, hashed_password=password_hash)
        db.add(user)
        db.flush()  # Get the user ID without committing

        # Create welcome post
        welcome_post = Post(
            title=f"Welcome {username}!",
            content="This is your first post.",
            author_id=user.id,
            published=True
        )
        db.add(welcome_post)

        db.commit()
        return user

    except Exception as e:
        db.rollback()
        raise e
```

---

## Performance Optimization

### Eager Loading

```python
# eager_loading.py
# Prevent N+1 query problems
from sqlalchemy.orm import joinedload, selectinload, subqueryload

def get_users_with_posts_efficient(db: Session) -> list:
    """Get users with posts using eager loading."""
    # joinedload: Single query with JOIN
    # Best for one-to-one or many-to-one
    return db.query(User).options(joinedload(User.posts)).all()

def get_posts_with_all_relations(db: Session) -> list:
    """Get posts with author and tags."""
    return db.query(Post).options(
        joinedload(Post.author),  # Many-to-one: use joinedload
        selectinload(Post.tags)   # Many-to-many: use selectinload
    ).all()

# Compare queries:
# Without eager loading: 1 query for posts + N queries for authors
# With joinedload: 1 query with JOIN
# With selectinload: 2 queries (posts, then tags for all posts)
```

### Bulk Operations

```python
# bulk_operations.py
# Efficient bulk operations
from sqlalchemy.dialects.postgresql import insert as pg_insert

def bulk_create_users(db: Session, users_data: list):
    """Create multiple users efficiently."""
    # Using bulk_insert_mappings (faster than adding one by one)
    db.bulk_insert_mappings(User, users_data)
    db.commit()

def bulk_update_users(db: Session, updates: list):
    """Update multiple users efficiently."""
    # updates = [{'id': 1, 'is_active': True}, {'id': 2, 'is_active': False}]
    db.bulk_update_mappings(User, updates)
    db.commit()

def upsert_tags(db: Session, tag_names: list):
    """Insert or update tags (PostgreSQL specific)."""
    stmt = pg_insert(Tag).values([{'name': name} for name in tag_names])
    stmt = stmt.on_conflict_do_nothing(index_elements=['name'])
    db.execute(stmt)
    db.commit()
```

---

## Async SQLAlchemy

```python
# async_database.py
# Async SQLAlchemy setup
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

ASYNC_DATABASE_URL = "postgresql+asyncpg://user:password@localhost/mydb"

async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session

# Async CRUD
async def async_get_user(db: AsyncSession, user_id: int) -> User:
    """Get user asynchronously."""
    from sqlalchemy import select

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def async_create_user(db: AsyncSession, **kwargs) -> User:
    """Create user asynchronously."""
    user = User(**kwargs)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

---

## Conclusion

SQLAlchemy provides a powerful, flexible way to work with databases in Python:

- Define models using declarative syntax
- Use relationships for related data
- Perform CRUD operations with sessions
- Optimize queries with eager loading
- Use transactions for data integrity
- Scale with async support

Master these patterns to build robust database-driven applications.

---

*Building database-backed Python applications? [OneUptime](https://oneuptime.com) helps you monitor database performance, track slow queries, and ensure your application stays responsive.*

