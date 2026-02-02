# How to Use SQLAlchemy ORM for Database Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, SQLAlchemy, Database, ORM

Description: A comprehensive guide to using SQLAlchemy ORM for database operations in Python. Learn model definitions, relationships, CRUD operations, advanced queries, connection pooling, migrations, and production best practices.

---

> SQLAlchemy is Python's most widely used and powerful Object-Relational Mapping (ORM) library. It provides a full suite of well-known enterprise-level persistence patterns while giving you complete flexibility and control over your database operations.

Whether you are building a small application or a large-scale distributed system, SQLAlchemy offers the tools you need to work with databases effectively. This guide covers everything from basic setup to advanced patterns that you will need in production environments.

---

## Understanding SQLAlchemy Architecture

Before diving into code, it helps to understand how SQLAlchemy is structured.

```mermaid
graph TB
    subgraph "SQLAlchemy Architecture"
        A[Application Code] --> B[ORM Layer]
        A --> C[Core Layer]
        B --> C
        C --> D[Engine]
        D --> E[Connection Pool]
        E --> F[Database]
    end

    subgraph "ORM Components"
        B --> G[Session]
        B --> H[Mapper]
        B --> I[Models]
    end

    subgraph "Core Components"
        C --> J[SQL Expression Language]
        C --> K[Schema/Types]
        C --> L[Dialects]
    end
```

SQLAlchemy consists of two main components: the **Core** layer provides a SQL abstraction with schema management and SQL expression language, while the **ORM** layer builds on top of Core to provide object-relational mapping capabilities.

---

## Getting Started

### Installation

Install SQLAlchemy along with the appropriate database driver for your chosen database.

```bash
# Install SQLAlchemy
pip install sqlalchemy

# Database drivers
pip install psycopg2-binary    # PostgreSQL
pip install pymysql            # MySQL
pip install cx_Oracle          # Oracle
pip install pyodbc             # SQL Server

# For async support
pip install asyncpg            # PostgreSQL async
pip install aiomysql           # MySQL async
```

### Database Connection Setup

The engine is the starting point for any SQLAlchemy application. It manages the connection pool and provides the interface to the database.

```python
# database.py
# This module sets up the database connection and session factory

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool

# Database URL format: dialect+driver://username:password@host:port/database
# Examples for different databases:
# PostgreSQL: postgresql://user:pass@localhost:5432/mydb
# MySQL: mysql+pymysql://user:pass@localhost:3306/mydb
# SQLite: sqlite:///./local.db

DATABASE_URL = "postgresql://user:password@localhost:5432/myapp"

# Create the database engine with connection pooling configuration
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,           # Number of connections to keep open
    max_overflow=20,        # Additional connections when pool is exhausted
    pool_timeout=30,        # Seconds to wait before giving up on getting a connection
    pool_recycle=1800,      # Recycle connections after 30 minutes
    pool_pre_ping=True,     # Verify connections before using them
    echo=False,             # Set to True to log all SQL statements
)

# Create a session factory bound to the engine
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for declarative model definitions
Base = declarative_base()


def get_db():
    """
    Dependency function that provides a database session.
    Use this with FastAPI or similar frameworks for dependency injection.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Defining Models

Models are Python classes that map to database tables. SQLAlchemy uses the declarative system to define models.

### Basic Model Definition

```python
# models/user.py
# User model with common fields and configurations

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Index
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """
    User model representing application users.
    Maps to the 'users' table in the database.
    """
    __tablename__ = "users"

    # Table-level configurations
    __table_args__ = (
        Index('ix_users_email_active', 'email', 'is_active'),  # Composite index
        {'schema': 'public'}  # Optional: specify schema
    )

    # Primary key - auto-incrementing integer
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Required string fields with constraints
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="User's email address"
    )
    username = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    # Password hash storage
    password_hash = Column(String(255), nullable=False)

    # Optional profile fields
    full_name = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)

    # Boolean flags with defaults
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Timestamp fields with automatic values
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    last_login = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        """String representation for debugging."""
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"

    def to_dict(self):
        """Convert model to dictionary for serialization."""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
