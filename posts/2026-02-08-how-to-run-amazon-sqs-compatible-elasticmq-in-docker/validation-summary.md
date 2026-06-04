# Validation Summary: How to Run Amazon SQS Compatible (ElasticMQ) in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- ElasticMQ
- Amazon SQS
- AWS CLI
- AWS SDK for Python (Boto3)
- AWS SDK for JavaScript v3
- Python
- Node.js
- HOCON configuration

## Sources Consulted
- ElasticMQ README and Docker documentation: https://github.com/softwaremill/elasticmq and https://hub.docker.com/r/softwaremill/elasticmq-native
- ElasticMQ example Docker Compose and configuration: https://raw.githubusercontent.com/softwaremill/elasticmq/master/docker-compose.yaml and https://raw.githubusercontent.com/softwaremill/elasticmq/master/examples/elasticmq.conf
- Docker Compose Specification documentation: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- AWS CLI SQS command reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html and https://docs.aws.amazon.com/cli/latest/reference/sqs/receive-message.html
- Boto3 SQS client documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs.html, https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/send_message.html, and https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/receive_message.html
- AWS SDK for JavaScript v3 SQS client and command reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sqs/Class/SQSClient and https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sqs-2012-11-05/SendMessage
- AWS SDK for JavaScript v3 service-client migration notes for custom SQS endpoints: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-service-client-notes.html
- Amazon SQS FIFO queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/creating-sqs-fifo-queues.html

## Issues Found
- The Docker Compose snippets used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification, where the field is only retained for backward compatibility and may produce an obsolete warning.
- The Python/Boto3 example claimed to work with both ElasticMQ and real SQS but always used a localhost endpoint, hard-coded local credentials, and manually constructed the queue URL. Updated it to set `endpoint_url` and dummy credentials only when `SQS_ENDPOINT` is present, and to resolve the queue URL with `get_queue_url`.
- The Node.js SDK example had the same real-SQS compatibility issue and manually constructed the queue URL. Updated it to configure the custom endpoint only when `SQS_ENDPOINT` is present and to use `GetQueueUrlCommand`.
- The AWS CLI examples did not provide credentials. ElasticMQ does not require real AWS credentials, but the AWS CLI normally needs credentials to sign requests. Added dummy local credential exports before the CLI commands.
- The integration test fixture manually constructed the ElasticMQ queue URL. Updated it to use `get_queue_url`, matching the SQS API and avoiding assumptions about account ID or base URL formatting.

## Review Notes
The ElasticMQ Docker image, default REST-SQS port `9324`, optional UI/statistics port `9325`, custom configuration mount path `/opt/elasticmq.conf`, HOCON queue configuration fields, dead-letter queue configuration, FIFO configuration, AWS CLI command names and flags, and SQS SDK send/receive/delete APIs were otherwise consistent with the consulted documentation. The article still assumes the queues are pre-created by the provided ElasticMQ configuration before the SDK examples run.
