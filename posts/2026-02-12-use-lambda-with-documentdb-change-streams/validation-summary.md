# Validation Summary: How to Use Lambda with DocumentDB Change Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon DocumentDB
- DocumentDB change streams
- AWS Lambda event source mappings
- AWS Secrets Manager
- AWS PrivateLink VPC endpoints
- AWS CLI
- Python
- DynamoDB

## Sources Consulted
- AWS Lambda Developer Guide, "Process Amazon DocumentDB events with Lambda": https://docs.aws.amazon.com/lambda/latest/dg/with-documentdb.html
- AWS Lambda Developer Guide, "Invoke a Lambda function from a Amazon DocumentDB trigger": https://docs.aws.amazon.com/lambda/latest/dg/example_serverless_DocumentDB_Lambda_section.html
- Amazon DocumentDB Developer Guide, "Using change streams with Amazon DocumentDB": https://docs.aws.amazon.com/documentdb/latest/devguide/change_streams.html
- AWS CLI Command Reference, `lambda create-event-source-mapping`: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS Lambda API Reference, `CreateEventSourceMapping`: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html

## Issues Found
- The post stated that DocumentDB change streams are enabled by default on DocumentDB 4.0 and later. AWS documents change streams as disabled by default and explicitly enabled with `modifyChangeStreams`, so the setup now shows `db.adminCommand({ modifyChangeStreams: ... })` and `$listChangeStreams`.
- The post described DocumentDB change streams as using MongoDB's oplog. Amazon DocumentDB does not support the MongoDB oplog, so this was changed to an internal change stream log.
- The networking section implied that configuring the Lambda function VPC is what gives the event source mapping access to DocumentDB. AWS documents that the function VPC configuration does not determine event source mapping connectivity, so the section now focuses on required VPC endpoints and security group access.
- The prerequisites omitted TLS and the specific permissions Lambda needs to work with a DocumentDB event source mapping. Added TLS and execution-role permission requirements at a high level.
- The Lambda handler returned `batchItemFailures` and the CLI command enabled `ReportBatchItemFailures`. AWS documents `ReportBatchItemFailures` for Kinesis, DynamoDB Streams, MSK, self-managed Kafka, and SQS, not DocumentDB. The handler now raises an error when any record fails, and the unsupported CLI option was removed.
- The audit-log Python snippet used `json.dumps` without importing `json`. Added the missing import.
- The monitoring section referred generically to change stream lag. Updated it to the Lambda `IteratorAge` metric used for DocumentDB event sources.
- The conclusion described the pipeline as fully serverless and said Lambda scales based on the volume of changes. Updated this to a managed pipeline and removed the scaling claim.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference and AWS Lambda API documentation rather than local `aws --help` output. The tutorial is now aligned with current AWS guidance for DocumentDB event source mappings, including explicit change stream activation, PrivateLink/NAT networking requirements, and DocumentDB-supported event source mapping options.
