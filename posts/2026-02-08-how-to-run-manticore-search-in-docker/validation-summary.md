# Validation Summary: How to Run Manticore Search in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Manticore Search
- Manticore SQL over the MySQL protocol
- Manticore HTTP/JSON API
- Manticore replication clusters
- Python MySQL Connector
- PostgreSQL

## Sources Consulted
- Manticore Search Manual: Starting and using Manticore in Docker - https://manual.manticoresearch.com/Starting_the_server/Docker
- Manticore Search Manual: Connecting to the server - https://manual.manticoresearch.com/Connecting_to_the_server
- Manticore Search Manual: Creating a table - https://manual.manticoresearch.com/Creating_a_table
- Manticore Search Manual: Plain and real-time table settings - https://manual.manticoresearch.com/Creating_a_table/Local_tables/Plain_and_real-time_table_settings
- Manticore Search Manual: Adding documents to an index - https://manual.manticoresearch.com/Adding%20documents%20to%20an%20index
- Manticore Search Manual: Searching and filtering - https://manual.manticoresearch.com/Searching
- Manticore Search Manual: Highlighting - https://manual.manticoresearch.com/Searching/Highlighting
- Manticore Search Manual: Sorting and ranking - https://manual.manticoresearch.com/Searching/Sorting_and_ranking
- Manticore Search Manual: HTTP data creation and modification - https://manual.manticoresearch.com/Data_creation_and_modification/Data_creation_and_modification
- Manticore Search Manual: Creating a replication cluster - https://manual.manticoresearch.com/Creating_a_cluster/Setting_up_replication/Creating_a_replication_cluster
- Manticore Search Manual: SHOW TABLE STATUS - https://manual.manticoresearch.com/Node_info_and_management/Table_settings_and_status/SHOW_TABLE_STATUS
- Docker CLI reference: docker run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose file reference - https://docs.docker.com/reference/compose-file/
- MySQL Connector/Python Developer Guide - https://dev.mysql.com/doc/connector-python/en/

## Issues Found
- The SQL inserts used `NOW()` for a `timestamp` column. Manticore documentation states that expressions are not supported in `INSERT` values, so the examples now use explicit Unix timestamp values.
- The HTTP `/search`, `/insert`, and `/bulk` examples used `index`. Current Manticore JSON API examples use `table`, so those payloads were updated. The search example now uses `*` as the match field to search across full-text fields.
- The Docker Compose example set `EXTRA: 1` with a comment claiming it enabled automatic column store behavior. The official Docker image documentation says the columnar library is included, but does not document that environment variable as enabling automatic column store behavior, so it was removed.
- The replication cluster example used unsupported `cluster` and `cluster_name` environment variables as if they created a replication cluster. It now follows the documented Docker replication flow: start two Manticore containers, run `CREATE CLUSTER` and `ALTER CLUSTER ... ADD ...` on the first node, then `JOIN CLUSTER ... AT 'manticore-1:9312'` on the second node.
- Broad Elasticsearch comparison claims were softened to clarify that performance and memory differences depend on workload and data/query patterns.

## Review Notes
The Docker, SQL, HTTP, highlighting, sorting, table status, and replication examples were reviewed against official documentation. A live Docker smoke test was attempted, but Docker Hub returned an unauthenticated pull rate-limit error, so runtime execution could not be completed in this environment.
