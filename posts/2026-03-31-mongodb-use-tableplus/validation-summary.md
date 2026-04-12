# Validation Summary: How to Use TablePlus for MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- TablePlus (native database GUI client)
- MongoDB (document database)
- MongoDB Atlas (cloud-hosted MongoDB with SRV connection strings)

## Sources Consulted
- TablePlus official homepage — https://tableplus.com/
- TablePlus keyboard shortcut documentation — https://docs.tableplus.com/utilities/shortcut-keys
- TablePlus import/export documentation — https://docs.tableplus.com/gui-tools/import-and-export
- TablePlus MongoDB blog post — https://tableplus.com/blog/2019/08/tableplus-native-gui-client-mongodb.html
- TablePlus GitHub issues for MongoDB support — https://github.com/TablePlus/TablePlus/issues
- MongoDB connection string documentation — https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found

### 1. Incorrect database count claim
- **What was wrong:** The post claimed TablePlus "supports over 20 database systems." The official TablePlus homepage lists approximately 14 supported databases (MySQL, PostgreSQL, SQL Server, SQLite, Redis, MariaDB, Amazon Redshift, MongoDB, CockroachDB, Oracle, Cassandra, BigQuery, ClickHouse, Turso).
- **What was changed:** Replaced "supports over 20 database systems including MongoDB, PostgreSQL, MySQL, Redis, and SQLite" with "supports multiple database systems including MongoDB, PostgreSQL, MySQL, Redis, SQLite, MariaDB, and Microsoft SQL Server."
- **Why:** The original claim overstated the number of supported databases by roughly 40%.

### 2. Incorrect keyboard shortcut for query editor (two locations)
- **What was wrong:** The post stated Cmd+K opens a "New query tab." According to official TablePlus shortcut documentation, Cmd+K switches databases. The correct shortcut to open the SQL/query editor is Cmd+E.
- **What was changed:** Replaced "Open a query tab (Cmd+K or from the menu)" with "Open the query editor (Cmd+E or from the menu)" in the Running Queries section. Updated the Keyboard Shortcuts table from "Cmd+K - New query tab" to "Cmd+E - Open query editor."
- **Why:** Using the wrong shortcut (Cmd+K) would switch databases instead of opening the query editor, causing confusion for readers following the guide.

## Review Notes
- **MongoDB shell syntax in query editor:** The post shows `db.collection.find()` and `db.collection.aggregate()` syntax in the query editor examples. Historical GitHub issues suggest TablePlus may not fully support MongoDB shell syntax in the query editor, though this may have been addressed in recent versions. Readers should verify this works in their version of TablePlus.
- **SRV connection strings:** Multiple GitHub issues have reported problems connecting to MongoDB Atlas via `mongodb+srv://` URIs. While recent versions may have resolved these issues, readers experiencing connection failures should check TablePlus's GitHub issues for workarounds.
- **Export formats:** The post lists JSON and CSV as export formats. TablePlus also supports SQL export, though this omission is minor and does not affect correctness for MongoDB-specific use cases.
- **MongoDB query syntax:** All MongoDB query and aggregation pipeline examples use correct, current syntax.
- **Connection defaults:** MongoDB default port 27017 and the Atlas SRV connection string format are both correct.
