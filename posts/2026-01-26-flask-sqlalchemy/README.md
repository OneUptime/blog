# How to Use Flask with SQLAlchemy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flask, SQLAlchemy, Python, Database, ORM

Description: Learn how to use Flask with SQLAlchemy for database operations including models, relationships, queries, and migrations with Flask-Migrate.

---

> Flask-SQLAlchemy combines the flexibility of Flask with the power of SQLAlchemy ORM. This integration provides a clean way to define models, manage relationships, and interact with your database using Python objects instead of raw SQL.

This guide covers everything from basic setup to advanced patterns including model relationships, complex queries, and database migrations.

---

## Architecture Overview

Before diving into code, let's understand how Flask-SQLAlchemy components work together:

```mermaid
graph TD
    A[Flask Application] --> B[Flask-SQLAlchemy Extension]
    B --> C[SQLAlchemy ORM]
    C --> D[Database Engine]
    D --> E[(PostgreSQL/MySQL/SQLite)]

    subgraph Models
        F[User Model]
        G[Post Model]
        H[Comment Model]
    end

    B --> F
    B --> G
    B --> H

    F --> |has_many| G
    G --> |has_many| H
    H --> |belongs_to| F
```

---

## Project Setup

### Installation

Install Flask-SQLAlchemy and a database driver:

```bash
# Install Flask-SQLAlchemy
pip install flask-sqlalchemy

# Install database drivers based on your choice
pip install psycopg2-binary  # PostgreSQL
pip install pymysql          # MySQL
pip install mysqlclient      # MySQL (alternative)
# SQLite is included with Python
```

### Basic Configuration

Create a Flask application with SQLAlchemy configured:

```python
# app.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize Flask application
app = Flask(__name__)

# Database configuration
# SQLite (for development)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'

# PostgreSQL (for production)
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@localhost:5432/mydb'

# MySQL
# app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://user:password@localhost:3306/mydb'

# Disable modification tracking (saves memory)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable SQL query logging in development
app.config['SQLALCHEMY_ECHO'] = True  # Set to False in production

# Initialize SQLAlchemy with the app
db = SQLAlchemy(app)
```

### Application Factory Pattern

For larger applications, use the factory pattern:

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Create db instance without app
db = SQLAlchemy()

