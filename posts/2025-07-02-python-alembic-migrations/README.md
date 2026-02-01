# How to Handle Database Migrations with Alembic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Alembic, Database, Migrations, SQLAlchemy, PostgreSQL

Description: Learn how to handle database migrations in Python applications using Alembic. This guide covers migration generation, version control, rollbacks, and production deployment strategies for SQLAlchemy applications.

---

> Database schema changes are inevitable. As your application evolves, so does your database. Alembic provides a lightweight migration framework that integrates seamlessly with SQLAlchemy, enabling you to version control your database schema and apply changes safely across environments.

Alembic is the de facto standard for database migrations in Python applications using SQLAlchemy. It tracks schema changes as versioned scripts, supports both manual and auto-generated migrations, and provides rollback capabilities for safe deployments.

---

## Why Alembic for Database Migrations?

Managing database schema changes without a migration tool leads to chaos:

- Manual SQL scripts that may or may not have been applied
- No version history of schema changes
- Difficulty synchronizing schema across environments
- Risk of data loss during deployments
- No rollback strategy when things go wrong

Alembic solves these problems by providing:

- **Version control** for database schema changes
- **Autogeneration** of migration scripts from model changes
- **Upgrade and downgrade** paths for each migration
- **Branch support** for parallel development
- **Integration** with SQLAlchemy ORM models

---

## How Alembic Works

```mermaid
flowchart TD
    A[SQLAlchemy Models] -->|Autogenerate| B[Migration Script]
    B --> C[alembic_version table]
    C -->|Track| D[Current Version]
    
    subgraph "Migration Process"
        E[alembic upgrade head] --> F[Apply Pending Migrations]
        F --> G[Update alembic_version]
    end
    
    subgraph "Rollback Process"
        H[alembic downgrade -1] --> I[Reverse Last Migration]
        I --> J[Update alembic_version]
    end
    
    D --> E
    D --> H
```

Alembic maintains a single table called `alembic_version` in your database that tracks the current migration version. Each migration script has a unique revision ID, and Alembic uses these to determine which migrations need to be applied.

---

## Getting Started with Alembic

### Installation

First, install Alembic and SQLAlchemy:

```bash
# Using pip
pip install alembic sqlalchemy psycopg2-binary

# Using Poetry
poetry add alembic sqlalchemy psycopg2-binary
```

### Project Structure

A typical Alembic project structure looks like this:

```
myproject/
├── alembic/
│   ├── versions/           # Migration scripts live here
│   │   ├── 001_initial_schema.py
│   │   └── 002_add_users_table.py
│   ├── env.py              # Environment configuration
│   ├── script.py.mako      # Migration template
│   └── README
├── alembic.ini             # Alembic configuration
├── app/
│   ├── __init__.py
│   ├── models.py           # SQLAlchemy models
│   └── database.py         # Database connection
└── requirements.txt
```

### Initialize Alembic

Initialize Alembic in your project directory:

```bash
# Initialize with default configuration
alembic init alembic

# Or initialize with async support (for asyncpg)
alembic init -t async alembic
```

This creates the `alembic/` directory and `alembic.ini` configuration file.

---

## Configuration

### alembic.ini

The main configuration file contains database connection settings and migration options:

```ini
# alembic.ini

[alembic]
# Path to migration scripts
script_location = alembic

# Template for new migration files
file_template = %%(year)d%%(month).2d%%(day).2d_%%(hour).2d%%(minute).2d%%(second).2d_%%(slug)s

# SQLAlchemy URL - can be overridden by env.py
# sqlalchemy.url = postgresql://user:pass@localhost/dbname

# Timezone for migration timestamps
timezone = UTC

# Truncate long revision IDs in file names
truncate_slug_length = 40

[post_write_hooks]
# Black formatting for generated migrations
hooks = black
black.type = console_scripts
black.entrypoint = black
black.options = -q

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

### env.py Configuration

The `env.py` file controls how Alembic connects to your database and generates migrations:

```python
# alembic/env.py
"""Alembic environment configuration for migrations."""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Import your models' Base to enable autogenerate
from app.models import Base

# Alembic Config object for access to alembic.ini values
config = context.config

# Set up logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLAlchemy MetaData for autogenerate support
# This must point to your declarative base's metadata
target_metadata = Base.metadata


