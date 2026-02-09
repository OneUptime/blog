# How to Configure RabbitMQ Federation for Multi-Cluster Message Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RabbitMQ, Multi-Cluster, Federation

Description: Learn how to configure RabbitMQ federation to route messages across multiple Kubernetes clusters for geo-distributed architectures, disaster recovery, and multi-region deployments.

---

RabbitMQ federation allows you to share messages and exchanges across geographically distributed RabbitMQ clusters without requiring full mesh connectivity. Unlike clustering, which requires low-latency connections between all nodes, federation works over unreliable WAN links and supports various topologies for different architectural requirements.

In this guide, you'll learn how to configure RabbitMQ federation between Kubernetes clusters, implement multi-region message routing, handle network partitions, and monitor federated connections for reliable cross-cluster messaging.

## Understanding RabbitMQ Federation

Federation creates links between brokers in different clusters, allowing:

- **Exchange federation** - Messages published to an exchange in one cluster are forwarded to federated exchanges in other clusters
- **Queue federation** - Consumers in one cluster can consume from queues in another cluster
- **Bi-directional federation** - Two-way message flow between clusters
- **Selective routing** - Filter which messages cross cluster boundaries

Federation differs from clustering:
- Works over WAN with high latency
- Clusters remain independent
- No shared state between clusters
- Tolerates network partitions
- Scales horizontally across regions

## Deploying Multiple RabbitMQ Clusters

Deploy RabbitMQ clusters in different regions or namespaces:

```yaml
# Cluster in region us-east
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: rabbitmq-us-east
  namespace: rabbitmq-us-east
spec:
  replicas: 3
  image: rabbitmq:3.12-management
  service:
    type: LoadBalancer
  rabbitmq:
    additionalPlugins:
      - rabbitmq_federation
      - rabbitmq_federation_management
    additionalConfig: |
      cluster_name = us-east-cluster
---
# Cluster in region eu-west
apiVersion: rabbitmq.com/v1beta1
kind: RabbitMQCluster
metadata:
  name: rabbitmq-eu-west
  namespace: rabbitmq-eu-west
spec:
  replicas: 3
  image: rabbitmq:3.12-management
  service:
    type: LoadBalancer
  rabbitmq:
    additionalPlugins:
      - rabbitmq_federation
      - rabbitmq_federation_management
    additionalConfig: |
      cluster_name = eu-west-cluster
```

Apply the clusters:

```bash
kubectl create namespace rabbitmq-us-east
kubectl create namespace rabbitmq-eu-west

kubectl apply -f rabbitmq-us-east.yaml
kubectl apply -f rabbitmq-eu-west.yaml

# Wait for clusters to be ready
kubectl wait --for=condition=ready rabbitmqcluster/rabbitmq-us-east -n rabbitmq-us-east --timeout=300s
kubectl wait --for=condition=ready rabbitmqcluster/rabbitmq-eu-west -n rabbitmq-eu-west --timeout=300s
```

## Configuring Federation Upstream

Define federation upstreams to connect clusters:

```bash
# Get credentials and endpoints
US_EAST_HOST=$(kubectl get svc rabbitmq-us-east -n rabbitmq-us-east -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
EU_WEST_HOST=$(kubectl get svc rabbitmq-eu-west -n rabbitmq-eu-west -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

US_EAST_USER=$(kubectl get secret rabbitmq-us-east-default-user -n rabbitmq-us-east -o jsonpath='{.data.username}' | base64 -d)
US_EAST_PASS=$(kubectl get secret rabbitmq-us-east-default-user -n rabbitmq-us-east -o jsonpath='{.data.password}' | base64 -d)

EU_WEST_USER=$(kubectl get secret rabbitmq-eu-west-default-user -n rabbitmq-eu-west -o jsonpath='{.data.username}' | base64 -d)
EU_WEST_PASS=$(kubectl get secret rabbitmq-eu-west-default-user -n rabbitmq-eu-west -o jsonpath='{.data.password}' | base64 -d)

# Configure upstream on EU cluster pointing to US cluster
kubectl exec -n rabbitmq-eu-west rabbitmq-eu-west-server-0 -- rabbitmqctl set_parameter federation-upstream us-east \
  "{\"uri\":\"amqp://${US_EAST_USER}:${US_EAST_PASS}@${US_EAST_HOST}:5672\",\"trust-user-id\":false}"

# Configure upstream on US cluster pointing to EU cluster
kubectl exec -n rabbitmq-us-east rabbitmq-us-east-server-0 -- rabbitmqctl set_parameter federation-upstream eu-west \
  "{\"uri\":\"amqp://${EU_WEST_USER}:${EU_WEST_PASS}@${EU_WEST_HOST}:5672\",\"trust-user-id\":false}"
```

