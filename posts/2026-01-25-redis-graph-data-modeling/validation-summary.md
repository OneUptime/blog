# Validation Summary: How to Model Graph Data with RedisGraph

## Status
validated

## Post Type
Tutorial / legacy maintenance guide

## Technologies Covered
- Redis
- RedisGraph
- Redis Stack
- Cypher
- redis-py
- Docker
- Python

## Sources Consulted
- RedisGraph End-of-Life Announcement: https://redis.io/blog/redisgraph-eol/
- Redis Graph deprecated feature documentation: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/
- Redis Graph quick start: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/graph-quickstart/
- Redis Graph commands documentation: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/commands/
- Redis Stack 7.2 release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisstack/redisstack-7.2-release-notes/
- RedisGraph Cypher coverage: https://raw.githubusercontent.com/RedisGraph/RedisGraph/master/docs/docs/cypher_support.md
- RedisGraph path algorithm documentation: https://raw.githubusercontent.com/RedisGraph/RedisGraph/master/docs/docs/path_algorithm.md
- RedisGraph known limitations: https://raw.githubusercontent.com/RedisGraph/RedisGraph/master/docs/docs/known_limitations.md
- redis-py GraphCommands source documentation: https://redis.readthedocs.io/en/v5.1.0/_modules/redis/commands/graph/commands.html
- redis-py QueryResult source: https://raw.githubusercontent.com/redis/redis-py/v5.1.0/redis/commands/graph/query_result.py
- Docker Hub RedisGraph image page: https://hub.docker.com/r/redislabs/redisgraph

## Issues Found
- The post presented RedisGraph as current technology. Redis has announced RedisGraph end-of-life, and Redis Stack 7.2 release notes state that graph capabilities are no longer included. I added a clear legacy-use caveat and changed current-tense claims to past-tense where needed.
- The Docker example used `redis/redis-stack:latest`, which no longer provides RedisGraph. I changed it to the deprecated `redislabs/redisgraph` image for a legacy local instance and updated the documentation URL.
- The e-commerce example attempted to create a `PURCHASED` relationship for customer `C001` without creating that customer first. I added a `Customer` node to the setup data so the purchase query can match both endpoints.
- The index examples used Neo4j-style `CREATE INDEX FOR (u:User) ON (u.name)` syntax. RedisGraph uses `CREATE INDEX ON :Label(property)`, so I updated both index creation queries.
- The profiling example used `EXPLAIN` and `PROFILE` as Cypher prefixes through `graph.query()`. redis-py exposes `execution_plan()` for `GRAPH.EXPLAIN` and `query(..., profile=True)` for `GRAPH.PROFILE`, so I corrected the example.
- The profiling example read `nodes_created` and `run_time_ms` from a profile result. In redis-py, profile results are parsed as a profile plan, while normal query results expose statistics such as `run_time_ms`. I updated the example to print the profile plan and query timing from the correct result object.

## Review Notes
RedisGraph is deprecated/end-of-life, so this article should be treated as a legacy maintenance guide rather than guidance for new production systems. The remaining Cypher examples use RedisGraph-supported clauses and functions, including `MATCH`, `CREATE`, `DELETE`, `DETACH DELETE`, `SET`, parameters, variable-length traversals, and `shortestPath`.
