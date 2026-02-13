# How to Migrate from Self-Managed RabbitMQ to Amazon MQ

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon MQ, RabbitMQ, Migration, Messaging

Description: A practical guide to migrating your self-managed RabbitMQ cluster to Amazon MQ, covering planning, configuration mapping, data migration, and cutover strategies.

---

Running RabbitMQ on your own infrastructure means you're responsible for upgrades, scaling, high availability, and all the little fires that come with managing stateful distributed systems. Amazon MQ for RabbitMQ takes that operational burden away while keeping full compatibility with the AMQP protocol. Your existing producers and consumers keep working with minimal changes.

But migration isn't just flipping a switch. There's planning involved. Let's walk through the process step by step.

## Assess Your Current Setup

Before you touch anything in AWS, document what you have. You need a clear picture of your current RabbitMQ deployment.

Run this against your existing RabbitMQ to export the full configuration.

```bash
# Export your current RabbitMQ definitions
rabbitmqctl export_definitions /tmp/rabbit-definitions.json

# Check your RabbitMQ version
rabbitmqctl version

# List all vhosts
rabbitmqctl list_vhosts

# List all queues with message counts
rabbitmqctl list_queues name messages consumers durable auto_delete
```

Pay attention to these details:

- **RabbitMQ version**: Amazon MQ supports specific versions. Check that your version (or a compatible one) is available.
- **Plugins in use**: Amazon MQ supports a subset of RabbitMQ plugins. If you rely on community plugins, you'll need to find alternatives.
- **Queue count and message throughput**: This determines what instance size you'll need.
- **Connection count**: Each Amazon MQ instance type has connection limits.

## Plan Your Instance Sizing

Amazon MQ for RabbitMQ offers several instance types. Pick one based on your current resource usage.

This script pulls key metrics from your existing RabbitMQ management API to help with sizing.

```python
import requests

# Replace with your RabbitMQ management URL
RABBIT_URL = "http://localhost:15672/api"
AUTH = ("guest", "guest")

# Get node metrics
nodes = requests.get(f"{RABBIT_URL}/nodes", auth=AUTH).json()
for node in nodes:
    print(f"Node: {node['name']}")
    print(f"  Memory used: {node['mem_used'] / 1024 / 1024:.0f} MB")
    print(f"  Disk free: {node['disk_free'] / 1024 / 1024 / 1024:.1f} GB")
    print(f"  File descriptors: {node['fd_used']}/{node['fd_total']}")
    print(f"  Erlang processes: {node['proc_used']}")

# Get overview
overview = requests.get(f"{RABBIT_URL}/overview", auth=AUTH).json()
msg_stats = overview.get("message_stats", {})
print(f"\nPublish rate: {msg_stats.get('publish_details', {}).get('rate', 0):.0f} msg/s")
print(f"Deliver rate: {msg_stats.get('deliver_get_details', {}).get('rate', 0):.0f} msg/s")
print(f"Connections: {overview['object_totals']['connections']}")
print(f"Queues: {overview['object_totals']['queues']}")
```

A rough sizing guide:

| Current Usage | Recommended Instance |
|---|---|
| < 100 msg/s, < 50 connections | mq.m5.large |
| 100-1000 msg/s, < 200 connections | mq.m5.xlarge |
| 1000+ msg/s, 200+ connections | mq.m5.2xlarge or cluster |

## Create Your Amazon MQ Broker

Create a RabbitMQ broker in Amazon MQ. For production, always use the multi-AZ cluster deployment.

```bash
aws mq create-broker \
  --broker-name prod-rabbitmq \
  --engine-type RABBITMQ \
  --engine-version "3.13" \
  --host-instance-type mq.m5.large \
  --deployment-mode CLUSTER_MULTI_AZ \
  --no-publicly-accessible \
  --subnet-ids subnet-aaa111 subnet-bbb222 subnet-ccc333 \
  --security-groups sg-xxx123 \
  --users '[{"username":"admin","password":"Pr0dR@bb1tP@ss!","consoleAccess":true}]'
```

Wait for the broker to reach `RUNNING` state.

```bash
# Check broker status
aws mq describe-broker --broker-id <broker-id> --query 'BrokerState'
```

## Recreate Your Topology

This is the most important step. You need to recreate your exchanges, queues, and bindings on the new broker. The definitions export you took earlier is your source of truth.

Amazon MQ for RabbitMQ exposes the management API, so you can import definitions directly.

This script uploads your exported RabbitMQ definitions to the new Amazon MQ broker.

```python
import requests
import json

# Your Amazon MQ RabbitMQ management endpoint
AMAZON_MQ_URL = "https://b-xxxx-xxxx.mq.us-east-1.amazonaws.com"
AUTH = ("admin", "Pr0dR@bb1tP@ss!")

# Load the definitions you exported earlier
with open("/tmp/rabbit-definitions.json") as f:
    definitions = json.load(f)

# Remove users and permissions - you'll manage these separately
# Amazon MQ has its own user management
definitions.pop("users", None)
definitions.pop("permissions", None)
definitions.pop("topic_permissions", None)

# Import the definitions
response = requests.post(
    f"{AMAZON_MQ_URL}/api/definitions",
    auth=AUTH,
    json=definitions,
    verify=True
)

if response.status_code == 200:
    print("Definitions imported successfully")
else:
    print(f"Import failed: {response.status_code}")
    print(response.text)
```

