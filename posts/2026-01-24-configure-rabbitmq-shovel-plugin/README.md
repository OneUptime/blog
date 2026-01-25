# How to Configure RabbitMQ Shovel Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Message Queue, Shovel, Data Replication, Distributed Systems

Description: A comprehensive guide to configuring the RabbitMQ Shovel plugin for reliable message transfer between brokers.

---

The RabbitMQ Shovel plugin is a powerful tool for moving messages between RabbitMQ brokers. It enables reliable message transfer across different data centers, handles network partitions gracefully, and supports various use cases like data migration, load distribution, and disaster recovery. This guide walks you through configuring and optimizing the Shovel plugin for production environments.

## Understanding the Shovel Plugin

The Shovel plugin creates a reliable message forwarding mechanism between queues, which can be on the same broker or different brokers entirely. Unlike federation, which is designed for loose coupling, Shovel provides a more direct and configurable approach to message movement.

```mermaid
flowchart LR
    subgraph Source["Source Broker (DC1)"]
        SQ[Source Queue]
    end

    subgraph Shovel["Shovel Plugin"]
        direction TB
        C[Consumer] --> P[Publisher]
    end

    subgraph Dest["Destination Broker (DC2)"]
        DQ[Destination Queue]
    end

    SQ --> C
    P --> DQ
```

## Prerequisites

Before configuring the Shovel plugin, ensure you have the following:

- RabbitMQ 3.8 or later installed
- Administrative access to the RabbitMQ management interface
- Network connectivity between source and destination brokers

## Enabling the Shovel Plugin

First, enable the Shovel plugin on your RabbitMQ server.

```bash
# Enable the shovel plugin
rabbitmq-plugins enable rabbitmq_shovel

# Enable the management interface for shovel (optional but recommended)
rabbitmq-plugins enable rabbitmq_shovel_management

# Verify the plugins are enabled
rabbitmq-plugins list | grep shovel
```

Expected output:
```
[E*] rabbitmq_shovel                   3.12.0
[E*] rabbitmq_shovel_management        3.12.0
```

## Static Shovel Configuration

Static shovels are defined in the RabbitMQ configuration file and persist across broker restarts. They are ideal for permanent message routing requirements.

### Basic Configuration

Create or edit the RabbitMQ configuration file (typically at `/etc/rabbitmq/rabbitmq.conf` for the new format or `/etc/rabbitmq/advanced.config` for advanced settings).

```erlang
%% advanced.config - Static shovel configuration
[
  {rabbitmq_shovel, [
    {shovels, [
      %% Define a shovel named 'orders_shovel'
      {orders_shovel, [
        %% Source configuration
        {source, [
          {protocol, amqp091},
          {uris, ["amqp://user:password@source-broker:5672"]},
          {declarations, [
            %% Declare the source queue if it doesn't exist
            {'queue.declare', [{queue, <<"orders_queue">>}, {durable, true}]}
          ]},
          {queue, <<"orders_queue">>},
          %% Acknowledge messages after successful publish
          {prefetch_count, 100}
        ]},

        %% Destination configuration
        {destination, [
          {protocol, amqp091},
          {uris, ["amqp://user:password@dest-broker:5672"]},
          {declarations, [
            %% Declare destination exchange and queue
            {'exchange.declare', [{exchange, <<"orders_exchange">>}, {type, <<"direct">>}, {durable, true}]},
            {'queue.declare', [{queue, <<"orders_backup">>}, {durable, true}]},
            {'queue.bind', [{queue, <<"orders_backup">>}, {exchange, <<"orders_exchange">>}, {routing_key, <<"order">>}]}
          ]},
          {publish_properties, [{delivery_mode, 2}]},
          {publish_fields, [{exchange, <<"orders_exchange">>}, {routing_key, <<"order">>}]}
        ]},

        %% Acknowledgement mode: on-confirm ensures messages are confirmed before ack
        {ack_mode, on_confirm},

        %% Reconnect delay in seconds
        {reconnect_delay, 5}
      ]}
    ]}
  ]}
].
```

### Configuration Options Explained

| Option | Description | Recommended Value |
|--------|-------------|-------------------|
| `ack_mode` | When to acknowledge messages | `on_confirm` for reliability |
| `prefetch_count` | Messages to prefetch | 100-1000 depending on message size |
| `reconnect_delay` | Seconds between reconnection attempts | 5-30 seconds |
| `delete_after` | Delete shovel after N messages | `never` for continuous operation |

## Dynamic Shovel Configuration

Dynamic shovels can be created, modified, and deleted at runtime using the management API or CLI. They are stored in the RabbitMQ database and survive broker restarts.

### Using rabbitmqctl

