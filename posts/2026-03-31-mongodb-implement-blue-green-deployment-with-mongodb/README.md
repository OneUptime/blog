# How to Implement Blue-Green Deployment with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Deployment, Blue-Green, Migration, Operation

Description: Learn how to implement blue-green deployments with MongoDB by using dual environments, schema compatibility strategies, and traffic switching techniques.

---

Blue-green deployment involves running two identical production environments - blue (current) and green (new) - and switching traffic between them. With MongoDB, the challenge is ensuring both environments can share or safely migrate database state without downtime.

## Strategy 1: Shared Replica Set with Schema Compatibility

The simplest approach is having both blue and green application versions connect to the same MongoDB replica set. This works when your schema changes are backward-compatible.

```javascript
// Blue app (v1) writes documents with this shape
{
  _id: ObjectId(),
  userId: "123",
  name: "Alice"
}

// Green app (v2) adds a new optional field - backward compatible
{
  _id: ObjectId(),
  userId: "123",
  name: "Alice",
  email: "alice@example.com"   // new optional field
}
```

Both versions can read each other's documents safely. Switch traffic by updating your load balancer or DNS entry.

## Strategy 2: Dual Collections with Data Sync

For breaking schema changes, use two collections and sync data between them during the transition window.

```javascript
// Sync script: copy from blue collection to green collection
const session = client.startSession();
session.startTransaction();
try {
  const cursor = db.users_blue.find({}, { session });
  for await (const doc of cursor) {
    const transformed = transformToNewSchema(doc);
    await db.users_green.insertOne(transformed, { session });
  }
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

Keep a change stream running on the blue collection to replicate ongoing writes to green during cutover.

## Set Up Change Streams for Live Sync

Use a change stream to keep the green database in sync with blue while you validate the new environment.

```javascript
const changeStream = db.users_blue.watch([], { fullDocument: "updateLookup" });

changeStream.on("change", async (change) => {
  if (change.operationType === "insert") {
    await db.users_green.insertOne(transformToNewSchema(change.fullDocument));
  } else if (change.operationType === "update") {
    await db.users_green.updateOne(
      { _id: change.documentKey._id },
      { $set: transformUpdates(change.updateDescription.updatedFields) }
    );
  } else if (change.operationType === "delete") {
    await db.users_green.deleteOne({ _id: change.documentKey._id });
  }
});
```

## Validate the Green Environment Before Switching

Run verification queries against green before switching traffic to confirm data integrity.

```javascript
const blueCount = await db.users_blue.countDocuments();
const greenCount = await db.users_green.countDocuments();

if (blueCount !== greenCount) {
  console.error(`Count mismatch: blue=${blueCount}, green=${greenCount}`);
  process.exit(1);
}

console.log("Document counts match - safe to switch traffic");
```

## Switch Traffic and Roll Back if Needed

Update your load balancer or connection string environment variable to point to the green application. If issues arise, revert the connection string to blue.

```bash
# Switch to green (update env var and restart app)
export MONGO_URI="mongodb://mongo1:27017/myapp_green?replicaSet=rs0"

# Roll back to blue if needed
export MONGO_URI="mongodb://mongo1:27017/myapp_blue?replicaSet=rs0"
```

Because blue data is still intact, rollback is instant and safe.

## Clean Up After a Successful Deployment

Once green has been stable in production for a defined period, drop the blue collection and stop the sync process.

```javascript
// After confirming green is stable
await db.users_blue.drop();
console.log("Blue collection removed - deployment complete");
```

## Summary

Blue-green deployments with MongoDB work best when schema changes are backward-compatible, allowing both versions to share the same replica set. For breaking changes, dual collections with a change stream sync bridge provide a safe cutover path. Always validate data integrity before switching traffic, and keep the blue environment intact long enough to enable a fast rollback if needed.
