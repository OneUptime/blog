# Validation Summary: How to Use RedisGraph for Graph Queries

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis
- RedisGraph
- Redis Stack
- Cypher / openCypher
- Python
- redis-py
- Docker

## Sources Consulted
- Redis Graph documentation: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/
- Redis Graph quick start: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/graph-quickstart/
- Redis Graph commands documentation: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/commands/
- RedisGraph release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisgraph/
- RedisGraph end-of-life announcement: https://redis.io/blog/redisgraph-eol/
- RedisGraph archived command and Cypher documentation: https://github.com/RedisGraph/RedisGraph
- redisgraph-py deprecation notice: https://github.com/RedisGraph/redisgraph-py

## Issues Found
- The post presented RedisGraph as a current Redis Stack capability and used `redis/redis-stack:latest` for installation. Redis now documents RedisGraph as an end-of-life deprecated feature, and current Redis Software/Stack feature sets no longer include RedisGraph. Updated the introduction and installation command to make the guide explicitly target legacy RedisGraph deployments and use the RedisGraph Docker image.
- The product recommendation `record_purchase()` example generated invalid Cypher when `rating` was provided: `SET r.timestamp = timestamp(), rating: 5`. Changed it to generate `SET r.timestamp = timestamp(), r.rating = 5`, and changed the conditional to preserve a rating value of `0`.

## Review Notes
Most RedisGraph query examples were consistent with RedisGraph 2.10-era documentation, including `GRAPH.QUERY`, `MERGE ... ON CREATE`, `timestamp()`, variable-length relationships, `shortestPath`, `CALL db.indexes()`, and node/relationship property indexes. The examples use string interpolation for Cypher construction; production code should use parameters or strict escaping to avoid injection issues.
