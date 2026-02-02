# How to Handle Database with Flask-SQLAlchemy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Flask, SQLAlchemy, Database, ORM

Description: Learn how to use Flask-SQLAlchemy for database operations, including model definition, relationships, queries, and database migrations.

---

If you've worked with Flask for any decent amount of time, you've probably hit the point where you need a real database. Flask-SQLAlchemy is the go-to solution for most Flask applications - it wraps SQLAlchemy (Python's most popular ORM) and makes it play nicely with Flask's application context.

In this post, I'll walk you through everything you need to get productive with Flask-SQLAlchemy, from basic setup to handling complex relationships and transactions.

## Installation and Setup

First, install the required packages:

```bash
pip install flask flask-sqlalchemy
```

Here's a minimal setup to get you started:

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Configure the database URI - using SQLite for simplicity
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'

# Disable modification tracking (saves memory)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the SQLAlchemy instance
db = SQLAlchemy(app)
```

For production, you'd swap SQLite for PostgreSQL or MySQL:

```python
# PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@localhost/dbname'

# MySQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://user:password@localhost/dbname'
```

## Defining Models

Models are Python classes that represent database tables. Each attribute becomes a column.

```python
from datetime import datetime

class User(db.Model):
    # Table name is automatically set to 'user', but you can override it
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<User {self.username}>'
```

### Common Column Types

Here's a quick reference for the column types you'll use most often:

| Type | Python Type | Description |
|------|-------------|-------------|
| `db.Integer` | int | Standard integer |
| `db.String(n)` | str | Variable-length string with max length n |
| `db.Text` | str | Unlimited length text |
| `db.Float` | float | Floating point number |
| `db.Boolean` | bool | True/False values |
| `db.DateTime` | datetime | Date and time |
| `db.Date` | date | Date only |
| `db.LargeBinary` | bytes | Binary data (files, images) |
| `db.JSON` | dict/list | JSON data (PostgreSQL native, emulated elsewhere) |

### Column Options

```python
# Common options you'll use
db.Column(db.String(100),
    primary_key=True,      # Makes this the primary key
    unique=True,           # No duplicate values allowed
    nullable=False,        # Cannot be NULL
    default='pending',     # Default value
    index=True             # Create an index for faster queries
)
```

## Relationships

### One-to-Many

The most common relationship - one user has many posts:

```python
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)

    # One user has many posts
    # backref creates a 'author' attribute on Post
    posts = db.relationship('Post', backref='author', lazy='dynamic')


class Post(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text)

    # Foreign key pointing to the users table
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
```

Using the relationship:

```python
# Create a user and posts
user = User(username='john')
post1 = Post(title='First Post', body='Hello world', author=user)
post2 = Post(title='Second Post', body='Another post', author=user)

db.session.add(user)
db.session.commit()

# Access posts from user
for post in user.posts:
    print(post.title)

# Access user from post
print(post1.author.username)  # 'john'
```

### Many-to-Many

For cases like posts and tags, where each post can have multiple tags and each tag can be on multiple posts:

```python
# Association table - no model class needed
post_tags = db.Table('post_tags',
    db.Column('post_id', db.Integer, db.ForeignKey('posts.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)


class Post(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)

    # Many-to-many relationship
    tags = db.relationship('Tag', secondary=post_tags, backref='posts')


class Tag(db.Model):
    __tablename__ = 'tags'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
```

Using many-to-many:

```python
# Create tags
python_tag = Tag(name='python')
flask_tag = Tag(name='flask')

# Create post with tags
post = Post(title='Flask Tutorial')
post.tags.append(python_tag)
post.tags.append(flask_tag)

db.session.add(post)
db.session.commit()

# Query posts by tag
flask_posts = Post.query.filter(Post.tags.any(name='flask')).all()
```

## CRUD Operations

### Create

```python
# Create a new record
user = User(username='alice', email='alice@example.com')
db.session.add(user)
db.session.commit()

# Add multiple records at once
users = [
    User(username='bob', email='bob@example.com'),
    User(username='charlie', email='charlie@example.com')
]
db.session.add_all(users)
db.session.commit()
```

### Read (Queries)

```python
# Get all records
users = User.query.all()

# Get by primary key
user = User.query.get(1)  # Returns None if not found

# Get by primary key or 404 (useful in Flask routes)
user = User.query.get_or_404(1)

# Filter by column value
user = User.query.filter_by(username='alice').first()

# More complex filters
from datetime import datetime, timedelta

# Users created in the last 7 days
week_ago = datetime.utcnow() - timedelta(days=7)
recent_users = User.query.filter(User.created_at > week_ago).all()

# Multiple conditions
active_admins = User.query.filter(
    User.is_active == True,
    User.username.like('%admin%')
).all()

# Ordering
users = User.query.order_by(User.created_at.desc()).all()

# Pagination
page = User.query.paginate(page=1, per_page=20)
print(page.items)       # List of users on this page
print(page.total)       # Total number of users
print(page.pages)       # Total number of pages
```

### Update

```python
# Method 1: Modify and commit
user = User.query.get(1)
user.email = 'newemail@example.com'
db.session.commit()

# Method 2: Bulk update (more efficient for many records)
User.query.filter_by(is_active=False).update({'is_active': True})
db.session.commit()
```

### Delete

```python
# Delete a single record
user = User.query.get(1)
db.session.delete(user)
db.session.commit()

# Bulk delete
User.query.filter_by(is_active=False).delete()
db.session.commit()
```

## Transactions and Error Handling

Database operations should be wrapped in proper error handling:

```python
from sqlalchemy.exc import IntegrityError

def create_user(username, email):
    try:
        user = User(username=username, email=email)
        db.session.add(user)
        db.session.commit()
        return user
    except IntegrityError:
        # Rollback on constraint violation (duplicate email, etc.)
        db.session.rollback()
        return None
    except Exception as e:
        db.session.rollback()
        raise e
```

For operations that need to succeed or fail together:

```python
def transfer_credits(from_user_id, to_user_id, amount):
    try:
        from_user = User.query.get(from_user_id)
        to_user = User.query.get(to_user_id)

        if from_user.credits < amount:
            raise ValueError('Insufficient credits')

        # Both operations happen in the same transaction
        from_user.credits -= amount
        to_user.credits += amount

        db.session.commit()
        return True
    except Exception as e:
        # If anything fails, both changes are rolled back
        db.session.rollback()
        raise e
```

## Database Migrations with Flask-Migrate

For production applications, you need migrations to evolve your schema:

```bash
pip install flask-migrate
```

Set it up:

```python
from flask_migrate import Migrate

app = Flask(__name__)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
```

Then use the CLI:

```bash
# Initialize migrations folder (run once)
flask db init

# Generate a migration after model changes
flask db migrate -m "Add profile_picture to users"

# Apply migrations to the database
flask db upgrade

# Roll back the last migration
flask db downgrade
```

## Creating Tables

For development or testing, you can create tables directly:

```python
# Create all tables
with app.app_context():
    db.create_all()

# Drop all tables (careful!)
with app.app_context():
    db.drop_all()
```

## Wrapping Up

Flask-SQLAlchemy handles most of what you need for database operations in Flask. The key things to remember:

- Always call `db.session.commit()` after changes
- Use `db.session.rollback()` when errors occur
- Use Flask-Migrate for production schema changes
- Choose the right relationship type for your data model

The SQLAlchemy documentation is excellent if you need to dig deeper into advanced features like custom queries, hybrid properties, or event hooks.