def create_app(config_name='development'):
    """Application factory function"""
    app = Flask(__name__)

    # Load configuration based on environment
    if config_name == 'development':
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dev.db'
        app.config['SQLALCHEMY_ECHO'] = True
    elif config_name == 'testing':
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_ECHO'] = False
    elif config_name == 'production':
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
        app.config['SQLALCHEMY_ECHO'] = False

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize db with app
    db.init_app(app)

    # Register blueprints
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    return app
```

---

## Defining Models

### Basic Model Structure

Models represent database tables. Each attribute becomes a column:

```python
# models/user.py
from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    """User model representing the users table"""

    # Table name (optional, defaults to class name lowercase)
    __tablename__ = 'users'

    # Primary key column
    id = db.Column(db.Integer, primary_key=True)

    # String columns with constraints
    username = db.Column(
        db.String(80),      # Max length 80 characters
        unique=True,        # Must be unique across all rows
        nullable=False,     # Cannot be NULL
        index=True          # Create index for faster lookups
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False,
        index=True
    )

    # Password hash (never store plain passwords)
    password_hash = db.Column(db.String(256), nullable=False)

    # Boolean with default value
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Timestamps
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,  # Set on creation
        nullable=False
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow  # Update on modification
    )

    def set_password(self, password):
        """Hash and set the password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        """String representation for debugging"""
        return f'<User {self.username}>'

    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
```

### Column Types Reference

SQLAlchemy provides various column types:

```python
# Column types reference
class Example(db.Model):
    __tablename__ = 'examples'

    id = db.Column(db.Integer, primary_key=True)

    # Numeric types
    small_int = db.Column(db.SmallInteger)    # -32768 to 32767
    integer = db.Column(db.Integer)            # Standard integer
    big_int = db.Column(db.BigInteger)         # Large integers
    float_val = db.Column(db.Float)            # Floating point
    decimal_val = db.Column(db.Numeric(10, 2)) # Precise decimal (10 digits, 2 after decimal)

    # String types
    short_text = db.Column(db.String(50))      # VARCHAR with max length
    long_text = db.Column(db.Text)             # Unlimited text

    # Date and time
    date_only = db.Column(db.Date)             # Date without time
    time_only = db.Column(db.Time)             # Time without date
    full_datetime = db.Column(db.DateTime)     # Date and time

    # Boolean
    is_flag = db.Column(db.Boolean)

    # Binary data
    binary_data = db.Column(db.LargeBinary)    # For files, images

    # JSON (PostgreSQL native, emulated on others)
    json_data = db.Column(db.JSON)

    # Enum
    status = db.Column(db.Enum('pending', 'active', 'closed', name='status_enum'))
```

---

## Model Relationships

### Relationship Types Overview

```mermaid
graph LR
    subgraph One-to-Many
        U1[User] -->|has many| P1[Posts]
    end

    subgraph Many-to-Many
        P2[Post] <-->|tags| T[Tags]
    end

    subgraph One-to-One
        U2[User] -->|has one| PR[Profile]
    end
```

### One-to-Many Relationship

A user can have many posts, but each post belongs to one user:

```python
# models/post.py
from app import db
from datetime import datetime

class Post(db.Model):
    """Blog post model with user relationship"""

    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False, index=True)
    is_published = db.Column(db.Boolean, default=False)
    published_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign key linking to users table
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),  # References users.id column
        nullable=False,
        index=True                   # Index for faster joins
    )

    # Relationship to User model
    # backref creates 'posts' attribute on User model
    author = db.relationship(
        'User',
        backref=db.backref(
            'posts',
            lazy='dynamic',      # Returns query object instead of list
            cascade='all, delete-orphan'  # Delete posts when user is deleted
        )
    )

    def __repr__(self):
        return f'<Post {self.title[:30]}>'

    def publish(self):
        """Mark post as published"""
        self.is_published = True
        self.published_at = datetime.utcnow()


# Update User model to include relationship reference
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # ... other fields ...

    # Relationship defined via backref in Post model
    # user.posts is now available
```

### Many-to-Many Relationship

Posts can have multiple tags, and tags can be applied to multiple posts:

```python
# models/tag.py
from app import db

# Association table for many-to-many relationship
post_tags = db.Table(
    'post_tags',
    db.Column('post_id', db.Integer, db.ForeignKey('posts.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)

class Tag(db.Model):
    """Tag model for categorizing posts"""

    __tablename__ = 'tags'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    slug = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # Many-to-many relationship with posts
    posts = db.relationship(
        'Post',
        secondary=post_tags,         # Use the association table
        lazy='dynamic',              # Returns query object
        backref=db.backref(
            'tags',
            lazy='dynamic'
        )
    )

    def __repr__(self):
        return f'<Tag {self.name}>'


# Usage examples
# Adding tags to a post
post = Post.query.get(1)
python_tag = Tag.query.filter_by(name='Python').first()
post.tags.append(python_tag)
db.session.commit()

# Getting all posts with a specific tag
python_posts = Tag.query.filter_by(name='Python').first().posts.all()

# Getting all tags for a post
post_tags = Post.query.get(1).tags.all()
```

### One-to-One Relationship

Each user has exactly one profile:

```python
# models/profile.py
from app import db

class Profile(db.Model):
    """User profile with additional information"""

    __tablename__ = 'profiles'

    id = db.Column(db.Integer, primary_key=True)
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.String(500))
    website = db.Column(db.String(200))
    location = db.Column(db.String(100))

    # Foreign key with unique constraint for one-to-one
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        unique=True,        # Ensures one-to-one relationship
        nullable=False
    )

    # Relationship with uselist=False for one-to-one
    user = db.relationship(
        'User',
        backref=db.backref(
            'profile',
            uselist=False,  # Returns single object, not list
            cascade='all, delete-orphan'
        )
    )

    def __repr__(self):
        return f'<Profile for user_id={self.user_id}>'


# Usage
user = User.query.get(1)
user.profile.bio = "Python developer"  # Access profile directly
db.session.commit()
```

### Self-Referential Relationship

For hierarchical data like comments with replies:

```python
# models/comment.py
from app import db
from datetime import datetime

class Comment(db.Model):
    """Comment model with self-referential relationship for replies"""

    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)

    # Self-referential foreign key for replies
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)

    # Relationships
    author = db.relationship('User', backref='comments')
    post = db.relationship('Post', backref=db.backref('comments', lazy='dynamic'))

    # Self-referential relationship
    replies = db.relationship(
        'Comment',
        backref=db.backref('parent', remote_side=[id]),
        lazy='dynamic'
    )

    def __repr__(self):
        return f'<Comment {self.id} by user {self.user_id}>'

    def get_thread(self):
        """Get all replies recursively"""
        result = []
        for reply in self.replies:
            result.append(reply)
            result.extend(reply.get_thread())
        return result
```

---

## CRUD Operations

### Creating Records

```python
# Creating a single record
def create_user(username, email, password):
    """Create a new user"""
    user = User(
        username=username,
        email=email
    )
    user.set_password(password)

    # Add to session and commit
    db.session.add(user)
    db.session.commit()

    return user


# Creating with relationships
def create_post(user_id, title, content):
    """Create a post for a user"""
    post = Post(
        user_id=user_id,
        title=title,
        content=content,
        slug=slugify(title)
    )

    db.session.add(post)
    db.session.commit()

    return post


# Bulk insert for better performance
def bulk_create_tags(tag_names):
    """Create multiple tags efficiently"""
    tags = [Tag(name=name, slug=slugify(name)) for name in tag_names]

    # add_all is more efficient than multiple add() calls
    db.session.add_all(tags)
    db.session.commit()

    return tags
```

### Reading Records

```python
# Get by primary key
user = User.query.get(1)           # Returns None if not found
user = User.query.get_or_404(1)    # Raises 404 if not found

# Get all records
all_users = User.query.all()       # Returns list

# Filter records
active_users = User.query.filter_by(is_active=True).all()

# Complex filtering with filter()
from sqlalchemy import and_, or_

# Multiple conditions
users = User.query.filter(
    and_(
        User.is_active == True,
        User.created_at >= datetime(2024, 1, 1)
    )
).all()

# OR conditions
users = User.query.filter(
    or_(
        User.username.like('%admin%'),
        User.email.like('%@company.com')
    )
).all()

# First record
user = User.query.filter_by(email='user@example.com').first()
user = User.query.filter_by(email='user@example.com').first_or_404()

# Ordering
recent_posts = Post.query.order_by(Post.created_at.desc()).all()

# Pagination
page = request.args.get('page', 1, type=int)
per_page = 10
posts = Post.query.order_by(Post.created_at.desc()).paginate(
    page=page,
    per_page=per_page,
    error_out=False  # Return empty page instead of 404
)

# Access pagination attributes
posts.items      # List of items on current page
posts.total      # Total number of items
posts.pages      # Total number of pages
posts.has_next   # True if there's a next page
posts.has_prev   # True if there's a previous page
posts.next_num   # Next page number
posts.prev_num   # Previous page number
```

### Updating Records

```python
# Update single record
def update_user(user_id, **kwargs):
    """Update user with provided fields"""
    user = User.query.get_or_404(user_id)

    # Update only provided fields
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.session.commit()
    return user


# Bulk update
def deactivate_old_users(days=365):
    """Deactivate users who haven't logged in"""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # update() executes UPDATE directly without loading objects
    count = User.query.filter(
        User.last_login < cutoff
    ).update(
        {'is_active': False},
        synchronize_session='fetch'  # Refresh session after update
    )

    db.session.commit()
    return count


