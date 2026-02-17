# How to Perform CRUD Operations on Firestore Documents Using the google-cloud-firestore Python Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Python, NoSQL, Cloud Database

Description: A practical guide to performing create, read, update, and delete operations on Firestore documents using the google-cloud-firestore Python client library.

---

Firestore is Google Cloud's serverless NoSQL document database. It scales automatically, supports real-time listeners, and has a pretty generous free tier. I have been using it for a while now on projects ranging from small APIs to larger production systems, and the Python client library is solid. In this post, I will cover the essential CRUD operations you need to know to work with Firestore from Python.

## Installation and Setup

Start by installing the Firestore client library.

```bash
# Install the Firestore Python client
pip install google-cloud-firestore
```

For local development, make sure you have authenticated with gcloud.

```bash
# Set up Application Default Credentials
gcloud auth application-default login
```

## Initializing the Firestore Client

The client connects to your default project automatically when ADC is configured.

```python
from google.cloud import firestore

# Initialize the Firestore client - picks up project from environment
db = firestore.Client()

# Or specify the project and database explicitly
db = firestore.Client(project="my-gcp-project", database="my-database")
```

## Creating Documents

There are two ways to create documents in Firestore: using `set()` when you want to specify the document ID, or using `add()` when you want Firestore to generate one for you.

```python
from google.cloud import firestore
import datetime

db = firestore.Client()

# Option 1: Set a document with a specific ID
# This creates (or overwrites) the document at users/user-123
user_ref = db.collection("users").document("user-123")
user_ref.set({
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "admin",
    "created_at": firestore.SERVER_TIMESTAMP,  # Server sets the timestamp
    "login_count": 0,
    "preferences": {
        "theme": "dark",
        "notifications": True
    }
})

# Option 2: Let Firestore auto-generate the document ID
# Useful when you don't have a natural key
timestamp, new_ref = db.collection("events").add({
    "type": "page_view",
    "page": "/dashboard",
    "user_id": "user-123",
    "occurred_at": datetime.datetime.now(tz=datetime.timezone.utc)
})

print(f"Created event with auto-generated ID: {new_ref.id}")
```

The `SERVER_TIMESTAMP` sentinel is worth highlighting. It tells Firestore to use the server's clock for the timestamp, which avoids issues with clock skew between clients.

## Reading Documents

Reading a single document is straightforward. You get a `DocumentSnapshot` that contains the data and metadata.

```python
from google.cloud import firestore

db = firestore.Client()

# Read a single document by its path
user_ref = db.collection("users").document("user-123")
doc = user_ref.get()

if doc.exists:
    # Convert to a Python dictionary
    data = doc.to_dict()
    print(f"Name: {data['name']}")
    print(f"Email: {data['email']}")
    print(f"Document ID: {doc.id}")
    print(f"Full path: {doc.reference.path}")
else:
    print("Document not found")
```

## Reading Multiple Documents with Queries

Firestore supports a range of query operators for filtering collections.

```python
from google.cloud import firestore

db = firestore.Client()

# Get all documents in a collection
all_users = db.collection("users").stream()
for doc in all_users:
    print(f"{doc.id} => {doc.to_dict()}")

# Filter with where clauses
admins = (
    db.collection("users")
    .where(filter=firestore.FieldFilter("role", "==", "admin"))
    .stream()
)

for doc in admins:
    print(f"Admin: {doc.to_dict()['name']}")

# Combine multiple filters
active_admins = (
    db.collection("users")
    .where(filter=firestore.FieldFilter("role", "==", "admin"))
    .where(filter=firestore.FieldFilter("login_count", ">", 10))
    .order_by("login_count", direction=firestore.Query.DESCENDING)
    .limit(5)
    .stream()
)

for doc in active_admins:
    user = doc.to_dict()
    print(f"{user['name']} - {user['login_count']} logins")
```

## Querying Nested Fields and Arrays

Firestore can query into nested objects and arrays, which is one of the features that makes it flexible for document-oriented data.

```python
from google.cloud import firestore

db = firestore.Client()

# Query a nested field using dot notation
dark_theme_users = (
    db.collection("users")
    .where(filter=firestore.FieldFilter("preferences.theme", "==", "dark"))
    .stream()
)

# Query documents where an array field contains a specific value
python_devs = (
    db.collection("users")
    .where(filter=firestore.FieldFilter("skills", "array_contains", "python"))
    .stream()
)

# Query with array-contains-any for matching any value in a list
web_devs = (
    db.collection("users")
    .where(
        filter=firestore.FieldFilter(
            "skills", "array_contains_any", ["javascript", "typescript", "react"]
        )
    )
    .stream()
)
```

## Updating Documents

Updates in Firestore are partial by default - they only modify the fields you specify without touching the rest of the document.