Alternatively, use the management API:

```python
import requests
import json

def configure_federation_upstream(mgmt_url, username, password, upstream_name, upstream_uri):
    """Configure federation upstream via management API"""
    response = requests.put(
        f"{mgmt_url}/api/parameters/federation-upstream/%2F/{upstream_name}",
        auth=(username, password),
        headers={"content-type": "application/json"},
        data=json.dumps({
            "value": {
                "uri": upstream_uri,
                "trust-user-id": False,
                "max-hops": 1,
                "reconnect-delay": 5
            }
        })
    )
    return response.status_code == 201

# Configure upstreams
configure_federation_upstream(
    "http://rabbitmq-eu-west.example.com:15672",
    "admin",
    "password",
    "us-east",
    f"amqp://{US_EAST_USER}:{US_EAST_PASS}@{US_EAST_HOST}:5672"
)
```

## Implementing Exchange Federation

Federate exchanges to route messages across clusters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: federation-definitions
  namespace: rabbitmq-eu-west
data:
  definitions.json: |
    {
      "exchanges": [
        {
          "name": "events",
          "vhost": "/",
          "type": "topic",
          "durable": true,
          "auto_delete": false
        }
      ],
      "policies": [
        {
          "vhost": "/",
          "name": "federate-events",
          "pattern": "^events$",
          "apply-to": "exchanges",
          "definition": {
            "federation-upstream-set": "all"
          },
          "priority": 1
        }
      ]
    }
```

Apply the policy:

```bash
# Port-forward to EU cluster management
kubectl port-forward -n rabbitmq-eu-west svc/rabbitmq-eu-west 15672:15672 &

# Set federation policy
curl -u ${EU_WEST_USER}:${EU_WEST_PASS} -X PUT \
  http://localhost:15672/api/policies/%2F/federate-events \
  -H "content-type: application/json" \
  -d '{
    "pattern": "^events$",
    "definition": {
      "federation-upstream-set": "all"
    },
    "priority": 1,
    "apply-to": "exchanges"
  }'
```

Now messages published to the `events` exchange in the US cluster will be forwarded to the EU cluster.

## Configuring Queue Federation

Federate queues to allow consumers in one cluster to consume from another:

```bash
# Create queue in US cluster
kubectl exec -n rabbitmq-us-east rabbitmq-us-east-server-0 -- \
  rabbitmqadmin declare queue name=orders durable=true

# Configure queue federation policy in EU cluster
curl -u ${EU_WEST_USER}:${EU_WEST_PASS} -X PUT \
  http://localhost:15672/api/policies/%2F/federate-orders \
  -H "content-type: application/json" \
  -d '{
    "pattern": "^orders$",
    "definition": {
      "federation-upstream-set": "all"
    },
    "priority": 1,
    "apply-to": "queues"
  }'
```

Consumers connected to the EU cluster can now consume messages from the US cluster's `orders` queue.

## Implementing Bi-directional Federation

Configure two-way federation for active-active setups:

```bash
# US cluster federates from EU
kubectl exec -n rabbitmq-us-east rabbitmq-us-east-server-0 -- \
  rabbitmqctl set_policy federate-all "^federated\." \
  '{"federation-upstream-set":"all"}' \
  --priority 1 \
  --apply-to exchanges

# EU cluster federates from US
kubectl exec -n rabbitmq-eu-west rabbitmq-eu-west-server-0 -- \
  rabbitmqctl set_policy federate-all "^federated\." \
  '{"federation-upstream-set":"all"}' \
  --priority 1 \
  --apply-to exchanges
```

Create exchanges with `federated.` prefix to enable bi-directional federation:

```python
import pika

# Connect to US cluster
us_connection = pika.BlockingConnection(
    pika.ConnectionParameters(host=US_EAST_HOST)
)
us_channel = us_connection.channel()

# Declare federated exchange
us_channel.exchange_declare(
    exchange='federated.notifications',
    exchange_type='fanout',
    durable=True
)

# Publish message - will be federated to EU
us_channel.basic_publish(
    exchange='federated.notifications',
    routing_key='',
    body='Message from US'
)
```

## Filtering Federated Messages

Use headers to control which messages cross cluster boundaries:

```bash
# Configure selective federation
curl -u ${EU_WEST_USER}:${EU_WEST_PASS} -X PUT \
  http://localhost:15672/api/parameters/federation-upstream/%2F/us-east \
  -H "content-type: application/json" \
  -d '{
    "value": {
      "uri": "amqp://user:pass@us-east-host:5672",
      "trust-user-id": false,
      "exchange": "events",
      "queue": "",
      "consumer-tag": "eu-west-consumer",
      "prefetch-count": 1000,
      "reconnect-delay": 5,
      "ack-mode": "on-confirm",
      "max-hops": 2,
      "message-ttl": 3600000
    }
  }'
