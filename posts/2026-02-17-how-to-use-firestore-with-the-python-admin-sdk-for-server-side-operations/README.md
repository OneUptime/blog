# How to Use Firestore with the Python Admin SDK for Server-Side Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Python, Admin SDK, Firebase

Description: A hands-on guide to using the Firebase Admin SDK for Python to perform server-side Firestore operations including reads, writes, queries, and batch operations.

---

If you are building backend services, scripts, or Cloud Functions that need to interact with Firestore, the Firebase Admin SDK for Python is the way to go. It gives you full read/write access to your Firestore database without security rules getting in the way (admin access bypasses rules entirely), and it integrates nicely with the rest of the Google Cloud ecosystem.

I use it for everything from data migration scripts to backend APIs to scheduled cleanup jobs. Let me walk you through setting it up and using it for common operations.

## Installation and Setup

First, install the Firebase Admin SDK.

```bash
# Install the Firebase Admin SDK for Python
pip install firebase-admin
```

Then initialize the SDK. There are a few ways to authenticate depending on where your code runs.

```python
# Initialize Firebase Admin SDK
# If running on GCP (Cloud Functions, Cloud Run, GCE), it auto-detects credentials
import firebase_admin
from firebase_admin import credentials, firestore

# Option 1: Running on GCP - uses default credentials automatically
firebase_admin.initialize_app()

# Option 2: Using a service account key file (for local development)
# cred = credentials.Certificate('path/to/serviceAccountKey.json')
# firebase_admin.initialize_app(cred)

# Option 3: Specify the project ID explicitly
# firebase_admin.initialize_app(options={'projectId': 'your-project-id'})

# Get a Firestore client
db = firestore.client()
```

## Reading Documents

Reading a single document is straightforward. You get a reference and call `get()`.

```python
# Read a single document by its ID
# Returns a DocumentSnapshot with the data and metadata
def get_user(user_id):
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()

    if doc.exists:
        print(f"User data: {doc.to_dict()}")
        return doc.to_dict()
    else:
        print("User not found")
        return None

user = get_user('user-123')
```

## Writing Documents

You can create or overwrite documents with `set()`, partially update with `update()`, or create with an auto-generated ID using `add()`.

```python
# Different ways to write documents to Firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

# set() creates or overwrites the entire document
def create_user(user_id, name, email):
    db.collection('users').document(user_id).set({
        'name': name,
        'email': email,
        'role': 'viewer',
        'createdAt': SERVER_TIMESTAMP  # Server-side timestamp
    })
    print(f"Created user {user_id}")

# update() only modifies specified fields, fails if doc does not exist
def update_user_role(user_id, new_role):
    db.collection('users').document(user_id).update({
        'role': new_role,
        'updatedAt': SERVER_TIMESTAMP
    })
    print(f"Updated role for {user_id} to {new_role}")

# add() creates a document with an auto-generated ID
def add_log_entry(action, details):
    timestamp, doc_ref = db.collection('audit-logs').add({
        'action': action,
        'details': details,
        'createdAt': SERVER_TIMESTAMP
    })
    print(f"Created log entry: {doc_ref.id}")
    return doc_ref.id

# set() with merge=True updates specified fields or creates if missing
def upsert_settings(user_id, settings):
    db.collection('user-settings').document(user_id).set(
        settings,
        merge=True  # Only update specified fields, keep the rest
    )
```

## Querying Collections

The Python Admin SDK supports all of Firestore's query capabilities.

```python
# Query documents with filters, ordering, and limits
from google.cloud.firestore_v1.base_query import FieldFilter

# Simple equality filter
def get_active_users():
    query = db.collection('users').where(
        filter=FieldFilter('role', '==', 'admin')
    )
    docs = query.stream()

    users = []
    for doc in docs:
        users.append({'id': doc.id, **doc.to_dict()})
    return users

# Compound query with multiple conditions
def get_recent_posts(author_id, limit=10):
    query = (
        db.collection('posts')
        .where(filter=FieldFilter('authorId', '==', author_id))
        .where(filter=FieldFilter('published', '==', True))
        .order_by('createdAt', direction=firestore.Query.DESCENDING)
        .limit(limit)
    )

    return [{'id': doc.id, **doc.to_dict()} for doc in query.stream()]

# Range queries
def get_posts_in_date_range(start_date, end_date):
    query = (
        db.collection('posts')
        .where(filter=FieldFilter('createdAt', '>=', start_date))
        .where(filter=FieldFilter('createdAt', '<=', end_date))
        .order_by('createdAt')
    )

    return [{'id': doc.id, **doc.to_dict()} for doc in query.stream()]
```

## Working with Subcollections

Subcollections work just like top-level collections. You chain the path to reach them.