```

### Defining Relationships

Relationships connect models together, representing foreign key relationships in the database.

```python
# models/post.py
# Post model with relationships to User and Tag

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# Association table for many-to-many relationship between posts and tags
post_tags = Table(
    'post_tags',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)


class Post(Base):
    """
    Blog post model with relationships to User (author) and Tags.
    """
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    excerpt = Column(String(500), nullable=True)

    # Publication status
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Foreign key to users table
    author_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # Many-to-one: each post has one author
    author = relationship(
        "User",
        back_populates="posts",
        lazy="joined"  # Eager load author with post
    )

    # Many-to-many: posts can have multiple tags
    tags = relationship(
        "Tag",
        secondary=post_tags,
        back_populates="posts",
        lazy="selectin"  # Efficient loading for collections
    )

    # One-to-many: post can have multiple comments
    comments = relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan",  # Delete comments when post is deleted
        lazy="dynamic"  # Returns a query object for further filtering
    )


class Tag(Base):
    """Tag model for categorizing posts."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(60), unique=True, nullable=False, index=True)

    # Many-to-many relationship with posts
    posts = relationship(
        "Post",
        secondary=post_tags,
        back_populates="tags"
    )


class Comment(Base):
    """Comment model for user comments on posts."""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)

    # Foreign keys
    post_id = Column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Self-referential relationship for nested comments
    parent_id = Column(Integer, ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    post = relationship("Post", back_populates="comments")
    author = relationship("User")
    parent = relationship("Comment", remote_side=[id], backref="replies")


# Add the posts relationship to User model
User.posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
```

### Relationship Loading Strategies

Understanding lazy loading options is crucial for performance.

```mermaid
graph LR
    subgraph "Loading Strategies"
        A[lazy='select'] --> B[Load on access - N+1 queries]
        C[lazy='joined'] --> D[Single JOIN query]
        E[lazy='selectin'] --> F[Separate SELECT IN query]
        G[lazy='subquery'] --> H[Subquery for collections]
        I[lazy='dynamic'] --> J[Returns Query object]
    end
```

---

## CRUD Operations

### Creating Records

```python
# crud/create.py
# Functions for creating database records

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import User, Post, Tag, Comment
from typing import List, Optional


def create_user(
    db: Session,
    email: str,
    username: str,
    password_hash: str,
    full_name: Optional[str] = None
) -> User:
    """
    Create a new user in the database.

    Args:
        db: Database session
        email: User's email address
        username: Unique username
        password_hash: Hashed password
        full_name: Optional full name

    Returns:
        The created User object

    Raises:
        IntegrityError: If email or username already exists
    """
    user = User(
        email=email,
        username=username,
        password_hash=password_hash,
        full_name=full_name
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)  # Refresh to get auto-generated values
        return user
    except IntegrityError:
        db.rollback()
        raise ValueError("User with this email or username already exists")


def create_post_with_tags(
    db: Session,
    title: str,
    content: str,
    author_id: int,
    tag_names: List[str],
    is_published: bool = False
) -> Post:
    """
    Create a post with associated tags.
    Creates new tags if they do not exist.
    """
    # Generate slug from title
    slug = title.lower().replace(" ", "-")[:220]

    # Get or create tags
    tags = []
    for name in tag_names:
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name, slug=name.lower().replace(" ", "-"))
            db.add(tag)
        tags.append(tag)

    # Create the post
    post = Post(
        title=title,
        slug=slug,
        content=content,
        author_id=author_id,
        is_published=is_published,
        tags=tags
    )

    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def bulk_create_users(db: Session, users_data: List[dict]) -> int:
    """
    Create multiple users efficiently using bulk insert.

    Args:
        db: Database session
        users_data: List of dictionaries with user data

    Returns:
        Number of users created
    """
    db.bulk_insert_mappings(User, users_data)
    db.commit()
    return len(users_data)
```

### Reading Records

```python
# crud/read.py
# Functions for querying database records

from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, func, and_, or_, desc
from models import User, Post, Tag
from typing import List, Optional


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a single user by their ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by their email address."""
    return db.query(User).filter(User.email == email).first()


