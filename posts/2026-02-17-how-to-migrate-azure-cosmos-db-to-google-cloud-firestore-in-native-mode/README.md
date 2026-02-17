# How to Migrate Azure Cosmos DB to Google Cloud Firestore in Native Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Firestore, Azure Cosmos DB, NoSQL, Database Migration, Cloud Migration

Description: Learn how to migrate your Azure Cosmos DB databases to Google Cloud Firestore in Native Mode, covering data modeling differences, export strategies, and query translation.

---

Azure Cosmos DB and Google Cloud Firestore are both globally distributed NoSQL databases, but they have different data models and query capabilities. Cosmos DB offers multiple API options (SQL, MongoDB, Cassandra, Gremlin, Table), while Firestore uses a document-collection model with real-time synchronization capabilities. This migration guide focuses on Cosmos DB's SQL (Core) API to Firestore Native Mode, which is the most common migration path.

## Data Model Differences

Understanding the model differences is essential before migrating:

| Cosmos DB Concept | Firestore Equivalent |
|------------------|---------------------|
| Database | Project (one Firestore per project) |
| Container | Collection |
| Item (document) | Document |
| Partition key | Collection group + document hierarchy |
| SQL-like queries | Firestore query language |
| Stored procedures | Cloud Functions |
| Change feed | Real-time listeners / Firestore triggers |
| TTL | TTL policies on collections |
| Global distribution | Multi-region (automatic) |

Key differences to note:

- Cosmos DB containers are schema-flexible with a partition key. Firestore collections do not have partition keys - the document ID serves as the primary key and Firestore handles distribution automatically.
- Cosmos DB uses Request Units (RUs) for throughput. Firestore charges per read/write/delete operation.
- Cosmos DB supports cross-partition queries. Firestore requires composite indexes for complex queries and does not support inequality filters on multiple fields.

## Step 1: Analyze Your Cosmos DB Data

Understand your data structure, sizes, and query patterns.

```bash
# Get Cosmos DB account information
az cosmosdb show \
  --name my-cosmos-account \
  --resource-group my-rg \
  --query '{Name:name, Location:location, Kind:kind}'

# List all databases
az cosmosdb sql database list \
  --account-name my-cosmos-account \
  --resource-group my-rg \
  --query '[*].{Name:name}' \
  --output table

# List containers in a database
az cosmosdb sql container list \
  --account-name my-cosmos-account \
  --resource-group my-rg \
  --database-name mydb \
  --query '[*].{Name:name, PartitionKey:resource.partitionKey.paths[0], TTL:resource.defaultTtl}' \
  --output table
```

## Step 2: Design Your Firestore Data Model

Cosmos DB uses a flat container model with partition keys. Firestore uses a hierarchical collection/document/subcollection model. You may need to restructure your data.

Example Cosmos DB structure:

```json
// Cosmos DB container: "orders"
// Partition key: /customerId
{
  "id": "order-123",
  "customerId": "cust-456",
  "items": [
    { "productId": "prod-1", "quantity": 2, "price": 29.99 },
    { "productId": "prod-2", "quantity": 1, "price": 49.99 }
  ],
  "total": 109.97,
  "status": "shipped",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

Firestore equivalent with hierarchical modeling:

```
// Firestore structure
// Collection: customers/{customerId}/orders/{orderId}
// This enables querying all orders for a specific customer efficiently

customers/
  cust-456/
    orders/
      order-123/
        items: [...]
        total: 109.97
        status: "shipped"
        createdAt: 2026-01-15T10:30:00Z
```

Or keep it flat if you need cross-customer queries:

```
// Flat Firestore structure
// Collection: orders/{orderId}

orders/
  order-123/
    customerId: "cust-456"
    items: [...]
    total: 109.97
    status: "shipped"
    createdAt: 2026-01-15T10:30:00Z
```

## Step 3: Export Data from Cosmos DB

Export your data using the Cosmos DB Data Migration Tool or a custom script.

```python
# Export data from Cosmos DB using the Python SDK
from azure.cosmos import CosmosClient
import json

# Connect to Cosmos DB
client = CosmosClient(
    'https://my-cosmos-account.documents.azure.com:443/',
    credential='your-primary-key'
)

database = client.get_database_client('mydb')
container = database.get_container_client('orders')

# Export all items from the container
items = []
for item in container.read_all_items():
    # Remove Cosmos DB system properties
    clean_item = {k: v for k, v in item.items()
                  if not k.startswith('_')}
    items.append(clean_item)

print(f"Exported {len(items)} items")

# Save to a JSON file for import
with open('cosmos-export.json', 'w') as f:
    json.dump(items, f, indent=2, default=str)
```

For large datasets, use pagination and write to NDJSON:

```python
# Export large datasets with pagination
import json

def export_cosmos_container(container, output_file):
    """Export Cosmos DB container to newline-delimited JSON."""
    count = 0
    with open(output_file, 'w') as f:
        # Use query with continuation for large datasets
        query = "SELECT * FROM c"
        for item in container.query_items(query=query, enable_cross_partition_query=True):
            clean = {k: v for k, v in item.items() if not k.startswith('_')}
            f.write(json.dumps(clean, default=str) + '\n')
            count += 1
            if count % 10000 == 0:
                print(f"Exported {count} items...")

    print(f"Total exported: {count} items")
    return count

