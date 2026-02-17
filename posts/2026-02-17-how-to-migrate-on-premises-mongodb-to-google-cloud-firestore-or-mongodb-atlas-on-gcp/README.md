# How to Migrate On-Premises MongoDB to Google Cloud Firestore or MongoDB Atlas on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, MongoDB, MongoDB Atlas, Database Migration

Description: Compare Firestore and MongoDB Atlas on GCP as migration targets for on-premises MongoDB and learn the migration process for each.

---

When your MongoDB databases need to move to Google Cloud, you have two solid options: migrate to Google Cloud Firestore (a fully managed NoSQL database native to GCP) or run MongoDB Atlas on GCP infrastructure (a managed MongoDB service that runs on Google's cloud). These are fundamentally different choices. Firestore means adopting a new database with a different data model and API. Atlas means keeping MongoDB but running it as a managed service. Let me walk through both paths.

## Option 1 - MongoDB Atlas on GCP

If you want to keep using MongoDB as-is, Atlas on GCP is the lowest-friction path. Your application code stays the same, your queries stay the same, and your data model stays the same. You are just moving from self-managed MongoDB to a managed service.

### Setting Up Atlas on GCP

```bash
# Atlas is configured through the Atlas CLI or web console
# Install the Atlas CLI
brew install mongodb-atlas-cli

# Login to Atlas
atlas auth login

# Create a project
atlas projects create my-gcp-project

# Create a cluster on GCP
atlas clusters create my-cluster \
  --provider GCP \
  --region CENTRAL_US \
  --tier M30 \
  --diskSizeGB 100 \
  --mdbVersion 7.0
```

### Migrating Data to Atlas

Atlas provides a built-in Live Migration service that handles the data transfer with minimal downtime:

```bash
# Option 1: Use Atlas Live Migration (recommended for production)
# Configure through the Atlas web console:
# 1. Go to your Atlas cluster
# 2. Click "Migrate Data to this Cluster"
# 3. Provide your source MongoDB connection string
# 4. Atlas handles initial sync and change stream replication

# Option 2: Use mongodump/mongorestore for smaller databases
# Export from the source
mongodump \
  --host mongodb-primary.internal:27017 \
  --db myapp \
  --out /tmp/mongodb-backup/ \
  --gzip

# Import into Atlas
mongorestore \
  --uri "mongodb+srv://admin:password@my-cluster.mongodb.net" \
  --db myapp \
  /tmp/mongodb-backup/myapp/ \
  --gzip \
  --drop
```

For continuous replication before cutover:

```bash
# Atlas Live Migration uses MongoDB change streams to replicate
# changes from your source to Atlas in real-time.
# The process:
# 1. Initial sync copies all data
# 2. Change streams capture new writes
# 3. When replication lag is near zero, you cut over
# 4. Update your application's connection string

# Monitor replication lag through the Atlas console
# When lag is zero, proceed with cutover
```

### Application Connection String Update

The main code change is updating the connection string:

```python
# Before: connecting to on-premises MongoDB
# client = MongoClient("mongodb://mongodb-primary.internal:27017/myapp?replicaSet=rs0")

# After: connecting to Atlas on GCP
from pymongo import MongoClient

client = MongoClient(
    "mongodb+srv://admin:password@my-cluster.abc123.mongodb.net/myapp"
    "?retryWrites=true&w=majority"
)

# Everything else stays the same
db = client.myapp
orders = db.orders.find({"status": "pending"}).sort("created_at", -1).limit(10)
```

## Option 2 - Google Cloud Firestore

Migrating to Firestore means changing your database technology. Your data model needs to be restructured from MongoDB's document model to Firestore's collection/document hierarchy. This is more work upfront but gives you deeper GCP integration.

### Key Differences Between MongoDB and Firestore

| Feature | MongoDB | Firestore |
|---------|---------|-----------|
| Query language | MQL (MongoDB Query Language) | Firestore query API |
| Aggregation | Aggregation pipeline | Limited (use BigQuery for analytics) |
| Indexes | Compound, text, geospatial | Auto single-field, manual composite |
| Transactions | Multi-document ACID | Multi-document ACID (up to 500 docs) |
| Max document size | 16 MB | 1 MB |
| Joins/lookups | $lookup aggregation | Not supported (denormalize) |
| Real-time updates | Change streams | Built-in real-time listeners |
| Nested arrays | Deeply nested, queryable | Limited query support on nested arrays |

### Data Model Conversion

MongoDB and Firestore both store documents, but the modeling patterns differ:

```python
# MongoDB document structure
# {
#   "_id": ObjectId("..."),
#   "customer_name": "Alice",
#   "email": "alice@example.com",
#   "orders": [
#     {
#       "order_id": "ORD-001",
#       "items": [
#         {"product": "Widget", "qty": 3, "price": 9.99},
#         {"product": "Gadget", "qty": 1, "price": 24.99}
#       ],
#       "total": 54.96,
#       "date": ISODate("2026-01-15")
#     }
#   ],
#   "address": {
#     "street": "123 Main St",
#     "city": "Portland"
#   }
# }

# Firestore equivalent - use subcollections instead of embedded arrays
from google.cloud import firestore

db = firestore.Client()

# Customer document in the "customers" collection
customer_ref = db.collection("customers").document("customer-alice")
customer_ref.set({
    "customer_name": "Alice",
    "email": "alice@example.com",
    "address": {
        "street": "123 Main St",
        "city": "Portland"
    }
})

# Orders as a subcollection under the customer
order_ref = customer_ref.collection("orders").document("ORD-001")
order_ref.set({
    "items": [
        {"product": "Widget", "qty": 3, "price": 9.99},
        {"product": "Gadget", "qty": 1, "price": 24.99}
    ],
    "total": 54.96,
    "date": firestore.SERVER_TIMESTAMP
})
```

### Migration Script

Write a migration script that reads from MongoDB and writes to Firestore:

```python
# Migration script: MongoDB to Firestore
from pymongo import MongoClient
from google.cloud import firestore
import datetime

# Connect to source MongoDB
mongo_client = MongoClient("mongodb://source-server:27017")
mongo_db = mongo_client.myapp

# Connect to Firestore
fs_client = firestore.Client(project="my-gcp-project")

def migrate_customers():
    """Migrate the customers collection from MongoDB to Firestore."""
    batch = fs_client.batch()
    batch_count = 0

    for doc in mongo_db.customers.find():
        # Convert MongoDB ObjectId to string for Firestore document ID
        doc_id = str(doc["_id"])

        # Create Firestore document reference
        fs_ref = fs_client.collection("customers").document(doc_id)

        # Convert MongoDB-specific types
        fs_data = {
            "customer_name": doc.get("customer_name"),
            "email": doc.get("email"),
            "address": doc.get("address", {}),
            "migrated_at": firestore.SERVER_TIMESTAMP
        }

        batch.set(fs_ref, fs_data)
        batch_count += 1

        # Firestore batches support up to 500 operations
        if batch_count >= 400:
            batch.commit()
            batch = fs_client.batch()
            batch_count = 0
            print(f"Committed batch of 400 customers")

        # Migrate orders as subcollection
        if "orders" in doc:
            for order in doc["orders"]:
                order_ref = fs_ref.collection("orders").document(order["order_id"])
                batch.set(order_ref, {
                    "items": order.get("items", []),
                    "total": order.get("total", 0),
                    "date": order.get("date")
                })
                batch_count += 1

                if batch_count >= 400:
                    batch.commit()
                    batch = fs_client.batch()
                    batch_count = 0

    # Commit remaining documents
    if batch_count > 0:
        batch.commit()

    print("Customer migration complete")

# Run the migration
migrate_customers()
```

### Rewriting Queries

MongoDB queries need to be rewritten for Firestore's API:

```python
# MongoDB: Find orders over $100 for a specific customer
# db.customers.aggregate([
#     {"$match": {"_id": customer_id}},
#     {"$unwind": "$orders"},
#     {"$match": {"orders.total": {"$gt": 100}}},
#     {"$sort": {"orders.date": -1}}
# ])

# Firestore equivalent: Query the orders subcollection
customer_ref = fs_client.collection("customers").document(customer_id)
expensive_orders = (
    customer_ref.collection("orders")
    .where("total", ">", 100)
    .order_by("total", direction=firestore.Query.DESCENDING)
    .stream()
)

for order in expensive_orders:
    print(f"Order {order.id}: ${order.to_dict()['total']}")
```

## Which Option to Choose

### Choose MongoDB Atlas on GCP when:

1. Your application is heavily dependent on MongoDB's query language and aggregation framework
2. You have extensive MongoDB-specific logic in your application
3. The migration timeline is tight and you cannot afford to rewrite data access code
4. You need features like change streams, aggregation pipelines, or text search
5. Your documents exceed 1 MB in size

### Choose Firestore when:

1. You are building new features and can restructure the data model
2. You want deep integration with Firebase, Cloud Functions, and other GCP services
3. Real-time synchronization to mobile or web clients is important
4. You want to eliminate database operations entirely (Firestore is fully managed with auto-scaling)
5. Your data model can work within Firestore's constraints (1 MB document size, limited query operators)

## Hybrid Approach

Some teams migrate to Atlas initially for speed, then gradually move specific collections to Firestore where the native GCP integration adds value. This gives you a safe starting point with the option to optimize later.

## Cost Comparison

- **MongoDB Atlas M30 on GCP**: starts around $380/month for a 3-node replica set
- **Firestore**: pay-per-operation pricing with a generous free tier (50K reads, 20K writes per day free)

For read-heavy workloads with moderate data volume, Firestore can be significantly cheaper. For write-heavy workloads with complex queries, Atlas pricing may be more predictable.

Choose based on your application's needs, not just cost. Rewriting your entire data access layer to save a few hundred dollars a month is rarely worth it. But if you are building new services from scratch on GCP, Firestore is the more natural choice.
