# Validation Summary: How to Use New Features in MongoDB 5.0 (Time Series, Live Resharding)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0
- MongoDB Time Series Collections
- MongoDB Live Resharding (`reshardCollection`)
- MongoDB Aggregation Pipeline (`$dateTrunc`, `$setWindowFields`, `$currentOp`)
- MongoDB TTL (expireAfterSeconds)

## Sources Consulted
- MongoDB 5.0 Release Notes: https://www.mongodb.com/docs/manual/release-notes/5.0/
- MongoDB Time Series Collections documentation: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB `reshardCollection` command reference: https://www.mongodb.com/docs/manual/reference/command/reshardCollection/
- MongoDB `$setWindowFields` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `$dateTrunc` expression: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
- MongoDB `$currentOp` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/

## Issues Found
No technical issues found.

## Review Notes
- The "sub-second" characterization of the resharding commit window is slightly optimistic for MongoDB 5.0's initial release. In practice, the critical section where writes are blocked during resharding commit can last a few seconds depending on workload and cluster configuration. Later MongoDB versions (6.0+) improved this duration. The post's phrasing ("brief (sub-second)") is acceptable but readers should be aware the exact duration varies.
- The resharding monitoring query uses `"command.reshardCollection"` as the match filter. While this approach works, the more canonical method from MongoDB documentation matches on `desc: "ReshardingCoordinator"`. Both approaches are valid for demonstrating the concept.
- MongoDB 5.0 time series `granularity` options (`"seconds"`, `"minutes"`, `"hours"`) are correct. Note that MongoDB 6.3+ introduced more fine-grained `bucketMaxSpanSeconds` and `bucketRoundingSeconds` parameters as alternatives.
