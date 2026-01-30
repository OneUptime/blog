# How to Build RabbitMQ Federation Topologies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RabbitMQ, Federation, Messaging, Architecture

Description: Configure RabbitMQ federation for multi-datacenter messaging with exchange and queue federation across geographically distributed clusters.

---

RabbitMQ federation allows you to connect multiple brokers across different datacenters or cloud regions. Unlike clustering, federation works over unreliable links and does not require full mesh connectivity. This makes it perfect for geographically distributed systems where you need message replication without the overhead of a full cluster.

In this guide, we will walk through setting up federation from scratch, configuring exchange and queue federation, and troubleshooting common issues.

## Understanding Federation vs Clustering

Before diving into configuration, let's clarify when to use federation versus clustering.

| Feature | Federation | Clustering |
|---------|-----------|------------|
| Network Requirements | Works over WAN, tolerates latency | Requires low-latency LAN |
| Message Replication | On-demand, pull-based | Full synchronization |
| Topology | Loose coupling, flexible | Tight coupling, full mesh |
| Use Case | Multi-datacenter, cross-region | High availability within datacenter |
| Failure Handling | Continues operating independently | Requires partition handling |
| Configuration | Per-exchange or per-queue policies | Cluster-wide settings |

Federation is ideal when you need to:

- Connect brokers across datacenters with high latency
- Share specific exchanges or queues between independent brokers
- Build hub-and-spoke or mesh topologies
- Maintain independent broker operations during network partitions

## Prerequisites

You will need:

- Two or more RabbitMQ servers (version 3.8 or later recommended)
- Network connectivity between servers on port 5672 (AMQP) or 5671 (AMQPS)
- Administrative access to all RabbitMQ instances
- Basic familiarity with RabbitMQ concepts (exchanges, queues, bindings)

## Installing the Federation Plugin

The federation plugin ships with RabbitMQ but is not enabled by default. Enable it on all nodes that will participate in federation.

Run this command on each RabbitMQ server to enable the federation plugin and its management interface:

```bash
# Enable the federation plugin
rabbitmq-plugins enable rabbitmq_federation

# Enable the management UI extension for federation
rabbitmq-plugins enable rabbitmq_federation_management

# Verify the plugins are enabled
rabbitmq-plugins list | grep federation
```

You should see output similar to:

```
[E*] rabbitmq_federation               3.12.0
[E*] rabbitmq_federation_management    3.12.0
```

The `E` indicates the plugin is explicitly enabled, and the `*` shows it is currently running.

## Federation Terminology

Understanding the terminology helps when configuring federation:

| Term | Definition |
|------|------------|
| Upstream | The remote broker that messages are pulled from |
| Downstream | The local broker that receives federated messages |
| Federation Link | The connection between upstream and downstream |
| Policy | Rules that determine which exchanges or queues are federated |

Messages flow from upstream to downstream. A single broker can be both an upstream and downstream in different relationships, enabling complex topologies.

## Setting Up Upstream Connections

The first step is defining upstream servers. This tells your local broker how to connect to remote brokers.

### Basic Upstream Configuration

Create an upstream definition using the `rabbitmqctl` command. This example creates an upstream named "datacenter-east" pointing to a remote broker:

```bash
# Set an upstream definition
# Replace the URI with your actual upstream server address
rabbitmqctl set_parameter federation-upstream datacenter-east \
  '{"uri":"amqp://federation_user:secure_password@east.example.com:5672","expires":3600000}'
```

The parameters explained:

- `uri`: Connection string to the upstream broker
- `expires`: Time in milliseconds before unused links are closed (1 hour in this example)

### Upstream Configuration with TLS

For production environments, always use TLS. Here is a secure upstream configuration:

```bash
# Configure upstream with TLS
rabbitmqctl set_parameter federation-upstream datacenter-east \
  '{
    "uri": "amqps://federation_user:secure_password@east.example.com:5671",
    "expires": 3600000,
    "message-ttl": 86400000,
    "trust-user-id": false,
    "ack-mode": "on-confirm"
  }'
```

Additional parameters:

| Parameter | Description | Recommended Value |
|-----------|-------------|-------------------|
| message-ttl | Maximum age of federated messages in ms | 86400000 (24 hours) |
| trust-user-id | Trust the user-id header from upstream | false for security |
| ack-mode | When to acknowledge messages | on-confirm for reliability |

### Creating a Dedicated Federation User

Create a user specifically for federation with minimal required permissions:

