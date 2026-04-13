# How to Drop and Modify Views in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, View, Database Administration, Schema Management, Collection Management

Description: Learn how to drop a MongoDB view with drop() and how to modify an existing view pipeline using the collMod command or by dropping and recreating it.

---

MongoDB views are immutable after creation - you cannot add stages or change the source collection with an `ALTER VIEW` equivalent. Instead, MongoDB provides two approaches: drop and recreate, or use `collMod` to replace the pipeline in place.

## Dropping a View

A view is dropped the same way as a regular collection:

```javascript
db.activeUsers.drop()
```

Or using `runCommand`:

```javascript
db.runCommand({ drop: "activeUsers" })
```

Dropping a view does not affect the underlying source collection.

## Modifying a View with collMod

Use `collMod` to replace the view's pipeline without dropping it:

```javascript
db.runCommand({
  collMod: "activeUsers",
  viewOn: "users",
  pipeline: [
    { $match: { status: "active", emailVerified: true } },
    { $project: { name: 1, email: 1, plan: 1, _id: 0 } }
  ]
})
```

The view name and source collection (`viewOn`) must be specified. The entire pipeline is replaced.

## Changing the Source Collection

`collMod` also lets you point the view at a different source collection:

```javascript
db.runCommand({
  collMod: "recentEvents",
  viewOn: "events_archive",   // was previously "events"
  pipeline: [
    { $match: { timestamp: { $gte: ISODate("2026-01-01") } } }
  ]
})
```

## Drop and Recreate Pattern

For complex changes, dropping and recreating is the simplest approach:

```javascript
// Step 1: drop
db.orderSummary.drop()

// Step 2: recreate with updated pipeline
db.createView("orderSummary", "orders", [
  { $match: { status: { $in: ["shipped", "delivered", "returned"] } } },
  {
    $project: {
      orderId: "$_id",
      customerId: 1,
      total: 1,
      status: 1,
      shippedAt: 1,
      _id: 0
    }
  }
])
```

## Checking Whether a View Exists Before Dropping

```javascript
const viewInfo = db.getCollectionInfos({ name: "activeUsers", type: "view" })
if (viewInfo.length > 0) {
  db.activeUsers.drop()
}
```

## Listing All Views in a Database

```javascript
db.getCollectionInfos({ type: "view" }).map(v => v.name)
```

## Permission Requirements

To drop a view, the user needs the `dropCollection` privilege. To modify a view with `collMod`, the user needs the `collMod` privilege. In a role definition:

```javascript
{
  resource: { db: "myapp", collection: "activeUsers" },
  actions: ["dropCollection", "collMod"]
}
```

## Practical Advice

- Use `collMod` when you need to update the view in place without interrupting concurrent readers.
- Use drop/recreate when changing the view definition significantly, as it is clearer and easier to audit in scripts.
- Store view definitions in version control (e.g., as migration scripts) so modifications are reproducible.

## Summary

Drop a MongoDB view with `db.viewName.drop()`. Modify an existing view without dropping it by using `db.runCommand({ collMod: "<viewName>", viewOn: "<source>", pipeline: [...] })`. For major changes, dropping and recreating is the clearest approach. Always version-control your view definitions.
