# How to Configure the RabbitMQ Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporters, RabbitMQ, Message Queue, AMQP, Event-Driven

Description: Learn how to configure the RabbitMQ exporter in the OpenTelemetry Collector to send telemetry data to RabbitMQ message queues for event-driven observability architectures.

The RabbitMQ exporter enables the OpenTelemetry Collector to send telemetry data to RabbitMQ message queues using the AMQP protocol. This capability is valuable for event-driven architectures where you want to process telemetry data asynchronously, integrate with existing message-based workflows, or build decoupled observability pipelines.

## Understanding the RabbitMQ Exporter

RabbitMQ is a widely-used message broker that implements the Advanced Message Queuing Protocol (AMQP). By exporting telemetry data to RabbitMQ, you can leverage its robust message delivery guarantees, flexible routing capabilities, and extensive ecosystem of consumers.

The RabbitMQ exporter publishes traces, metrics, and logs as messages to RabbitMQ exchanges. These messages can then be consumed by various systems for processing, storage, analysis, or forwarding. This architecture provides flexibility and scalability, allowing you to build sophisticated observability pipelines.

```mermaid
graph LR
    A[Applications] --> B[OTel Collector]
    B --> C[RabbitMQ Exporter]
    C --> D[RabbitMQ Exchange]
    D --> E[Queue 1: Analytics]
    D --> F[Queue 2: Alerting]
    D --> G[Queue 3: Storage]
    E --> H[Consumer 1]
    F --> I[Consumer 2]
    G --> J[Consumer 3]
    style C fill:#f9f,stroke:#333,stroke-width:4px
```

## Use Cases for RabbitMQ Export

The RabbitMQ exporter supports several important use cases:

**Asynchronous Processing**: Decouple telemetry collection from processing, allowing consumers to process data at their own pace without blocking the collector.

**Fan-Out Distribution**: Send telemetry data to multiple consumers simultaneously using RabbitMQ's exchange types and routing patterns.

**Buffer and Backpressure**: Use RabbitMQ as a buffer during traffic spikes or when downstream systems are temporarily unavailable.

**Integration with Legacy Systems**: Connect OpenTelemetry to existing message-based workflows and systems that consume from RabbitMQ.

**Event-Driven Alerting**: Trigger alerts or workflows based on specific telemetry patterns by routing messages to specialized consumers.

## Basic Configuration

Here is a basic configuration for exporting telemetry data to RabbitMQ:

```yaml
receivers:
  # Receive telemetry via OTLP
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Batch telemetry data
  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  # Configure RabbitMQ exporter
  rabbitmq:
    # RabbitMQ connection URL
    connection:
      endpoint: amqp://guest:guest@localhost:5672/
    # Exchange configuration
    exchange:
      name: telemetry
      type: topic
      durable: true
      auto_delete: false
    # Routing key for messages
    routing_key: otel.traces
    # Message encoding format
    encoding: json
    # Connection timeout
    timeout: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq]
```

This configuration connects to a local RabbitMQ instance and publishes trace data to a topic exchange named "telemetry" with the routing key "otel.traces". Messages are encoded in JSON format for easy consumption by downstream systems.

## Exchange Types and Routing

RabbitMQ supports several exchange types that determine how messages are routed to queues. Configure the appropriate exchange type for your use case:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # Direct exchange for single consumer
  rabbitmq/direct:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry-direct
      type: direct
      durable: true
    routing_key: traces
    encoding: json

  # Topic exchange for pattern-based routing
  rabbitmq/topic:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry-topic
      type: topic
      durable: true
    # Routing key with service name
    routing_key_template: "otel.traces.{{ .Resource.service.name }}"
    encoding: json

  # Fanout exchange for broadcasting
  rabbitmq/fanout:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry-fanout
      type: fanout
      durable: true
    # Routing key is ignored for fanout exchanges
    encoding: json

service:
  pipelines:
    traces/direct:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq/direct]

    traces/topic:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq/topic]

    traces/fanout:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq/fanout]
```

**Direct Exchange**: Routes messages to queues whose binding key exactly matches the routing key. Use this for single-consumer scenarios.

**Topic Exchange**: Routes messages based on pattern matching between the routing key and binding patterns. Use this when you need flexible routing based on message characteristics.

**Fanout Exchange**: Broadcasts messages to all bound queues, ignoring routing keys. Use this when multiple consumers need all messages.

## Secure Connection Configuration

For production environments, secure the connection to RabbitMQ using TLS and authentication:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  rabbitmq:
    connection:
      # Use AMQPS for TLS-encrypted connections
      endpoint: amqps://username:password@rabbitmq.example.com:5671/production
      # TLS configuration
      tls:
        insecure: false
        ca_file: /etc/ssl/certs/rabbitmq-ca.crt
        cert_file: /etc/ssl/certs/client.crt
        key_file: /etc/ssl/private/client.key
        server_name_override: rabbitmq.example.com
      # Connection settings
      connection_timeout: 30s
      heartbeat_interval: 60s
      # Channel prefetch count
      prefetch_count: 100
    exchange:
      name: telemetry
      type: topic
      durable: true
      auto_delete: false
    routing_key: otel.traces
    encoding: json
    # Message persistence
    delivery_mode: persistent
    # Confirm published messages
    confirm_mode: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq]
```

