# How to Perform CRUD Operations on Azure Cosmos DB Using azure-cosmos SDK in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Python, NoSQL, CRUD, azure-cosmos, Database

Description: Learn how to create, read, update, and delete documents in Azure Cosmos DB using the azure-cosmos Python SDK with practical examples.

---

Azure Cosmos DB is a globally distributed, multi-model database service. If you need low-latency reads and writes across multiple regions, it is hard to beat. The azure-cosmos Python SDK gives you direct access to the SQL (Core) API, which is the most commonly used API for Cosmos DB. In this post, I will cover the full CRUD lifecycle - creating databases, containers, and documents, plus querying, updating, and deleting data.

## Setting Up

Install the SDK along with the identity library for authentication.

```bash
# Install Cosmos DB SDK
pip install azure-cosmos azure-identity
```

You need a Cosmos DB account. Create one using the Azure CLI if you do not have one yet.

```bash
# Create a Cosmos DB account with the SQL API
az cosmosdb create \
    --name my-cosmos-account \
    --resource-group my-rg \
    --kind GlobalDocumentDB \
    --locations regionName=eastus failoverPriority=0
```

## Connecting to Cosmos DB

You can connect using either a connection key or Azure AD authentication. I will show both.

```python
from azure.cosmos import CosmosClient

# Option 1: Using endpoint and key (simpler for getting started)
endpoint = "https://my-cosmos-account.documents.azure.com:443/"
key = "your-primary-key-here"
client = CosmosClient(endpoint, credential=key)

# Option 2: Using Azure AD (recommended for production)
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = CosmosClient(endpoint, credential=credential)
```

For Azure AD authentication, you need to assign the "Cosmos DB Built-in Data Contributor" role to your identity. This is a Cosmos DB-specific role, not a regular Azure RBAC role.

```bash
# Assign Cosmos DB data plane role
az cosmosdb sql role assignment create \
    --account-name my-cosmos-account \
    --resource-group my-rg \
    --role-definition-name "Cosmos DB Built-in Data Contributor" \
    --principal-id <your-principal-id> \
    --scope "/"
```

## Creating a Database and Container

Cosmos DB organizes data into databases and containers. A container is similar to a table in a relational database. Each container has a partition key, which is critical for performance.

```python
# Create a database (or get existing one)
database_name = "ecommerce"
database = client.create_database_if_not_exists(id=database_name)
print(f"Database '{database_name}' ready")

# Create a container with a partition key
container_name = "products"
container = database.create_container_if_not_exists(
    id=container_name,
    partition_key={"paths": ["/category"], "kind": "Hash"},
    offer_throughput=400  # 400 RU/s is the minimum
)
print(f"Container '{container_name}' ready")
```

Choosing the right partition key is one of the most important decisions you will make with Cosmos DB. It determines how data is distributed and directly impacts query performance. Pick a property that has high cardinality and is frequently used in WHERE clauses.

## Creating Documents (INSERT)

Documents in Cosmos DB are JSON objects. Every document must have an `id` field and the partition key field you defined.

```python
import uuid

# Create a single product document
product = {
    "id": str(uuid.uuid4()),  # Unique ID for the document
    "category": "electronics",  # Partition key
    "name": "Wireless Headphones",
    "brand": "SoundMax",
    "price": 79.99,
    "in_stock": True,
    "tags": ["audio", "wireless", "bluetooth"],
    "specs": {
        "battery_hours": 30,
        "driver_size_mm": 40,
        "weight_grams": 250
    }
}

# Insert the document
created_item = container.create_item(body=product)
print(f"Created product: {created_item['name']} (id: {created_item['id']})")
```

You can also insert multiple documents in a loop. For bulk operations, consider using the bulk execution library for better throughput.

```python
# Insert multiple products
products = [
    {
        "id": str(uuid.uuid4()),
        "category": "electronics",
        "name": "Bluetooth Speaker",
        "brand": "SoundMax",
        "price": 49.99,
        "in_stock": True
    },
    {
        "id": str(uuid.uuid4()),
        "category": "furniture",
        "name": "Standing Desk",
        "brand": "ErgoWorks",
        "price": 349.00,
        "in_stock": False
    },
    {
        "id": str(uuid.uuid4()),
        "category": "electronics",
        "name": "USB-C Hub",
        "brand": "TechConnect",
        "price": 34.99,
        "in_stock": True
    }
]

for product in products:
    container.create_item(body=product)
    print(f"Inserted: {product['name']}")
```

## Reading Documents (SELECT)

There are two ways to read documents: point reads and queries. Point reads are faster and cheaper because you provide both the ID and partition key, so Cosmos DB knows exactly where the data lives.

```python
# Point read - fastest and cheapest (1 RU for a 1KB document)
item = container.read_item(
    item="your-document-id",
    partition_key="electronics"
)
print(f"Found: {item['name']} - ${item['price']}")
```

For more flexible retrieval, use SQL queries.

