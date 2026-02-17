# How to Use SQLAlchemy with Azure Database for PostgreSQL in a Flask Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQLAlchemy, PostgreSQL, Flask, Python, ORM, Database

Description: Connect SQLAlchemy to Azure Database for PostgreSQL Flexible Server in a Flask application with connection pooling and migrations.

---

SQLAlchemy is the most popular ORM in the Python ecosystem, and for good reason. It gives you both a high-level ORM for rapid development and a lower-level core for when you need precise SQL control. Pairing it with Azure Database for PostgreSQL gives you a fully managed database backend that handles backups, patching, and high availability. In this post, I will show how to wire everything together in a Flask application.

## Prerequisites

You need an Azure Database for PostgreSQL Flexible Server and a Flask project. Let me set up both.

```bash
# Install the required Python packages
pip install flask flask-sqlalchemy flask-migrate psycopg2-binary python-dotenv
```

Create the PostgreSQL server if you do not have one.

```bash
# Create the Flexible Server
az postgres flexible-server create \
    --name my-pg-server \
    --resource-group my-rg \
    --location eastus \
    --admin-user pgadmin \
    --admin-password "YourStr0ngP@ss!" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --version 15 \
    --storage-size 32

# Create the database
az postgres flexible-server db create \
    --resource-group my-rg \
    --server-name my-pg-server \
    --database-name flaskapp

# Allow your IP to connect (for local development)
az postgres flexible-server firewall-rule create \
    --resource-group my-rg \
    --name my-pg-server \
    --rule-name allow-local \
    --start-ip-address <your-ip> \
    --end-ip-address <your-ip>
```

## Project Structure

Here is the project layout we are building toward.

```
flask-pg-app/
    app/
        __init__.py      # Application factory
        models.py        # SQLAlchemy models
        routes.py        # API routes
    migrations/          # Alembic migrations (auto-generated)
    config.py            # Configuration
    .env                 # Local environment variables
    run.py               # Entry point
```

## Configuration

Start with the configuration file that reads the database URL from the environment.

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")

    # SQLAlchemy database URI
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///local.db"  # Fallback for local development without PostgreSQL
    )

    # Connection pool settings - important for production
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,          # Maximum number of persistent connections
        "max_overflow": 10,      # Extra connections allowed beyond pool_size
        "pool_timeout": 30,      # Seconds to wait for a connection from the pool
        "pool_recycle": 1800,    # Recycle connections after 30 minutes
        "pool_pre_ping": True    # Verify connections are alive before using them
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
```

The `.env` file for local development.

```
DATABASE_URL=postgresql://pgadmin:YourStr0ngP@ss!@my-pg-server.postgres.database.azure.com:5432/flaskapp?sslmode=require
SECRET_KEY=your-random-secret-key
```

The `sslmode=require` parameter is important. Azure Database for PostgreSQL requires SSL connections by default.

## Application Factory

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Create the SQLAlchemy instance outside the factory
db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class="config.Config"):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    return app
```

## Defining Models

Here are some SQLAlchemy models for a simple blog application.

```python
# app/models.py
from app import db
from datetime import datetime, timezone


class Author(db.Model):
    """Represents a blog author."""
    __tablename__ = "authors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    bio = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to posts
    posts = db.relationship("Post", backref="author", lazy="dynamic")

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "bio": self.bio,
            "created_at": self.created_at.isoformat(),
            "post_count": self.posts.count()
        }


class Post(db.Model):
    """Represents a blog post."""
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False)
    published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    # Foreign key to author
    author_id = db.Column(db.Integer, db.ForeignKey("authors.id"), nullable=False)

    # Relationship to tags through association table
    tags = db.relationship("Tag", secondary="post_tags", backref="posts")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "content": self.content[:200] + "..." if len(self.content) > 200 else self.content,
            "published": self.published,
            "author": self.author.name,
            "tags": [tag.name for tag in self.tags],
            "created_at": self.created_at.isoformat()
        }


class Tag(db.Model):
    """Represents a tag for categorizing posts."""
    __tablename__ = "tags"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)


# Association table for many-to-many relationship between posts and tags
post_tags = db.Table(
    "post_tags",
    db.Column("post_id", db.Integer, db.ForeignKey("posts.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tags.id"), primary_key=True)
)
```