# Update with validation
def update_post(post_id, user_id, **kwargs):
    """Update post with ownership check"""
    post = Post.query.get_or_404(post_id)

    # Verify ownership
    if post.user_id != user_id:
        raise PermissionError("Not authorized to edit this post")

    for key, value in kwargs.items():
        if hasattr(post, key) and key not in ['id', 'user_id', 'created_at']:
            setattr(post, key, value)

    db.session.commit()
    return post
```

### Deleting Records

```python
# Delete single record
def delete_user(user_id):
    """Delete a user and related data"""
    user = User.query.get_or_404(user_id)

    db.session.delete(user)
    db.session.commit()


# Delete with cascade (defined in relationship)
# When user is deleted, their posts are also deleted
# due to cascade='all, delete-orphan' in relationship


# Bulk delete
def delete_old_posts(days=30):
    """Delete unpublished posts older than specified days"""
    cutoff = datetime.utcnow() - timedelta(days=days)

    count = Post.query.filter(
        and_(
            Post.is_published == False,
            Post.created_at < cutoff
        )
    ).delete(synchronize_session='fetch')

    db.session.commit()
    return count


# Soft delete pattern
class SoftDeleteMixin:
    """Mixin for soft delete functionality"""

    deleted_at = db.Column(db.DateTime, nullable=True)

    def soft_delete(self):
        """Mark as deleted without removing from database"""
        self.deleted_at = datetime.utcnow()
        db.session.commit()

    def restore(self):
        """Restore a soft-deleted record"""
        self.deleted_at = None
        db.session.commit()

    @classmethod
    def active(cls):
        """Query only non-deleted records"""
        return cls.query.filter(cls.deleted_at.is_(None))