```python
# Read and write to subcollections
# Subcollections are nested under a parent document

# Add a message to a room's messages subcollection
def add_message(room_id, sender_id, text):
    db.collection('rooms').document(room_id) \
      .collection('messages').add({
        'sender': sender_id,
        'text': text,
        'timestamp': SERVER_TIMESTAMP
    })

# Get all messages in a room, ordered by time
def get_room_messages(room_id, limit=50):
    messages_ref = (
        db.collection('rooms').document(room_id)
        .collection('messages')
        .order_by('timestamp', direction=firestore.Query.DESCENDING)
        .limit(limit)
    )

    return [{'id': doc.id, **doc.to_dict()} for doc in messages_ref.stream()]
```

## Batch Writes

For bulk operations, use batch writes to commit up to 500 operations atomically.

```python
# Batch write to update multiple documents atomically
# Max 500 operations per batch
def bulk_update_status(user_ids, new_status):
    batch_size = 500

    for i in range(0, len(user_ids), batch_size):
        batch = db.batch()
        chunk = user_ids[i:i + batch_size]

        for user_id in chunk:
            ref = db.collection('users').document(user_id)
            batch.update(ref, {'status': new_status})

        batch.commit()
        print(f"Updated batch {i // batch_size + 1}: {len(chunk)} users")

# Batch delete for cleanup
def delete_old_logs(cutoff_date):
    query = db.collection('audit-logs').where(
        filter=FieldFilter('createdAt', '<', cutoff_date)
    ).limit(500)  # Process in chunks

    deleted_count = 0
    while True:
        docs = list(query.stream())
        if not docs:
            break

        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
        batch.commit()

        deleted_count += len(docs)
        print(f"Deleted {deleted_count} logs so far")

    print(f"Total deleted: {deleted_count}")
```

## Transactions

When you need to read and then write based on what you read, use transactions.

```python
# Use a transaction to safely transfer credits between accounts
# The transaction retries automatically if there is a conflict
from firebase_admin import firestore as fs

@fs.transactional
def transfer_credits(transaction, from_id, to_id, amount):
    from_ref = db.collection('accounts').document(from_id)
    to_ref = db.collection('accounts').document(to_id)

    # Read both accounts inside the transaction
    from_doc = from_ref.get(transaction=transaction)
    to_doc = to_ref.get(transaction=transaction)

    from_balance = from_doc.get('credits')
    to_balance = to_doc.get('credits')

    if from_balance < amount:
        raise ValueError(f"Insufficient credits: has {from_balance}, needs {amount}")

    # Write both updates
    transaction.update(from_ref, {'credits': from_balance - amount})
    transaction.update(to_ref, {'credits': to_balance + amount})

# Execute the transaction
transaction = db.transaction()
transfer_credits(transaction, 'user-1', 'user-2', 50)
```

## Real-Time Listeners

The Python SDK also supports real-time listeners, which are useful for long-running server processes.

```python
# Set up a real-time listener for document changes
# Useful for backend services that need to react to data changes
import threading

def on_snapshot(doc_snapshot, changes, read_time):
    for doc in doc_snapshot:
        print(f"Document {doc.id} updated: {doc.to_dict()}")

# Watch all documents in the orders collection
query = db.collection('orders').where(
    filter=FieldFilter('status', '==', 'pending')
)

# Start listening - this runs in a background thread
doc_watch = query.on_snapshot(on_snapshot)

# To stop listening later
# doc_watch.unsubscribe()
```

## Pagination

Paginating through large result sets uses the same cursor-based approach as the client SDKs.

```python
# Paginate through a large collection using cursors
def get_all_users_paginated(page_size=100):
    all_users = []
    query = db.collection('users').order_by('name').limit(page_size)

    while True:
        docs = list(query.stream())
        if not docs:
            break

        for doc in docs:
            all_users.append({'id': doc.id, **doc.to_dict()})

        # Use the last document as the cursor for the next page
        last_doc = docs[-1]
        query = (
            db.collection('users')
            .order_by('name')
            .start_after(last_doc)
            .limit(page_size)
        )

        print(f"Fetched {len(all_users)} users so far")

    return all_users
```

## Error Handling

Always handle Firestore-specific exceptions in production code.

```python
# Proper error handling for Firestore operations
from google.api_core import exceptions

def safe_read(collection, doc_id):
    try:
        doc = db.collection(collection).document(doc_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except exceptions.NotFound:
        print(f"Document {doc_id} not found")
        return None
    except exceptions.PermissionDenied:
        print("Permission denied - check your credentials")
        return None
    except exceptions.DeadlineExceeded:
        print("Request timed out - try again")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise
```

## Wrapping Up

The Firebase Admin SDK for Python gives you full access to Firestore's capabilities from your server-side code. Whether you are building REST APIs, running data migrations, processing events in Cloud Functions, or writing maintenance scripts, the patterns covered here will handle most of your needs. The SDK is well-documented and follows Pythonic conventions, so it feels natural to work with. Just remember that admin access bypasses security rules entirely, so your server-side code is responsible for its own access control logic.
