# How to Implement RabbitMQ Shovel Plugin for Message Transfer Between Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RabbitMQ, Message Queue, Data Migration

Description: Learn how to use the RabbitMQ Shovel plugin to transfer messages between clusters, implement one-way message routing, and perform data migration in Kubernetes environments.

---

The RabbitMQ Shovel plugin provides reliable message transfer between brokers or clusters. Unlike federation, which establishes ongoing replication relationships, shovels are point-to-point connections designed for specific message routing tasks like data migration, selective forwarding, or connecting disparate systems.

In this guide, you'll learn how to configure static and dynamic shovels, implement message transformation during transfer, monitor shovel health, and use shovels for common scenarios like cluster migration and selective message routing.

## Understanding RabbitMQ Shovels

Shovels consume messages from a source queue or exchange and publish them to a destination. Key characteristics:

- **One-way transfer** - Messages flow from source to destination only
- **Protocol bridging** - Can connect AMQP 0.9.1, AMQP 1.0, and STOMP
- **Message transformation** - Can modify messages during transfer
- **Reliable delivery** - Uses publisher confirms and acknowledgments
- **Dynamic or static** - Configure at runtime or in configuration files

Shovels are ideal for:
- Migrating messages between clusters
- Routing specific messages to different systems
- Bridging different message broker protocols
- One-time data transfers or ongoing forwarding

## Enabling the Shovel Plugin

Configure RabbitMQ clusters with shovel plugin enabled:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: source-cluster
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:3.12-management
  rabbitmq:
    additionalPlugins:
      - rabbitmq_shovel
      - rabbitmq_shovel_management
    additionalConfig: |
      cluster_name = source-cluster
---
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: destination-cluster
  namespace: rabbitmq
spec:
  replicas: 3
  image: rabbitmq:3.12-management
  rabbitmq:
    additionalPlugins:
      - rabbitmq_shovel
      - rabbitmq_shovel_management
    additionalConfig: |
      cluster_name = destination-cluster
```

Apply and verify:

```bash
kubectl apply -f rabbitmq-clusters.yaml

# Verify shovel plugin is enabled
kubectl exec -n rabbitmq source-cluster-server-0 -- \
  rabbitmq-plugins list | grep shovel
```

## Creating Static Shovels

Static shovels are defined in RabbitMQ configuration:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: source-cluster
  namespace: rabbitmq
spec:
  replicas: 3
  rabbitmq:
    additionalPlugins:
      - rabbitmq_shovel
      - rabbitmq_shovel_management
    advancedConfig: |
      [
        {rabbitmq_shovel, [
          {shovels, [
            {migration_shovel, [
              {sources, [
                {brokers, ["amqp://source-cluster:5672"]},
                {queue, <<"legacy_queue">>}
              ]},
              {destinations, [
                {brokers, ["amqp://destination-cluster:5672"]},
                {queue, <<"new_queue">>}
              ]},
              {ack_mode, on_confirm},
              {reconnect_delay, 5}
            ]}
          ]}
        ]}
      ].
```

## Creating Dynamic Shovels

Dynamic shovels can be created via the management API:

```python
import requests
import json

def create_shovel(mgmt_url, username, password, shovel_name, config):
    """Create a dynamic shovel via management API"""
    response = requests.put(
        f"{mgmt_url}/api/parameters/shovel/%2F/{shovel_name}",
        auth=(username, password),
        headers={"content-type": "application/json"},
        data=json.dumps({"value": config})
    )
    return response.status_code == 201

# Configure a basic shovel
shovel_config = {
    "src-uri": "amqp://user:pass@source-cluster:5672",
    "src-queue": "orders",
    "dest-uri": "amqp://user:pass@destination-cluster:5672",
    "dest-queue": "orders_migrated",
    "ack-mode": "on-confirm",
    "reconnect-delay": 5
}

create_shovel(
    "http://source-cluster:15672",
    "admin",
    "password",
    "orders-migration",
    shovel_config
)
```

Using kubectl:

```bash
# Get credentials
SOURCE_USER=$(kubectl get secret source-cluster-default-user -n rabbitmq -o jsonpath='{.data.username}' | base64 -d)
SOURCE_PASS=$(kubectl get secret source-cluster-default-user -n rabbitmq -o jsonpath='{.data.password}' | base64 -d)
DEST_USER=$(kubectl get secret destination-cluster-default-user -n rabbitmq -o jsonpath='{.data.username}' | base64 -d)
DEST_PASS=$(kubectl get secret destination-cluster-default-user -n rabbitmq -o jsonpath='{.data.password}' | base64 -d)

# Port-forward to management interface
kubectl port-forward -n rabbitmq svc/source-cluster 15672:15672 &

# Create shovel
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/data-migration \
  -H "content-type: application/json" \
  -d "{
    \"value\": {
      \"src-uri\": \"amqp://${SOURCE_USER}:${SOURCE_PASS}@source-cluster:5672\",
      \"src-queue\": \"legacy_data\",
      \"dest-uri\": \"amqp://${DEST_USER}:${DEST_PASS}@destination-cluster:5672\",
      \"dest-queue\": \"new_data\",
      \"ack-mode\": \"on-confirm\",
      \"reconnect-delay\": 5
    }
  }"
```

## Implementing Exchange-to-Exchange Shovels

Transfer messages between exchanges rather than queues:

```bash
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/exchange-shovel \
  -H "content-type: application/json" \
  -d '{
    "value": {
      "src-uri": "amqp://source-cluster:5672",
      "src-exchange": "events",
      "src-exchange-key": "order.*",
      "dest-uri": "amqp://destination-cluster:5672",
      "dest-exchange": "processed_events",
      "dest-exchange-key": "migrated.order.*",
      "ack-mode": "on-confirm"
    }
  }'
```

This shovel:
- Consumes from `events` exchange with routing key pattern `order.*`
- Publishes to `processed_events` exchange with modified routing key

## Transforming Messages During Transfer

Add headers or modify properties:

```bash
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/transform-shovel \
  -H "content-type: application/json" \
  -d '{
    "value": {
      "src-uri": "amqp://source-cluster:5672",
      "src-queue": "raw_messages",
      "dest-uri": "amqp://destination-cluster:5672",
      "dest-queue": "processed_messages",
      "ack-mode": "on-confirm",
      "add-forward-headers": true,
      "dest-add-timestamp-header": true
    }
  }'
```

The `add-forward-headers` option adds metadata about the shovel transfer.

## Implementing Selective Message Routing

Use message properties for filtering:

```python
import pika

# Producer publishes with custom headers
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='source-cluster')
)
channel = connection.channel()

# Publish with priority header
channel.basic_publish(
    exchange='',
    routing_key='messages',
    body='High priority message',
    properties=pika.BasicProperties(
        headers={'priority': 'high'},
        delivery_mode=2
    )
)
```

Configure shovel to route based on headers (requires custom consumer):

```bash
# Shovel with prefetch for selective routing
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/priority-shovel \
  -H "content-type: application/json" \
  -d '{
    "value": {
      "src-uri": "amqp://source-cluster:5672",
      "src-queue": "messages",
      "dest-uri": "amqp://destination-cluster:5672",
      "dest-queue": "priority_messages",
      "ack-mode": "on-confirm",
      "src-prefetch-count": 100
    }
  }'
```

## Monitoring Shovel Status

Check shovel status via API:

```bash
# List all shovels
curl -u ${SOURCE_USER}:${SOURCE_PASS} \
  http://localhost:15672/api/shovels

# Get specific shovel status
curl -u ${SOURCE_USER}:${SOURCE_PASS} \
  http://localhost:15672/api/shovels/%2F/data-migration
```

Using rabbitmqctl:

```bash
kubectl exec -n rabbitmq source-cluster-server-0 -- \
  rabbitmqctl shovel_status
```

Create Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rabbitmq-shovel-alerts
  namespace: monitoring
