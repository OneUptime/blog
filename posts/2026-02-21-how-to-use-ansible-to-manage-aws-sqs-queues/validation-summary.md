# Validation Summary: How to Use Ansible to Manage AWS SQS Queues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- `community.aws` Ansible collection
- Amazon SQS
- AWS CLI
- AWS IAM resource policies
- AWS KMS server-side encryption
- Python `boto3` and `botocore`

## Sources Consulted
- Ansible `community.aws.sqs_queue` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/sqs_queue_module.html
- Amazon SQS FIFO exactly-once processing documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- Amazon SQS queue types documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html
- Amazon SQS dead-letter queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS CLI v2 `sqs get-queue-attributes` documentation: https://docs.aws.amazon.com/cli/latest/reference/sqs/get-queue-attributes.html
- Amazon SQS server-side encryption documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html
- Amazon SQS visibility timeout documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS short and long polling documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html
- Amazon SQS `CreateQueue` API documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html

## Issues Found
- The FIFO queue examples used `fifo_queue: true`, which is not a current documented `community.aws.sqs_queue` parameter. Changed both FIFO examples to `queue_type: fifo`.
- The access policy example passed a JSON block scalar to `policy`, but the current Ansible module documents `policy` as a dictionary. Converted the example to an equivalent YAML dictionary.
- The FIFO explanation implied broad exactly-once delivery. Adjusted it to match AWS documentation: FIFO queues help prevent duplicate messages within the 5-minute deduplication interval.
- The dead-letter queue explanation said messages move after exactly 3 receives with `maxReceiveCount: 3`. AWS documents that the message moves after the receive count exceeds `maxReceiveCount`, so the wording was corrected.
- The microservices loop passed integer module values through quoted Jinja expressions. Added `| int` filters for `default_visibility_timeout` and `maxReceiveCount` so the module receives integers.

## Review Notes
The rest of the examples and claims matched the current official documentation. FIFO queue throughput can be increased with high-throughput FIFO settings, but the post's default FIFO throughput statement remains accurate for default FIFO queues.