def get_users_paginated(
    db: Session,
    page: int = 1,
    per_page: int = 20,
    is_active: Optional[bool] = None
) -> dict:
    """
    Get users with pagination and optional filtering.

    Returns:
        Dictionary with items, total, page, and per_page
    """
    query = db.query(User)

    # Apply filter if specified
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # Get total count for pagination
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    users = query.order_by(User.created_at.desc()).offset(offset).limit(per_page).all()

    return {
        "items": users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


def search_users(db: Session, query_string: str) -> List[User]:
    """
    Search users by username or email using ILIKE.
    """
    search_pattern = f"%{query_string}%"
    return db.query(User).filter(
        or_(
            User.username.ilike(search_pattern),
            User.email.ilike(search_pattern),
            User.full_name.ilike(search_pattern)
        )
    ).all()


def get_posts_with_relations(db: Session, published_only: bool = True) -> List[Post]:
    """
    Get posts with their author and tags eagerly loaded.
    This prevents N+1 query problems.
    """
    query = db.query(Post).options(
        joinedload(Post.author),    # Load author in same query
        selectinload(Post.tags)     # Load tags with SELECT IN
    )

    if published_only:
        query = query.filter(Post.is_published == True)

    return query.order_by(desc(Post.published_at)).all()


def get_posts_by_tag(db: Session, tag_slug: str) -> List[Post]:
    """Get all published posts with a specific tag."""
    return db.query(Post).join(Post.tags).filter(
        Tag.slug == tag_slug,
        Post.is_published == True
    ).order_by(desc(Post.published_at)).all()


def get_user_post_stats(db: Session) -> List[dict]:
    """
    Get post statistics for each user.
    Uses aggregation functions.
    """
    results = db.query(
        User.id,
        User.username,
        func.count(Post.id).label('total_posts'),
        func.count(Post.id).filter(Post.is_published == True).label('published_posts')
    ).outerjoin(Post).group_by(User.id).all()

    return [
        {
            "user_id": r.id,
            "username": r.username,
            "total_posts": r.total_posts,
            "published_posts": r.published_posts
        }
        for r in results
    ]
```

### Updating Records

```python
# crud/update.py
# Functions for updating database records

from sqlalchemy.orm import Session
from sqlalchemy import update
from models import User, Post
from typing import Optional
from datetime import datetime


def update_user(
    db: Session,
    user_id: int,
    **kwargs
) -> Optional[User]:
    """
    Update a user's attributes.
    Only updates fields that are provided.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # Update only provided fields
    allowed_fields = {'email', 'username', 'full_name', 'bio', 'is_active'}
    for key, value in kwargs.items():
        if key in allowed_fields and value is not None:
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def update_user_bulk(db: Session, user_ids: List[int], is_active: bool) -> int:
    """
    Update multiple users at once using bulk update.
    More efficient than updating one by one.

    Returns:
        Number of rows affected
    """
    stmt = (
        update(User)
        .where(User.id.in_(user_ids))
        .values(is_active=is_active)
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def publish_post(db: Session, post_id: int) -> Optional[Post]:
    """Publish a post by setting is_published and published_at."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return None

    post.is_published = True
    post.published_at = datetime.utcnow()

    db.commit()
    db.refresh(post)
    return post


def update_post_tags(db: Session, post_id: int, tag_ids: List[int]) -> Optional[Post]:
    """
    Replace all tags on a post with new tags.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return None

    # Get tags by IDs
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()

    # Replace tags
    post.tags = tags

    db.commit()
    db.refresh(post)
    return post
```

### Deleting Records

```python
# crud/delete.py
# Functions for deleting database records

from sqlalchemy.orm import Session
from sqlalchemy import delete
from models import User, Post, Comment
from typing import Optional
from datetime import datetime, timedelta


def delete_user(db: Session, user_id: int) -> bool:
    """
    Delete a user by ID.
    Due to cascade settings, this also deletes user's posts.

    Returns:
        True if user was deleted, False if not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    db.delete(user)
    db.commit()
    return True


def delete_post(db: Session, post_id: int, author_id: int) -> bool:
    """
    Delete a post, ensuring the author owns it.
    """
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.author_id == author_id
    ).first()

    if not post:
        return False

    db.delete(post)
    db.commit()
    return True