spec:
  groups:
  - name: rabbitmq-shovels
    rules:
    - alert: ShovelNotRunning
      expr: |
        rabbitmq_shovels_up == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "RabbitMQ shovel not running"
        description: "Shovel {{ $labels.shovel }} is not running"

    - alert: ShovelHighErrorRate
      expr: |
        rate(rabbitmq_shovel_errors_total[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High shovel error rate"
```

## Migrating Data Between Clusters

Implement complete cluster migration:

```bash
#!/bin/bash
# migrate-cluster.sh

SOURCE_HOST="source-cluster.rabbitmq.svc.cluster.local"
DEST_HOST="destination-cluster.rabbitmq.svc.cluster.local"

# Get list of queues to migrate
QUEUES=$(kubectl exec -n rabbitmq source-cluster-server-0 -- \
  rabbitmqctl list_queues name -q)

# Create shovel for each queue
for QUEUE in $QUEUES; do
  echo "Creating shovel for queue: $QUEUE"

  curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
    http://localhost:15672/api/parameters/shovel/%2F/migrate-${QUEUE} \
    -H "content-type: application/json" \
    -d "{
      \"value\": {
        \"src-uri\": \"amqp://${SOURCE_USER}:${SOURCE_PASS}@${SOURCE_HOST}:5672\",
        \"src-queue\": \"${QUEUE}\",
        \"src-delete-after\": \"never\",
        \"dest-uri\": \"amqp://${DEST_USER}:${DEST_PASS}@${DEST_HOST}:5672\",
        \"dest-queue\": \"${QUEUE}\",
        \"ack-mode\": \"on-confirm\"
      }
    }"
done

echo "Migration shovels created. Monitor progress:"
echo "kubectl exec -n rabbitmq source-cluster-server-0 -- rabbitmqctl shovel_status"
```

## Auto-Deleting Shovels After Migration

Configure shovels to delete after completion:

```bash
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/one-time-migration \
  -H "content-type: application/json" \
  -d '{
    "value": {
      "src-uri": "amqp://source-cluster:5672",
      "src-queue": "temp_data",
      "src-delete-after": "queue-length",
      "dest-uri": "amqp://destination-cluster:5672",
      "dest-queue": "migrated_data",
      "ack-mode": "on-confirm"
    }
  }'
```

The `src-delete-after: queue-length` option deletes the shovel when the source queue is empty.

## Protocol Bridging with Shovels

Connect AMQP 0.9.1 to AMQP 1.0:

```bash
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/amqp-bridge \
  -H "content-type: application/json" \
  -d '{
    "value": {
      "src-protocol": "amqp091",
      "src-uri": "amqp://rabbitmq:5672",
      "src-queue": "messages",
      "dest-protocol": "amqp10",
      "dest-uri": "amqp://azure-servicebus.servicebus.windows.net",
      "dest-address": "queue-name",
      "ack-mode": "on-confirm"
    }
  }'
```

## Best Practices

Follow these practices for RabbitMQ shovels:

1. **Use on-confirm ack mode** - Ensures reliable delivery
2. **Monitor shovel status** - Alert on shovel failures
3. **Set reconnect delays** - Prevent overwhelming systems during outages
4. **Use src-delete-after** - Auto-cleanup for one-time migrations
5. **Configure prefetch** - Limit memory usage with prefetch-count
6. **Test before production** - Verify shovel behavior in staging
7. **Document shovel purpose** - Clear naming and documentation

## Troubleshooting Shovel Issues

Common problems and solutions:

```bash
# Check shovel errors
kubectl logs -n rabbitmq source-cluster-server-0 | grep shovel

# View shovel details
kubectl exec -n rabbitmq source-cluster-server-0 -- \
  rabbitmqctl eval 'rabbit_shovel_status:status().'

# Delete problematic shovel
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X DELETE \
  http://localhost:15672/api/parameters/shovel/%2F/problematic-shovel

# Recreate shovel with corrected configuration
curl -u ${SOURCE_USER}:${SOURCE_PASS} -X PUT \
  http://localhost:15672/api/parameters/shovel/%2F/corrected-shovel \
  -H "content-type: application/json" \
  -d '{ ... }'
```

## Conclusion

The RabbitMQ Shovel plugin provides flexible message transfer capabilities for cluster migration, selective routing, and protocol bridging. Understanding the difference between shovels and federation, knowing when to use static versus dynamic shovels, and implementing proper monitoring ensures reliable message transfer operations.

Shovels are particularly valuable during cluster migrations, when integrating disparate systems, or when implementing complex routing logic that federation cannot handle. Combined with Kubernetes deployments, shovels enable sophisticated message routing architectures across distributed RabbitMQ clusters.
