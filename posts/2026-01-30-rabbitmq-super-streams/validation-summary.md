# Validation Summary: How to Create RabbitMQ Super Streams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ Streams and Super Streams
- `rabbitmq-streams` and `rabbitmqctl` CLI tools
- RabbitMQ Stream Java client (`com.rabbitmq.stream.*`)
- Python `pika` AMQP client (for the order-processing example)
- RabbitMQ policies (`set_policy`)
- Mermaid diagrams (for architecture illustrations)

## Sources Consulted
- [RabbitMQ Streams and Superstreams docs](https://www.rabbitmq.com/docs/streams)
- [`rabbitmq-streams(8)` man page](https://www.rabbitmq.com/docs/man/rabbitmq-streams.8) and the [Arch mirror](https://man.archlinux.org/man/rabbitmq-streams.8.en)
- [RabbitMQ 3.11 Feature Preview: Super Streams](https://www.rabbitmq.com/blog/2022/07/13/rabbitmq-3-11-feature-preview-super-streams)
- [RabbitMQ Stream Java Client docs](https://rabbitmq.github.io/rabbitmq-stream-java-client/stable/htmlsingle/)
- [`ProducerBuilder` Javadoc](https://rabbitmq.github.io/rabbitmq-stream-java-client/stable/api/com/rabbitmq/stream/ProducerBuilder.html)
- [`ProducerBuilder.RoutingConfiguration` Javadoc](https://rabbitmq.github.io/rabbitmq-stream-java-client/stable/api/com/rabbitmq/stream/ProducerBuilder.RoutingConfiguration.html)
- [RabbitMQ HTTP API Reference](https://www.rabbitmq.com/docs/http-api-reference)

## Issues Found

1. **Non-existent HTTP API endpoint.** The "Using the Management HTTP API" section showed a `PUT /api/stream/super-streams/{name}` call. The official RabbitMQ HTTP API has no super-stream creation endpoint; the stream-related endpoints listed in the HTTP API reference are all `GET`/`DELETE` for connections, publishers and consumers. The misleading section was removed.

2. **Non-existent CLI command `rabbitmq-streams list_super_streams`.** The `rabbitmq-streams` tool exposes `add_super_stream` and `delete_super_stream`, but no `list_super_streams`. Replaced the verification step with `rabbitmqctl list_exchanges`/`list_queues` filtering by the super-stream name, which is what users actually use.

3. **Wrong flag name `--routing-keys`.** The `add_super_stream` flag for named partitions is `--binding-keys`, per the man page. Updated all usages.

4. **Wrong `list_stream_consumers --super-stream` flag.** This subcommand only accepts `-p <vhost>` and an optional info-item list — there is no `--super-stream` filter. Replaced with `--formatter pretty_table | grep orders`.

5. **Invalid stream policy key `max-segment-size`.** Stream policies use `stream-max-segment-size-bytes` (numeric bytes), not `max-segment-size` with a size suffix like `"500mb"`. Updated both policy snippets to use the correct key and a numeric byte value.

6. **Broken Mermaid edge between subgraphs ("Before Scaling" → "After Scaling").** Mermaid cannot use quoted multi-word subgraph titles as edge endpoints. Gave the subgraphs explicit IDs (`BEFORE`/`AFTER`) and used those IDs in the connecting edge so the diagram renders.

7. **Python consumer would fail at runtime against a stream queue.** Consuming from a stream via AMQP 0-9-1 requires (a) a non-zero `basic_qos` prefetch and (b) an `x-stream-offset` consumer argument. Without these, `basic_consume` is rejected by the broker. Added `basic_qos(prefetch_count=100)` and `arguments={'x-stream-offset': 'first'}`.

8. **`method.delivery_tag` printed as the partition name.** The consumer was constructing a `partition` variable but then printing `method.delivery_tag` (an integer). Switched to printing the partition (derived from `method.exchange`, which is the super-stream exchange the message came in on).

9. **`--max-age PT24H` CLI value.** Changed to `24h` to match the format documented for stream retention values; ISO-8601 durations are not the documented form here.

## Review Notes
- The Java Stream client API used in the producer/consumer examples (`environment.producerBuilder().superStream(...).routing(...).producerBuilder().build()`, `singleActiveConsumer()`, `consumerUpdateListener(...)`, `OffsetSpecification.*`, `storeOffset()`) matches the current public API of `com.rabbitmq.stream.*` and was left as-is.
- The post mixes the native Stream protocol (Java client, port 5552) with AMQP 0-9-1 access (Python `pika`) without explicitly calling out the protocol difference. The Python example does work against the partition streams (after the QoS / `x-stream-offset` fixes) but loses super-stream features like single-active-consumer coordination, which are only available through stream-protocol clients. A future revision could call this out or switch the Python example to `rstream`/`rabbitmq-stream-python-client`.
- The claim that RabbitMQ cannot dynamically grow a super stream is still accurate as of mid-2026; partition count is fixed at creation time.
- The default routing strategy is 32-bit MurmurHash3 over the routing key, as the post describes.
