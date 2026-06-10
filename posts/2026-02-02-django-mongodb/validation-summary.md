# Validation Summary: How to Use MongoDB with Django

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django
- MongoDB
- Python
- Djongo (Django ORM-to-MongoDB connector)
- MongoEngine (MongoDB ODM)
- PyMongo (MongoDB driver)
- Django REST Framework
- rest_framework_mongoengine
- MongoDB Aggregation Framework

## Sources Consulted
- Djongo documentation: https://www.djongomapper.com/
- Djongo GitHub: https://github.com/doableware/djongo
- MongoEngine documentation: https://docs.mongoengine.org/
- MongoEngine `connect()` reference: https://docs.mongoengine.org/apireference.html#mongoengine.connect
- MongoEngine QuerySet API: https://docs.mongoengine.org/apireference.html#mongoengine.queryset.QuerySet
- PyMongo documentation: https://pymongo.readthedocs.io/
- PyMongo MongoClient URI options: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- MongoDB Aggregation Pipeline reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- rest_framework_mongoengine: https://github.com/umutbozkurt/django-rest-framework-mongoengine
- Django JSONField docs: https://docs.djangoproject.com/en/stable/ref/models/fields/#jsonfield

## Issues Found

1. **Djongo `ArrayField` used with a field instance instead of a Model class.** The original code defined a simple string tag array as `djongo_models.ArrayField(model_container=models.CharField(max_length=50))`. Djongo's `ArrayField.__init__` accepts `model_container: typing.Type[Model]` — it must be a Model subclass, not a Field instance, so this would fail at model definition. Replaced with `models.JSONField(default=list)`, which Djongo stores natively as a MongoDB array. Subsequent code that does `order.tags.append(tag)` continues to work because the field is still a Python list.

2. **Invalid `read_preference` key in the MongoEngine production config.** The original passed `'read_preference': 'primaryPreferred'` to `mongoengine.connect()`. PyMongo's `read_preference` Python keyword expects a `pymongo.read_preferences.ReadPreference` object, not a string; only the camelCase URI option `readPreference` accepts the string form (and matches the style of the surrounding camelCase options like `maxPoolSize`, `connectTimeoutMS`, etc.). Renamed the key to `'readPreference'` so the string value is parsed correctly.

3. **Missing imports in the Indexing Strategies example.** The `Product` document used `BooleanField(default=True)` and `DateTimeField(default=datetime.utcnow)`, but the snippet only imported `Document, StringField, DateTimeField, IntField` and did not import `datetime`. Added `from datetime import datetime` and included `BooleanField` in the `mongoengine` import list so the snippet stands on its own.

## Review Notes

- The `pymongo==3.12.3` pin for Djongo is correct — Djongo (current version 1.3.x) is incompatible with PyMongo 4.x. Readers should be aware Djongo is essentially unmaintained at this point and the PyMongo 3 line is itself in extended-support-only mode; for greenfield projects MongoEngine (or PyMongo directly) is the safer long-term choice.
- The basic Djongo config uses `SCRAM-SHA-1` while the production block uses `SCRAM-SHA-256`. Both are valid PyMongo `authMechanism` values, but `SCRAM-SHA-256` is preferred on MongoDB 4.0+; the basic example is left as-is since it still works.
- The MongoEngine `OrderItem.subtotal` returns `int * Decimal` → `Decimal`, and `sum(...)` over `Decimal` values starting from int `0` is fine — total amount calculation is correct.
- `mongoengine.queryset.QuerySet.update_one()` returns the integer count of updated documents, so the `if result == 0` guards in the update functions are valid.
- `rest_framework_mongoengine` has not had a release in several years and may have compatibility issues with the latest DRF/Django releases; readers should check version compatibility before adopting it in new projects.