```bash
# On the upstream server, create a federation user
rabbitmqctl add_user federation_user secure_random_password

# Grant configure, write, and read permissions on the virtual host
rabbitmqctl set_permissions -p "/" federation_user "^federation\\..*" ".*" ".*"

# Set user tags (no management access needed)
rabbitmqctl set_user_tags federation_user
```

This user can:
- Configure resources matching the pattern `^federation\..*`
- Write to any exchange
- Read from any queue

## Configuring Upstream Sets

When you have multiple upstream servers, group them into upstream sets for easier policy management.

Create an upstream set that includes multiple datacenters:

```bash
# Define individual upstreams first
rabbitmqctl set_parameter federation-upstream dc-east \
  '{"uri":"amqps://fed:pass@east.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream dc-west \
  '{"uri":"amqps://fed:pass@west.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream dc-europe \
  '{"uri":"amqps://fed:pass@europe.example.com:5671"}'

# Create an upstream set containing all datacenters
rabbitmqctl set_parameter federation-upstream-set all-datacenters \
  '[{"upstream":"dc-east"},{"upstream":"dc-west"},{"upstream":"dc-europe"}]'
```

## Exchange Federation

Exchange federation replicates messages published to an exchange on the upstream to a matching exchange on the downstream.

### How Exchange Federation Works

1. A policy on the downstream marks an exchange as federated
2. The downstream creates a queue on the upstream bound to the upstream exchange
3. Messages published to the upstream exchange are copied to this queue
4. The federation link transfers messages to the downstream exchange
5. Messages are then routed normally on the downstream

### Creating a Federated Exchange

First, declare the exchange on both the upstream and downstream servers. The exchange must exist on both sides with compatible settings:

```bash
# On upstream server - create the exchange
rabbitmqadmin declare exchange name=events type=topic durable=true

# On downstream server - create the matching exchange
rabbitmqadmin declare exchange name=events type=topic durable=true
```

Now create a federation policy on the downstream server to federate this exchange:

```bash
# Create a policy that federates exchanges matching the pattern "events"
rabbitmqctl set_policy federate-events \
  "^events$" \
  '{"federation-upstream-set":"all-datacenters"}' \
  --priority 10 \
  --apply-to exchanges
```

Policy parameters:

- `federate-events`: Name of the policy
- `^events$`: Regex pattern matching exchange names
- `federation-upstream-set`: Which upstreams to federate with
- `--priority 10`: Policy priority (higher wins)
- `--apply-to exchanges`: Apply only to exchanges

### Verifying Exchange Federation

Check the federation status through the management API or CLI:

```bash
# List all federation links
rabbitmqctl eval 'rabbit_federation_status:status().'

# Using the HTTP API
curl -u admin:password http://localhost:15672/api/federation-links
```

A healthy federation link shows status `running`. You should see output like:

```json
[
  {
    "node": "rabbit@downstream",
    "exchange": "events",
    "upstream_exchange": "events",
    "type": "exchange",
    "vhost": "/",
    "upstream": "dc-east",
    "status": "running",
    "local_connection": "<rabbit@downstream.1.2.3.4:5672>"
  }
]
```

### Testing Exchange Federation

Publish a message to the upstream and verify it arrives downstream:

```bash
# On upstream - publish a test message
rabbitmqadmin publish exchange=events routing_key=test.federation \
  payload='{"test":"federation works"}'

# On downstream - create a queue and bind it to receive messages
rabbitmqadmin declare queue name=federation-test durable=false
rabbitmqadmin declare binding source=events destination=federation-test \
  routing_key="test.#"

# Consume the message
rabbitmqadmin get queue=federation-test count=1
```

## Queue Federation

Queue federation distributes messages across queues with the same name on different brokers. Unlike exchange federation, queue federation provides load distribution rather than replication.

### How Queue Federation Works

1. A policy on the downstream marks a queue as federated
2. When the downstream queue has available consumers but no local messages, it pulls from upstream
3. Messages are consumed from the upstream queue and transferred to downstream
4. This provides active-active consumption across datacenters

### When to Use Queue Federation

| Scenario | Exchange Federation | Queue Federation |
|----------|---------------------|------------------|
| Replicate messages to multiple sites | Yes | No |
| Distribute work across sites | No | Yes |
| Both sites need all messages | Yes | No |
| Load balancing consumers | No | Yes |
| Disaster recovery | Yes | Yes |

### Creating a Federated Queue

Declare the queue on both servers, then apply a federation policy on the downstream:

```bash
# On upstream - create the queue
rabbitmqadmin declare queue name=work-queue durable=true

# On downstream - create the matching queue
rabbitmqadmin declare queue name=work-queue durable=true

# On downstream - create federation policy for queues
rabbitmqctl set_policy federate-work-queue \
  "^work-queue$" \
  '{"federation-upstream-set":"all-datacenters"}' \
  --priority 10 \
  --apply-to queues
```