```

---

## Advanced Queries

### Query Flow Visualization

```mermaid
flowchart LR
    A[Model.query] --> B[filter/filter_by]
    B --> C[order_by]
    C --> D[limit/offset]
    D --> E{Terminal}
    E --> F[.all - List]
    E --> G[.first - Single/None]
    E --> H[.one - Single/Error]
    E --> I[.count - Integer]
    E --> J[.paginate - Pagination]
```

### Eager Loading to Avoid N+1 Queries

```python
from sqlalchemy.orm import joinedload, selectinload, subqueryload

# Problem: N+1 queries
# This executes 1 query for posts + N queries for authors
posts = Post.query.all()
for post in posts:
    print(post.author.username)  # Each access triggers a query


# Solution 1: joinedload (good for one-to-one, one-to-many)
# Single query with JOIN
posts = Post.query.options(
    joinedload(Post.author)
).all()

for post in posts:
    print(post.author.username)  # No additional queries


# Solution 2: selectinload (good for many relationships)
# Two queries: one for posts, one for all related authors
posts = Post.query.options(
    selectinload(Post.tags)
).all()


# Solution 3: subqueryload (alternative for collections)
users = User.query.options(
    subqueryload(User.posts)
).all()


# Nested eager loading
posts = Post.query.options(
    joinedload(Post.author).joinedload(User.profile),
    selectinload(Post.tags),
    selectinload(Post.comments).joinedload(Comment.author)
).all()
```

### Complex Filtering

```python
from sqlalchemy import func, case, and_, or_, not_

# Text search with LIKE
posts = Post.query.filter(
    Post.title.ilike('%python%')  # Case-insensitive
).all()

# IN clause
user_ids = [1, 2, 3, 4, 5]
users = User.query.filter(User.id.in_(user_ids)).all()

# NOT IN
users = User.query.filter(~User.id.in_(user_ids)).all()

# BETWEEN
posts = Post.query.filter(
    Post.created_at.between(start_date, end_date)
).all()

# IS NULL / IS NOT NULL
draft_posts = Post.query.filter(Post.published_at.is_(None)).all()
published_posts = Post.query.filter(Post.published_at.isnot(None)).all()

# Subquery
from sqlalchemy import exists

# Find users who have published posts
subq = db.session.query(Post.user_id).filter(Post.is_published == True).subquery()
authors = User.query.filter(User.id.in_(subq)).all()

# EXISTS subquery
has_posts = db.session.query(
    exists().where(Post.user_id == User.id)
).correlate(User)
users_with_posts = User.query.filter(has_posts).all()
```

### Aggregations and Grouping

```python
from sqlalchemy import func

# Count
total_users = User.query.count()
active_users = User.query.filter_by(is_active=True).count()

# Aggregate functions
result = db.session.query(
    func.count(Post.id).label('total_posts'),
    func.avg(func.length(Post.content)).label('avg_length'),
    func.max(Post.created_at).label('latest_post')
).first()

print(f"Total: {result.total_posts}, Avg length: {result.avg_length}")

# Group by
posts_per_user = db.session.query(
    User.username,
    func.count(Post.id).label('post_count')
).join(Post).group_by(User.id).all()

for username, count in posts_per_user:
    print(f"{username}: {count} posts")

# Having clause
prolific_authors = db.session.query(
    User.username,
    func.count(Post.id).label('post_count')
).join(Post).group_by(User.id).having(
    func.count(Post.id) >= 5
).all()

# Complex aggregation with case
user_stats = db.session.query(
    User.username,
    func.count(Post.id).label('total_posts'),
    func.sum(
        case((Post.is_published == True, 1), else_=0)
    ).label('published_posts'),
    func.sum(
        case((Post.is_published == False, 1), else_=0)
    ).label('draft_posts')
).outerjoin(Post).group_by(User.id).all()
```

### Raw SQL When Needed

```python
from sqlalchemy import text