```python
# Query all products in the electronics category
query = "SELECT * FROM products p WHERE p.category = @category"
parameters = [{"name": "@category", "value": "electronics"}]

items = container.query_items(
    query=query,
    parameters=parameters,
    enable_cross_partition_query=False  # Single partition, more efficient
)

for item in items:
    print(f"{item['name']} - ${item['price']} - In stock: {item['in_stock']}")
```

Note the parameterized query. Always use parameters instead of string concatenation to avoid injection issues.

Here are more query examples.

```python
# Find products under a certain price across all categories
query = "SELECT p.name, p.price, p.category FROM products p WHERE p.price < @max_price ORDER BY p.price ASC"
items = container.query_items(
    query=query,
    parameters=[{"name": "@max_price", "value": 50.00}],
    enable_cross_partition_query=True  # Cross-partition query needed
)

for item in items:
    print(f"{item['name']} ({item['category']}) - ${item['price']}")

# Count documents by category
query = "SELECT p.category, COUNT(1) as count FROM products p GROUP BY p.category"
items = container.query_items(
    query=query,
    enable_cross_partition_query=True
)

for item in items:
    print(f"{item['category']}: {item['count']} products")
```

## Updating Documents (UPDATE)

Cosmos DB uses a replace model. You read the document, modify it, and write the entire thing back. There is also a partial update (patch) feature.

```python
# Full replace - read, modify, write back
item = container.read_item(item="your-document-id", partition_key="electronics")

# Update the price and stock status
item["price"] = 69.99
item["in_stock"] = False
item["last_updated"] = "2026-02-16T10:00:00Z"

# Replace the document
updated_item = container.replace_item(item=item["id"], body=item)
print(f"Updated: {updated_item['name']} - new price: ${updated_item['price']}")
```

For partial updates, use the patch operation. This is more efficient since you only send the changes.

```python
# Partial update using patch operations
from azure.cosmos import PartitionKey

operations = [
    {"op": "replace", "path": "/price", "value": 59.99},
    {"op": "set", "path": "/on_sale", "value": True},
    {"op": "incr", "path": "/view_count", "value": 1}
]

patched_item = container.patch_item(
    item="your-document-id",
    partition_key="electronics",
    patch_operations=operations
)
print(f"Patched: {patched_item['name']}")
```

## Deleting Documents (DELETE)

Deleting requires both the document ID and the partition key value.

```python
# Delete a single document
container.delete_item(
    item="your-document-id",
    partition_key="electronics"
)
print("Document deleted")
```

To delete multiple documents based on a query, you need to query first and then delete each result.

```python
# Delete all out-of-stock products in a category
query = "SELECT * FROM products p WHERE p.category = @category AND p.in_stock = false"
items = container.query_items(
    query=query,
    parameters=[{"name": "@category", "value": "electronics"}]
)

deleted_count = 0
for item in items:
    container.delete_item(item=item["id"], partition_key=item["category"])
    deleted_count += 1

print(f"Deleted {deleted_count} out-of-stock products")
```

## Handling Conflicts and ETags

Cosmos DB uses ETags for optimistic concurrency control. If two processes try to update the same document, one of them should fail rather than silently overwriting the other's changes.

```python
from azure.core.exceptions import HttpResponseError

# Read the item and capture its ETag
item = container.read_item(item="doc-id", partition_key="electronics")
etag = item["_etag"]

# Modify the item
item["price"] = 55.00

# Replace with ETag check - fails if someone else updated it
try:
    container.replace_item(
        item=item["id"],
        body=item,
        if_match=etag  # Only succeed if ETag matches
    )
    print("Update successful")
except HttpResponseError as e:
    if e.status_code == 412:  # Precondition failed
        print("Conflict detected - document was modified by another process")
    else:
        raise
```

## Monitoring Request Units

Every operation in Cosmos DB costs Request Units (RUs). Keeping an eye on your RU consumption helps you right-size your throughput provisioning.

```python
# The response headers contain RU charge information
item = container.read_item(item="doc-id", partition_key="electronics")
# Access RU charge from the response headers
print(f"This read cost: {container.client_connection.last_response_headers['x-ms-request-charge']} RUs")
```

## Best Practices

1. **Choose partition keys carefully.** A bad partition key leads to hot partitions and poor performance.
2. **Use point reads when possible.** They cost 1 RU for a 1KB document, while queries cost more.
3. **Set appropriate throughput.** Start with 400 RU/s and scale based on actual usage. Consider autoscale for variable workloads.
4. **Use parameterized queries.** Never concatenate user input into query strings.
5. **Handle 429 (throttled) responses.** The SDK has built-in retry logic, but you should still design for throttling.

## Wrapping Up

The azure-cosmos SDK provides a clean, Pythonic interface for working with Cosmos DB. The key things to remember are: always include your partition key, use point reads for known documents, and parameterize your queries. Once you have these fundamentals down, you can build high-performance, globally distributed applications with confidence.