After importing, verify everything looks right.

```bash
# List queues on the new broker
curl -s -u admin:Pr0dR@bb1tP@ss! \
  "https://b-xxxx-xxxx.mq.us-east-1.amazonaws.com/api/queues" | \
  python3 -c "import sys,json; [print(q['name']) for q in json.load(sys.stdin)]"
```

## Handle Configuration Differences

Amazon MQ doesn't support everything a self-managed RabbitMQ does. Here are the common gotchas.

**Plugins**: Amazon MQ enables a fixed set of plugins. You can't add custom ones. The shovel and federation plugins are available, but check the docs for the full list.

**Policies**: You'll need to recreate your policies. The definitions import handles most of this, but double-check.

This creates a ha-policy equivalent on the new broker (Amazon MQ handles HA differently, but policies for TTL, max-length etc. still apply).

```bash
# Set a policy for message TTL on a queue pattern
curl -u admin:Pr0dR@bb1tP@ss! -X PUT \
  "https://b-xxxx-xxxx.mq.us-east-1.amazonaws.com/api/policies/%2f/ttl-policy" \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "^temp\\.",
    "definition": {"message-ttl": 3600000},
    "apply-to": "queues"
  }'
```

**Users and Permissions**: Amazon MQ manages users through the AWS API, not the RabbitMQ management interface. Create users with the AWS CLI.

```bash
aws mq create-user \
  --broker-id <broker-id> \
  --username app-user \
  --password "AppUs3rP@ssw0rd!" \
  --no-console-access
```

## Update Your Application Configuration

Your applications need new connection strings. The AMQP endpoint for Amazon MQ follows a specific format.

Here's a Python example showing the connection string change.

```python
import pika
import ssl

# Old self-managed connection
# connection = pika.BlockingConnection(
#     pika.ConnectionParameters(host="rabbitmq.internal.example.com")
# )

# New Amazon MQ connection
ssl_context = ssl.create_default_context()
credentials = pika.PlainCredentials("app-user", "AppUs3rP@ssw0rd!")

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host="b-xxxx-xxxx.mq.us-east-1.amazonaws.com",
        port=5671,  # AMQPS port
        virtual_host="/",
        credentials=credentials,
        ssl_options=pika.SSLOptions(ssl_context)
    )
)

channel = connection.channel()
channel.basic_publish(
    exchange="orders",
    routing_key="order.created",
    body="test message"
)
```

Notice two important changes: you're now using port 5671 (AMQPS) instead of 5672 (AMQP), and you need to provide an SSL context. Amazon MQ enforces TLS.

## Choose a Cutover Strategy

You have two main options for the actual migration.

### Option 1: Blue-Green Cutover

Run both brokers simultaneously. Point producers to the new broker first, let the old broker drain its existing messages, then switch consumers over.

```mermaid
graph LR
    P[Producers] -->|Step 1: Switch| NEW[Amazon MQ]
    P -.->|Drain| OLD[Self-Managed RabbitMQ]
    OLD -->|Existing messages| C[Consumers]
    NEW -->|New messages| C
```

### Option 2: Federation Bridge

Use the RabbitMQ Federation plugin to bridge your old and new brokers. Messages published to the old broker get forwarded to Amazon MQ automatically.

```bash
# On your old RabbitMQ, set up an upstream pointing to Amazon MQ
rabbitmqctl set_parameter federation-upstream amazon-mq \
  '{"uri":"amqps://app-user:AppUs3rP@ssw0rd!@b-xxxx-xxxx.mq.us-east-1.amazonaws.com:5671"}'

# Create a policy to federate specific exchanges
rabbitmqctl set_policy federate-orders \
  "^orders$" \
  '{"federation-upstream":"amazon-mq"}' \
  --apply-to exchanges
```

The federation approach gives you a smoother transition since both brokers stay in sync during the migration window.

## Validate and Monitor

After cutover, watch these CloudWatch metrics for your Amazon MQ broker:

- **MessageCount**: Ensure messages aren't piling up.
- **ConsumerCount**: Verify all consumers reconnected.
- **PublishRate / AckRate**: Compare with your baseline numbers.

For comprehensive monitoring of your AWS messaging infrastructure, consider setting up [CloudWatch monitoring for your messaging services](https://oneuptime.com/blog/post/2026-02-12-monitor-sns-cloudwatch/view).

## Decommission the Old Broker

Don't rush this step. Keep your old RabbitMQ running (but with no traffic) for at least a week after migration. If something goes wrong, you want the option to fail back.

Once you're confident the migration is successful:

1. Verify zero connections on the old broker
2. Check that no messages remain in any queues
3. Take a final definitions export for your records
4. Shut down the old instances

## Wrapping Up

Migrating from self-managed RabbitMQ to Amazon MQ is straightforward if you plan it properly. The key steps are: assess your current setup, size your new broker, recreate your topology, update connection strings, and choose a cutover strategy that matches your risk tolerance. The AMQP protocol compatibility means your application code needs minimal changes - mostly just new endpoints and TLS configuration.