# Execute raw SQL
result = db.session.execute(
    text("SELECT * FROM users WHERE created_at > :date"),
    {'date': datetime(2024, 1, 1)}
)
users = result.fetchall()

# Raw SQL with model mapping
users = db.session.query(User).from_statement(
    text("SELECT * FROM users WHERE is_active = :active ORDER BY created_at DESC")
).params(active=True).all()

# Complex raw query
query = text("""
    SELECT
        u.username,
        COUNT(p.id) as post_count,
        MAX(p.created_at) as last_post
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    GROUP BY u.id
    ORDER BY post_count DESC
    LIMIT :limit
""")

result = db.session.execute(query, {'limit': 10})
for row in result:
    print(f"{row.username}: {row.post_count} posts")
```

---

## Database Migrations with Flask-Migrate

Flask-Migrate uses Alembic to handle schema changes safely.

### Setup

```bash
# Install Flask-Migrate
pip install flask-migrate
```

```python
# app.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Import models so they're registered
from models import User, Post, Tag, Comment
```

### Migration Workflow

```mermaid
flowchart LR
    A[Change Model] --> B[flask db migrate]
    B --> C[Review Migration]
    C --> D[flask db upgrade]
    D --> E[Database Updated]

    F[Rollback Needed] --> G[flask db downgrade]
    G --> H[Previous State]
```

### Migration Commands

```bash
# Initialize migrations directory (run once)
flask db init

# Create a migration after model changes
flask db migrate -m "Add user profile table"

# Apply migrations to database
flask db upgrade

# Rollback last migration
flask db downgrade

# View migration history
flask db history

# View current revision
flask db current

# Upgrade to specific revision
flask db upgrade ae1027a6acf

# Downgrade to specific revision
flask db downgrade ae1027a6acf
```

### Example Migration File

After running `flask db migrate`, review the generated file:

```python
# migrations/versions/xxxx_add_user_profile_table.py
"""Add user profile table

Revision ID: ae1027a6acf
Revises: 5678abcd
Create Date: 2024-01-15 10:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'ae1027a6acf'
down_revision = '5678abcd'
branch_labels = None
depends_on = None

def upgrade():
    """Apply migration"""
    # Create profiles table
    op.create_table(
        'profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Add index
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'])

def downgrade():
    """Reverse migration"""
    op.drop_index('ix_profiles_user_id', table_name='profiles')
    op.drop_table('profiles')
```

### Data Migrations

Sometimes you need to migrate data, not just schema:

```python
# migrations/versions/xxxx_populate_slugs.py
"""Populate post slugs

Revision ID: bf2038b7def
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = 'bf2038b7def'
down_revision = 'ae1027a6acf'

def slugify(text):
    """Convert text to URL-friendly slug"""
    import re
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

def upgrade():
    # Define table for raw SQL operations
    posts = table('posts',
        column('id', sa.Integer),
        column('title', sa.String),
        column('slug', sa.String)
    )

    # Get connection
    connection = op.get_bind()

    # Fetch posts without slugs
    results = connection.execute(
        sa.select(posts.c.id, posts.c.title).where(posts.c.slug.is_(None))
    ).fetchall()

    # Update each post with generated slug
    for post_id, title in results:
        connection.execute(
            posts.update().where(posts.c.id == post_id).values(slug=slugify(title))
        )

def downgrade():
    # Data migrations typically don't need downgrade
    pass