TLS encryption protects telemetry data in transit. The persistent delivery mode ensures messages survive RabbitMQ restarts, and confirm mode provides acknowledgment that messages were successfully published.

## Multiple Pipeline Configuration

Configure different exporters for different telemetry signals with appropriate routing:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch/traces:
    timeout: 10s
    send_batch_size: 512

  batch/metrics:
    timeout: 30s
    send_batch_size: 1024

  batch/logs:
    timeout: 10s
    send_batch_size: 512

exporters:
  # Traces to RabbitMQ
  rabbitmq/traces:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
      durable: true
    routing_key: otel.traces
    encoding: protobuf
    delivery_mode: persistent

  # Metrics to RabbitMQ
  rabbitmq/metrics:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
      durable: true
    routing_key: otel.metrics
    encoding: json
    delivery_mode: persistent

  # Logs to RabbitMQ
  rabbitmq/logs:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
      durable: true
    routing_key: otel.logs
    encoding: json
    delivery_mode: persistent

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch/traces]
      exporters: [rabbitmq/traces]

    metrics:
      receivers: [otlp]
      processors: [batch/metrics]
      exporters: [rabbitmq/metrics]

    logs:
      receivers: [otlp]
      processors: [batch/logs]
      exporters: [rabbitmq/logs]
```

Separate pipelines allow you to configure different batching strategies and routing keys for each signal type. Using Protocol Buffers encoding for traces reduces message size, while JSON encoding for metrics and logs provides easier consumption by downstream systems.

## Dynamic Routing with Message Attributes

Use message attributes and routing key templates to enable dynamic routing based on telemetry characteristics:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add routing attributes
  attributes:
    actions:
      - key: routing.service
        from_attribute: service.name
        action: upsert
      - key: routing.environment
        from_attribute: deployment.environment
        action: upsert
      - key: routing.severity
        from_attribute: severity
        action: upsert

  batch:
    timeout: 10s

exporters:
  rabbitmq:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
      durable: true
    # Dynamic routing key based on attributes
    routing_key_template: "otel.{{ .routing.environment }}.{{ .routing.service }}"
    encoding: json
    # Message headers from attributes
    headers:
      severity: "{{ .routing.severity }}"
      service: "{{ .routing.service }}"
      environment: "{{ .routing.environment }}"
    delivery_mode: persistent

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [rabbitmq]
```

This configuration creates routing keys like "otel.production.checkout-service" or "otel.staging.user-service", allowing consumers to subscribe to specific services or environments. Message headers provide additional metadata that consumers can use for filtering or processing.

## Message Encoding Options

The RabbitMQ exporter supports multiple encoding formats. Choose the format that best suits your consumers:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # JSON encoding for human readability
  rabbitmq/json:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
    routing_key: otel.traces.json
    encoding: json
    # Pretty print JSON (development only)
    json_indent: true

  # Protocol Buffers for efficiency
  rabbitmq/protobuf:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
    routing_key: otel.traces.protobuf
    encoding: protobuf

  # MessagePack for compact binary
  rabbitmq/messagepack:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
    routing_key: otel.traces.msgpack
    encoding: messagepack

service:
  pipelines:
    traces/json:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq/json]

    traces/protobuf:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq/protobuf]

    traces/messagepack:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq/messagepack]
```

**JSON**: Human-readable, easy to debug, larger message size.

**Protocol Buffers**: Efficient binary format, smaller message size, requires schema knowledge.

**MessagePack**: Compact binary format, good balance between size and compatibility.

## High Availability Configuration

Configure the exporter for high availability with connection pooling and cluster support:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  rabbitmq:
    connection:
      # Multiple RabbitMQ cluster nodes
      endpoints:
        - amqp://user:password@rabbitmq-1.example.com:5672/
        - amqp://user:password@rabbitmq-2.example.com:5672/
        - amqp://user:password@rabbitmq-3.example.com:5672/
      # Connection pool settings
      connection_pool:
        max_connections: 10
        max_channels_per_connection: 100
      # Reconnection settings
      reconnect:
        enabled: true
        initial_interval: 1s
        max_interval: 30s
        max_elapsed_time: 300s
      # Heartbeat for connection health
      heartbeat_interval: 60s
    exchange:
      name: telemetry
      type: topic
      durable: true
    routing_key: otel.traces
    encoding: json
    delivery_mode: persistent
    confirm_mode: true
    # Retry failed publishes
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq]
```

Multiple RabbitMQ endpoints provide failover capability. The exporter automatically connects to an available node if the current connection fails. Connection pooling improves throughput by maintaining multiple connections and channels.