```bash
# Create a dynamic shovel using rabbitmqctl
rabbitmqctl set_parameter shovel events_shovel '{
  "src-protocol": "amqp091",
  "src-uri": "amqp://user:password@source-broker:5672",
  "src-queue": "events",
  "src-prefetch-count": 100,
  "dest-protocol": "amqp091",
  "dest-uri": "amqp://user:password@dest-broker:5672",
  "dest-exchange": "events_exchange",
  "dest-exchange-key": "event",
  "ack-mode": "on-confirm",
  "reconnect-delay": 5
}'

# List all configured shovels
rabbitmqctl list_parameters -p / --formatter=json | jq '.[] | select(.component == "shovel")'

# Delete a dynamic shovel
rabbitmqctl clear_parameter shovel events_shovel
```

### Using the HTTP API

```bash
# Create a shovel via HTTP API
curl -u admin:password -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/parameters/shovel/%2f/logs_shovel \
  -d '{
    "value": {
      "src-protocol": "amqp091",
      "src-uri": "amqp://user:password@source-broker:5672",
      "src-queue": "application_logs",
      "src-prefetch-count": 500,
      "dest-protocol": "amqp091",
      "dest-uri": "amqp://user:password@dest-broker:5672",
      "dest-queue": "logs_archive",
      "ack-mode": "on-confirm",
      "reconnect-delay": 10
    }
  }'

# Check shovel status
curl -u admin:password \
  http://localhost:15672/api/shovels/%2f/logs_shovel
```

## Advanced Configuration Patterns

### Multi-Destination Shovel

For scenarios requiring message replication to multiple destinations, configure multiple shovels from the same source.

```mermaid
flowchart TD
    subgraph Source["Source Broker"]
        SQ[Orders Queue]
    end

    subgraph Shovels["Shovel Workers"]
        S1[Shovel 1]
        S2[Shovel 2]
        S3[Shovel 3]
    end

    subgraph Destinations["Destination Brokers"]
        D1[Analytics Broker]
        D2[Archive Broker]
        D3[Backup Broker]
    end

    SQ --> S1
    SQ --> S2
    SQ --> S3
    S1 --> D1
    S2 --> D2
    S3 --> D3
```

```erlang
%% Multiple shovels from same source
[
  {rabbitmq_shovel, [
    {shovels, [
      %% Shovel to analytics
      {orders_to_analytics, [
        {source, [
          {uris, ["amqp://user:pass@source:5672"]},
          {queue, <<"orders">>}
        ]},
        {destination, [
          {uris, ["amqp://user:pass@analytics:5672"]},
          {queue, <<"orders_analytics">>}
        ]},
        {ack_mode, on_confirm}
      ]},

      %% Shovel to archive
      {orders_to_archive, [
        {source, [
          {uris, ["amqp://user:pass@source:5672"]},
          {queue, <<"orders">>}
        ]},
        {destination, [
          {uris, ["amqp://user:pass@archive:5672"]},
          {queue, <<"orders_archive">>}
        ]},
        {ack_mode, on_confirm}
      ]}
    ]}
  ]}
].
```

### Shovel with Message Transformation

Use the `dest-add-forward-headers` option to add metadata about the message origin.

```bash
# Shovel with forward headers
rabbitmqctl set_parameter shovel transform_shovel '{
  "src-protocol": "amqp091",
  "src-uri": "amqp://user:password@source:5672",
  "src-queue": "raw_events",
  "dest-protocol": "amqp091",
  "dest-uri": "amqp://user:password@dest:5672",
  "dest-queue": "processed_events",
  "dest-add-forward-headers": true,
  "dest-add-timestamp-header": true,
  "ack-mode": "on-confirm"
}'
```

### High Availability Configuration

For production environments, configure multiple URIs for failover support.

```erlang
%% HA Shovel configuration with multiple URIs
{ha_shovel, [
  {source, [
    {protocol, amqp091},
    %% Multiple source URIs for failover
    {uris, [
      "amqp://user:pass@source-node1:5672",
      "amqp://user:pass@source-node2:5672",
      "amqp://user:pass@source-node3:5672"
    ]},
    {queue, <<"critical_events">>},
    {prefetch_count, 200}
  ]},
  {destination, [
    {protocol, amqp091},
    %% Multiple destination URIs for failover
    {uris, [
      "amqp://user:pass@dest-node1:5672",
      "amqp://user:pass@dest-node2:5672"
    ]},
    {queue, <<"critical_events_backup">>}
  ]},
  {ack_mode, on_confirm},
  {reconnect_delay, 2}
]}
```

## Monitoring Shovel Status

### Using the Management UI

Navigate to `Admin > Shovel Status` in the RabbitMQ Management UI to view:

- Current shovel state (running, starting, terminated)
- Messages transferred
- Source and destination connection status

### Using the CLI

```bash
# Get shovel status
rabbitmqctl shovel_status

# Sample output format
# Name          | Type    | State   | Source                | Destination
# orders_shovel | dynamic | running | amqp://source:5672    | amqp://dest:5672

# Get detailed status via API
curl -u admin:password http://localhost:15672/api/shovels | jq '.'
```

### Prometheus Metrics

If you have the Prometheus plugin enabled, shovel metrics are automatically exported.

```yaml
# Example Prometheus alert for shovel failures
groups:
  - name: rabbitmq_shovel
    rules:
      - alert: RabbitMQShovelDown
        expr: rabbitmq_shovel_state{state!="running"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ Shovel {{ $labels.name }} is not running"
          description: "Shovel has been in {{ $labels.state }} state for more than 5 minutes"
```

## Troubleshooting Common Issues

### Connection Failures

```bash
# Check connectivity to destination broker
rabbitmqctl eval 'net_adm:ping('\''dest-broker@hostname'\'').'

# Verify credentials
rabbitmqctl authenticate_user <username> <password>

# Check TLS configuration if using amqps
openssl s_client -connect dest-broker:5671 -CAfile /path/to/ca.pem
```

### Message Loss Prevention

```mermaid
flowchart TD
    A[Message Published] --> B{Shovel Connected?}
    B -->|Yes| C[Forward to Destination]
    B -->|No| D[Message Stays in Queue]
    C --> E{Destination Confirms?}
    E -->|Yes| F[Acknowledge Source]
    E -->|No| G[Retry with Backoff]
    G --> C
    D --> H[Reconnect Attempt]
    H --> B
```

To prevent message loss:

1. Always use `ack_mode: on_confirm`
2. Configure destination queues as durable
3. Set appropriate `prefetch_count` to avoid memory issues
4. Monitor shovel status continuously

### Performance Tuning

```erlang
%% Optimized shovel for high throughput
{high_throughput_shovel, [
  {source, [
    {uris, ["amqp://user:pass@source:5672"]},
    {queue, <<"high_volume_queue">>},
    %% Increase prefetch for better throughput
    {prefetch_count, 1000}
  ]},
  {destination, [
    {uris, ["amqp://user:pass@dest:5672"]},
    {queue, <<"high_volume_dest">>},
    %% Batch publish for efficiency
    {publish_properties, [{delivery_mode, 2}]}
  ]},
  %% Use no-ack for maximum throughput (less reliable)
  %% {ack_mode, no_ack},
  %% Or use on-publish for balance
  {ack_mode, on_publish},
  {reconnect_delay, 1}
]}
```

## Security Best Practices

### TLS Configuration

```erlang
%% Shovel with TLS
{secure_shovel, [
  {source, [
    {protocol, amqp091},
    {uris, ["amqps://user:pass@source:5671?cacertfile=/path/ca.pem&certfile=/path/cert.pem&keyfile=/path/key.pem&verify=verify_peer"]},
    {queue, <<"secure_queue">>}
  ]},
  {destination, [
    {protocol, amqp091},
    {uris, ["amqps://user:pass@dest:5671?cacertfile=/path/ca.pem&certfile=/path/cert.pem&keyfile=/path/key.pem&verify=verify_peer"]},
    {queue, <<"secure_dest">>}
  ]},
  {ack_mode, on_confirm}
]}
```

### Credential Management

Instead of embedding credentials in configuration, use environment variables or a secrets manager.

```bash
# Using environment variables with dynamic shovel
export RABBITMQ_SOURCE_URI="amqp://user:${SOURCE_PASS}@source:5672"
export RABBITMQ_DEST_URI="amqp://user:${DEST_PASS}@dest:5672"

# Create shovel with environment variables
rabbitmqctl set_parameter shovel secure_shovel "{
  \"src-uri\": \"${RABBITMQ_SOURCE_URI}\",
  \"src-queue\": \"secure_queue\",
  \"dest-uri\": \"${RABBITMQ_DEST_URI}\",
  \"dest-queue\": \"secure_dest\",
  \"ack-mode\": \"on-confirm\"
}"
```

## Summary

The RabbitMQ Shovel plugin is an essential tool for reliable message transfer between brokers. Key takeaways:

1. Use static configuration for permanent routing needs
2. Use dynamic configuration for flexible, runtime-adjustable shovels
3. Always configure `ack_mode: on_confirm` for reliability
4. Set up proper monitoring and alerting for shovel status
5. Use TLS for secure communication between brokers
6. Configure multiple URIs for high availability

With proper configuration and monitoring, the Shovel plugin enables robust cross-datacenter message replication and disaster recovery scenarios.
