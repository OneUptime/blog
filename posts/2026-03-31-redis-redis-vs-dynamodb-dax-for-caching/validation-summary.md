# Validation Summary: Redis vs DynamoDB DAX for Caching

## Status
validated

## Post Type
Comparison Guide / Tutorial

## Technologies Covered
- Amazon DynamoDB Accelerator (DAX)
- Redis (via Amazon ElastiCache)
- Amazon DynamoDB
- Python (boto3, amazon-dax-client, redis-py)
- AWS

## Sources Consulted
- AWS DAX Developer Guide — How DAX Works (item cache and query cache): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html
- AWS DAX Python SDK documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-python.html
- DynamoDB TransactGetItems API Reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactGetItems.html
- DAX cluster configuration and node types: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.cluster.html
- boto3 DynamoDB resource documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

### Issue 1: Unused `amazon.ion.simpleion` import
- **What was wrong:** The DAX Python code example included `import amazon.ion.simpleion as ion`, which is never used in the example and is not required to instantiate or use `AmazonDaxClient`.
- **What was changed:** Removed the unused import line.
- **Why:** It confuses readers into thinking this import is necessary for DAX client usage.

### Issue 2: Incorrect claim that DAX does not cache Scan operations
- **What was wrong:** The post stated "DAX does NOT cache Scan operations." This is false. DAX has two caches: an **item cache** (for GetItem and BatchGetItem) and a **query cache** (for both Query and Scan results). Scan results are cached in the query cache.
- **What was changed:** Removed the incorrect claim about Scan not being cached. Reworked the "What DAX Cannot Cache" section to focus on what DAX actually cannot cache: TransactGetItems/TransactWriteItems (passed through without caching) and arbitrary non-DynamoDB data.
- **Why:** This was factually incorrect per AWS documentation and could lead readers to implement unnecessary Redis caching layers for Scan results that DAX already handles.

### Issue 3: Incorrect TransactGetItems claim
- **What was wrong:** The post stated "DAX does NOT cache TransactGetItems with more than 25 items." Two errors: (1) the DynamoDB TransactGetItems limit is 100 items, not 25 (25 is the BatchWriteItem limit), and (2) DAX does not cache TransactGetItems at all — they are always passed through to DynamoDB regardless of item count.
- **What was changed:** Replaced with accurate statement that DAX does not cache TransactGetItems or TransactWriteItems, and they are passed through to DynamoDB without caching.
- **Why:** The 25-item number was incorrect and the conditional framing ("more than 25") falsely implied DAX caches smaller transact requests.

## Review Notes
- The DAX minimum cluster size is listed as "3 nodes (HA)" in the cost comparison table. While this is the recommended production HA configuration, DAX does support single-node clusters for development/testing. The "(HA)" qualifier makes the entry technically defensible, but readers may be misled into thinking DAX requires 3 nodes minimum.
- The DAX write-through description is simplified. While writes through DAX update the item cache, the query cache entries are not invalidated — they expire based on TTL. This is an acceptable simplification for a comparison blog post.
- The latency figures are reasonable ballpark estimates but not sourced to specific benchmarks.