def get_database_url() -> str:
    """Get database URL from environment or alembic.ini.
    
    Environment variable takes precedence for production deployments.
    """
    # Try environment variable first (for production/CI)
    url = os.environ.get("DATABASE_URL")
    if url:
        # Handle Heroku-style postgres:// URLs
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    
    # Fall back to alembic.ini setting
    return config.get_main_option("sqlalchemy.url")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    
    This configures the context with just a URL and not an Engine.
    Calls to context.execute() emit the given string to the script output.
    
    Use this for generating SQL scripts without database connection.
    """
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Compare types for more accurate autogenerate
        compare_type=True,
        # Compare server defaults
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    
    Creates an Engine and associates a connection with the context.
    This is the standard mode for applying migrations.
    """
    # Override sqlalchemy.url from environment
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Don't use connection pooling for migrations
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Compare column types during autogenerate
            compare_type=True,
            # Compare server defaults during autogenerate
            compare_server_default=True,
            # Include schemas in autogenerate
            include_schemas=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# Determine which mode to run in
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

## Defining SQLAlchemy Models

Before creating migrations, define your SQLAlchemy models:

```python
# app/models.py
"""SQLAlchemy ORM models for the application."""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Float,
    Index,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

# Create the declarative base - this is what we import in env.py
Base = declarative_base()


class User(Base):
    """User account model.
    
    Stores user authentication and profile information.
    """
    __tablename__ = "users"
    
    # Primary key using UUID for better distributed systems support
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the user"
    )
    
    # Authentication fields
    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="User email address - used for login"
    )
    password_hash = Column(
        String(255),
        nullable=False,
        comment="Bcrypt hashed password"
    )
    
    # Profile fields
    username = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Public username"
    )
    full_name = Column(
        String(255),
        nullable=True,
        comment="User's full name"
    )
    
    # Status fields
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether the user account is active"
    )
    is_verified = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether the user has verified their email"
    )
    
    # Timestamps
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="When the user was created"
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        comment="When the user was last updated"
    )
    
    # Relationships
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    
    # Table-level constraints and indexes
    __table_args__ = (
        # Composite index for common queries
        Index("ix_users_email_active", "email", "is_active"),
        # Check constraint for email format
        CheckConstraint(
            "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
            name="check_email_format"
        ),
    )


class Post(Base):
    """Blog post model.
    
    Stores blog posts created by users.
    """
    __tablename__ = "posts"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Content fields
    title = Column(
        String(255),
        nullable=False,
        comment="Post title"
    )
    slug = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="URL-friendly slug"
    )
    content = Column(
        Text,
        nullable=False,
        comment="Post content in markdown"
    )
    excerpt = Column(
        String(500),
        nullable=True,
        comment="Short excerpt for previews"
    )
    
    # Metadata stored as JSONB for flexibility
    metadata = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="Additional metadata like tags, categories"
    )
    
    # Status
    is_published = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether the post is published"
    )
    published_at = Column(
        DateTime,
        nullable=True,
        comment="When the post was published"
    )
    
    # Foreign key to user
    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The user who authored this post"
    )
    
    # Timestamps
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    author = relationship("User", back_populates="posts")
    
    __table_args__ = (
        # Index for listing published posts by date
        Index("ix_posts_published", "is_published", "published_at"),
        # GIN index for JSONB searches
        Index("ix_posts_metadata", "metadata", postgresql_using="gin"),
    )


class AuditLog(Base):
    """Audit log for tracking changes.
    
    Stores a record of all significant actions in the system.
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # What happened
    action = Column(
        String(50),
        nullable=False,
        index=True,
        comment="The action performed (create, update, delete)"
    )
    entity_type = Column(
        String(100),
        nullable=False,
        index=True,
        comment="The type of entity affected"
    )
    entity_id = Column(
        String(100),
        nullable=False,
        comment="The ID of the affected entity"
    )
    
    # Who did it
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    # Details
    changes = Column(
        JSONB,
        default=dict,
        comment="JSON diff of changes made"
    )
    ip_address = Column(
        String(45),
        nullable=True,
        comment="IP address of the request"
    )
    
    # When
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    
    __table_args__ = (
        # Composite index for querying audit logs
        Index("ix_audit_logs_entity", "entity_type", "entity_id", "created_at"),
    )
```

---

## Creating Migrations

### Autogenerate Migrations

