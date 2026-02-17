# How to Migrate from Firestore in Datastore Mode to Firestore Native Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Datastore, Migration, Database

Description: A practical guide to migrating your application from Firestore in Datastore mode to Firestore Native mode, covering data export, schema mapping, and application code changes.

---

If you started on Google Cloud years ago, there is a good chance your application uses Firestore in Datastore mode (or the original Cloud Datastore). It works fine, but Firestore Native mode offers real-time listeners, offline support, better querying, and a more intuitive data model. At some point, the migration makes sense.

The problem is that Google does not offer a one-click migration between these two modes. Once a project is set to Datastore mode, you cannot switch it to Native mode. You need to move your data to a different project or database, update your application code, and carefully cut over.

Let me walk you through how to do this without losing data or breaking your production system.

## Understanding the Differences

Before migrating, it helps to understand what changes between the two modes.

**Datastore mode:**
- Entities with kinds and keys
- Eventual consistency for queries (though strong consistency is now default)
- No real-time listeners
- Uses the Datastore API
- Ancestors define entity groups

**Firestore Native mode:**
- Documents in collections
- Strong consistency everywhere
- Real-time snapshot listeners
- Richer querying with composite indexes
- Subcollections replace entity groups

The data model mapping looks like this:

| Datastore Concept | Firestore Native Concept |
|---|---|
| Kind | Collection |
| Entity | Document |
| Key | Document Reference |
| Property | Field |
| Ancestor path | Subcollection hierarchy |

## Step 1: Export Data from Datastore Mode

First, export your data from the Datastore mode database. You can do this through the Google Cloud Console or the gcloud CLI.

```bash
# Export all data from your Datastore mode database to a GCS bucket
gcloud firestore export gs://my-backup-bucket/datastore-export \
  --project=my-datastore-project

# Or export specific kinds only
gcloud firestore export gs://my-backup-bucket/datastore-export \
  --collection-ids=Users,Orders,Products \
  --project=my-datastore-project
```

This creates a managed export in Cloud Storage. The export format is the same regardless of which mode your Firestore is running in.

## Step 2: Set Up Firestore Native Mode

You need a project (or database) configured for Firestore Native mode. If your current project is locked to Datastore mode, you will need a different project or use Firestore's named databases feature.

```bash
# Create a new Firestore database in Native mode (named database)
gcloud firestore databases create \
  --database=native-db \
  --location=us-central1 \
  --type=firestore-native \
  --project=my-project
```

If you prefer to use a new project entirely:

```bash
# Create Firestore in Native mode in a new project
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native \
  --project=my-new-project
```

## Step 3: Transform and Import Data

Here is where it gets interesting. You cannot directly import a Datastore mode export into a Firestore Native mode database because the data structures differ. You need to transform the data.

The most reliable approach is to read from the export and write to the new database using a script. Here is a Python script that handles the migration:

```python
# migrate_data.py - Read from Datastore and write to Firestore Native
from google.cloud import datastore
from google.cloud import firestore
import time

# Initialize both clients
ds_client = datastore.Client(project='my-datastore-project')
fs_client = firestore.Client(project='my-new-project')

def migrate_kind(kind_name, collection_name, batch_size=500):
    """Migrate all entities of a given kind to a Firestore collection."""
    query = ds_client.query(kind=kind_name)
    total_migrated = 0

    # Process entities in batches for efficiency
    batch = fs_client.batch()
    count = 0

    for entity in query.fetch():
        # Convert the Datastore entity to a Firestore document
        doc_data = dict(entity)

        # Use the entity key as the document ID
        doc_id = str(entity.key.id or entity.key.name)
        doc_ref = fs_client.collection(collection_name).document(doc_id)

        batch.set(doc_ref, doc_data)
        count += 1

        # Commit the batch when it reaches the size limit
        if count >= batch_size:
            batch.commit()
            total_migrated += count
            print(f"Migrated {total_migrated} {kind_name} entities")
            batch = fs_client.batch()
            count = 0
            # Small delay to avoid quota issues
            time.sleep(0.1)

    # Commit any remaining documents
    if count > 0:
        batch.commit()
        total_migrated += count

    print(f"Finished migrating {total_migrated} {kind_name} entities")
    return total_migrated

# Migrate each kind to its corresponding collection
kinds_to_migrate = [
    ('User', 'users'),
    ('Order', 'orders'),
    ('Product', 'products'),
]

for kind, collection in kinds_to_migrate:
    migrate_kind(kind, collection)
```

## Step 4: Handle Ancestor Relationships

Datastore uses ancestor paths to group entities. In Firestore Native, the equivalent is subcollections. This requires special handling during migration.

