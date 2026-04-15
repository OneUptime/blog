# Validation Summary: How to Use MongoDB Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MongoDB table engine and mongodb() table function)
- MongoDB (BSON types, replica sets, collections)
- SQL (CREATE TABLE, SELECT, JOIN, INSERT INTO ... SELECT)

## Sources Consulted
- ClickHouse MongoDB table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/mongodb
- ClickHouse mongodb() table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/mongodb

## Issues Found

### 1. Missing `structure` parameter in mongodb() table function
**What was wrong:** The `mongodb()` table function example omitted the required `structure` parameter that defines column names and types. The blog showed only 5 positional parameters (host, database, collection, user, password), but the function signature requires a 6th `structure` parameter.
**What was changed:** Added the `structure` parameter (`'_id String, username String, email String, plan String, country String, created_at DateTime, is_active UInt8'`) to the table function call, and added a note explaining that the table function requires this parameter unlike the engine.
**Why:** Without the `structure` parameter, the query would fail with a syntax error.

### 2. Incorrect replica set ENGINE syntax
**What was wrong:** The replica set example used 5 parameters (URI, database, collection, user, password), but the URI format for the MongoDB engine only accepts 2-3 parameters: `MongoDB(uri, collection[, oid_columns])`. When using a URI, credentials and database name must be embedded in the URI itself.
**What was changed:** Rewrote the ENGINE declaration to use the correct 2-parameter URI format: `MongoDB('mongodb://reader:secret@host1,host2,host3/orders_db?replicaSet=myReplSet', 'orders')`. Added explanatory text about the URI format.
**Why:** The original syntax would fail because ClickHouse doesn't accept the 5-parameter form when the first parameter is a `mongodb://` URI.

### 3. Incomplete Array type mapping
**What was wrong:** The type mapping table listed Array as mapping only to `String (JSON-serialized)`, but ClickHouse also supports mapping MongoDB arrays to native ClickHouse `Array` types.
**What was changed:** Updated the mapping to `Array or String (JSON-serialized)`.
**Why:** Omitting the `Array` mapping option could lead readers to unnecessarily serialize arrays as JSON strings when a native Array type would work.

## Review Notes
- The `mongodb+srv://` seed list connection format is not yet supported by ClickHouse, which is worth noting for readers using MongoDB Atlas. The blog doesn't mention this limitation.
- The predicate pushdown section mentions `IN` clauses pushing down to MongoDB. The official docs describe pushdown support for "simple expressions" such as `WHERE field = <constant>`. `IN` may or may not push down depending on the ClickHouse version; readers should test this with their specific setup.
- The type mapping table is simplified compared to the official docs (e.g., the docs show `uuid (binary subtype 4) → UUID` which the blog omits), but the mappings listed are correct.
- The `mongodb_throw_on_unsupported_query` setting is not mentioned in the blog; this setting controls whether unsupported queries raise errors or are processed client-side.