def delete_old_drafts(db: Session, days: int = 90) -> int:
    """
    Delete unpublished posts older than specified days.
    Uses bulk delete for efficiency.

    Returns:
        Number of deleted posts
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    stmt = (
        delete(Post)
        .where(Post.is_published == False)
        .where(Post.created_at < cutoff_date)
    )

    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def soft_delete_user(db: Session, user_id: int) -> Optional[User]:
    """
    Soft delete a user by setting is_active to False.
    Preserves data for potential recovery.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
```

---

## Advanced Query Techniques

### SQLAlchemy 2.0 Query Style

SQLAlchemy 2.0 introduces a new query style using `select()` statements.

```python
# queries/modern.py
# SQLAlchemy 2.0 style queries

from sqlalchemy import select, func, and_, or_, desc, case
from sqlalchemy.orm import Session
from models import User, Post, Tag


def get_user_by_id_v2(db: Session, user_id: int) -> Optional[User]:
    """Get user using SQLAlchemy 2.0 select statement."""
    stmt = select(User).where(User.id == user_id)
    result = db.execute(stmt)
    return result.scalar_one_or_none()


def get_active_users_ordered(db: Session) -> List[User]:
    """Get active users ordered by creation date."""
    stmt = (
        select(User)
        .where(User.is_active == True)
        .order_by(desc(User.created_at))
    )
    result = db.execute(stmt)
    return result.scalars().all()


def complex_aggregation(db: Session) -> List[dict]:
    """
    Complex query with conditional aggregation.
    Gets user statistics with conditional counts.
    """
    stmt = (
        select(
            User.id,
            User.username,
            func.count(Post.id).label('total_posts'),
            func.sum(
                case((Post.is_published == True, 1), else_=0)
            ).label('published_count'),
            func.max(Post.published_at).label('last_published')
        )
        .outerjoin(Post, User.id == Post.author_id)
        .group_by(User.id)
        .having(func.count(Post.id) > 0)
        .order_by(desc('total_posts'))
    )

    result = db.execute(stmt)
    return [dict(row._mapping) for row in result]


def search_posts_fulltext(db: Session, search_term: str) -> List[Post]:
    """
    Search posts using PostgreSQL full-text search.
    Note: Requires PostgreSQL with proper text search configuration.
    """
    from sqlalchemy import text

    stmt = (
        select(Post)
        .where(
            text("to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', :term)")
        )
        .params(term=search_term)
        .order_by(desc(Post.published_at))
    )

    result = db.execute(stmt)
    return result.scalars().all()
```

### Subqueries and CTEs

```python
# queries/subqueries.py
# Subqueries and Common Table Expressions (CTEs)

from sqlalchemy import select, func
from sqlalchemy.orm import Session
from models import User, Post


def get_users_with_post_count(db: Session, min_posts: int = 1) -> List[dict]:
    """
    Get users who have at least a minimum number of posts.
    Uses a subquery for the count.
    """
    # Subquery to count posts per user
    post_count_subquery = (
        select(Post.author_id, func.count(Post.id).label('post_count'))
        .group_by(Post.author_id)
        .subquery()
    )

    # Main query joining with the subquery
    stmt = (
        select(User, post_count_subquery.c.post_count)
        .join(post_count_subquery, User.id == post_count_subquery.c.author_id)
        .where(post_count_subquery.c.post_count >= min_posts)
    )

    result = db.execute(stmt)
    return [
        {"user": row[0], "post_count": row[1]}
        for row in result
    ]


def get_recent_active_users_cte(db: Session, days: int = 30) -> List[User]:
    """
    Get users who have posted in the last N days using a CTE.
    """
    from datetime import datetime, timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Define CTE for users with recent posts
    recent_posters_cte = (
        select(Post.author_id)
        .where(Post.published_at >= cutoff_date)
        .distinct()
        .cte('recent_posters')
    )

    # Use CTE in main query
    stmt = (
        select(User)
        .join(recent_posters_cte, User.id == recent_posters_cte.c.author_id)
        .order_by(User.username)
    )

    result = db.execute(stmt)
    return result.scalars().all()
