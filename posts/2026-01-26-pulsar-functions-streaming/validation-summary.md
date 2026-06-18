# Validation Summary: How to Use Pulsar Functions for Stream Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar
- Pulsar Functions
- Pulsar admin CLI
- Pulsar Python Functions SDK
- Pulsar Java Functions SDK
- Apache BookKeeper state storage
- Docker
- Stream processing patterns

## Sources Consulted
- Apache Pulsar Functions API documentation: https://pulsar.apache.org/docs/next/functions-develop-api/
- Apache Pulsar Functions concepts and processing guarantees: https://pulsar.apache.org/docs/next/functions-concepts/
- Apache Pulsar Functions CLI and YAML configs: https://pulsar.apache.org/docs/4.0.x/functions-cli/
- Apache Pulsar stateful functions worker configuration: https://pulsar.apache.org/docs/next/functions-worker-stateful/
- Apache Pulsar Python Context API: https://pulsar.apache.org/api/python/3.6.x/pulsar.functions.context.Context.html
- Apache Pulsar Java Context API: https://pulsar.apache.org/api/pulsar-functions/3.0.x/org/apache/pulsar/functions/api/Context.html
- Apache Pulsar Java BaseContext API: https://pulsar.apache.org/api/pulsar-functions/3.0.x/org/apache/pulsar/functions/api/BaseContext.html
- Apache Pulsar Java Record API: https://pulsar.apache.org/api/pulsar-functions/3.0.x/org/apache/pulsar/functions/api/Record.html
- Local Apache Pulsar 3.3.0 `pulsar-admin functions create --help` and `pulsar-admin functions trigger --help` output from the official Docker image.

## Issues Found
- The post described function scaling as automatic based on topic partitions. Pulsar Functions use configured parallelism, so this was changed to describe configurable parallelism.
- The effectively-once explanation and diagram described a transactional commit path. Pulsar Functions documentation describes effectively-once as at-least-once processing with server-side deduplication so each input has one output. The diagram and text were corrected.
- The Python routing example passed `partition_key` directly to `context.publish`, but the Python Context API accepts producer options through `message_conf`. The example now passes `message_conf={'partition_key': ...}`.
- The stateful function deployment used a non-existent `--state-storage-service-url` function create flag. The command was corrected, and the surrounding text now explains that `stateStorageServiceUrl` is configured on the function worker.
- The window aggregation example attempted to clear arbitrary state with `context.put_state(state_key, None)`, which is not supported by the Python state API. That invalid call was removed.
- The Java example called `context.getMessageId()`, which is not exposed by the Java Functions `Context` API. It now obtains the message ID from `context.getCurrentRecord().getMessage()`.
- The resource example used `--ram 4096` and `--disk 10000` while describing the values as megabytes. Pulsar CLI help documents these values as bytes, so the example and descriptions were corrected.
- The error handling section claimed to configure automatic dead letter routing while showing manual DLQ publishing code. The wording now accurately describes manual routing from the function.
- The monitoring section labeled a `functions trigger` command as viewing logs and omitted the optional input topic. The comment was corrected to a test invocation, and `--topic` was added.
- The update section claimed Pulsar performs rolling function updates one instance at a time. The wording was narrowed to the documented behavior: updating the deployed function configuration and checking status/backlog after affected instances restart.

## Review Notes
The post is technically relevant and remains a practical Pulsar Functions guide. The examples are illustrative and assume that function workers and Python runtime dependencies are available in the deployment environment. For production, readers should also configure retry limits and `--dead-letter-topic` when they want framework-managed dead letter routing instead of manual DLQ publishing.
