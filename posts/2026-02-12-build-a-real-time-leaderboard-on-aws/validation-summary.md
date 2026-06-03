# Validation Summary: How to Build a Real-Time Leaderboard on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS ElastiCache for Redis OSS
- Redis sorted sets
- Amazon DynamoDB
- Amazon API Gateway WebSocket APIs
- AWS Lambda
- Python
- Boto3
- CloudFormation

## Sources Consulted
- AWS CloudFormation `AWS::ElastiCache::ReplicationGroup` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-replicationgroup.html
- Redis sorted set command documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Boto3 API Gateway Management API `post_to_connection` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/apigatewaymanagementapi/client/post_to_connection.html
- DynamoDB `Scan` API documentation: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
- Python 3.12 deprecations for `datetime.utcnow()`: https://docs.python.org/3.12/whatsnew/3.12.html
- OneUptime monitoring product page: https://oneuptime.com/product/monitoring

## Issues Found
- The score submission handler used `ZREVRANK` for all leaderboard modes, which made `lowest` mode rank lower scores incorrectly. Changed the rank calculation to use `ZRANK` when `mode == 'lowest'` and `ZREVRANK` otherwise, matching Redis sorted set ordering semantics.
- The Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- The WebSocket broadcast example used a DynamoDB `scan` with a filter expression to find connections by leaderboard. DynamoDB applies scan filters after reading items and scan results require pagination after 1 MB, so the sample could miss connections and would not scale. Updated the example to use a `Query` against a `leaderboardId` global secondary index.
- The OneUptime monitoring link pointed to an unrelated API monetization article. Updated it to the OneUptime monitoring product page.

## Review Notes
- The Redis complexity claims for `ZINCRBY`, `ZRANK`, `ZREVRANK`, `ZRANGE`, and `ZREVRANGE` match the official Redis documentation.
- The ElastiCache CloudFormation snippet uses valid `AWS::ElastiCache::ReplicationGroup` and DynamoDB table properties, assuming the referenced subnets and security group are defined elsewhere in the full stack.
- The query API sample is written for highest-score leaderboards. The post correctly notes later that ascending leaderboards should use `ZRANGE`; a production API would usually parameterize the ordering across all query helpers.