## Message Priority and TTL

Configure message priority and time-to-live for fine-grained control over message handling:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add priority attribute based on severity
  transform:
    trace_statements:
      - context: span
        statements:
          - set(attributes["message.priority"], 5) where severity_number >= 17
          - set(attributes["message.priority"], 3) where severity_number < 17 and severity_number >= 13
          - set(attributes["message.priority"], 1) where severity_number < 13

  batch:
    timeout: 10s

exporters:
  rabbitmq:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
      durable: true
      # Enable priority queue support
      arguments:
        x-max-priority: 10
    routing_key: otel.traces
    encoding: json
    # Message priority from attribute
    priority_template: "{{ .attributes.message.priority }}"
    # Message time-to-live (milliseconds)
    ttl: 3600000  # 1 hour
    # Expiration template for dynamic TTL
    expiration_template: "{{ .attributes.message.ttl }}"
    delivery_mode: persistent

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform, batch]
      exporters: [rabbitmq]
```

Message priority ensures that critical telemetry data is processed before lower-priority messages. TTL prevents old messages from accumulating in queues by automatically expiring them after a specified time.

## Consumer Example

Here is a Python example of consuming telemetry data from RabbitMQ:

```python
import pika
import json

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='rabbitmq.example.com',
        port=5672,
        credentials=pika.PlainCredentials('user', 'password')
    )
)
channel = connection.channel()

# Declare exchange (should match exporter configuration)
channel.exchange_declare(
    exchange='telemetry',
    exchange_type='topic',
    durable=True
)

# Declare queue
channel.queue_declare(queue='traces-consumer', durable=True)

# Bind queue to exchange with routing pattern
channel.queue_bind(
    exchange='telemetry',
    queue='traces-consumer',
    routing_key='otel.traces.#'
)

# Process messages
def callback(ch, method, properties, body):
    try:
        # Parse JSON message
        trace_data = json.loads(body)

        # Process trace data
        print(f"Received trace: {trace_data}")

        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Error processing message: {e}")
        # Reject and requeue message
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

# Start consuming
channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue='traces-consumer', on_message_callback=callback)

print('Waiting for messages...')
channel.start_consuming()
```

This consumer connects to RabbitMQ, subscribes to trace messages, and processes them. The routing pattern "otel.traces.#" matches all trace messages regardless of service or environment.

## Monitoring and Performance

Monitor the RabbitMQ exporter to ensure reliable message delivery:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  rabbitmq:
    connection:
      endpoint: amqp://user:password@rabbitmq.example.com:5672/
    exchange:
      name: telemetry
      type: topic
      durable: true
    routing_key: otel.traces
    encoding: json

  # Export collector metrics
  prometheus:
    endpoint: "0.0.0.0:8888"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [rabbitmq]

  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: ":8888"
```

Monitor these key metrics:

- Messages published and failed counts
- Connection status and reconnections
- Publish confirmation latency
- Queue depth and consumer lag (from RabbitMQ management API)

For more details on collector monitoring, see our guide on [monitoring the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-google-cloud-monitoring-receiver-opentelemetry-collector/view).

## Best Practices

Follow these best practices when using the RabbitMQ exporter:

**Use Durable Exchanges and Queues**: Ensure messages survive RabbitMQ restarts by making exchanges and queues durable.

**Enable Persistent Delivery**: Set delivery mode to persistent for critical telemetry data.

**Configure Confirm Mode**: Use publisher confirms to ensure messages are successfully written to disk.

**Implement Connection Pooling**: Use multiple connections and channels for better throughput.

**Set Appropriate TTL**: Prevent unbounded queue growth by setting message expiration times.

**Monitor Queue Depth**: Track queue sizes to detect consumer lag or processing bottlenecks.

**Secure Connections**: Use TLS encryption and strong authentication in production environments.

**Choose the Right Exchange Type**: Select exchange types and routing patterns that match your distribution requirements.

## Integration with Event-Driven Architectures

The RabbitMQ exporter enables integration with event-driven observability systems. For more information on building event-driven observability pipelines, see our posts on [OpenTelemetry architecture patterns](https://oneuptime.com/blog/post/2026-02-06-what-opentelemetry-does-not-do/view) and [asynchronous telemetry processing](https://oneuptime.com/blog/post/2026-02-13-asynchronous-telemetry-processing/view).

## Conclusion

The RabbitMQ exporter enables powerful event-driven observability architectures by publishing telemetry data to message queues. This approach provides flexibility, scalability, and resilience through asynchronous processing, message persistence, and sophisticated routing capabilities.

Configure the exporter based on your architecture requirements, choosing appropriate exchange types, encoding formats, and reliability settings. With proper configuration and monitoring, the RabbitMQ exporter becomes a valuable component for building decoupled, scalable observability systems that integrate seamlessly with message-based workflows and event-driven applications.
