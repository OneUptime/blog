# How to Implement Canary Deployments with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Deployment, Canary, Feature Flag, Operation

Description: Learn how to implement canary deployments with MongoDB by gradually routing traffic to new app versions while maintaining backward-compatible schema changes.

---

Canary deployments gradually shift a small percentage of traffic to a new application version before rolling it out fully. With MongoDB, this requires schema changes to be backward-compatible so both the canary and stable versions can read and write the same data safely.

## Ensure Backward-Compatible Schema Changes

Before deploying the canary, make sure new fields are optional and old fields are not removed. This allows both versions to operate on the same collection.

```javascript
// Old document shape (stable version writes this)
{ _id: ObjectId(), userId: "u1", status: "active" }

// New document shape (canary version writes this - adds optional field)
{ _id: ObjectId(), userId: "u1", status: "active", tier: "premium" }

// Stable version reading a canary document - tier is simply ignored
const doc = await db.users.findOne({ userId: "u1" });
console.log(doc.status); // "active" - works fine
```

## Add Indexes Before Deploying the Canary

If the canary version queries on a new field, add the index before rolling out the canary to avoid slow queries under load.

```javascript
// Run this before deploying the canary
await db.users.createIndex(
  { tier: 1 },
  { sparse: true }
);
```

Using `sparse: true` means documents without the `tier` field are excluded from the index, keeping index size manageable during the transition.

## Use Feature Flags Stored in MongoDB

Control which users see the canary behavior using a feature flags collection, allowing gradual rollout without redeployment.

```javascript
// Insert a feature flag document
await db.featureFlags.insertOne({
  name: "new_tier_system",
  enabledForPercentage: 10,   // 10% canary traffic
  createdAt: new Date()
});

// Check flag in application code
async function isFeatureEnabled(userId) {
  const flag = await db.featureFlags.findOne({ name: "new_tier_system" });
  const hash = hashUserId(userId) % 100;
  return hash < flag.enabledForPercentage;
}
```

## Monitor Canary Behavior with Aggregation

Compare error rates and query performance between canary and stable traffic using an audit log collection.

```javascript
const stats = await db.requestLogs.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 3600000) }
    }
  },
  {
    $group: {
      _id: "$appVersion",
      totalRequests: { $sum: 1 },
      errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
      avgLatencyMs: { $avg: "$latencyMs" }
    }
  }
]).toArray();

stats.forEach(s => {
  const errorRate = ((s.errors / s.totalRequests) * 100).toFixed(2);
  console.log(`${s._id}: ${errorRate}% errors, ${s.avgLatencyMs.toFixed(0)}ms avg`);
});
```

## Gradually Increase Canary Traffic

Once the canary looks healthy, increase the rollout percentage incrementally.

```javascript
// Increase from 10% to 25%
await db.featureFlags.updateOne(
  { name: "new_tier_system" },
  { $set: { enabledForPercentage: 25, updatedAt: new Date() } }
);
```

Continue increasing in steps (10% - 25% - 50% - 100%) with monitoring between each step.

## Roll Back the Canary if Needed

If the canary shows elevated errors, roll back by resetting the flag to 0% and deploying the stable version.

```javascript
// Disable canary immediately
await db.featureFlags.updateOne(
  { name: "new_tier_system" },
  { $set: { enabledForPercentage: 0, rolledBackAt: new Date() } }
);
```

Because schema changes were backward-compatible, no data migration is needed on rollback.

## Summary

Canary deployments with MongoDB rely on backward-compatible schema changes so both old and new application versions can safely operate on the same collection. Adding indexes before the canary launch prevents performance regressions. Storing feature flags in MongoDB enables percentage-based traffic routing without redeployment, and aggregation queries over request logs provide the observability needed to decide when to increase traffic or roll back.