```

Publish with routing keys to filter:

```python
# Only route high-priority messages
channel.basic_publish(
    exchange='events',
    routing_key='high-priority',
    body='Important message'
)
```

## Monitoring Federation Links

Deploy monitoring for federation health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rabbitmq-federation-alerts
  namespace: monitoring
spec:
  groups:
  - name: rabbitmq-federation
    rules:
    - alert: FederationLinkDown
      expr: |
        rabbitmq_federation_links_up == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Federation link down"
        description: "Federation link to {{ $labels.upstream }} is down"

    - alert: FederationHighLatency
      expr: |
        rabbitmq_federation_link_latency_seconds > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Federation link high latency"
```

Check federation status:

```bash
# View federation links
kubectl exec -n rabbitmq-eu-west rabbitmq-eu-west-server-0 -- \
  rabbitmqctl eval 'rabbit_federation_status:status().'

# Check federation link status via API
curl -u ${EU_WEST_USER}:${EU_WEST_PASS} \
  http://localhost:15672/api/federation-links
```

## Handling Network Partitions

Federation tolerates network partitions gracefully:

```bash
# Simulate network partition
kubectl annotate pod rabbitmq-eu-west-server-0 -n rabbitmq-eu-west \
  chaos-mesh.org/network-partition="true"

# Federation automatically reconnects when network recovers
# Check reconnection in logs
kubectl logs -n rabbitmq-eu-west rabbitmq-eu-west-server-0 | grep federation
```

Configure reconnection behavior:

```json
{
  "uri": "amqp://user:pass@upstream:5672",
  "reconnect-delay": 5,
  "max-hops": 2,
  "ack-mode": "on-confirm"
}
```

## Implementing Multi-Region Active-Active

Deploy active-active architecture across regions:

```yaml
# Application deployment in US
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: rabbitmq-us-east
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: order-processor:latest
        env:
        - name: RABBITMQ_HOST
          value: rabbitmq-us-east.rabbitmq-us-east.svc.cluster.local
        - name: RABBITMQ_QUEUE
          value: federated.orders
---
# Application deployment in EU
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: rabbitmq-eu-west
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: order-processor:latest
        env:
        - name: RABBITMQ_HOST
          value: rabbitmq-eu-west.rabbitmq-eu-west.svc.cluster.local
        - name: RABBITMQ_QUEUE
          value: federated.orders
```

## Best Practices

Follow these practices for RabbitMQ federation:

1. **Use appropriate max-hops** - Prevent infinite message loops in complex topologies
2. **Monitor link health** - Alert on federation link failures
3. **Configure reconnection** - Set reasonable reconnect-delay values
4. **Filter strategically** - Only federate necessary messages to reduce bandwidth
5. **Use durable exchanges** - Ensure exchanges survive broker restarts
6. **Enable publisher confirms** - Use ack-mode: on-confirm for reliability
7. **Document topology** - Maintain clear diagrams of federation links

## Troubleshooting Federation Issues

Common problems and solutions:

```bash
# Check federation plugin status
kubectl exec -n rabbitmq-eu-west rabbitmq-eu-west-server-0 -- \
  rabbitmq-plugins list | grep federation

# View federation link errors
kubectl exec -n rabbitmq-eu-west rabbitmq-eu-west-server-0 -- \
  rabbitmqctl environment | grep federation

# Test upstream connectivity
kubectl exec -n rabbitmq-eu-west rabbitmq-eu-west-server-0 -- \
  rabbitmqctl eval 'rabbit_federation_upstream:test_connection("us-east").'

# Check federation exchange bindings
curl -u ${EU_WEST_USER}:${EU_WEST_PASS} \
  http://localhost:15672/api/exchanges/%2F/events/bindings/source
```

## Conclusion

RabbitMQ federation provides a flexible solution for multi-cluster message routing across geographically distributed Kubernetes deployments. By understanding exchange and queue federation, implementing proper monitoring, and handling network partitions gracefully, you can build resilient geo-distributed messaging architectures.

Federation's loose coupling and tolerance for network issues makes it ideal for multi-region deployments, disaster recovery scenarios, and gradual migration strategies. Combined with Kubernetes deployments across regions, RabbitMQ federation enables truly global messaging infrastructure with local processing capabilities.