```python
from google.cloud import firestore

db = firestore.Client()

user_ref = db.collection("users").document("user-123")

# Partial update - only changes specified fields, leaves others untouched
user_ref.update({
    "email": "alice.new@example.com",
    "login_count": firestore.Increment(1),  # Atomic increment
    "last_login": firestore.SERVER_TIMESTAMP,
})

# Update a nested field using dot notation
user_ref.update({
    "preferences.theme": "light"
})

# Add an element to an array field without reading the current value
user_ref.update({
    "skills": firestore.ArrayUnion(["golang"])
})

# Remove an element from an array field
user_ref.update({
    "skills": firestore.ArrayRemove(["php"])
})
```

The atomic operations like `Increment`, `ArrayUnion`, and `ArrayRemove` are really useful because they avoid race conditions. You do not need to read the current value, modify it in your code, and write it back. The server handles it atomically.

## Deleting Documents

Deleting is simple. You can delete entire documents or specific fields within them.

```python
from google.cloud import firestore

db = firestore.Client()

# Delete a single document
db.collection("events").document("event-456").delete()

# Delete specific fields from a document (keeps the document, removes the field)
user_ref = db.collection("users").document("user-123")
user_ref.update({
    "preferences.notifications": firestore.DELETE_FIELD
})
```

One thing to know is that deleting a document does not automatically delete its subcollections. If you have nested data, you need to delete the subcollection documents separately.

## Batch Operations

When you need to write multiple documents atomically, use a batch. All operations in a batch either succeed together or fail together.

```python
from google.cloud import firestore

db = firestore.Client()

# Create a batch to perform multiple writes atomically
batch = db.batch()

# Add multiple operations to the batch
user_ref = db.collection("users").document("user-123")
batch.update(user_ref, {"login_count": firestore.Increment(1)})

log_ref = db.collection("audit_logs").document()
batch.set(log_ref, {
    "action": "login",
    "user_id": "user-123",
    "timestamp": firestore.SERVER_TIMESTAMP
})

stats_ref = db.collection("stats").document("daily")
batch.update(stats_ref, {"total_logins": firestore.Increment(1)})

# Commit all operations at once - either all succeed or all fail
batch.commit()
print("Batch write completed successfully")
```

## Transactions

For operations that need to read and then write based on the current state, transactions ensure consistency.

```python
from google.cloud import firestore

db = firestore.Client()

@firestore.transactional
def transfer_credits(transaction, from_ref, to_ref, amount):
    """Transfer credits between two user accounts atomically."""
    # Read both documents within the transaction
    from_doc = from_ref.get(transaction=transaction)
    to_doc = to_ref.get(transaction=transaction)

    from_balance = from_doc.get("credits")
    to_balance = to_doc.get("credits")

    # Validate the transfer
    if from_balance < amount:
        raise ValueError(f"Insufficient credits: {from_balance} < {amount}")

    # Write the updated balances
    transaction.update(from_ref, {"credits": from_balance - amount})
    transaction.update(to_ref, {"credits": to_balance + amount})

# Run the transaction
transaction = db.transaction()
from_user = db.collection("users").document("user-123")
to_user = db.collection("users").document("user-456")

try:
    transfer_credits(transaction, from_user, to_user, 50)
    print("Transfer completed")
except ValueError as e:
    print(f"Transfer failed: {e}")
```

## Pagination

For collections with many documents, pagination prevents loading everything at once.

```python
from google.cloud import firestore

db = firestore.Client()

def get_users_page(page_size=25, last_doc=None):
    """Fetch a page of users, optionally starting after a specific document."""
    query = (
        db.collection("users")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(page_size)
    )

    # If we have a cursor from the previous page, start after it
    if last_doc:
        query = query.start_after(last_doc)

    docs = list(query.stream())
    return docs

# Fetch the first page
page1 = get_users_page(page_size=10)
for doc in page1:
    print(f"{doc.id}: {doc.to_dict()['name']}")

# Fetch the next page using the last document as a cursor
if page1:
    page2 = get_users_page(page_size=10, last_doc=page1[-1])
```

## Monitoring Your Firestore Usage

In production, you want visibility into your Firestore operations - read/write volumes, latency, and error rates. OneUptime (https://oneuptime.com) can help you monitor the services that depend on Firestore and alert you when things go wrong, so you catch issues before your users do.

## Final Thoughts

The Firestore Python client library covers a lot of ground. The CRUD operations are intuitive, and features like atomic increments, batches, and transactions handle the tricky parts of concurrent data access. One pattern I have found useful is to start with simple `set()` and `get()` calls, and then introduce batches and transactions only when you actually need atomicity. Keep it simple until your use case demands otherwise.
