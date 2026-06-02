# Validation Summary: How to Use Kinesis Data Streams Enhanced Fan-Out

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Kinesis Data Streams
- Kinesis enhanced fan-out
- AWS CLI
- Kinesis Client Library (KCL) 2.x
- AWS SDK for Java 2.x
- boto3 for Python
- AWS Lambda event source mappings

## Sources Consulted
- AWS Kinesis Data Streams Developer Guide: enhanced fan-out consumers: https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
- AWS Kinesis Data Streams quotas and limits: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- AWS CLI Command Reference: register-stream-consumer: https://docs.aws.amazon.com/cli/latest/reference/kinesis/register-stream-consumer.html
- AWS Kinesis API Reference: SubscribeToShard: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_SubscribeToShard.html
- Boto3 Kinesis client reference: subscribe_to_shard: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/client/subscribe_to_shard.html
- AWS Lambda Developer Guide: using Lambda with Kinesis: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda Kinesis event source mapping parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS Kinesis Client Library source: FanOutConfig and ConfigsBuilder: https://github.com/awslabs/amazon-kinesis-client

## Issues Found
- The comparison table listed enhanced fan-out as a flat maximum of 20 consumers per stream. AWS now documents 20 registered enhanced fan-out consumers per stream for provisioned and On-demand Standard streams, and 50 per stream for On-demand Advantage streams. Updated the table.
- The comparison table described standard consumers as "5 per shard recommended." The official limit is 5 GetRecords calls per second per shard, not a recommended consumer count. Updated the table label and wording.
- The KCL Java example used SDK and KCL classes without the imports needed to make the snippet syntactically complete. Added the relevant imports.
- The Python example used a single list_shards call, which can miss shards when results are paginated. Updated it to use the boto3 paginator.
- The Python example implied a direct boto3 loop was enough for production multi-shard consumption. Added a note that each shard subscription should run in its own worker, or KCL should be used.
- The first Lambda command was labeled as enhanced fan-out even though it used the stream ARN and therefore created a standard event source mapping. Updated the comment to identify it as a standard mapping before the post explains the enhanced fan-out version.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI shapes were verified against the official AWS CLI and service documentation rather than local `--help` output. KCL 2.x still supports enhanced fan-out, but AWS recommends using the latest supported KCL version for new production applications.