Alembic can automatically detect changes between your models and database:

```bash
# Generate a migration by comparing models to database
alembic revision --autogenerate -m "add users and posts tables"
```

This creates a new migration file in `alembic/versions/`:

```python
# alembic/versions/20250702_120000_add_users_and_posts_tables.py
"""add users and posts tables

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2025-07-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema.
    
    Creates the users, posts, and audit_logs tables with all
    indexes, constraints, and relationships.
    """
    # Create users table
    op.create_table(
        'users',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            nullable=False,
            comment='Unique identifier for the user'
        ),
        sa.Column(
            'email',
            sa.String(length=255),
            nullable=False,
            comment='User email address - used for login'
        ),
        sa.Column(
            'password_hash',
            sa.String(length=255),
            nullable=False,
            comment='Bcrypt hashed password'
        ),
        sa.Column(
            'username',
            sa.String(length=100),
            nullable=False,
            comment='Public username'
        ),
        sa.Column(
            'full_name',
            sa.String(length=255),
            nullable=True,
            comment="User's full name"
        ),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            comment='Whether the user account is active'
        ),
        sa.Column(
            'is_verified',
            sa.Boolean(),
            nullable=False,
            comment='Whether the user has verified their email'
        ),
        sa.Column(
            'created_at',
            sa.DateTime(),
            nullable=False,
            comment='When the user was created'
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(),
            nullable=False,
            comment='When the user was last updated'
        ),
        sa.CheckConstraint(
            "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
            name='check_email_format'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    
    # Create indexes for users table
    op.create_index('ix_users_email', 'users', ['email'], unique=False)
    op.create_index('ix_users_username', 'users', ['username'], unique=False)
    op.create_index('ix_users_email_active', 'users', ['email', 'is_active'], unique=False)
    
    # Create posts table
    op.create_table(
        'posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, comment='Post title'),
        sa.Column('slug', sa.String(length=255), nullable=False, comment='URL-friendly slug'),
        sa.Column('content', sa.Text(), nullable=False, comment='Post content in markdown'),
        sa.Column('excerpt', sa.String(length=500), nullable=True, comment='Short excerpt'),
        sa.Column(
            'metadata',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            comment='Additional metadata'
        ),
        sa.Column('is_published', sa.Boolean(), nullable=False, comment='Whether published'),
        sa.Column('published_at', sa.DateTime(), nullable=True, comment='When published'),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    
    # Create indexes for posts table
    op.create_index('ix_posts_slug', 'posts', ['slug'], unique=False)
    op.create_index('ix_posts_author_id', 'posts', ['author_id'], unique=False)
    op.create_index('ix_posts_published', 'posts', ['is_published', 'published_at'], unique=False)
    op.create_index(
        'ix_posts_metadata',
        'posts',
        ['metadata'],
        unique=False,
        postgresql_using='gin'
    )
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for audit_logs table
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'], unique=False)
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'], unique=False)
    op.create_index(
        'ix_audit_logs_entity',
        'audit_logs',
        ['entity_type', 'entity_id', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade database schema.
    
    Drops all tables in reverse order of creation to respect
    foreign key constraints.
    """
    # Drop audit_logs table and indexes
    op.drop_index('ix_audit_logs_entity', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_type', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_table('audit_logs')
    
    # Drop posts table and indexes
    op.drop_index('ix_posts_metadata', table_name='posts', postgresql_using='gin')
    op.drop_index('ix_posts_published', table_name='posts')
    op.drop_index('ix_posts_author_id', table_name='posts')
    op.drop_index('ix_posts_slug', table_name='posts')
    op.drop_table('posts')
    
    # Drop users table and indexes
    op.drop_index('ix_users_email_active', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
```

### Manual Migrations

For complex changes that autogenerate cannot handle, create empty migrations:

```bash
# Create an empty migration for manual editing
alembic revision -m "add full text search"
```

Example of a manual migration for adding full-text search:

```python
# alembic/versions/20250702_130000_add_full_text_search.py
"""add full text search

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-07-02 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add full-text search capabilities to posts table.
    
    Creates a tsvector column and GIN index for efficient
    full-text search across post titles and content.
    """
    # Add tsvector column for search
    op.add_column(
        'posts',
        sa.Column(
            'search_vector',
            sa.dialects.postgresql.TSVECTOR(),
            nullable=True,
            comment='Full-text search vector'
        )
    )
    
    # Create GIN index for fast full-text search
    op.create_index(
        'ix_posts_search_vector',
        'posts',
        ['search_vector'],
        unique=False,
        postgresql_using='gin'
    )
    
    # Create function to update search vector
    op.execute("""
        CREATE OR REPLACE FUNCTION posts_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)
    
    # Create trigger to automatically update search vector
    op.execute("""
        CREATE TRIGGER posts_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, excerpt, content ON posts
        FOR EACH ROW
        EXECUTE FUNCTION posts_search_vector_update();
    """)
    
    # Populate search vector for existing rows
    op.execute("""
        UPDATE posts SET search_vector =
            setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(content, '')), 'C');
    """)


def downgrade() -> None:
    """Remove full-text search capabilities.
    
    Drops the trigger, function, index, and column in reverse order.
    """
    # Drop trigger
    op.execute("DROP TRIGGER IF EXISTS posts_search_vector_trigger ON posts;")
    
    # Drop function
    op.execute("DROP FUNCTION IF EXISTS posts_search_vector_update();")
    
    # Drop index
    op.drop_index('ix_posts_search_vector', table_name='posts', postgresql_using='gin')
    
    # Drop column
    op.drop_column('posts', 'search_vector')
```

---

## Migration Workflow

```mermaid
flowchart LR
    A[Change Models] --> B[Generate Migration]
    B --> C[Review Migration]
    C --> D{Changes OK?}
    D -->|Yes| E[Apply to Dev]
    D -->|No| F[Edit Migration]
    F --> C
    E --> G[Test]
    G --> H{Tests Pass?}
    H -->|Yes| I[Commit]
    H -->|No| J[Fix Issues]
    J --> A
    I --> K[Deploy to Staging]
    K --> L[Deploy to Production]
```

### Common Alembic Commands

```bash
# Check current migration version
alembic current

# View migration history
alembic history

# View migration history with verbose output
alembic history --verbose

# Apply all pending migrations
alembic upgrade head

# Apply next migration only
alembic upgrade +1

# Upgrade to a specific revision
alembic upgrade a1b2c3d4e5f6

# Rollback last migration
alembic downgrade -1

# Rollback to a specific revision
alembic downgrade a1b2c3d4e5f6

# Rollback all migrations
alembic downgrade base

# Generate SQL without applying (for review)
alembic upgrade head --sql

# Show what migrations would be applied
alembic upgrade head --sql > migration.sql
```

---

## Data Migrations

Sometimes you need to migrate data, not just schema. Here is how to handle data migrations safely:

```python
# alembic/versions/20250702_140000_migrate_user_data.py
"""migrate user data

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-07-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy import text

revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migrate user display names.
    
    Splits full_name into first_name and last_name columns,
    then migrates existing data.
    """
    # Step 1: Add new columns
    op.add_column(
        'users',
        sa.Column('first_name', sa.String(length=100), nullable=True)
    )
    op.add_column(
        'users',
        sa.Column('last_name', sa.String(length=100), nullable=True)
    )
    
    # Step 2: Migrate data using SQL
    # This is more efficient than loading all records into Python
    op.execute(text("""
        UPDATE users
        SET 
            first_name = split_part(full_name, ' ', 1),
            last_name = CASE 
                WHEN position(' ' in full_name) > 0 
                THEN substring(full_name from position(' ' in full_name) + 1)
                ELSE NULL
            END
        WHERE full_name IS NOT NULL;
    """))
    
    # Step 3: Drop old column (optional, can be done in a later migration)
    # op.drop_column('users', 'full_name')


def downgrade() -> None:
    """Revert user display name migration.
    
    Combines first_name and last_name back into full_name.
    """
    # Ensure full_name column exists (it might not have been dropped)
    # Migrate data back
    op.execute(text("""
        UPDATE users
        SET full_name = CONCAT_WS(' ', first_name, last_name)
        WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
    """))
    
    # Drop new columns
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
```

### Batch Data Migration

For large tables, use batch processing to avoid long locks:

