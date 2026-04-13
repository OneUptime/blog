# How to Use $addToSet in MongoDB to Add Unique Array Elements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $addToSet, Array, Update, Operator

Description: Learn how to use MongoDB's $addToSet operator to add elements to an array only if they don't already exist, ensuring array uniqueness without extra queries.

---

## How $addToSet Works

`$addToSet` adds a value to an array only if the value is not already present. If the value exists, the operation is a no-op for that element. This is the duplicate-safe alternative to `$push`. Like `$push`, if the field does not exist, `$addToSet` creates the array with the new element.

```mermaid
flowchart TD
    A["$addToSet: {tags: mongodb}"] --> B{Is "mongodb" already in array?}
    B -- No --> C[Append "mongodb" to array]
    B -- Yes --> D[No change - array unchanged]
```

## Syntax

```javascript
{ $addToSet: { arrayField: value } }
```

## Basic Example - Preventing Duplicates

```javascript
// Before: { _id: 1, tags: ["mongodb", "database"] }

// Try to add "mongodb" (already exists)
db.articles.updateOne(
  { _id: 1 },
  { $addToSet: { tags: "mongodb" } }
)
// After: { _id: 1, tags: ["mongodb", "database"] }  (no change)

// Add "tutorial" (does not exist)
db.articles.updateOne(
  { _id: 1 },
  { $addToSet: { tags: "tutorial" } }
)
// After: { _id: 1, tags: ["mongodb", "database", "tutorial"] }
```

## $addToSet vs $push

```text
$addToSet                      $push
-----------------------------  --------------------------------
Skips if value already exists  Always appends
Maintains unique array         Allows duplicates
Slightly more overhead         Slightly faster (no duplicate check)
Best for tag/role arrays       Best for logs, history, queues
```

## Adding Multiple Unique Values with $each

Use `$each` to add multiple values, each checked for uniqueness:

```javascript
// Before: { _id: 2, roles: ["viewer", "editor"] }

db.users.updateOne(
  { _id: 2 },
  { $addToSet: { roles: { $each: ["editor", "admin", "moderator"] } } }
)

// After: { _id: 2, roles: ["viewer", "editor", "admin", "moderator"] }
// "editor" was skipped because it already existed
```

## Adding Embedded Documents

`$addToSet` performs an exact equality check for objects - the document must have the same fields, values, **and field order** to be considered a duplicate:

```javascript
// Before: { _id: 3, skills: [{ name: "JavaScript", level: "advanced" }] }

// This has different content - it IS added
db.developers.updateOne(
  { _id: 3 },
  { $addToSet: { skills: { name: "Python", level: "intermediate" } } }
)

// This is an exact duplicate - it is NOT added
db.developers.updateOne(
  { _id: 3 },
  { $addToSet: { skills: { name: "JavaScript", level: "advanced" } } }
)

// Same fields and values but different order - it IS added (not a duplicate)
db.developers.updateOne(
  { _id: 3 },
  { $addToSet: { skills: { level: "advanced", name: "JavaScript" } } }
)
```

## Initializing a New Array

If the array field does not exist, `$addToSet` creates it:

```javascript
// Before: { _id: 4, name: "Dave" }

db.users.updateOne(
  { _id: 4 },
  { $addToSet: { tags: "newUser" } }
)

// After: { _id: 4, name: "Dave", tags: ["newUser"] }
```

## Adding User Permissions

A real-world example: adding a permission to a user's permissions array:

```javascript
db.users.updateOne(
  { username: "alice" },
  { $addToSet: { permissions: "reports:read" } }
)
```

If "reports:read" is already in the array, this is safe to call repeatedly.

## Idempotent Operations

`$addToSet` is naturally idempotent - calling it multiple times with the same value is safe:

```javascript
// Calling this 5 times produces the same result as calling it once
for (let i = 0; i < 5; i++) {
  db.users.updateOne(
    { username: "alice" },
    { $addToSet: { tags: "verified" } }
  )
}
// tags contains "verified" exactly once
```

This makes it ideal for retry-safe event handlers.

## Use Cases

- Adding tags to articles without creating duplicates
- Granting roles or permissions to a user (idempotently)
- Building a unique subscriber list within a document
- Tracking which users have liked or starred a post
- Maintaining a set of unique device IDs for a user

## Summary

`$addToSet` is the duplicate-safe array append operator. It checks whether the value already exists before adding it, making the operation idempotent and safe to call multiple times. Use `$each` to add multiple values simultaneously, each checked independently. For embedded documents, `$addToSet` uses exact equality including field order to detect duplicates. Use `$addToSet` over `$push` whenever array uniqueness is a requirement - such as for tags, roles, permissions, and unique identifiers.
