# How to Choose Between Firestore Native Mode and Datastore Mode for NoSQL on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Datastore, NoSQL, Database

Description: Learn the differences between Firestore in Native mode and Datastore mode to pick the right NoSQL database for your GCP application.

---

Google Cloud offers Firestore in two distinct modes: Native mode and Datastore mode. They share the same underlying storage engine, but they expose different APIs, support different features, and suit different use cases. Picking the wrong mode at project creation is painful because you cannot switch modes on an existing database - you would need to migrate your data to a new project. Let me break down what matters.

## Firestore Native Mode

Firestore Native mode is the newer option. It was originally built as Firebase's cloud database and later became the recommended NoSQL option on GCP. It provides a document-oriented data model with collections and documents, real-time listeners, and offline support for mobile and web clients.

Here is a basic example of working with Firestore Native mode:

```python
# Working with Firestore in Native mode
from google.cloud import firestore

# Initialize the Firestore client
db = firestore.Client(project="my-project")

# Create a document in a collection
doc_ref = db.collection("users").document("user123")
doc_ref.set({
    "name": "Alice",
    "email": "alice@example.com",
    "created_at": firestore.SERVER_TIMESTAMP,
    "preferences": {
        "theme": "dark",
        "notifications": True
    }
})

# Query documents with filters
users = db.collection("users") \
    .where("preferences.theme", "==", "dark") \
    .order_by("created_at") \
    .limit(10) \
    .stream()

for user in users:
    print(f"{user.id}: {user.to_dict()}")
```

One of the standout features of Native mode is real-time listeners:

```python
# Real-time listener - get notified when data changes
def on_snapshot(doc_snapshot, changes, read_time):
    for doc in doc_snapshot:
        print(f"Document changed: {doc.id} => {doc.to_dict()}")

# Watch for changes to a collection in real time
query = db.collection("orders").where("status", "==", "pending")
query_watch = query.on_snapshot(on_snapshot)
```

## Firestore Datastore Mode

Datastore mode is the evolution of the original Google Cloud Datastore. If you have used App Engine's datastore in the past, this will feel familiar. It uses the Datastore API and concepts like entities, kinds, and ancestors instead of documents and collections.

```python
# Working with Firestore in Datastore mode
from google.cloud import datastore

# Initialize the Datastore client
client = datastore.Client(project="my-project")

# Create an entity (equivalent to a document)
key = client.key("User", "user123")
entity = datastore.Entity(key=key)
entity.update({
    "name": "Alice",
    "email": "alice@example.com",
    "theme": "dark",
    "notifications": True
})
client.put(entity)

# Query entities with filters
query = client.query(kind="User")
query.add_filter("theme", "=", "dark")
query.order = ["created_at"]

# Fetch results
results = list(query.fetch(limit=10))
for entity in results:
    print(f"{entity.key.name}: {dict(entity)}")
```

## Key Differences

### Real-Time Updates

Native mode supports real-time listeners that push changes to connected clients instantly. This is a big deal for mobile apps, chat applications, collaborative tools, and dashboards that need live updates.

Datastore mode has no real-time listener support. If you need to detect changes, you have to poll the database, which is less efficient and adds latency.

### Offline Support

Native mode has built-in offline support in its mobile and web SDKs. Users can read and write data while offline, and the SDK automatically syncs changes when connectivity returns.

Datastore mode does not provide offline support. It is designed for server-side applications where connectivity is assumed.

### Pricing Model

Both modes charge for reads, writes, and deletes, plus storage. But the pricing details differ:

- Native mode charges per document read, write, or delete
- Datastore mode charges per entity read, write, or delete
- Native mode has a generous free tier (50,000 reads, 20,000 writes, 20,000 deletes per day)
- Datastore mode has a similar free tier structure

The per-operation costs are the same, but the way operations are counted can differ depending on your access patterns.

### Consistency Model

Native mode provides strong consistency for all queries by default. Every read returns the latest committed data, regardless of the query type.

Datastore mode also provides strong consistency for all queries (this changed in 2021 - previously it had eventual consistency for some query types). So from a consistency standpoint, they are now equivalent.

### Indexing

Both modes support automatic single-field indexes and composite indexes for complex queries. However, the way you define and manage composite indexes differs slightly.

In Native mode:

```json
// firestore.indexes.json - define composite indexes
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

In Datastore mode:

```yaml
# index.yaml - define composite indexes
indexes:
  - kind: Order
    properties:
      - name: status
        direction: asc
      - name: created_at
        direction: desc
```

### Transactions

Both modes support transactions, but with different scope limitations.

Native mode transactions can read and write up to 500 documents in a single transaction. Writes in a transaction can span multiple collections.

Datastore mode transactions can include up to 500 entities. Cross-group transactions (spanning entity groups) are supported but have been a source of complexity historically.

## When to Choose Native Mode

Pick Firestore Native mode when:

1. **You are building a mobile or web application** that benefits from real-time updates and offline support
2. **You are using Firebase** for authentication, hosting, or other services - Native mode integrates deeply with the Firebase ecosystem
3. **You are starting a new project** with no legacy Datastore code to maintain
4. **You need real-time synchronization** between clients
5. **Your data model is document-oriented** with nested objects and subcollections

## When to Choose Datastore Mode

Pick Firestore Datastore mode when:

1. **You have existing Datastore applications** that you want to keep running without code changes
2. **You are building server-side only applications** where real-time listeners and offline support do not matter
3. **You need higher throughput for batch operations** - Datastore mode is optimized for backend workloads
4. **You are migrating from App Engine Datastore** and want a smooth transition
5. **Your application is purely server-to-server** with no direct client connections

## Common Mistakes

**Picking Datastore mode for a new project because it feels simpler.** Unless you have specific Datastore compatibility needs, Native mode is the better default for new projects. Google is investing more heavily in Native mode features.

**Underestimating the importance of real-time listeners.** Even if you do not need them today, having the option is valuable. Many applications eventually need some form of live data synchronization.

**Not planning your data model before choosing.** Both modes work best with denormalized data. If you are thinking in relational terms with lots of joins, neither mode will feel natural. Design your document or entity structure around your access patterns first.

## Making the Decision

For new projects, start with Native mode unless you have a compelling reason to choose Datastore mode. Native mode is where Google is putting its development effort, and the real-time features open up application patterns that simply are not possible with Datastore mode.

If you have an existing Datastore application, there is no urgent need to migrate to Native mode. Datastore mode runs on the same infrastructure and will continue to be supported. Migrate only if you need features that Datastore mode does not offer.

The mode is set per project and cannot be changed, so make this decision carefully before writing your first document.
