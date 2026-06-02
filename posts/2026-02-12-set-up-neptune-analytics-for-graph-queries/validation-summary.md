# Validation Summary: How to Set Up Neptune Analytics for Graph Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Neptune Analytics
- Amazon Neptune Database
- AWS CLI
- openCypher
- Neptune Analytics graph algorithms
- Neptune Analytics vector search
- Amazon CloudWatch
- Python boto3

## Sources Consulted
- AWS CLI `neptune-graph create-graph` command reference: https://docs.aws.amazon.com/cli/latest/reference/neptune-graph/create-graph.html
- AWS CLI `neptune-graph create-graph-using-import-task` command reference: https://docs.aws.amazon.com/cli/latest/reference/neptune-graph/create-graph-using-import-task.html
- Neptune Analytics bulk import into an existing graph: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/loading-data-existing-graph.html
- Neptune Analytics import from S3: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/bulk-import-create-from-s3.html
- Neptune Analytics import from Neptune cluster or snapshot: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/bulk-import-create-from-neptune.html
- Neptune Analytics CSV data format: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/using-CSV-data.html
- Neptune Analytics ExecuteQuery API: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/query-APIs-execute-query.html
- boto3 `neptune-graph.execute_query` reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/neptune-graph/client/execute_query.html
- Neptune Analytics algorithms overview: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/algorithms.html
- Neptune Analytics PageRank algorithm: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/page-rank.html
- Neptune Analytics Louvain algorithm: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/louvain.html
- Neptune Analytics Bellman-Ford path algorithm: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/sssp-bellmanFord-path.html
- Neptune Analytics vector search algorithms: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/vss-algorithms.html
- Neptune Analytics `.vectors.topK.byNode` algorithm: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/vectors.topK.byNode.html
- Neptune Analytics CloudWatch monitoring: https://docs.aws.amazon.com/neptune-analytics/latest/userguide/monitoring-cw.html

## Issues Found
- Corrected the Neptune Analytics memory explanation from "GB" to m-NCUs and noted that each m-NCU is roughly 1 GiB of memory capacity plus compute and networking.
- Fixed the `--tags` CLI shorthand for `create-graph` from the EC2-style `Key=...,Value=...` form to the map form used by `neptune-graph`.
- Replaced the sample graph identifier with one matching the documented `g-[a-z0-9]{10}` pattern.
- Corrected the Gremlin CSV edge file headers and rows from unsupported `~source`/`~target` columns to `~from`/`~to`, and removed the unsupported edge `~id` column from the sample.
- Replaced the Neptune Database import example with `create-graph-using-import-task`, because `start-import-task` is for loading S3 data into an existing empty Neptune Analytics graph and does not import directly from Neptune Database.
- Added the required output target to AWS CLI `execute-query` examples and used the documented CLI language value `open_cypher`.
- Fixed openCypher references to the reserved `~id` key by quoting it as `` `~id` ``.
- Corrected the PageRank example to pass a node input, use `numOfIterations`, and read the `rank` output.
- Replaced the nonexistent `neptune.algo.community` example with the documented `neptune.algo.louvain` community detection procedure.
- Replaced the nonexistent `neptune.algo.shortestPath` example with the documented `neptune.algo.sssp.bellmanFord.path` procedure and required edge-weight options.
- Updated the Python query to alias returned fields so the boto3 result parsing example uses stable keys.
- Replaced the deprecated vector procedure `vectors.topKByNode` with `vectors.topK.byNode` and corrected its arguments.
- Replaced invalid CloudWatch namespace, dimension, and metric names with documented Neptune Analytics values.

## Review Notes
The examples remain illustrative and still require real AWS resources, IAM permissions, an S3 bucket in the same Region, and compatible vector embeddings before they can be run end to end.
