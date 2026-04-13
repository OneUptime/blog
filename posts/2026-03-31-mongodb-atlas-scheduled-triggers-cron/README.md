# How to Use Scheduled Triggers for Cron Automation in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Triggers, Automation

Description: Create scheduled triggers in MongoDB Atlas to run Atlas Functions on a cron schedule for recurring tasks like aggregations, cleanups, and report generation.

---

Atlas Scheduled Triggers run Atlas Functions on a fixed schedule defined by a CRON expression. They are ideal for recurring tasks like aggregating daily metrics, purging expired data, sending periodic reports, or syncing data to external systems.

## Creating a Scheduled Trigger

In the Atlas UI, navigate to App Services - Triggers - Add Trigger, then select Scheduled. Alternatively, deploy via the App Services CLI:

```json
{
  "name": "daily-metrics-aggregation",
  "type": "SCHEDULED",
  "config": {
    "schedule": "0 2 * * *",
    "skip_catchup_events": true
  },
  "function_name": "aggregateDailyMetrics",
  "disabled": false
}
```

## CRON Expression Syntax

Atlas uses standard 5-field CRON syntax (UTC timezone):

```text
Field:    Minute Hour Day Month DayOfWeek
Example:  0      2    *   *     *

Common schedules:
"0 2 * * *"     - Daily at 2:00 AM UTC
"0 */6 * * *"   - Every 6 hours
"0 9 * * 1"     - Every Monday at 9:00 AM UTC
"*/15 * * * *"  - Every 15 minutes
"0 0 1 * *"     - First day of each month at midnight
```

## Writing the Scheduled Function

```javascript
// Function: aggregateDailyMetrics
exports = async function() {
  const mongodb = context.services.get("mongodb-atlas");
  const db = mongodb.db("production");

  // Calculate yesterday's date range
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setUTCDate(today.getUTCDate() + 1);

  console.log(`Aggregating metrics for ${yesterday.toISOString().split("T")[0]}`);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: yesterday, $lt: today },
        status: "completed"
      }
    },
    {
      $group: {
        _id: "$category",
        revenue: { $sum: "$amount" },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: "$amount" }
      }
    }
  ];

  const metrics = await db.collection("orders").aggregate(pipeline).toArray();

  // Upsert daily summary
  const bulkOps = metrics.map(m => {
    const { _id, ...rest } = m;
    return {
      updateOne: {
        filter: { date: yesterday, category: _id },
        update: { $set: { ...rest, date: yesterday, updatedAt: new Date() } },
        upsert: true
      }
    };
  });

  if (bulkOps.length > 0) {
    await db.collection("daily_metrics").bulkWrite(bulkOps);
  }

  console.log(`Aggregated ${metrics.length} category metrics`);
  return { metricsWritten: metrics.length };
};
```

## Cleanup Trigger - Remove Expired Data

```javascript
// Function: removeExpiredSessions
exports = async function() {
  const db = context.services.get("mongodb-atlas").db("production");

  const expiredCutoff = new Date();
  expiredCutoff.setHours(expiredCutoff.getHours() - 24);

  const result = await db.collection("sessions").deleteMany({
    lastActiveAt: { $lt: expiredCutoff }
  });

  console.log(`Deleted ${result.deletedCount} expired sessions`);
  return { deleted: result.deletedCount };
};
```

Schedule this to run every hour: `"0 * * * *"`.

## Skip Catchup Events

The `skip_catchup_events` option controls behavior when the trigger was disabled or missed executions. Set it to `true` for aggregation jobs where you do not want all missed runs to fire at once after a restart:

```json
{
  "config": {
    "schedule": "0 3 * * *",
    "skip_catchup_events": true
  }
}
```

## Monitoring Scheduled Trigger Executions

Check execution history in Atlas UI under App Services - Logs. Filter by trigger name to see success/failure history. For programmatic monitoring:

```bash
# Atlas Admin API
curl -H "Authorization: Bearer <token>" \
  "https://services.cloud.mongodb.com/api/admin/v3.0/groups/<project-id>/apps/<app-id>/logs?type=TRIGGER_SCHEDULED"
```

## Summary

Atlas Scheduled Triggers use standard CRON expressions to execute Atlas Functions at fixed intervals. They are well-suited for daily aggregations, cleanup jobs, and periodic syncs. Use `skip_catchup_events: true` for aggregation workloads to prevent replay of missed executions, and monitor execution logs in the Atlas UI to catch failures promptly.
