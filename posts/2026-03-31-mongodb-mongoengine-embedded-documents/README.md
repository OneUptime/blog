# How to Use MongoEngine Embedded Documents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoEngine, Python, EmbeddedDocument, Schema

Description: Learn how to use MongoEngine EmbeddedDocument and EmbeddedDocumentField to model nested data structures in MongoDB with Python classes.

---

MongoEngine's `EmbeddedDocument` class lets you model nested subdocuments within a parent document. Unlike referenced documents, embedded documents are stored inline within the parent, making reads faster and enabling atomic updates on the entire structure.

## Defining Embedded Documents

Create a class that inherits from `EmbeddedDocument` instead of `Document`:

```python
from mongoengine import Document, EmbeddedDocument, StringField, IntField, EmbeddedDocumentField, ListField

class Address(EmbeddedDocument):
    street = StringField(required=True)
    city = StringField(required=True)
    state = StringField(max_length=2)
    zip_code = StringField(max_length=10)

class User(Document):
    username = StringField(required=True)
    address = EmbeddedDocumentField(Address)
```

The `EmbeddedDocumentField` links the embedded class to the parent document.

## Storing and Retrieving Embedded Documents

```python
from mongoengine import connect

connect("mydb")

addr = Address(street="123 Main St", city="Springfield", state="IL", zip_code="62701")
user = User(username="alice", address=addr)
user.save()

# Retrieve and access embedded fields
user = User.objects.get(username="alice")
print(user.address.city)  # Springfield
```

## Lists of Embedded Documents

Use `EmbeddedDocumentListField` for arrays of embedded documents:

```python
from mongoengine import EmbeddedDocumentListField

class OrderItem(EmbeddedDocument):
    product_id = StringField(required=True)
    name = StringField(required=True)
    quantity = IntField(min_value=1)
    price = IntField()  # price in cents

class Order(Document):
    customer_id = StringField(required=True)
    items = EmbeddedDocumentListField(OrderItem)
    total = IntField()
```

Creating an order with multiple items:

```python
items = [
    OrderItem(product_id="p1", name="Widget", quantity=2, price=999),
    OrderItem(product_id="p2", name="Gadget", quantity=1, price=2499),
]
order = Order(customer_id="c123", items=items, total=4497)
order.save()
```

## Querying on Embedded Fields

Use double-underscore notation to query nested fields:

```python
# Find users in Springfield
users = User.objects(address__city="Springfield")

# Find orders with a specific product
orders = Order.objects(items__product_id="p1")

# Find orders where any item has quantity > 1
orders = Order.objects(items__quantity__gt=1)
```

## Updating Embedded Fields

Use the `set__` prefix with double-underscore notation for atomic updates:

```python
# Update a top-level embedded field
User.objects(username="alice").update(set__address__city="Chicago")

# Append to a list of embedded documents
new_item = OrderItem(product_id="p3", name="Doohickey", quantity=3, price=599)
Order.objects(customer_id="c123").update(push__items=new_item)
```

## Nested Embedded Documents

Embedded documents can be nested to multiple levels:

```python
from mongoengine import FloatField

class GeoPoint(EmbeddedDocument):
    lat = FloatField()
    lon = FloatField()

class Location(EmbeddedDocument):
    name = StringField()
    coordinates = EmbeddedDocumentField(GeoPoint)

class Store(Document):
    store_id = StringField()
    location = EmbeddedDocumentField(Location)
```

## When to Use Embedded vs Referenced Documents

Embedded documents work best when:
- The nested data is always accessed together with the parent
- The nested array has a bounded size (avoid unbounded growth)
- You need atomic updates across parent and child data
- The data has a 1-to-1 or 1-to-few relationship

## Summary

MongoEngine's `EmbeddedDocument` and `EmbeddedDocumentListField` provide a clean way to model nested MongoDB documents in Python. By defining separate classes for embedded types, you gain reusable validation logic and clean query syntax while keeping related data colocated in a single MongoDB document for efficient reads and atomic writes.
