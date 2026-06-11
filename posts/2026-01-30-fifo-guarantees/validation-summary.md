# Validation Summary: How to Implement FIFO Guarantees

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Python
- Apache Kafka
- Confluent Kafka Python client
- Amazon SQS FIFO queues
- Boto3 / Amazon SQS API
- Message partitioning, sequence numbers, deduplication, and reordering buffers

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Confluent Kafka Python client documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Amazon SQS FIFO queue delivery logic: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html
- Amazon SQS exactly-once processing documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- Amazon SQS SendMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- Amazon SQS SendMessageBatch API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessageBatch.html
- Amazon SQS ReceiveMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- Fixed the time-window partitioning calculation. The original code used `timedelta.seconds` incorrectly in the minute calculation, causing default five-minute windows to collapse to the start of the hour. The code now uses `total_seconds()` and computes the correct minute boundary.
- Corrected the entity partitioning wording from "consistent hashing" to "stable hashing"; modulo hashing keeps an entity stable for a fixed partition count but is not consistent hashing when partitions are added or removed.
- Corrected the Kafka consumer comment for `max.partition.fetch.bytes`; it limits bytes fetched per partition and does not make the consumer fetch from only one partition at a time.
- Corrected SQS FIFO deduplication wording. SQS deduplication IDs suppress duplicate sends within the deduplication interval; they do not by themselves guarantee exactly-once business processing.
- Added a guard to `send_batch` because the SQS `SendMessageBatch` API accepts 1 to 10 entries per request.
- Replaced deprecated `AttributeNames=['All']` usage in `receive_message` with `MessageSystemAttributeNames=['All']`.
- Fixed a reordering-buffer timeout bug where the local `expected` variable was not updated after skipping missing sequence numbers, which could cause an infinite loop once the timeout branch was reached.
- Corrected the buffer-full wording and variable names from "oldest" to "lowest-sequence" because the heap is ordered by sequence number, not timestamp.

## Review Notes
The Python code blocks were syntax-checked with Python's `compile()` after edits. The examples remain illustrative and omit production concerns such as persistent sequence storage, consumer rebalance handling, visibility-timeout extension, SQS batch partial-failure handling, and atomic idempotency with business-state updates.