```

---

## Transaction Management

Proper transaction management ensures data integrity.

```python
# transactions.py
# Transaction management patterns

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
from typing import Generator


@contextmanager
def transaction_scope(db: Session) -> Generator[Session, None, None]:
    """
    Context manager for handling transactions.
    Commits on success, rolls back on error.
    """
    try:
        yield db
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise e


def transfer_post_ownership(
    db: Session,
    post_id: int,
    from_user_id: int,
    to_user_id: int
) -> bool:
    """
    Transfer post ownership from one user to another.
    Uses transaction to ensure atomicity.
    """
    with transaction_scope(db):
        # Verify source user owns the post
        post = db.query(Post).filter(
            Post.id == post_id,
            Post.author_id == from_user_id
        ).first()

        if not post:
            return False

        # Verify target user exists
        target_user = db.query(User).filter(User.id == to_user_id).first()
        if not target_user:
            return False

        # Transfer ownership
        post.author_id = to_user_id

        # Log the transfer (if you have an audit log table)
        # audit_log = AuditLog(action="post_transfer", ...)
        # db.add(audit_log)

        return True


def create_user_with_profile(db: Session, user_data: dict, profile_data: dict) -> User:
    """
    Create user and profile in a single transaction.
    Uses savepoints for nested transactions.
    """
    try:
        # Start outer transaction
        user = User(**user_data)
        db.add(user)
        db.flush()  # Get user ID without committing

        # Create savepoint for profile creation
        savepoint = db.begin_nested()

        try:
            profile = UserProfile(user_id=user.id, **profile_data)
            db.add(profile)
            savepoint.commit()
        except Exception as e:
            savepoint.rollback()
            # Profile creation failed, but user is still valid
            # Log warning and continue
            pass

        db.commit()
        db.refresh(user)
        return user

    except Exception as e:
        db.rollback()
        raise e
```

---

## Connection Pooling

Connection pooling is essential for production applications.

```mermaid
graph LR
    subgraph "Connection Pool"
        A[Application] --> B[Pool Manager]
        B --> C1[Connection 1]
        B --> C2[Connection 2]
        B --> C3[Connection 3]
        B --> C4[Connection N]
        C1 --> D[Database]
        C2 --> D
        C3 --> D
        C4 --> D
    end
```

```python
# pool_config.py
# Advanced connection pool configuration

from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool, NullPool
import logging

logger = logging.getLogger(__name__)


def create_production_engine(database_url: str):
    """
    Create an engine with production-ready pool settings.
    """
    engine = create_engine(
        database_url,
        poolclass=QueuePool,

        # Pool size settings
        pool_size=20,          # Base number of connections
        max_overflow=30,       # Extra connections when pool is full

        # Timeout settings
        pool_timeout=30,       # Seconds to wait for a connection
        pool_recycle=1800,     # Recycle connections every 30 minutes

        # Health checking
        pool_pre_ping=True,    # Verify connection before using

        # Performance settings
        echo=False,            # Disable SQL logging in production
        echo_pool=False,       # Disable pool event logging

        # Execution options
        execution_options={
            "isolation_level": "READ COMMITTED"
        }
    )

    return engine


def create_readonly_engine(database_url: str):
    """
    Create an engine for read-only operations.
    Uses a smaller pool and sets read-only transaction.
    """
    engine = create_engine(
        database_url,
        pool_size=10,
        max_overflow=5,
        pool_pre_ping=True,
        execution_options={
            "isolation_level": "AUTOCOMMIT"  # Read-only, no transactions needed
        }
    )

    return engine


# Event listeners for connection lifecycle
@event.listens_for(engine, "connect")
def on_connect(dbapi_connection, connection_record):
    """Called when a new connection is created."""
    logger.debug("New database connection created")


