# How to Use MongoEngine Signals and Hooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoEngine, Python, Signal, Hook

Description: Learn how to use MongoEngine signals and pre/post save hooks to execute logic automatically before or after document operations in MongoDB.

---

MongoEngine provides a signals framework that lets you hook into the document lifecycle. Signals fire automatically when documents are saved, deleted, or validated, enabling cross-cutting concerns like auditing, caching invalidation, and derived field computation without cluttering your business logic.

## Available Signals

MongoEngine provides these signals from the `mongoengine.signals` module:

```python
from mongoengine import signals

# Document lifecycle signals
signals.pre_init       # Before __init__
signals.post_init      # After __init__
signals.pre_save       # Before save()
signals.post_save      # After save()
signals.pre_delete     # Before delete()
signals.post_delete    # After delete()
signals.pre_save_post_validation  # After validation, before save
signals.pre_bulk_insert  # Before bulk insert
signals.post_bulk_insert # After bulk insert
```

## Connecting Signals with `connect()`

The cleanest approach is to define handler functions and wire them up with `connect()`:

```python
from mongoengine import Document, StringField, DateTimeField
from mongoengine import signals
from datetime import datetime

class Article(Document):
    title = StringField(required=True)
    content = StringField()
    created_at = DateTimeField()
    updated_at = DateTimeField()

def update_timestamps(sender, document, **kwargs):
    now = datetime.utcnow()
    if not document.created_at:
        document.created_at = now
    document.updated_at = now

signals.pre_save.connect(update_timestamps, sender=Article)
```

## Using the `@classmethod` Pattern

A common pattern is to define signal handlers as class methods and register them inside the class:

```python
from mongoengine import Document, StringField, IntField
from mongoengine import signals

class Product(Document):
    name = StringField(required=True)
    price = IntField()
    slug = StringField()

    @classmethod
    def pre_save(cls, sender, document, **kwargs):
        # Auto-generate slug from name
        document.slug = document.name.lower().replace(" ", "-")

    @classmethod
    def post_save(cls, sender, document, created, **kwargs):
        if created:
            print(f"New product created: {document.name}")
        else:
            print(f"Product updated: {document.name}")

signals.pre_save.connect(Product.pre_save, sender=Product)
signals.post_save.connect(Product.post_save, sender=Product)
```

## The `created` Flag in post_save

The `post_save` signal receives a `created` boolean indicating whether the document was newly inserted or updated:

```python
def on_post_save(sender, document, created, **kwargs):
    if created:
        send_welcome_email(document.email)
    else:
        invalidate_cache(document.id)

signals.post_save.connect(on_post_save, sender=User)
```

## Delete Signals

Use pre/post delete hooks for cleanup tasks:

```python
def on_pre_delete(sender, document, **kwargs):
    # Clean up related files before deleting
    if document.avatar_path:
        import os
        os.remove(document.avatar_path)

def on_post_delete(sender, document, **kwargs):
    # Log the deletion
    AuditLog.objects.create(
        action="deleted",
        model="User",
        document_id=str(document.id)
    )

signals.pre_delete.connect(on_pre_delete, sender=User)
signals.post_delete.connect(on_post_delete, sender=User)
```

## Disconnecting Signals

Signals can be disconnected when no longer needed:

```python
signals.post_save.disconnect(update_timestamps, sender=Article)
```

This is useful in tests where you want to avoid side effects from signal handlers.

## Using `clean()` as a Validation Hook

For validation logic that runs before save, override the `clean()` method:

```python
from mongoengine import Document, StringField, FloatField, ValidationError

class Transfer(Document):
    from_account = StringField(required=True)
    to_account = StringField(required=True)
    amount = FloatField(required=True)

    def clean(self):
        if self.from_account == self.to_account:
            raise ValidationError("Cannot transfer to the same account")
        if self.amount <= 0:
            raise ValidationError("Amount must be positive")
```

The `clean()` method is called automatically during `validate()` and `save()`.

## Summary

MongoEngine signals provide a lifecycle hook system for MongoDB documents without modifying document classes. Use `pre_save` for derived field computation and normalization, `post_save` for side effects like notifications and cache invalidation, and `pre_delete`/`post_delete` for cleanup tasks. The `clean()` method offers a synchronous validation hook as a simpler alternative to signals for validation-only concerns.