## API Routes

```python
# app/routes.py
from flask import Blueprint, jsonify, request
from app import db
from app.models import Author, Post, Tag

api_bp = Blueprint("api", __name__)


@api_bp.route("/authors", methods=["GET"])
def list_authors():
    """Return all authors."""
    authors = Author.query.all()
    return jsonify([a.to_dict() for a in authors])


@api_bp.route("/authors", methods=["POST"])
def create_author():
    """Create a new author."""
    data = request.get_json()

    if not data or "name" not in data or "email" not in data:
        return jsonify({"error": "name and email are required"}), 400

    author = Author(
        name=data["name"],
        email=data["email"],
        bio=data.get("bio", "")
    )
    db.session.add(author)
    db.session.commit()

    return jsonify(author.to_dict()), 201


@api_bp.route("/posts", methods=["GET"])
def list_posts():
    """Return published posts with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    # Query with pagination
    pagination = Post.query.filter_by(published=True)\
        .order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "posts": [p.to_dict() for p in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    })


@api_bp.route("/posts", methods=["POST"])
def create_post():
    """Create a new blog post."""
    data = request.get_json()

    required = ["title", "slug", "content", "author_id"]
    if not all(field in data for field in required):
        return jsonify({"error": f"Required fields: {required}"}), 400

    # Handle tags
    tag_objects = []
    for tag_name in data.get("tags", []):
        tag = Tag.query.filter_by(name=tag_name).first()
        if not tag:
            tag = Tag(name=tag_name)
        tag_objects.append(tag)

    post = Post(
        title=data["title"],
        slug=data["slug"],
        content=data["content"],
        author_id=data["author_id"],
        published=data.get("published", False),
        tags=tag_objects
    )
    db.session.add(post)
    db.session.commit()

    return jsonify(post.to_dict()), 201


@api_bp.route("/posts/<int:post_id>", methods=["PUT"])
def update_post(post_id):
    """Update an existing post."""
    post = Post.query.get_or_404(post_id)
    data = request.get_json()

    if "title" in data:
        post.title = data["title"]
    if "content" in data:
        post.content = data["content"]
    if "published" in data:
        post.published = data["published"]

    db.session.commit()
    return jsonify(post.to_dict())
```

## Running Migrations

Flask-Migrate (built on Alembic) handles database migrations.

```bash
# Initialize the migrations directory (one-time setup)
flask db init

# Generate a migration from your models
flask db migrate -m "Initial tables for authors, posts, and tags"

# Apply the migration to the database
flask db upgrade
```

## Entry Point

```python
# run.py
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
```

## Connection Pool Tuning

The connection pool settings in config.py are critical for production. Azure PostgreSQL has a connection limit based on your SKU tier. The Standard_B1ms tier allows 50 connections. If you run multiple workers, each worker gets its own pool, so you need to divide accordingly.

For example, if you run Gunicorn with 4 workers and a pool_size of 5, that is 20 persistent connections plus potential overflow.

```python
# For a 4-worker Gunicorn setup with 50 connection limit
SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_size": 5,        # 5 per worker x 4 workers = 20 base connections
    "max_overflow": 5,     # 5 overflow per worker = 20 more max = 40 total max
    "pool_timeout": 30,
    "pool_recycle": 1800,
    "pool_pre_ping": True  # Handles dropped connections gracefully
}
```

The `pool_pre_ping` setting is especially important with Azure PostgreSQL. Azure occasionally drops idle connections, and pre_ping detects and replaces dead connections before your application code sees an error.

## Handling SSL Connections

Azure PostgreSQL requires SSL. If you hit SSL-related errors, make sure your connection string includes `sslmode=require` and that your system has the proper CA certificates.

```python
# Alternative: configure SSL through engine options
SQLALCHEMY_ENGINE_OPTIONS = {
    "connect_args": {
        "sslmode": "require"
    },
    "pool_pre_ping": True
}
```

## Wrapping Up

SQLAlchemy with Azure Database for PostgreSQL in a Flask application gives you a powerful, production-ready stack. The key things to get right are the SSL connection requirement, connection pool sizing relative to your database SKU limits, and using Flask-Migrate for schema changes. Once those pieces are in place, you can focus on building features instead of fighting database connectivity issues.