```python
# Migrate entities with ancestor relationships to subcollections
def migrate_with_ancestors(parent_kind, child_kind, subcollection_name):
    """Migrate child entities into subcollections under their parents."""
    # First, get all parent entities
    parent_query = ds_client.query(kind=parent_kind)

    for parent in parent_query.fetch():
        parent_id = str(parent.key.id or parent.key.name)

        # Query for children of this parent using ancestor filter
        child_query = ds_client.query(kind=child_kind, ancestor=parent.key)

        batch = fs_client.batch()
        count = 0

        for child in child_query.fetch():
            child_id = str(child.key.id or child.key.name)
            child_data = dict(child)

            # Write to a subcollection under the parent document
            doc_ref = (fs_client
                      .collection('users')
                      .document(parent_id)
                      .collection(subcollection_name)
                      .document(child_id))

            batch.set(doc_ref, child_data)
            count += 1

            if count >= 500:
                batch.commit()
                batch = fs_client.batch()
                count = 0

        if count > 0:
            batch.commit()

        print(f"Migrated children for parent {parent_id}")

# Example: Migrate OrderItems as subcollections of Orders
migrate_with_ancestors('Order', 'OrderItem', 'items')
```

## Step 5: Update Application Code

The biggest effort in this migration is updating your application code. Here is a side-by-side comparison of common operations.

Reading a single entity/document:

```python
# BEFORE: Datastore mode
from google.cloud import datastore
ds = datastore.Client()
key = ds.key('User', 12345)
entity = ds.get(key)
name = entity['name']

# AFTER: Firestore Native mode
from google.cloud import firestore
db = firestore.Client()
doc = db.collection('users').document('12345').get()
name = doc.to_dict()['name']
```

Querying:

```python
# BEFORE: Datastore mode
query = ds.query(kind='User')
query.add_filter('age', '>=', 18)
query.add_filter('region', '=', 'us-east1')
query.order = ['age']
results = list(query.fetch(limit=50))

# AFTER: Firestore Native mode
query = (db.collection('users')
         .where('age', '>=', 18)
         .where('region', '==', 'us-east1')
         .order_by('age')
         .limit(50))
results = query.stream()
```

Writing data:

```python
# BEFORE: Datastore mode
entity = datastore.Entity(key=ds.key('User'))
entity.update({
    'name': 'Alice',
    'email': 'alice@example.com',
    'created_at': datetime.utcnow(),
})
ds.put(entity)

# AFTER: Firestore Native mode
db.collection('users').add({
    'name': 'Alice',
    'email': 'alice@example.com',
    'created_at': firestore.SERVER_TIMESTAMP,
})
```

## Step 6: Validate the Migration

Before cutting over, verify that your data migrated correctly:

```python
# Validation script to compare record counts and spot-check data
def validate_migration(kind_name, collection_name, sample_size=100):
    """Compare data between Datastore and Firestore."""
    # Count entities in Datastore
    ds_query = ds_client.query(kind=kind_name)
    ds_query.keys_only()
    ds_count = len(list(ds_query.fetch()))

    # Count documents in Firestore
    fs_count = 0
    for _ in fs_client.collection(collection_name).stream():
        fs_count += 1

    print(f"{kind_name}: Datastore={ds_count}, Firestore={fs_count}")

    if ds_count != fs_count:
        print(f"  WARNING: Count mismatch!")

    # Spot-check some documents
    ds_query = ds_client.query(kind=kind_name)
    for entity in ds_query.fetch(limit=sample_size):
        doc_id = str(entity.key.id or entity.key.name)
        doc = fs_client.collection(collection_name).document(doc_id).get()
        if not doc.exists:
            print(f"  MISSING: {doc_id}")

    print(f"Validation complete for {kind_name}")
```

## Step 7: Cut Over

The safest approach is a phased cutover:

1. **Dual-write phase:** Update your application to write to both databases simultaneously. Read from Datastore mode.
2. **Shadow-read phase:** Start reading from Firestore Native and comparing results with Datastore reads. Log any discrepancies.
3. **Switch reads:** Once you are confident the data matches, switch reads to Firestore Native.
4. **Drop Datastore writes:** Stop writing to the old database.
5. **Clean up:** Remove old Datastore code and decommission the old database.

This approach gives you a rollback path at every step. If anything goes wrong, you can switch reads back to Datastore immediately.

## Things to Watch Out For

A few gotchas from real migrations:

- **Key types matter.** Datastore auto-generated keys are int64. Firestore document IDs are strings. Make sure your application handles this conversion.
- **Timestamps.** Datastore stores timestamps differently than Firestore. Test that your date queries work correctly after migration.
- **Indexes.** You will need to create new composite indexes in Firestore Native. Run your queries in development first to see which indexes Firestore requests.
- **Quotas and limits.** Firestore Native has different rate limits than Datastore mode. Test your write patterns under load.

Monitoring the migration with a tool like OneUptime helps you catch issues early, especially during the dual-write phase where latency or error rate spikes can indicate problems with the new database.

The migration is not trivial, but the payoff - real-time listeners, better querying, and a more natural data model - makes it worthwhile for most applications.
