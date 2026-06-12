# Validation Summary: How to Build RabbitMQ Stream Queues

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- RabbitMQ Streams and Super Streams
- RabbitMQ Management HTTP API and `rabbitmqadmin`
- RabbitMQ Stream protocol
- `rabbitmq-stream-js-client`
- `amqplib`
- Python `pika`
- Redis checkpoint storage
- RabbitMQ Stream PerfTest
- Prometheus metrics and PromQL

## Sources Consulted
- RabbitMQ Streams and Super Streams documentation: https://www.rabbitmq.com/docs/streams
- RabbitMQ `rabbitmqadmin` v2 documentation: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ `rabbitmq-streams` manual page: https://www.rabbitmq.com/docs/4.2/man/rabbitmq-streams.8
- RabbitMQ Stream JavaScript tutorial: https://www.rabbitmq.com/tutorials/tutorial-two-javascript-stream
- `rabbitmq-stream-js-client` package declarations and README: https://www.npmjs.com/package/rabbitmq-stream-js-client and https://github.com/coders51/rabbitmq-stream-js-client
- `amqplib` channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- RabbitMQ Stream PerfTest documentation: https://rabbitmq.github.io/rabbitmq-stream-perf-test/stable/htmlsingle/

## Issues Found
- The `amqplib` publisher example used `createChannel()` followed by a nonexistent `confirmChannel()` method. I changed it to `createConfirmChannel()` and used the confirm callback form documented for `ConfirmChannel#sendToQueue`.
- The native JavaScript stream examples used invalid exports and method names such as `Client.connect`, `OffsetSpecification`, `declareProducer`, `sendBatch`, `declareSuperStreamProducer`, and `initialCredits`. I updated them to the current `rabbitmq-stream-js-client` API: `connect`, `Offset`, `declarePublisher`, `sendSubEntries`, `declareSuperStreamPublisher`, and `creditPolicy`.
- Several stream client connection examples omitted the required `vhost` option. I added `vhost: '/'`.
- The Single Active Consumer example implied that setting a consumer `name` implicitly enables SAC. I corrected it to use `singleActive: true` with a shared `consumerRef`, plus a `consumerUpdateListener` for handoff offset continuity.
- The Super Stream example used the wrong `createSuperStream` and producer signatures. I corrected partition creation and routing-key extraction to match the package API.
- The benchmark script mixed regular PerfTest with stream-protocol-specific options that do not match current tooling. I changed it to use RabbitMQ Stream PerfTest with documented options such as `--uris`, `--streams`, `--batch-size`, and `--confirms`.
- The `rabbitmqadmin` examples used older syntax. I updated the basic examples to the current v2 `queues declare` and `streams declare` command style.
- The performance table gave fixed throughput, latency, overhead, and replication figures that are too environment-specific or inaccurate as defaults. I replaced them with workload-dependent descriptions aligned with RabbitMQ's performance and replication documentation.
- The intro and use-case bullets claimed generic "millions of messages per second" handling. I changed this to "very high throughput" wording because actual throughput depends on message size, batching, disks, replication, and protocol.
- The stream feature comparison oversimplified offset tracking and replication. I clarified that stream offsets can be client-managed or server-stored and that streams use quorum replication rather than describing it simply as Raft consensus.

## Review Notes
The post is now technically aligned with current RabbitMQ 4.x documentation and `rabbitmq-stream-js-client` 1.0.0 APIs. Future updates should re-check `rabbitmqadmin` v2 flags and stream-client method signatures because both are actively maintained outside the RabbitMQ server release cadence.
