# How to Use MongoDB with Flask and Flask-PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Flask, PyMongo, Python, REST

Description: Learn how to connect MongoDB to a Flask application using Flask-PyMongo, build REST endpoints, and query documents with PyMongo's fluent API.

---

## Introduction

Flask-PyMongo bridges Flask and PyMongo, registering a MongoDB connection with the Flask application object and exposing `mongo.db` for collection access. It handles connection lifecycle, supports multiple databases, and works with Flask's application factory pattern.

## Installation

```bash
pip install flask flask-pymongo pymongo
```

## Basic Application

```python
from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from bson import ObjectId
from bson.json_util import dumps
import os

app    = Flask(__name__)
app.config['MONGO_URI'] = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/shop')

mongo = PyMongo(app)
```

## CRUD Endpoints

```python
@app.route('/products', methods=['GET'])
def list_products():
    category = request.args.get('category')
    query    = {'category': category} if category else {}
    products = list(mongo.db.products.find(query))
    return dumps(products), 200, {'Content-Type': 'application/json'}


@app.route('/products', methods=['POST'])
def create_product():
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'price', 'category')):
        return jsonify({'error': 'name, price, and category are required'}), 400

    result = mongo.db.products.insert_one({
        'name':     data['name'],
        'price':    float(data['price']),
        'category': data['category'],
        'inStock':  data.get('inStock', True),
    })
    return jsonify({'_id': str(result.inserted_id)}), 201


@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        oid     = ObjectId(product_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    product = mongo.db.products.find_one({'_id': oid})
    if not product:
        return jsonify({'error': 'Not found'}), 404

    product['_id'] = str(product['_id'])
    return jsonify(product), 200


@app.route('/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        oid = ObjectId(product_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    data = request.get_json()
    mongo.db.products.update_one({'_id': oid}, {'$set': data})
    return jsonify({'updated': True}), 200


@app.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        oid = ObjectId(product_id)
    except Exception:
        return jsonify({'error': 'Invalid ID'}), 400

    mongo.db.products.delete_one({'_id': oid})
    return '', 204
```

## Aggregation Example

```python
@app.route('/products/stats', methods=['GET'])
def product_stats():
    pipeline = [
        {'$group': {
            '_id':   '$category',
            'count': {'$sum': 1},
            'avg':   {'$avg': '$price'},
        }},
        {'$sort': {'count': -1}},
    ]
    stats = list(mongo.db.products.aggregate(pipeline))
    return dumps(stats), 200, {'Content-Type': 'application/json'}
```

## Application Factory Pattern

```python
def create_app(config=None):
    app   = Flask(__name__)
    app.config['MONGO_URI'] = os.environ['MONGODB_URI']
    mongo = PyMongo(app)
    app.extensions['mongo'] = mongo
    # register blueprints
    return app
```

## Summary

Flask-PyMongo provides `mongo.db` as a reference to your MongoDB database after initializing `PyMongo(app)` with a `MONGO_URI` config value. All standard PyMongo collection operations are available. Use `bson.json_util.dumps` for serializing cursor results with ObjectId fields, and convert `ObjectId` strings with `bson.ObjectId()` in route parameters.
