# How to Design One-to-One Relationships in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, One-To-One, Schema Design, Relationship

Description: Learn how to design one-to-one relationships in MongoDB using embedding and referencing patterns with practical examples and guidance on when to use each.

---

## What Is a One-to-One Relationship?

A one-to-one relationship exists when one document is associated with exactly one other document. For example, a `user` has exactly one `userProfile`, or a `company` has exactly one `address`.

MongoDB offers two approaches: embedding the related data in the parent document, or storing it in a separate collection with a reference.

## Approach 1: Embedding (Denormalization)

Embed the related document as a nested object inside the parent:

```javascript
// users collection - profile embedded directly
{
  _id: ObjectId("..."),
  email: "alice@example.com",
  passwordHash: "...",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    bio: "Software engineer",
    avatarUrl: "https://cdn.example.com/alice.jpg",
    updatedAt: ISODate("2026-01-15T00:00:00Z")
  }
}
```

Retrieve user with profile in one query:

```javascript
db.users.findOne({ email: "alice@example.com" })
```

## When to Embed

- The related data is always fetched together with the parent
- The embedded document does not exceed ~16MB (MongoDB document limit)
- The related data is not shared across multiple parent documents
- Writes to both happen together (atomic update)

```javascript
// Update user and profile atomically
db.users.updateOne(
  { email: "alice@example.com" },
  {
    $set: {
      "profile.bio": "Senior software engineer",
      "profile.updatedAt": new Date()
    }
  }
)
```

## Approach 2: Referencing (Normalization)

Store the related document in a separate collection and link via a reference:

```javascript
// users collection
{
  _id: ObjectId("aaa111aaa111aaa111aaa111"),
  email: "alice@example.com",
  passwordHash: "..."
}

// userProfiles collection
{
  _id: ObjectId("bbb222bbb222bbb222bbb222"),
  userId: ObjectId("aaa111aaa111aaa111aaa111"),
  firstName: "Alice",
  lastName: "Smith",
  bio: "Software engineer",
  updatedAt: ISODate("2026-01-15T00:00:00Z")
}
```

Fetch profile with a separate query:

```javascript
const user = db.users.findOne({ email: "alice@example.com" });
const profile = db.userProfiles.findOne({ userId: user._id });
```

Or use `$lookup` in an aggregation:

```javascript
db.users.aggregate([
  { $match: { email: "alice@example.com" } },
  {
    $lookup: {
      from: "userProfiles",
      localField: "_id",
      foreignField: "userId",
      as: "profile"
    }
  },
  { $unwind: "$profile" }
])
```

## When to Reference

- The related document is large and rarely needed together with the parent
- The related document has its own access patterns (updated or queried independently)
- You want to avoid hitting the 16MB document size limit
- Different parts of the system own each document separately

## Choosing the Right Approach

```text
Factor                              | Embed    | Reference
------------------------------------|----------|----------
Always fetched together             | Yes      | No
Updated independently               | No       | Yes
Large related document              | No       | Yes
Need atomic updates on both         | Yes      | No (use transactions)
Shared across multiple parents      | No       | Yes
```

## Handling Atomicity with References

If you reference and need to update both documents atomically, use a transaction:

```javascript
const session = db.getMongo().startSession();
session.startTransaction();
try {
  db.users.updateOne({ _id: userId }, { $set: { updatedAt: new Date() } }, { session });
  db.userProfiles.updateOne({ userId }, { $set: { bio: "New bio" } }, { session });
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  throw e;
}
```

## Summary

For one-to-one relationships in MongoDB, embedding is the preferred approach when the related data is always accessed together, fits within the document size limit, and is updated atomically with the parent. Use referencing when the related document is large, updated independently, or needs its own query patterns. Embedding reduces query complexity and eliminates joins, making it the default choice for most one-to-one scenarios.