```

---

## Flask Integration Patterns

### Request Context and Sessions

```python
# routes/users.py
from flask import Blueprint, request, jsonify
from app import db
from models import User

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/', methods=['GET'])
def list_users():
    """List all active users with pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # SQLAlchemy session is automatically managed per request
    pagination = User.query.filter_by(
        is_active=True
    ).order_by(
        User.created_at.desc()
    ).paginate(page=page, per_page=per_page)

    return jsonify({
        'users': [user.to_dict() for user in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a single user by ID"""
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@users_bp.route('/', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.get_json()

    # Validate required fields
    if not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check for existing user
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409

    # Create user
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Update an existing user"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    # Update allowed fields
    if 'email' in data:
        # Check uniqueness
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        user.email = data['email']

    if 'is_active' in data:
        user.is_active = data['is_active']

    db.session.commit()
    return jsonify(user.to_dict())

@users_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user"""
    user = User.query.get_or_404(user_id)

    db.session.delete(user)
    db.session.commit()

    return '', 204
```

### Error Handling

```python
# app/errors.py
from flask import jsonify
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

def register_error_handlers(app):
    """Register database error handlers"""

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        """Handle database constraint violations"""
        db.session.rollback()
        return jsonify({
            'error': 'Database constraint violation',
            'message': str(error.orig)
        }), 409

    @app.errorhandler(SQLAlchemyError)
    def handle_db_error(error):
        """Handle general database errors"""
        db.session.rollback()
        app.logger.error(f"Database error: {error}")
        return jsonify({
            'error': 'Database error occurred'
        }), 500
```

### Testing with SQLAlchemy

```python
# tests/conftest.py
import pytest
from app import create_app, db
from models import User, Post

@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app('testing')

    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Drop all tables after test
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def sample_user(app):
    """Create a sample user for testing"""
    with app.app_context():
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        return user.id


# tests/test_users.py
def test_create_user(client):
    """Test user creation"""
    response = client.post('/api/users/', json={
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'securepass'
    })

    assert response.status_code == 201
    data = response.get_json()
    assert data['username'] == 'newuser'

def test_get_user(client, sample_user):
    """Test getting a user"""
    response = client.get(f'/api/users/{sample_user}')

    assert response.status_code == 200
    data = response.get_json()
    assert data['username'] == 'testuser'

def test_duplicate_username(client, sample_user):
    """Test that duplicate usernames are rejected"""
    response = client.post('/api/users/', json={
        'username': 'testuser',  # Already exists
        'email': 'another@example.com',
        'password': 'password'
    })

    assert response.status_code == 409
```

---

## Best Practices

### 1. Use Application Factory Pattern

Separate db initialization from app creation for better testing and configuration:

```python
# Correct
db = SQLAlchemy()
def create_app():
    app = Flask(__name__)
    db.init_app(app)
    return app

# Avoid
app = Flask(__name__)
db = SQLAlchemy(app)  # Tightly coupled
```

### 2. Index Frequently Queried Columns

```python
# Add indexes for columns used in WHERE, JOIN, ORDER BY
email = db.Column(db.String(120), index=True)  # Frequently searched
user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)  # Foreign keys
```

### 3. Use Lazy Loading Appropriately

```python
# lazy='select' (default) - Load when accessed
# lazy='dynamic' - Returns query object
# lazy='joined' - Load with JOIN
# lazy='subquery' - Load with subquery

# For large collections, use 'dynamic'
posts = db.relationship('Post', lazy='dynamic')  # user.posts returns query

# For always-needed data, use 'joined'
profile = db.relationship('Profile', lazy='joined', uselist=False)
```

### 4. Handle Transactions Properly

```python
# Use context manager for complex operations
def transfer_ownership(from_user_id, to_user_id, post_ids):
    try:
        for post_id in post_ids:
            post = Post.query.get(post_id)
            if post.user_id != from_user_id:
                raise ValueError(f"Post {post_id} not owned by user {from_user_id}")
            post.user_id = to_user_id

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise
```

### 5. Avoid N+1 Queries

```python
# Bad - N+1 queries
posts = Post.query.all()
for post in posts:
    print(post.author.username)  # Query per post

# Good - eager loading
posts = Post.query.options(joinedload(Post.author)).all()
for post in posts:
    print(post.author.username)  # No extra queries
```

---

## Conclusion

Flask-SQLAlchemy provides a powerful and flexible way to work with databases in Flask applications. Key takeaways:

- **Models map to tables** with declarative syntax
- **Relationships** handle foreign keys and associations cleanly
- **Query API** is expressive and Pythonic
- **Flask-Migrate** manages schema changes safely
- **Eager loading** prevents N+1 query problems

Start simple with basic models and queries, then add complexity as your application grows. The patterns shown here scale from small projects to large production applications.

---

*Looking to monitor your Flask application performance? [OneUptime](https://oneuptime.com) provides application monitoring with database query tracking, error alerting, and performance metrics for Python applications.*

**Related Reading:**
- [How to Implement Connection Pooling in Python for PostgreSQL](https://oneuptime.com/blog/post/2025-01-06-python-connection-pooling-postgresql/view)
- [How to Build Production-Ready FastAPI Applications](https://oneuptime.com/blog/post/2026-01-26-fastapi-production-ready/view)