### Queue Federation with Consumer Priorities

Control which datacenter processes messages first using consumer priorities. This example shows how to configure a Python consumer that prefers local messages:

```python
#!/usr/bin/env python3
"""
Queue federation consumer with priority settings.
Messages are consumed locally first, then pulled from upstream when local queue is empty.
"""

import pika

# Connection parameters
connection_params = pika.ConnectionParameters(
    host='localhost',
    port=5672,
    credentials=pika.PlainCredentials('app_user', 'app_password'),
    # Heartbeat keeps the connection alive during idle periods
    heartbeat=60
)

connection = pika.BlockingConnection(connection_params)
channel = connection.channel()

def process_message(ch, method, properties, body):
    """Process incoming work items."""
    print(f"Processing: {body.decode()}")
    # Simulate work
    # ... your processing logic here ...
    # Acknowledge after successful processing
    ch.basic_ack(delivery_tag=method.delivery_tag)

# Set prefetch to control how many messages are pulled at once
# Lower values mean more responsive federation pulling
channel.basic_qos(prefetch_count=10)

# Start consuming with x-priority argument
# Higher priority consumers receive messages first
channel.basic_consume(
    queue='work-queue',
    on_message_callback=process_message,
    arguments={'x-priority': 10}  # High priority for local consumer
)

print('Waiting for messages. Press CTRL+C to exit.')
channel.start_consuming()
```

## Federation Policies in Depth

Policies control which resources are federated and how. Understanding policy patterns helps you build flexible topologies.

### Policy Pattern Examples

Common patterns for matching exchanges and queues:

```bash
# Federate all exchanges starting with "shared."
rabbitmqctl set_policy federate-shared \
  "^shared\\..*" \
  '{"federation-upstream":"dc-east"}' \
  --apply-to exchanges

# Federate all queues ending with ".federated"
rabbitmqctl set_policy federate-queues \
  ".*\\.federated$" \
  '{"federation-upstream":"dc-east"}' \
  --apply-to queues

# Federate everything (use with caution)
rabbitmqctl set_policy federate-all \
  ".*" \
  '{"federation-upstream":"dc-east"}' \
  --apply-to all
```

### Combining Federation with Other Policies

Policies can include multiple definitions. This example combines federation with high availability settings:

```bash
# Federated exchange with additional settings
rabbitmqctl set_policy ha-federated \
  "^ha\\..*" \
  '{
    "federation-upstream-set": "all-datacenters",
    "ha-mode": "exactly",
    "ha-params": 2,
    "ha-sync-mode": "automatic"
  }' \
  --priority 20 \
  --apply-to all
```

### Policy Priority and Conflicts

When multiple policies match a resource, the highest priority wins. Plan your priorities carefully:

| Priority Range | Use Case |
|---------------|----------|
| 0-10 | Default policies |
| 11-50 | Standard federation policies |
| 51-100 | Override policies for specific resources |

## Building Federation Topologies

Federation supports various topologies. Choose based on your requirements.

### Hub and Spoke Topology

A central hub receives messages from multiple regional spokes:

```
    [Spoke-East] ----\
                      \
    [Spoke-West] ------> [Central Hub]
                      /
    [Spoke-Europe] --/
```

Configuration on the hub (downstream):

```bash
# Hub receives from all spokes
rabbitmqctl set_parameter federation-upstream spoke-east \
  '{"uri":"amqps://fed:pass@east.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream spoke-west \
  '{"uri":"amqps://fed:pass@west.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream spoke-europe \
  '{"uri":"amqps://fed:pass@europe.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream-set all-spokes \
  '[{"upstream":"spoke-east"},{"upstream":"spoke-west"},{"upstream":"spoke-europe"}]'

rabbitmqctl set_policy hub-federation \
  "^regional\\..*" \
  '{"federation-upstream-set":"all-spokes"}' \
  --apply-to exchanges
```

### Bidirectional (Mesh) Topology

Each broker federates with every other broker for full message distribution:

```
    [DC-East] <-----> [DC-West]
        ^                ^
        |                |
        v                v
    [DC-Europe] <---> [DC-Asia]
```

Configuration for bidirectional federation requires setup on each node. Here is the configuration for DC-East:

```bash
# On DC-East - configure upstreams for all other datacenters
rabbitmqctl set_parameter federation-upstream dc-west \
  '{"uri":"amqps://fed:pass@west.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream dc-europe \
  '{"uri":"amqps://fed:pass@europe.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream dc-asia \
  '{"uri":"amqps://fed:pass@asia.example.com:5671"}'

rabbitmqctl set_parameter federation-upstream-set mesh-partners \
  '[{"upstream":"dc-west"},{"upstream":"dc-europe"},{"upstream":"dc-asia"}]'

rabbitmqctl set_policy mesh-federation \
  "^global\\..*" \
  '{"federation-upstream-set":"mesh-partners"}' \
  --apply-to exchanges
```

Repeat similar configuration on each datacenter, adjusting the upstream URIs accordingly.

### Preventing Message Loops

In bidirectional topologies, messages can loop indefinitely. RabbitMQ prevents this using the `x-received-from` header. However, you should also:

1. Use specific exchange patterns rather than wildcarding everything
2. Set appropriate message TTLs
3. Monitor for unexpected message amplification

```bash
# Configure upstream with max-hops to limit message propagation
rabbitmqctl set_parameter federation-upstream dc-west \
  '{
    "uri": "amqps://fed:pass@west.example.com:5671",
    "max-hops": 1
  }'
```

The `max-hops` parameter limits how many times a message can be forwarded between federated brokers.

## Monitoring Federation

Effective monitoring catches issues before they impact your application.

### Federation Metrics to Monitor

Key metrics available through the management API:

```bash
# Get federation link status
curl -s -u admin:password \
  http://localhost:15672/api/federation-links | jq '.[] | {
    upstream: .upstream,
    status: .status,
    type: .type,
    uri: .uri
  }'
```

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| Link status | Not "running" | Not "running" for 5+ minutes |
| Messages transferred/sec | Sudden drop | Zero for 5+ minutes |
| Link age | N/A | Frequent reconnections |
| Upstream queue depth | Growing consistently | Over 100,000 messages |

### Prometheus Metrics

RabbitMQ exposes federation metrics in Prometheus format. Enable the Prometheus plugin:

```bash
rabbitmq-plugins enable rabbitmq_prometheus
```

Key metrics to track:

```promql
# Federation link status (1 = running, 0 = not running)
rabbitmq_federation_links_running

# Messages transferred via federation
rabbitmq_federation_messages_transferred_total

# Federation link errors
rabbitmq_federation_link_errors_total
```

### Health Check Script

A shell script to check federation health:

```bash
#!/bin/bash
# federation_health_check.sh
# Checks the status of all federation links

RABBITMQ_HOST="localhost"
RABBITMQ_PORT="15672"
RABBITMQ_USER="admin"
RABBITMQ_PASS="password"

# Fetch federation links status
LINKS=$(curl -s -u "${RABBITMQ_USER}:${RABBITMQ_PASS}" \
  "http://${RABBITMQ_HOST}:${RABBITMQ_PORT}/api/federation-links")

# Check if any links are not running
NOT_RUNNING=$(echo "$LINKS" | jq '[.[] | select(.status != "running")] | length')

if [ "$NOT_RUNNING" -gt 0 ]; then
    echo "WARNING: $NOT_RUNNING federation link(s) not running"
    echo "$LINKS" | jq '.[] | select(.status != "running") | {upstream, status, error}'
    exit 1
fi

TOTAL_LINKS=$(echo "$LINKS" | jq 'length')
echo "OK: All $TOTAL_LINKS federation links running"
exit 0
```

## Troubleshooting Federation

Common issues and their solutions.

### Link Status: "starting"

The link is attempting to connect but has not succeeded yet.

Causes and solutions:

1. **Network connectivity**: Verify the upstream is reachable
```bash
# Test connectivity to upstream
telnet east.example.com 5672
```

2. **Authentication failure**: Check credentials
```bash
# Test authentication manually
rabbitmqadmin -H east.example.com -u federation_user -p password list queues
```

3. **Virtual host mismatch**: Ensure the vhost exists on upstream
```bash
# List vhosts on upstream
rabbitmqctl -n rabbit@east list_vhosts
```

### Link Status: "error"

The link encountered an error and stopped.

Check the error details:

```bash
# Get detailed link status including errors
rabbitmqctl eval 'rabbit_federation_status:status().'
```

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| access_refused | Permission denied | Check user permissions on upstream |
| not_found | Exchange or queue missing | Create the resource on upstream |
| connection_closed | Network or TLS issue | Check firewall and TLS configuration |

### Messages Not Federating

If links show "running" but messages do not transfer:

1. **Check bindings on upstream**: Federation creates internal bindings
```bash
# List bindings on upstream for the federated exchange
rabbitmqadmin -H east.example.com list bindings source=events
```

