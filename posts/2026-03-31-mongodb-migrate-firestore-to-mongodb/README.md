# How to Migrate from Firebase Firestore to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Firebase, Firestore, Migration, NoSQL

Description: Step-by-step guide for migrating data from Firebase Firestore to MongoDB, including export strategies, document transformation, and subcollection handling.

---

## Overview

Migrating from Firebase Firestore to MongoDB involves exporting hierarchical Firestore data, transforming subcollections into embedded documents or separate MongoDB collections, and updating your application to use the MongoDB driver. This guide covers each step.

## Export Data from Firestore

Use the Firebase Admin SDK to export all documents from a Firestore collection:

```python
import firebase_admin
from firebase_admin import credentials, firestore
import json

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
fs = firestore.client()

def export_collection(coll_ref, output_file):
  docs = []
  for doc in coll_ref.stream():
    data = doc.to_dict()
    data["_firestoreId"] = doc.id  # preserve Firestore ID
    docs.append(data)
  with open(output_file, "w") as f:
    json.dump(docs, f, default=str)
  print(f"Exported {len(docs)} documents to {output_file}")

export_collection(fs.collection("users"), "users_export.json")
```

## Handle Subcollections

Firestore's subcollections do not automatically appear when you export a parent document. You must recursively fetch them.

```python
from pymongo import MongoClient, InsertOne

mongo_client = MongoClient("mongodb://localhost:27017")
db = mongo_client["mydb"]

def export_users_with_orders(fs, db):
  ops = []
  for user_doc in fs.collection("users").stream():
    user = user_doc.to_dict()
    user["_id"] = user_doc.id

    # Fetch subcollection: users/{uid}/orders
    orders = []
    for order_doc in user_doc.reference.collection("orders").stream():
      order = order_doc.to_dict()
      order["orderId"] = order_doc.id
      orders.append(order)

    user["orders"] = orders  # embed subcollection as array
    ops.append(InsertOne(user))

  if ops:
    result = db.users.bulk_write(ops, ordered=False)
    print(f"Inserted {result.inserted_count} users with embedded orders")

export_users_with_orders(fs, db)
```

## Transform Firestore Timestamps

Firestore uses `Timestamp` objects that need conversion to Python `datetime` or MongoDB `Date`:

```python
from google.api_core.datetime_helpers import DatetimeWithNanoseconds
import datetime

def convert_timestamps(obj):
  if isinstance(obj, dict):
    return {k: convert_timestamps(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [convert_timestamps(i) for i in obj]
  if isinstance(obj, DatetimeWithNanoseconds):
    return obj.replace(tzinfo=datetime.timezone.utc)
  return obj
```

Apply this conversion before inserting into MongoDB:

```python
user_converted = convert_timestamps(user)
db.users.insert_one(user_converted)
```

## Handle Firestore Document References

Firestore supports `DocumentReference` fields (pointers to other documents). Convert these to string IDs in MongoDB:

```python
from google.cloud.firestore_v1 import DocumentReference

def normalize_references(obj):
  if isinstance(obj, DocumentReference):
    return obj.id  # store as string ID
  if isinstance(obj, dict):
    return {k: normalize_references(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [normalize_references(i) for i in obj]
  return obj
```

## Update Application Code

Replace Firestore SDK calls with MongoDB driver calls:

```javascript
// Before (Firestore)
const userRef = doc(db, "users", userId);
const userSnap = await getDoc(userRef);
const userData = userSnap.data();

// After (MongoDB)
const userData = await db.collection("users").findOne({ _id: userId });
```

For real-time listeners, replace Firestore's `onSnapshot` with MongoDB change streams (requires replica set):

```javascript
// MongoDB change stream equivalent
const changeStream = db.collection("users").watch(
  [{ $match: { "documentKey._id": userId } }],
  { fullDocument: "updateLookup" }
);
changeStream.on("change", (change) => {
  console.log("Updated:", change.fullDocument);
});
```

## Validate the Migration

```python
user_count = db.users.count_documents({})
firestore_count = len(list(fs.collection("users").list_documents()))
print(f"Firestore: {firestore_count}, MongoDB: {user_count}")
assert user_count == firestore_count
```

## Summary

Migrating from Firestore to MongoDB involves recursively fetching subcollections, converting Timestamps and DocumentReferences, and deciding whether to embed subcollections or store them as separate MongoDB collections. Thoroughly validate counts and data integrity before switching production traffic.