```python
# alembic/versions/20250702_150000_batch_migrate_posts.py
"""batch migrate posts metadata

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2025-07-02 15:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Batch size for processing
BATCH_SIZE = 1000


def upgrade() -> None:
    """Migrate posts metadata format.
    
    Processes posts in batches to avoid long-running transactions
    and table locks that could impact application performance.
    """
    # Get a connection for executing raw SQL
    connection = op.get_bind()
    
    # Get total count
    result = connection.execute(text("SELECT COUNT(*) FROM posts"))
    total_count = result.scalar()
    
    print(f"Migrating {total_count} posts in batches of {BATCH_SIZE}")
    
    # Process in batches
    offset = 0
    while offset < total_count:
        # Update batch with explicit commit
        connection.execute(text("""
            UPDATE posts
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{version}',
                '"2"'::jsonb
            )
            WHERE id IN (
                SELECT id FROM posts
                WHERE metadata->>'version' IS NULL
                   OR metadata->>'version' = '1'
                ORDER BY created_at
                LIMIT :batch_size
            )
        """), {"batch_size": BATCH_SIZE})
        
        offset += BATCH_SIZE
        print(f"Processed {min(offset, total_count)}/{total_count} posts")


def downgrade() -> None:
    """Revert posts metadata format."""
    connection = op.get_bind()
    
    # Remove version field from metadata
    connection.execute(text("""
        UPDATE posts
        SET metadata = metadata - 'version'
        WHERE metadata ? 'version';
    """))
```

---

## Production Deployment Strategies

### Pre-Deployment Checklist

```mermaid
flowchart TD
    A[Deployment Start] --> B{Backup Database?}
    B -->|Yes| C[Create Backup]
    C --> D{Check Migration?}
    B -->|Skip| D
    D -->|Review SQL| E[Generate SQL Preview]
    E --> F{Looks Safe?}
    F -->|Yes| G[Run Migration]
    F -->|No| H[Abort & Fix]
    G --> I{Success?}
    I -->|Yes| J[Deploy App]
    I -->|No| K[Rollback Migration]
    K --> L[Investigate]
    J --> M[Monitor]
    M --> N{Issues?}
    N -->|Yes| O[Rollback All]
    N -->|No| P[Done]
```

### Safe Deployment Script

```python
# scripts/deploy_migrations.py
"""Safe migration deployment script.

Run migrations with proper error handling, logging, and rollback capabilities.
"""

import os
import sys
import logging
from datetime import datetime
from typing import Optional

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MigrationDeployer:
    """Handles safe migration deployment with rollback support."""
    
    def __init__(self, alembic_cfg_path: str = "alembic.ini"):
        self.alembic_cfg = Config(alembic_cfg_path)
        self.database_url = os.environ.get("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable required")
        
        self.engine = create_engine(self.database_url)
    
    def get_current_revision(self) -> Optional[str]:
        """Get the current migration revision in the database."""
        with self.engine.connect() as conn:
            context = MigrationContext.configure(conn)
            return context.get_current_revision()
    
    def get_pending_revisions(self) -> list:
        """Get list of pending migrations."""
        from alembic.script import ScriptDirectory
        
        script = ScriptDirectory.from_config(self.alembic_cfg)
        current = self.get_current_revision()
        
        pending = []
        for revision in script.walk_revisions("head", current):
            if revision.revision != current:
                pending.append(revision.revision)
        
        return list(reversed(pending))
    
    def create_backup_point(self) -> str:
        """Create a backup point before migration.
        
        Returns the current revision for potential rollback.
        """
        current = self.get_current_revision()
        logger.info(f"Backup point created at revision: {current}")
        return current
    
    def verify_database_connection(self) -> bool:
        """Verify we can connect to the database."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection verified")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def generate_sql_preview(self, target: str = "head") -> str:
        """Generate SQL that would be executed without applying it."""
        from io import StringIO
        
        output = StringIO()
        self.alembic_cfg.output_buffer = output
        
        current = self.get_current_revision()
        command.upgrade(self.alembic_cfg, target, sql=True)
        
        return output.getvalue()
    
    def apply_migrations(self, target: str = "head") -> bool:
        """Apply pending migrations to the target revision."""
        try:
            pending = self.get_pending_revisions()
            if not pending:
                logger.info("No pending migrations")
                return True
            
            logger.info(f"Applying {len(pending)} pending migrations: {pending}")
            
            command.upgrade(self.alembic_cfg, target)
            
            logger.info(f"Successfully migrated to: {self.get_current_revision()}")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
    
    def rollback(self, target_revision: str) -> bool:
        """Rollback to a specific revision."""
        try:
            logger.info(f"Rolling back to revision: {target_revision}")
            command.downgrade(self.alembic_cfg, target_revision)
            logger.info(f"Rolled back to: {self.get_current_revision()}")
            return True
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False
    
    def deploy(self, dry_run: bool = False) -> bool:
        """Execute the full deployment process."""
        logger.info("Starting migration deployment")
        timestamp = datetime.now().isoformat()
        
        # Step 1: Verify connection
        if not self.verify_database_connection():
            return False
        
        # Step 2: Create backup point
        backup_revision = self.create_backup_point()
        
        # Step 3: Check pending migrations
        pending = self.get_pending_revisions()
        if not pending:
            logger.info("No pending migrations to apply")
            return True
        
        logger.info(f"Found {len(pending)} pending migrations")
        
        # Step 4: Generate and log SQL preview
        if dry_run:
            sql = self.generate_sql_preview()
            logger.info("SQL Preview (dry run):")
            print(sql)
            return True
        
        # Step 5: Apply migrations
        if not self.apply_migrations():
            logger.error("Migration failed, attempting rollback")
            self.rollback(backup_revision or "base")
            return False
        
        logger.info(f"Migration deployment completed at {timestamp}")
        return True


def main():
    """CLI entry point for migration deployment."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Deploy database migrations")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show SQL without executing"
    )
    parser.add_argument(
        "--rollback",
        type=str,
        help="Rollback to specific revision"
    )
    
    args = parser.parse_args()
    
    deployer = MigrationDeployer()
    
    if args.rollback:
        success = deployer.rollback(args.rollback)
    else:
        success = deployer.deploy(dry_run=args.dry_run)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy with Migrations

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Preview migrations (dry run)
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          python scripts/deploy_migrations.py --dry-run
      
      - name: Apply migrations to staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          python scripts/deploy_migrations.py
      
      - name: Run integration tests
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          pytest tests/integration/
      
      - name: Apply migrations to production
        if: success()
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          python scripts/deploy_migrations.py
```

