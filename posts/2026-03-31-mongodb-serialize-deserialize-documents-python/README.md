# How to Serialize and Deserialize MongoDB Documents in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, BSON, Serialization

Description: Learn how to serialize and deserialize MongoDB documents in Python using PyMongo, handle BSON types like ObjectId and Decimal128, and convert documents to JSON for APIs.

---

## How PyMongo Handles BSON Types

PyMongo automatically maps BSON types to Python objects when reading from MongoDB and serializes Python objects to BSON when writing. Knowing these mappings prevents silent type coercion bugs.

## BSON Type Mappings in PyMongo

```text
Python Type              <->  BSON Type
--------------------          ---------
str                           String
int                           Int32/Int64 (auto-selected)
float                         Double
bool                          Boolean
None                          Null
datetime.datetime             Date (UTC)
bson.ObjectId                 ObjectId
bson.Decimal128               Decimal128
bytes                         Binary (subtype 0)
bson.Binary                   Binary (with subtype)
bson.Regex                    Regex
```

## Basic Insert and Read

```python
from pymongo import MongoClient
from bson import ObjectId, Decimal128
from datetime import datetime, UTC

client = MongoClient(uri)
db = client["shop"]

# Insert a document
product = {
    "_id": ObjectId(),
    "name": "Wireless Headphones",
    "price": Decimal128("149.99"),  # Use Decimal128 for money
    "qty": 50,
    "tags": ["electronics", "audio"],
    "created_at": datetime.now(UTC),
    "active": True
}
db.products.insert_one(product)

# Read back
retrieved = db.products.find_one({"_id": product["_id"]})
assert isinstance(retrieved["_id"], ObjectId)
assert isinstance(retrieved["created_at"], datetime)
assert str(retrieved["price"]) == "149.99"
```

## Querying by ObjectId from a String

```python
from bson import ObjectId

# Convert URL parameter string to ObjectId
product_id = ObjectId("507f1f77bcf86cd799439011")
product = db.products.find_one({"_id": product_id})
```

## Serializing Documents to JSON

PyMongo documents cannot be directly passed to `json.dumps` because ObjectId and datetime are not JSON-serializable. Use `bson.json_util`:

```python
import json
from bson import json_util

# Serialize with bson.json_util (Extended JSON)
product = db.products.find_one({"_id": ObjectId("507f1f77bcf86cd799439011")})
serialized = json.dumps(product, default=json_util.default)
print(serialized)
# {"_id": {"$oid": "507f..."}, "created_at": {"$date": ...}, "price": {"$numberDecimal": "149.99"}}

# Deserialize back (preserves BSON types)
deserialized = json.loads(serialized, object_hook=json_util.object_hook)
assert isinstance(deserialized["_id"], ObjectId)
```

## Custom JSON Encoder for REST APIs

For API responses, use a custom encoder that produces clean JSON:

```python
import json
from datetime import datetime
from bson import ObjectId, Decimal128

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Decimal128):
            return float(str(obj))
        return super().default(obj)

# In a Flask route
from flask import Flask
app = Flask(__name__)

@app.route("/products/<product_id>")
def get_product(product_id):
    product = db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        return {"error": "Not found"}, 404
    return app.response_class(
        response=json.dumps(product, cls=MongoJSONEncoder),
        mimetype="application/json"
    )
```

## Using Pydantic for Document Validation and Serialization

```python
from typing import Any
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema
from bson import ObjectId
from datetime import datetime

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls.validate,
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class ProductModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    price: float
    qty: int
    created_at: datetime

    @field_serializer("created_at")
    def serialize_datetime(self, v: datetime) -> str:
        return v.isoformat()

product = ProductModel(**db.products.find_one({"name": "Wireless Headphones"}))
print(product.model_dump_json())
```

## Summary

PyMongo maps BSON types to Python counterparts automatically: ObjectId, Decimal128, and datetime objects round-trip correctly through insert and find operations. For JSON serialization, use `bson.json_util` for round-trippable Extended JSON or a custom `json.JSONEncoder` for API-friendly output that converts ObjectId to strings and datetime to ISO 8601. For structured applications, Pydantic models with custom ObjectId validators provide type safety and clean serialization.
