# How to Use MongoDB with Metabase for Business Intelligence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Metabase, Business Intelligence, Dashboard, Analytics

Description: Learn how to connect MongoDB to Metabase to build interactive dashboards and self-service analytics using the MongoDB native driver or a SQL interface.

---

Metabase is an open-source BI tool that can connect directly to MongoDB and allow non-technical users to explore data, build charts, and create dashboards using a visual query builder - no aggregation pipeline knowledge required.

## Connect Metabase to MongoDB

1. Install Metabase (Docker is the easiest option):

```bash
docker run -d -p 3000:3000 \
  -e "MB_DB_TYPE=postgres" \
  -e "MB_DB_DBNAME=metabase" \
  -e "MB_DB_PORT=5432" \
  -e "MB_DB_USER=metabase" \
  -e "MB_DB_PASS=password" \
  -e "MB_DB_HOST=postgres" \
  --name metabase metabase/metabase
```

2. Navigate to `http://localhost:3000` and complete setup.
3. Go to **Admin > Databases > Add a database**.
4. Select **MongoDB** and enter your connection details:

```text
Host: localhost
Port: 27017
Database: salesdb
Authentication: Username/Password (if enabled)
```

For Atlas, use the connection string format.

## Query with the Visual Query Builder

Metabase's question builder maps MongoDB operations to visual controls:
- **Filter** corresponds to `$match`
- **Summarize** corresponds to `$group`
- **Sort** corresponds to `$sort`

Example: Count orders by category for the last 30 days.

1. Select the `orders` table
2. Add a filter: `status = completed` AND `createdAt > 30 days ago`
3. Summarize: Count of rows, grouped by `category`
4. Sort: Descending by count

## Write Native Aggregation Queries

For complex analytics, use Metabase's native query editor with MongoDB aggregation syntax:

```json
[
  { "$match": { "status": "completed" } },
  {
    "$group": {
      "_id": { "year": { "$year": "$createdAt" }, "month": { "$month": "$createdAt" } },
      "revenue": { "$sum": "$amount" },
      "orders": { "$sum": 1 }
    }
  },
  { "$sort": { "_id.year": 1, "_id.month": 1 } },
  {
    "$project": {
      "period": {
        "$concat": [
          { "$toString": "$_id.year" }, "-",
          { "$toString": "$_id.month" }
        ]
      },
      "revenue": 1,
      "orders": 1
    }
  }
]
```

## Build a Dashboard

Create multiple questions (queries), then combine them into a dashboard:

1. Click **+ New > Dashboard**
2. Add your saved questions as cards
3. Add filters (e.g., a date range picker) that apply across all cards
4. Set up auto-refresh for live monitoring

## Set Up Automated Reports

Schedule email reports directly from Metabase:

1. Open a dashboard and click the subscription icon
2. Configure the schedule (daily at 8am, weekly on Monday, etc.)
3. Add email recipients

```text
Schedule: Every day at 8:00 AM
Recipients: team@company.com
Format: Inline charts with optional CSV/XLSX attachments
```

## Control Access with Permissions

Metabase supports role-based access control. Restrict which collections specific groups can see:

1. Go to **Admin > Permissions > Data**
2. Set collection-level permissions for each group
3. Use row-level permissions (Metabase Pro) for more granular control

## Summary

Metabase connects to MongoDB and provides a visual query builder, native aggregation query support, and dashboard tooling that makes MongoDB data accessible to non-technical stakeholders. Use the visual query builder for standard reports, native aggregation queries for complex analytics, and scheduling for automated report delivery. Role-based permissions control which teams can access which collections.