---

## Testing Migrations

### Migration Test Framework

```python
# tests/test_migrations.py
"""Test suite for database migrations.

Ensures migrations can be applied and rolled back cleanly.
"""

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
import os


@pytest.fixture
def alembic_config():
    """Create Alembic config for testing."""
    config = Config("alembic.ini")
    # Use test database
    test_db_url = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/test_db"
    )
    config.set_main_option("sqlalchemy.url", test_db_url)
    return config


@pytest.fixture
def test_engine(alembic_config):
    """Create a test database engine."""
    url = alembic_config.get_main_option("sqlalchemy.url")
    engine = create_engine(url)
    return engine


@pytest.fixture
def clean_database(test_engine, alembic_config):
    """Ensure database is clean before tests."""
    # Drop all tables
    with test_engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    
    yield
    
    # Cleanup after test
    with test_engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()


class TestMigrations:
    """Test migration apply and rollback."""
    
    def test_upgrade_to_head(self, alembic_config, clean_database, test_engine):
        """Test that all migrations can be applied."""
        # Apply all migrations
        command.upgrade(alembic_config, "head")
        
        # Verify tables exist
        inspector = inspect(test_engine)
        tables = inspector.get_table_names()
        
        assert "users" in tables
        assert "posts" in tables
        assert "audit_logs" in tables
        assert "alembic_version" in tables
    
    def test_downgrade_to_base(self, alembic_config, clean_database, test_engine):
        """Test that all migrations can be rolled back."""
        # Apply all migrations
        command.upgrade(alembic_config, "head")
        
        # Rollback all migrations
        command.downgrade(alembic_config, "base")
        
        # Verify only alembic_version remains
        inspector = inspect(test_engine)
        tables = inspector.get_table_names()
        
        assert "users" not in tables
        assert "posts" not in tables
    
    def test_upgrade_downgrade_cycle(self, alembic_config, clean_database, test_engine):
        """Test full upgrade/downgrade cycle."""
        # Get all revisions
        from alembic.script import ScriptDirectory
        script = ScriptDirectory.from_config(alembic_config)
        revisions = list(script.walk_revisions())
        
        # Apply each migration one at a time
        for revision in reversed(revisions):
            command.upgrade(alembic_config, revision.revision)
        
        # Rollback each migration one at a time
        for revision in revisions:
            if revision.down_revision:
                command.downgrade(alembic_config, revision.down_revision)
            else:
                command.downgrade(alembic_config, "base")
    
    def test_migration_with_data(self, alembic_config, clean_database, test_engine):
        """Test that migrations preserve data."""
        # Apply migrations
        command.upgrade(alembic_config, "head")
        
        # Insert test data
        Session = sessionmaker(bind=test_engine)
        with Session() as session:
            session.execute(text("""
                INSERT INTO users (id, email, password_hash, username, is_active, is_verified, created_at, updated_at)
                VALUES (
                    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    'test@example.com',
                    'hashed_password',
                    'testuser',
                    true,
                    true,
                    NOW(),
                    NOW()
                )
            """))
            session.commit()
        
        # Verify data exists
        with Session() as session:
            result = session.execute(text("SELECT COUNT(*) FROM users"))
            assert result.scalar() == 1


class TestMigrationIdempotency:
    """Test that migrations are idempotent."""
    
    def test_double_upgrade(self, alembic_config, clean_database):
        """Test that running upgrade twice is safe."""
        # First upgrade
        command.upgrade(alembic_config, "head")
        
        # Second upgrade should be no-op
        command.upgrade(alembic_config, "head")
```

