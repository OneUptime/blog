# Validation Summary: How to Use Redis Search (RediSearch) for Full-Text Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis Stack
- Redis Search / RediSearch
- Redis CLI commands
- Docker and Docker Compose
- Python redis-py
- Node.js node-redis

## Sources Consulted
- Redis FT.CREATE command documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis Query syntax documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/query_syntax/
- Redis Full-text search documentation: https://redis.io/docs/latest/develop/ai/search-and-query/query/full-text/
- Redis Aggregations documentation: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/aggregations/
- Redis Field and type options documentation: https://redis.io/docs/latest/develop/ai/search-and-query/indexing/field-and-type-options/
- Redis node-redis index and query documents guide: https://redis.io/docs/latest/develop/clients/nodejs/queryjson/
- Redis redis-py index and query documents guide: https://redis.io/docs/latest/develop/clients/redis-py/queryjson/
- node-redis / @redis/search 6.0.0 package API metadata from npm

## Issues Found
- The Python example imported `IndexDefinition` from the older camel-cased module path. Updated it to `redis.commands.search.index_definition`, matching current redis-py documentation.
- The Node.js example used `SchemaFieldTypes` and imported `AggregateSteps`, but current `redis@6.0.0` exports `SCHEMA_FIELD_TYPE` and does not export those names. Updated the import and schema field constants.
- The Node.js schema used lowercase `weight` and `sortable` options. Current node-redis search schema options are uppercase `WEIGHT` and `SORTABLE`, so those were corrected.
- The suffix wildcard note implied a generic "SUFFIX support" requirement. Updated it to note Redis Search 2.6+ support and that `WITHSUFFIXTRIE` optimizes suffix queries.
- The Python aggregation result example accessed row positions directly. Updated it to convert each row to a dictionary before reading `category`, `count`, and `avg_price`, matching redis-py's documented row format and making the example robust to field ordering assumptions.

## Review Notes
Most Redis command examples and claims matched the official Redis Search documentation. The post uses `redis/redis-stack:latest`; for production tutorials, pinning a Redis Stack version would improve reproducibility, but the current command is valid for a getting-started guide.
