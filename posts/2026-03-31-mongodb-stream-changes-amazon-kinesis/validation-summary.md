# Validation Summary: How to Stream MongoDB Changes to Amazon Kinesis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams (4.0+)
- Amazon Kinesis Data Streams
- AWS SDK for Python (boto3)
- PyMongo (MongoClient, change streams, `bson.json_util`)
- AWS Lambda (Kinesis event source)
- AWS CLI (Kinesis, CloudWatch)
- AWS CloudWatch Metrics

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- PyMongo `watch()` API reference: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.watch
- AWS Kinesis `PutRecords` API reference: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- AWS CLI `kinesis create-stream` reference: https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- AWS Lambda Kinesis event source mapping: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS CloudWatch Kinesis metrics: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- `bson.json_util` documentation: https://pymongo.readthedocs.io/en/stable/api/bson/json_util.html

## Issues Found
No technical issues found.

## Review Notes
- The `json` module is imported but unused in both the producer (`import boto3, json, time`) and the Lambda handler (`import json`). Only `bson.json_util` is actually used for serialization. This is cosmetic and does not affect functionality.
- The `PutRecords` batch of 500 records respects the API record-count limit, but does not check the 5 MB total payload limit or the 1 MB per-record limit. For a production deployment, payload size checks and retry logic for `FailedRecordCount > 0` responses would be advisable.
- The `resume_after` approach saves the token after each successful Kinesis publish. In a batched scenario, the token should ideally be saved after the entire batch is confirmed, to avoid skipping events if the process crashes mid-batch. The blog separates the batching and resume-token sections, so this is not contradictory, but worth noting for readers combining both patterns.
- Change streams are available on sharded clusters as well as replica sets. The prerequisite note ("change streams require a replica set") is essentially correct since sharded clusters are built on replica set shards, but readers on sharded deployments should know it works there too.