---

## Advanced Patterns

### Multi-Database Migrations

For applications with multiple databases:

```python
# alembic/env.py for multi-database
"""Multi-database Alembic environment."""

from alembic import context
from sqlalchemy import engine_from_config, pool
import os

# Database configurations
DATABASES = {
    "primary": {
        "url": os.environ.get("PRIMARY_DATABASE_URL"),
        "metadata": "app.models.primary.Base",
    },
    "analytics": {
        "url": os.environ.get("ANALYTICS_DATABASE_URL"),
        "metadata": "app.models.analytics.Base",
    },
}


def run_migrations_online():
    """Run migrations for all databases."""
    db_name = context.get_x_argument(as_dictionary=True).get("db", "primary")
    
    if db_name not in DATABASES:
        raise ValueError(f"Unknown database: {db_name}")
    
    db_config = DATABASES[db_name]
    
    # Import the correct metadata
    module_path, attr = db_config["metadata"].rsplit(".", 1)
    module = __import__(module_path, fromlist=[attr])
    target_metadata = getattr(module, attr).metadata
    
    connectable = engine_from_config(
        {"sqlalchemy.url": db_config["url"]},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        
        with context.begin_transaction():
            context.run_migrations()


# Usage:
# alembic -x db=primary upgrade head
# alembic -x db=analytics upgrade head
```

### Branch Management

Handle parallel development with branches:

```bash
# Create a new branch for a feature
alembic revision --branch-label feature_auth -m "add oauth tables"

# Merge branches
alembic merge -m "merge feature branches" head1 head2
```

---

## Best Practices Summary

### 1. Always Review Generated Migrations
```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Review the generated file before committing
# Autogenerate may miss some changes or generate incorrect migrations
```

### 2. Write Reversible Migrations
```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20)))

def downgrade():
    op.drop_column('users', 'phone')
```

### 3. Use Descriptive Migration Names
```bash
# Good
alembic revision -m "add_user_email_verification_columns"

# Bad
alembic revision -m "update"
```

### 4. Test Migrations in CI
```yaml
# Run migration tests before deploying
- name: Test migrations
  run: pytest tests/test_migrations.py
```

### 5. Handle Large Data Migrations Separately
```python
# Schema change migration
def upgrade():
    op.add_column('posts', sa.Column('view_count', sa.Integer(), default=0))

# Separate data migration
def upgrade():
    # Process in batches
    op.execute("UPDATE posts SET view_count = 0 WHERE view_count IS NULL")
```

---

## Conclusion

Alembic provides a robust foundation for managing database migrations in Python applications:

- **Version control** your database schema changes alongside your code
- **Autogenerate** migrations from model changes to save time
- **Rollback** capabilities for safe deployments
- **Testing** support to catch issues before production
- **CI/CD integration** for automated deployments

With proper migration practices, your database changes become predictable, reversible, and auditable.

---

*Need to monitor your database performance? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring with query performance tracking, connection pool metrics, and automatic alerting when issues arise.*