@event.listens_for(engine, "checkout")
def on_checkout(dbapi_connection, connection_record, connection_proxy):
    """Called when a connection is retrieved from the pool."""
    logger.debug("Connection checked out from pool")


@event.listens_for(engine, "checkin")
def on_checkin(dbapi_connection, connection_record):
    """Called when a connection is returned to the pool."""
    logger.debug("Connection returned to pool")
```

---

## Database Migrations with Alembic

Alembic is the standard migration tool for SQLAlchemy.

```bash
# Initialize Alembic in your project
pip install alembic
alembic init migrations
```

```python
# migrations/env.py
# Alembic environment configuration

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from database import Base
from models import User, Post, Tag, Comment  # Import all models

config = context.config
fileConfig(config.config_file_name)

# Set target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Creating Migrations

```bash
# Generate migration from model changes
alembic revision --autogenerate -m "Add user verification fields"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

```python
# migrations/versions/xxxx_add_user_verification.py
# Example migration file

from alembic import op
import sqlalchemy as sa


revision = 'abc123'
down_revision = 'xyz789'
branch_labels = None
depends_on = None


def upgrade():
    """Add verification fields to users table."""
    op.add_column('users',
        sa.Column('verification_token', sa.String(100), nullable=True)
    )
    op.add_column('users',
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Create index for faster token lookups
    op.create_index(
        'ix_users_verification_token',
        'users',
        ['verification_token'],
        unique=True
    )


def downgrade():
    """Remove verification fields from users table."""
    op.drop_index('ix_users_verification_token', table_name='users')
    op.drop_column('users', 'verified_at')
    op.drop_column('users', 'verification_token')
```

---

## Async SQLAlchemy

For high-concurrency applications, async SQLAlchemy provides better performance.

```python
# async_database.py
# Async SQLAlchemy configuration

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Use async driver in connection string
ASYNC_DATABASE_URL = "postgresql+asyncpg://user:password@localhost/myapp"

# Create async engine
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    echo=False,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_async_db():
    """Async dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

```python
# async_crud.py
# Async CRUD operations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, Post
from typing import List, Optional


async def async_get_user_by_id(
    db: AsyncSession,
    user_id: int
) -> Optional[User]:
    """Get user by ID asynchronously."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def async_get_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> List[User]:
    """Get users with pagination asynchronously."""
    stmt = select(User).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def async_create_user(
    db: AsyncSession,
    email: str,
    username: str,
    password_hash: str
) -> User:
    """Create user asynchronously."""
    user = User(
        email=email,
        username=username,
        password_hash=password_hash
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def async_update_user(
    db: AsyncSession,
    user_id: int,
    **kwargs
) -> Optional[User]:
    """Update user asynchronously."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return None

    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


async def async_delete_user(db: AsyncSession, user_id: int) -> bool:
    """Delete user asynchronously."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return False

    await db.delete(user)
    await db.commit()
    return True
```

---

## Testing with SQLAlchemy

### Setting Up Test Database

```python
# tests/conftest.py
# Pytest fixtures for database testing

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, Post, Tag


# Use SQLite for tests (fast, no server needed)
TEST_DATABASE_URL = "sqlite:///./test.db"


@pytest.fixture(scope="session")
def engine():
    """Create test database engine."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False}  # SQLite specific
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(engine):
    """Create a new database session for each test."""
    connection = engine.connect()
    transaction = connection.begin()

    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing."""
    user = User(
        email="test@example.com",
        username="testuser",
        password_hash="hashed_password"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user
```

### Writing Tests

```python
# tests/test_crud.py
# Tests for CRUD operations

import pytest
from crud.create import create_user, create_post_with_tags
from crud.read import get_user_by_email, get_posts_with_relations


def test_create_user(db_session):
    """Test user creation."""
    user = create_user(
        db_session,
        email="new@example.com",
        username="newuser",
        password_hash="hashed"
    )

    assert user.id is not None
    assert user.email == "new@example.com"
    assert user.username == "newuser"
    assert user.is_active is True


def test_create_duplicate_email_fails(db_session, sample_user):
    """Test that duplicate email raises error."""
    with pytest.raises(ValueError, match="already exists"):
        create_user(
            db_session,
            email=sample_user.email,  # Duplicate email
            username="different",
            password_hash="hashed"
        )


def test_create_post_with_tags(db_session, sample_user):
    """Test creating post with tags."""
    post = create_post_with_tags(
        db_session,
        title="Test Post",
        content="Content here",
        author_id=sample_user.id,
        tag_names=["python", "sqlalchemy"]
    )

    assert post.id is not None
    assert post.title == "Test Post"
    assert len(post.tags) == 2
    assert {t.name for t in post.tags} == {"python", "sqlalchemy"}


def test_get_user_by_email(db_session, sample_user):
    """Test retrieving user by email."""
    user = get_user_by_email(db_session, sample_user.email)

    assert user is not None
    assert user.id == sample_user.id


def test_get_nonexistent_user(db_session):
    """Test that nonexistent user returns None."""
    user = get_user_by_email(db_session, "nonexistent@example.com")
    assert user is None
```

---

## Best Practices

### 1. Always Use Context Managers for Sessions

```python
# Good: Session is properly closed
def get_data():
    with Session() as session:
        return session.query(User).all()

# Good: Using dependency injection
def get_data(db: Session = Depends(get_db)):
    return db.query(User).all()
```

### 2. Use Eager Loading to Avoid N+1 Queries

```python
# Bad: N+1 queries
users = db.query(User).all()
for user in users:
    print(user.posts)  # Each access triggers a query

# Good: Single query with join
users = db.query(User).options(joinedload(User.posts)).all()
for user in users:
    print(user.posts)  # Already loaded
```

### 3. Use Bulk Operations for Multiple Records

```python
# Bad: One query per record
for data in users_data:
    user = User(**data)
    db.add(user)
    db.commit()

# Good: Single bulk insert
db.bulk_insert_mappings(User, users_data)
db.commit()
```

### 4. Handle Exceptions Properly

```python
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

try:
    db.add(user)
    db.commit()
except IntegrityError:
    db.rollback()
    raise ValueError("Duplicate entry")
except SQLAlchemyError as e:
    db.rollback()
    logger.error(f"Database error: {e}")
    raise
```

### 5. Use Indexes Strategically

```python
class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index('ix_users_email_active', 'email', 'is_active'),
        Index('ix_users_created', 'created_at'),
    )
```

### 6. Configure Connection Pool for Your Workload

```python
# For web applications with many short-lived connections
engine = create_engine(url, pool_size=20, max_overflow=30)

# For batch jobs with few long-running connections
engine = create_engine(url, pool_size=5, max_overflow=0)

# For serverless (create new connections each time)
engine = create_engine(url, poolclass=NullPool)
```

---

## Conclusion

SQLAlchemy ORM provides a powerful and flexible way to work with databases in Python. Here are the key takeaways from this guide:

- **Model Definition**: Use declarative base classes to define models with proper column types, constraints, and indexes
- **Relationships**: Leverage SQLAlchemy's relationship system for foreign key associations with appropriate loading strategies
- **CRUD Operations**: Follow consistent patterns for create, read, update, and delete operations
- **Query Optimization**: Use eager loading (joinedload, selectinload) to prevent N+1 query problems
- **Transactions**: Always use proper transaction management to ensure data integrity
- **Connection Pooling**: Configure connection pools based on your application's concurrency requirements
- **Migrations**: Use Alembic for version-controlled database schema changes
- **Testing**: Write comprehensive tests using fixtures and isolated sessions

By following the patterns and best practices in this guide, you can build robust, performant database-driven applications with SQLAlchemy.

---

*Building database-backed applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your database performance, helping you identify slow queries, connection issues, and capacity problems before they impact users.*

**Related Reading:**
- [How to Implement Connection Pooling in Python PostgreSQL Applications](https://oneuptime.com/blog/post/2025-01-06-python-connection-pooling-postgresql/view)
- [How to Work with Alembic for Database Migrations](https://oneuptime.com/blog/post/2025-07-02-python-alembic-migrations/view)
