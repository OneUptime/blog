# How to Migrate On-Premises MongoDB to Google Cloud Firestore or MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, MongoDB, MongoDB Atlas, Database Migration

Description: Compare Firestore and MongoDB Atlas on GCP as migration targets for on-premises MongoDB and learn the migration process for each.

---

When your MongoDB databases need to move to Google Cloud, you have two solid options: migrate to Google Cloud Firestore (a fully managed, serverless NoSQL database native to GCP) or run MongoDB Atlas on GCP infrastructure (a managed MongoDB service that runs on Google's cloud). If you choose Firestore you can also choose between using Firestore's own APIs or its MongoDB wire-compatible API.  These are fundamentally different choices. Using Firestore APIs means adopting a new database with a different data model and API. Using MongoDB Atlas or Firestore's MongoDB compatibility means keeping your code as is but running it as a managed service. Let me walk through both paths.

## Option 1 - MongoDB Atlas on GCP

If you want to keep using MongoDB as-is, Atlas on GCP is the lowest-friction path especially if your storage volume isn't high. Your application code stays the same, your queries stay the same, and your data model stays the same. You are just moving from self-managed MongoDB to a managed service. Data volume is an important consideration and can cause friction during migration because MongoDB Atlas enforces limits on per-shard data volume that do not apply to self-managed MongoDB. 

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
# Atlas Live Migration uses Mongosync behind the scenes for
# continuous synchronization from your source to Atlas.
# The process:
# 1. Initial sync copies all data
# 2. Continuous synchronization keeps applying new writes
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
## Option 2 - Firestore with MongoDB compatibility

If you want to keep using your MongoDB code as-is, but want to move to a serverless database, Firestore's MongoDB compatible API is the lowest-friction path. Since Firestore is wire-compatible with MongoDB, all MongoDB client libraries, CLI tools like mongosh, mongoimport, mongoexport, mongorestore, mongodump and GUIs like Compass work seamlessly. Your application code stays the same, your queries stay the same, and your data model stays the same. You are just making a connection string change. Once you migrate you can use either the native APIs or MongoDB APIs because Firestore allows you to access the database using different APIs simultaneously. 

### Setting Up Firestore with MongoDB Compatibility

You can provision a Firestore database with MongoDB compatibility enabled using the Google Cloud CLI (`gcloud`). Note that MongoDB compatibility requires **Firestore Enterprise Edition**:

```bash
# Set your active GCP project
gcloud config set project my-gcp-project

# Create a Firestore Enterprise database with MongoDB compatibility enabled
gcloud firestore databases create \
  --database=myapp-db \
  --location=nam5 \
  --edition=enterprise \
  --enable-mongodb-compatible-data-access
```

### Creating Database User Credentials

Before connecting to your database, create user credentials using the `gcloud firestore user-creds create` command:

```bash
# Create user credentials for your Firestore database
gcloud firestore user-creds create myapp-user \
  --database=myapp-db
```

This command returns details about the created credential, including a server-generated secure password in the `securePassword` field:

```yaml
createTime: '2026-10-13T15:30:00.000000Z'
name: projects/my-gcp-project/databases/myapp-db/userCreds/myapp-user
resourceIdentity:
  principal: principal://firestore.googleapis.com/projects/123456789012/name/databases/myapp-db/userCreds/myapp-user
securePassword: 'a1b2c3d4-generated-secure-password'
state: ENABLED
```

> [!IMPORTANT]
> The `securePassword` is only displayed once when the credential is created (or when running `gcloud firestore user-creds reset-password`). Be sure to save it in a secure location such as Secret Manager.

By default, newly created user credentials have no database permissions. Grant the credential access to your database by binding an IAM role (such as `roles/datastore.owner` for full administrative, index, and data access, or `roles/datastore.user` for standard read/write operations) to the credential's principal identity:

```bash
# Fetch your numeric project number
PROJECT_NUMBER=$(gcloud projects describe my-gcp-project --format="value(projectNumber)")

# Grant roles/datastore.owner scoped to the target database
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="principal://firestore.googleapis.com/projects/${PROJECT_NUMBER}/name/databases/myapp-db/userCreds/myapp-user" \
  --role="roles/datastore.owner" \
  --condition='expression=resource.name == "projects/my-gcp-project/databases/myapp-db",title=myapp-db-access'
```

### Getting the Connection String

Once the database and user credentials are created, use `gcloud firestore databases connection-string` to retrieve the MongoDB connection string. You can choose the authentication mechanism that fits your deployment environment:

```bash
# Option A: Get connection string template with password-based authentication (SCRAM-SHA-256)
gcloud firestore databases connection-string \
  --database=myapp-db \
  --auth=scram-sha-256

# Output returned:
# mongodb://username:password@<database-uid>.nam5.firestore.goog:443/myapp-db?loadBalanced=true&tls=true&retryWrites=false&authMechanism=SCRAM-SHA-256
```

Substitute the `username` with `myapp-user` and `password` with the password generated from the credential creation step:

```
mongodb://myapp-user:a1b2c3d4-generated-secure-password@<database-uid>.nam5.firestore.goog:443/myapp-db?loadBalanced=true&tls=true&retryWrites=false&authMechanism=SCRAM-SHA-256
```

Alternatively, if connecting from Google Compute Engine, Cloud Run, or GKE, you can use IAM authentication without managing database passwords:

```bash
# Option B: Get connection string for Google Compute Engine VM / Cloud Run using IAM (OIDC)
gcloud firestore databases connection-string \
  --database=myapp-db \
  --auth=gce-vm

# Connection string format returned:
# mongodb://<database-uid>.nam5.firestore.goog:443/myapp-db?loadBalanced=true&tls=true&retryWrites=false&authMechanism=MONGODB-OIDC&authMechanismProperties=ENVIRONMENT:gcp,TOKEN_RESOURCE:FIRESTORE
```

### Migrating Data to Firestore

Google Cloud provides Datastream and Dataflow to handle continuous synchronization with minimal downtime, while standard MongoDB tools can be used for smaller offline migrations:

```bash
# Option 1: Use Datastream and Dataflow for continuous replication (recommended for production)
# 1. Datastream streams MongoDB data and changes into Cloud Storage
# 2. The Datastream to Firestore Dataflow template writes the events into Firestore
# 3. When replication lag approaches zero, initiate cutover
# 4. Point your application connection string to Firestore

# Option 2: Use mongodump and mongorestore for smaller databases
# Export from the source MongoDB
mongodump \
  --host mongodb-primary.internal:27017 \
  --db myapp \
  --out /tmp/mongodb-backup/ \
  --gzip

# Import directly into Firestore using your user credentials and connection string
mongorestore \
  --uri "mongodb://myapp-user:a1b2c3d4-generated-secure-password@myapp-db.nam5.firestore.goog:443/myapp?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256" \
  --db myapp \
  /tmp/mongodb-backup/myapp/ \
  --gzip
```

For continuous replication before cutover, see the official Google Cloud documentation:
- [Migrate data from MongoDB to Firestore with MongoDB compatibility](https://cloud.google.com/firestore/mongodb-compatibility/docs/migrate-data)
- [Datastream Overview](https://cloud.google.com/datastream/docs)
- [Datastream MongoDB to Firestore Dataflow Template](https://github.com/GoogleCloudPlatform/DataflowTemplates/tree/main/v2/datastream-mongodb-to-firestore)

### Application Connection String Update

Because Firestore with MongoDB compatibility is wire-compatible, your application code, MongoDB driver, and queries stay the same. You only need to update the connection string:

```python
# Before: connecting to on-premises MongoDB
# client = MongoClient("mongodb://mongodb-primary.internal:27017/myapp?replicaSet=rs0")

# After: connecting to Firestore with MongoDB compatibility
from pymongo import MongoClient

# Use the connection string with the user credentials created via gcloud CLI
client = MongoClient(
    "mongodb://myapp-user:a1b2c3d4-generated-secure-password@<database-uid>.nam5.firestore.goog:443/myapp"
    "?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false"
)

# Everything else stays exactly the same
db = client.myapp
orders = db.orders.find({"status": "pending"}).sort("created_at", -1).limit(10)
``` 

## Option 3 - Firestore native APIs

Using to Firestore's proprietary APIs means changing your application code. Your data model now also supports new constructs like sub-documents unlike MongoDB's document model which handles all the nesting in a single document. This might involve more work upfront but gives you more data modeling flexibility and deeper GCP integration.

### Key Differences Between MongoDB and Firestore

| Feature | MongoDB Atlas | Firestore with MongoDB compatibility | Firestore Native API |
|---------|---------|-----------|-----------|
| Query language | MQL (MongoDB Query Language) | MQL (MongoDB Query Language) | Firestore query API |
| Aggregation | Aggregation pipeline  | Aggregation pipeline | Pipeline queries |
| Indexes | Compound, text, geospatial | Compound, text, geospatial | Compound, text, geospatial |
| Storage | Per shard storage limits | Unlimited, compute and storage scale independently | Unlimited, compute and storage scale independently |
| Transactions | Multi-document ACID | Multi-document ACID | Multi-document ACID |
| Max document size | 16 MiB | 16 MiB | 16 MiB |
| Joins/lookups | $lookup aggregation | $lookup aggregation | addFields pipeline stage |
| Max Nesting Depth | 100 levels | 20 levels | 100 levels via sub-collections |
| Real-time updates | Change streams | Change streams | Built-in real-time listeners |

Note that Firestore offers a Standard and an Enterprise Edition. This comparison is based on Firestore Enterprise Edition.

### Data Model Conversion

MongoDB and Firestore both store documents, but if you don't use Firestore's MongoDB compatibility option, the patterns differ especially when it comes to nesting:

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
from google.cloud.firestore_v1 import FieldFilter

customer_ref = fs_client.collection("customers").document(customer_id)
expensive_orders = (
    customer_ref.collection("orders")
    .where(filter=FieldFilter("total", ">", 100))
    .order_by("total", direction=firestore.Query.DESCENDING)
    .stream()
)

for order in expensive_orders:
    print(f"Order {order.id}: ${order.to_dict()['total']}")
```

## Which Option to Choose

### Choose MongoDB Atlas on GCP when:

1. Your application is heavily dependent on MongoDB's query language and aggregation framework and you rely on more than 20 levels of nesting
2. You have extensive MongoDB-specific logic in your application that relies on some obscure MongoDB features so 100% compatibility is required
3. The migration timeline is tight and you cannot afford to rewrite data access code


### Choose Firestore with MongoDB compatibility when:

1. Your application is heavily dependent on MongoDB's query language and aggregation framework but you don't rely on deeply nested documents
2. You have extensive MongoDB-specific logic in your application but you're using common operators that Firestore's MongoDB compatible API also supports
3. The migration timeline is tight and you cannot afford to rewrite data access code
4. You want to eliminate database operations entirely (Firestore is fully managed with auto-scaling)


### Choose Firestore Native APIs when:

1. You are building new features and can restructure the data model
2. You want deep integration with Firebase, Cloud Functions, and other GCP services
3. Real-time synchronization to mobile or web clients is important
4. You want to eliminate database operations entirely (Firestore is fully managed with auto-scaling)

## Hybrid Approach

Some teams migrate to Atlas or Firestore with MongoDB compatibility initially for speed, then gradually use specific queries or collections to Firestore where the native GCP integration adds value. This gives you a safe starting point with the option to optimize later. Firestore also supports using both APIs on the same database so over time you can mix-and-match capabilities between the native API and MongoDB API. This allows you to get added benefits like real-time sync from Firestore while using your existing MongoDB code for everything else to get the best of both worlds.

## Cost Comparison

- **MongoDB Atlas M30 on GCP**: fixed hourly cluster pricing that varies by region, storage, backup, and configuration
- **Firestore**: pay-per-operation pricing with a generous free tier (50K reads, 20K writes per day free)

For read-heavy workloads with daily fluctuations, Firestore can be significantly cheaper. For steady workloads, Atlas's provisioned pricing pricing may be more predictable.

Choose based on your application's needs, not just cost. Rewriting your entire data access layer to save a few hundred dollars a month is rarely worth it.