export_cosmos_container(container, 'orders-export.ndjson')
```

## Step 4: Import Data into Firestore

Load the exported data into Firestore using the Admin SDK.

```python
# Import data into Firestore using the Admin SDK
from google.cloud import firestore
import json

db = firestore.Client(project='my-gcp-project')

def import_to_firestore(input_file, collection_name):
    """Import NDJSON data into a Firestore collection."""
    batch = db.batch()
    count = 0
    batch_count = 0

    with open(input_file, 'r') as f:
        for line in f:
            item = json.loads(line)
            doc_id = item.pop('id')  # Use Cosmos DB id as Firestore document ID

            # Convert date strings to Firestore timestamps if needed
            if 'createdAt' in item:
                from datetime import datetime
                item['createdAt'] = datetime.fromisoformat(
                    item['createdAt'].replace('Z', '+00:00')
                )

            doc_ref = db.collection(collection_name).document(doc_id)
            batch.set(doc_ref, item)
            count += 1
            batch_count += 1

            # Firestore batches support up to 500 operations
            if batch_count >= 450:
                batch.commit()
                batch = db.batch()
                batch_count = 0
                print(f"Committed {count} documents...")

    # Commit remaining documents
    if batch_count > 0:
        batch.commit()

    print(f"Total imported: {count} documents")

import_to_firestore('orders-export.ndjson', 'orders')
```

## Step 5: Convert Queries

Cosmos DB SQL queries need to be translated to Firestore queries.

```python
# Cosmos DB SQL query examples and Firestore equivalents

# Cosmos DB: SELECT * FROM c WHERE c.status = 'shipped'
# Firestore:
orders_ref = db.collection('orders')
shipped = orders_ref.where('status', '==', 'shipped').stream()

# Cosmos DB: SELECT * FROM c WHERE c.total > 100 ORDER BY c.createdAt DESC
# Firestore (requires a composite index):
large_orders = (orders_ref
    .where('total', '>', 100)
    .order_by('createdAt', direction=firestore.Query.DESCENDING)
    .stream())

# Cosmos DB: SELECT TOP 10 * FROM c ORDER BY c.createdAt DESC
# Firestore:
recent = (orders_ref
    .order_by('createdAt', direction=firestore.Query.DESCENDING)
    .limit(10)
    .stream())

# Cosmos DB: SELECT * FROM c WHERE c.customerId = 'cust-456' AND c.status IN ('pending', 'processing')
# Firestore:
customer_orders = (orders_ref
    .where('customerId', '==', 'cust-456')
    .where('status', 'in', ['pending', 'processing'])
    .stream())
```

Firestore query limitations to be aware of:

- You cannot use inequality operators on multiple fields in a single query
- Range filters and orderBy must be on the same field
- Array-contains can only be used once per query
- Composite indexes must be created for complex queries

## Step 6: Create Composite Indexes

Firestore automatically creates single-field indexes. For compound queries, create composite indexes.

```bash
# Create composite indexes using the Firebase CLI
# Define indexes in firestore.indexes.json
```

```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "customerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "total", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:

```bash
# Deploy Firestore indexes
gcloud firestore indexes composite create \
  --collection-group=orders \
  --field-config=field-path=customerId,order=ascending \
  --field-config=field-path=createdAt,order=descending
```

## Step 7: Convert Change Feed to Firestore Triggers

Cosmos DB change feed becomes Firestore triggers via Cloud Functions.

```python
# Cloud Function triggered by Firestore document changes
# Replaces Cosmos DB change feed processor
from firebase_functions import firestore_fn
from firebase_admin import initialize_app

initialize_app()

@firestore_fn.on_document_updated(document="orders/{orderId}")
def on_order_updated(event):
    """React to order updates - equivalent to Cosmos DB change feed."""
    old_data = event.data.before.to_dict()
    new_data = event.data.after.to_dict()

    # Check if status changed to 'shipped'
    if old_data.get('status') != 'shipped' and new_data.get('status') == 'shipped':
        send_shipping_notification(
            event.params['orderId'],
            new_data['customerId']
        )
```

## Step 8: Update Application Code

Switch your application from the Cosmos DB SDK to the Firestore SDK.

```python
# Old Cosmos DB client code
from azure.cosmos import CosmosClient

cosmos = CosmosClient(url, credential)
database = cosmos.get_database_client('mydb')
container = database.get_container_client('orders')

def get_order(order_id, customer_id):
    return container.read_item(item=order_id, partition_key=customer_id)

def create_order(order):
    return container.create_item(body=order)

# New Firestore client code
from google.cloud import firestore

db = firestore.Client()

def get_order(order_id):
    """Retrieve an order document from Firestore."""
    doc = db.collection('orders').document(order_id).get()
    return doc.to_dict() if doc.exists else None

def create_order(order_id, order_data):
    """Create a new order document in Firestore."""
    db.collection('orders').document(order_id).set(order_data)
    return order_data
```

## Summary

Migrating from Cosmos DB to Firestore requires rethinking your data model and query patterns. The biggest adjustments are moving from a partition-key-based model to Firestore's document hierarchy, translating SQL-like queries to Firestore's query API, and replacing stored procedures with Cloud Functions. Plan for composite index creation early in the process, as missing indexes will cause queries to fail. Test your queries thoroughly against realistic data volumes, since Firestore's query restrictions may require restructuring some of your data access patterns.
