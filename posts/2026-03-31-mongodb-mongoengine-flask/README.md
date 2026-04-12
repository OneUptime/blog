# How to Use MongoEngine with Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoEngine, Flask, Python, Integration

Description: Learn how to integrate MongoEngine with Flask using Flask-MongoEngine to build a MongoDB-backed web application with document models and REST endpoints.

---

Flask-MongoEngine is the most widely used integration library that connects MongoEngine with Flask's application context. It handles connection lifecycle, integrates with Flask's configuration system, and provides pagination utilities out of the box.

## Installation

```bash
pip install flask flask-mongoengine
```

## Basic Setup

Configure Flask-MongoEngine in your application factory:

```python
from flask import Flask
from flask_mongoengine import MongoEngine

db = MongoEngine()

def create_app(config=None):
    app = Flask(__name__)

    app.config["MONGODB_SETTINGS"] = {
        "db": "myapp",
        "host": "localhost",
        "port": 27017
    }

    db.init_app(app)
    return app
```

For MongoDB Atlas, use a URI string:

```python
app.config["MONGODB_SETTINGS"] = {
    "host": "mongodb+srv://user:pass@cluster.mongodb.net/myapp"
}
```

## Defining Models

Document classes work the same as plain MongoEngine, but the `db` instance provides a base class:

```python
from flask_mongoengine import MongoEngine
from mongoengine import StringField, IntField, DateTimeField
from datetime import datetime

db = MongoEngine()

class Post(db.Document):
    title = StringField(required=True, max_length=200)
    body = StringField(required=True)
    author = StringField(required=True)
    views = IntField(default=0)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {"ordering": ["-created_at"]}
```

## Building REST Endpoints

Use Flask routes with MongoEngine queries:

```python
from flask import Flask, jsonify, request, abort

app = create_app()

@app.route("/posts", methods=["GET"])
def list_posts():
    posts = Post.objects.all()
    return jsonify([
        {"id": str(p.id), "title": p.title, "author": p.author}
        for p in posts
    ])

@app.route("/posts/<post_id>", methods=["GET"])
def get_post(post_id):
    post = Post.objects(id=post_id).first_or_404()
    return jsonify({
        "id": str(post.id),
        "title": post.title,
        "body": post.body,
        "author": post.author,
        "views": post.views
    })

@app.route("/posts", methods=["POST"])
def create_post():
    data = request.get_json()
    post = Post(
        title=data["title"],
        body=data["body"],
        author=data["author"]
    )
    post.save()
    return jsonify({"id": str(post.id)}), 201

@app.route("/posts/<post_id>", methods=["DELETE"])
def delete_post(post_id):
    post = Post.objects(id=post_id).first_or_404()
    post.delete()
    return "", 204
```

## Pagination with Flask-MongoEngine

Flask-MongoEngine adds a `paginate()` method to querysets:

```python
@app.route("/posts")
def list_posts():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    pagination = Post.objects.paginate(page=page, per_page=per_page)

    return jsonify({
        "posts": [
            {"id": str(p.id), "title": p.title}
            for p in pagination.items
        ],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    })
```

## Environment-Based Configuration

Use environment variables for production configuration:

```python
import os

app.config["MONGODB_SETTINGS"] = {
    "host": os.environ.get("MONGODB_URI", "mongodb://localhost:27017/myapp")
}
```

## Error Handling

MongoEngine raises `mongoengine.DoesNotExist` when `.get()` finds no document. Flask-MongoEngine's `first_or_404()` converts this to a 404 response automatically:

```python
from mongoengine import DoesNotExist

@app.errorhandler(DoesNotExist)
def handle_not_found(e):
    return jsonify({"error": "Document not found"}), 404
```

## Summary

Flask-MongoEngine simplifies MongoDB integration in Flask applications by managing connection lifecycle through the application context and providing Flask-friendly utilities like `first_or_404()` and `paginate()`. Define your document models using standard MongoEngine fields, register them through the app factory pattern, and use querysets directly in your route handlers for clean, readable database interaction code.