2. **Verify routing keys**: Messages must match the binding routing keys
```bash
# Publish with explicit routing key
rabbitmqadmin publish exchange=events routing_key=test.message payload="test"
```

3. **Check consumer on downstream**: Messages only transfer when there are consumers
```bash
# List consumers on downstream
rabbitmqadmin list consumers
```

### High Memory Usage

Federation queues on the upstream can grow if the link is slow.

Solutions:

1. Set message TTL on the upstream definition:
```bash
rabbitmqctl set_parameter federation-upstream dc-east \
  '{"uri":"amqps://fed:pass@east.example.com:5671","message-ttl":3600000}'
```

2. Monitor and alert on queue depth:
```bash
# Check federation queue depth
rabbitmqadmin list queues name messages | grep federation
```

### Debugging with Tracing

Enable the firehose tracer to see message flow:

```bash
# Enable the rabbitmq_tracing plugin
rabbitmq-plugins enable rabbitmq_tracing

# Create a trace for federation messages
rabbitmqctl trace_on -p /
```

View traces in the management UI under Admin > Tracing.

## Performance Tuning

Optimize federation for high throughput.

### Prefetch and Batching

Adjust prefetch count for better throughput:

```bash
# Higher prefetch for high-throughput scenarios
rabbitmqctl set_parameter federation-upstream dc-east \
  '{
    "uri": "amqps://fed:pass@east.example.com:5671",
    "prefetch-count": 1000
  }'
```

| Prefetch Value | Use Case |
|---------------|----------|
| 1-10 | Low latency, small messages |
| 100-500 | Balanced throughput and latency |
| 1000+ | Maximum throughput, higher latency |

### Connection Settings

Tune TCP settings for WAN links:

```bash
rabbitmqctl set_parameter federation-upstream dc-east \
  '{
    "uri": "amqps://fed:pass@east.example.com:5671",
    "reconnect-delay": 5,
    "channel-use-max": 10
  }'
```

Parameters:
- `reconnect-delay`: Seconds to wait before reconnecting (default 1)
- `channel-use-max`: Maximum channels per connection

### Multiple Links

For high-volume exchanges, configure multiple upstream links:

```bash
# Create upstream set with multiple instances of the same upstream
rabbitmqctl set_parameter federation-upstream-set high-volume \
  '[
    {"upstream":"dc-east"},
    {"upstream":"dc-east"},
    {"upstream":"dc-east"}
  ]'
```

This creates three parallel federation links, tripling potential throughput.

## Security Best Practices

Secure your federation setup.

### TLS Configuration

Always use TLS for federation links:

```bash
# Configure RabbitMQ to verify upstream certificates
rabbitmqctl set_parameter federation-upstream dc-east \
  '{
    "uri": "amqps://fed:pass@east.example.com:5671?cacertfile=/path/to/ca.pem&certfile=/path/to/client.pem&keyfile=/path/to/client.key&verify=verify_peer&server_name_indication=east.example.com"
  }'
```

### Credential Management

Never hardcode credentials. Use environment variables or secrets management:

```bash
# Using environment variable substitution (requires shell)
UPSTREAM_PASS=$(vault kv get -field=password secret/rabbitmq/federation)
rabbitmqctl set_parameter federation-upstream dc-east \
  "{\"uri\":\"amqps://fed:${UPSTREAM_PASS}@east.example.com:5671\"}"
```

### Network Segmentation

Restrict federation traffic:

1. Use dedicated network interfaces for federation
2. Configure firewall rules to allow only specific IP addresses
3. Use VPN or private links for cross-datacenter traffic

## Conclusion

RabbitMQ federation provides a flexible way to connect brokers across datacenters without the constraints of clustering. Key takeaways:

1. **Use exchange federation** when all datacenters need copies of messages
2. **Use queue federation** when you want to distribute work across datacenters
3. **Always use TLS** for production federation links
4. **Monitor link status** and queue depths proactively
5. **Set message TTLs** to prevent unbounded queue growth
6. **Plan your topology** based on message flow requirements

Start with a simple hub-and-spoke topology and evolve to mesh only when needed. Test thoroughly in a staging environment before deploying federation changes to production.

## Additional Resources

- RabbitMQ Federation Plugin Documentation: https://www.rabbitmq.com/federation.html
- RabbitMQ Clustering vs Federation: https://www.rabbitmq.com/distributed.html
- RabbitMQ TLS Configuration: https://www.rabbitmq.com/ssl.html
- RabbitMQ Management HTTP API: https://www.rabbitmq.com/management.html#http-api
