# Validation Summary: How to Use MongoDB with Metabase for Business Intelligence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- Metabase (open-source BI tool)
- Docker
- MongoDB Aggregation Pipeline

## Sources Consulted
- Metabase Environment Variables documentation (https://www.metabase.com/docs/latest/configuring-metabase/environment-variables)
- Metabase Adding and Managing Databases documentation (https://www.metabase.com/docs/latest/databases/connecting)
- Metabase MongoDB guide (https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/mongodb)
- Metabase Permissions documentation (https://www.metabase.com/docs/latest/permissions/introduction)
- Metabase Data Permissions documentation (https://www.metabase.com/docs/latest/permissions/data)
- Metabase Collection Permissions documentation (https://www.metabase.com/docs/latest/permissions/collections)
- Metabase MongoDB Data Source page (https://www.metabase.com/data-sources/mongo-db)
- Metabase Dashboard Subscriptions documentation (https://www.metabase.com/docs/latest/dashboards/subscriptions)

## Issues Found

1. **Description mentioned "SQL interface"**: The description claimed users could use "the MongoDB native driver or a SQL interface." Metabase does not support SQL queries against MongoDB — only the visual query builder and native MongoDB aggregation pipeline syntax are available. Changed to "the visual query builder or native aggregation queries."

2. **Incorrect navigation path for adding a database**: The post said "Settings > Admin > Databases > Add database." There is no "Settings" step — you access Admin directly from the gear/grid icon. Changed to "Admin > Databases > Add a database."

3. **Incorrect email subscription format**: The post listed "PDF or inline image" as the format for dashboard email subscriptions. Metabase does not support PDF attachments for dashboards. Charts are rendered inline in the email body, and file attachments are available in CSV/XLSX format only. Changed to "Inline charts with optional CSV/XLSX attachments."

## Review Notes
- The Docker command correctly configures the Metabase application database (Postgres) via `MB_DB_*` environment variables. The MongoDB data source is configured separately through the Metabase UI, which the post correctly shows in the next steps.
- The MongoDB aggregation pipeline example is syntactically correct and uses valid operators (`$match`, `$group`, `$year`, `$month`, `$sum`, `$sort`, `$project`, `$concat`, `$toString`).
- MongoDB is supported in all Metabase editions including the free open-source version.
- The row-level permissions note correctly identifies this as a Metabase Pro feature (called "data sandboxing" in Metabase documentation).
- The term "collection" in the permissions section is slightly ambiguous — it could refer to MongoDB collections (data tables) or Metabase collections (folders of saved questions/dashboards). In context it appears to mean MongoDB collections, which aligns with the "Data" permissions path shown.
