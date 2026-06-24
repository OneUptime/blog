# How to Set Up RabbitMQ Federation Over IPv4 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Federation, IPv4, Messaging, AMQP, Configuration, Distributed System

Description: Learn how to configure RabbitMQ federation to replicate exchanges and queues between RabbitMQ brokers on different IPv4 networks.

---

RabbitMQ federation allows exchanges and queues to be federated. In exchange federation, messages published to one broker can flow to another broker on a different IPv4 network without clients needing to know about both brokers. This enables geographic distribution and WAN-friendly message routing.

## How Federation Works

```mermaid
graph LR
    P[Producer\nDatacenter A] --> B1[Broker\n10.0.0.10]
    B1 -->|Federation Link| B2[Broker\n10.1.0.10]
    B2 --> C[Consumer\nDatacenter B]
```

## Enabling the Federation Plugin

```bash
# Enable federation and federation management plugins on both brokers

rabbitmq-plugins enable rabbitmq_federation rabbitmq_federation_management

# Verify the plugins are active
rabbitmq-plugins list | grep federation
```

## Step 1: Define an Upstream

An upstream defines a connection to a remote broker.

```bash
# On the downstream broker (10.1.0.10): define the upstream broker
# The upstream is the broker we want to receive messages FROM
rabbitmqctl set_parameter -p "/" federation-upstream upstream-dc-a \
  '{"uri":"amqp://feduser:fedpassword@10.0.0.10:5672/%2F","max-hops":1,"ack-mode":"on-confirm"}'
```

Parameters:
- `uri` - AMQP connection URI to the upstream broker and vhost (here, the default vhost `/`)
- `max-hops` - Maximum number of federation hops a message published to a federated exchange can traverse before it is dropped
- `ack-mode` - `on-confirm` for reliable delivery

## Step 2: Create a Federation Policy

Policies match exchanges or queues and apply federation behavior.

```bash
# Federate all exchanges matching the pattern "amq.topic" on the default vhost
rabbitmqctl set_policy -p "/" federate-topic-exchanges "^amq\.topic$" \
  '{"federation-upstream":"upstream-dc-a"}' --priority 10 --apply-to exchanges

# Federate a specific exchange named "orders"
rabbitmqctl set_policy -p "/" federate-orders "^orders$" \
  '{"federation-upstream":"upstream-dc-a"}' --apply-to exchanges
```

## Step 3: Create the Federation User on the Upstream Broker

```bash
# On the upstream broker (10.0.0.10):
rabbitmqctl add_user feduser fedpassword
rabbitmqctl set_permissions -p "/" feduser ".*" ".*" ".*"
```

## Verifying Federation Links

```bash
# Check the status of all federation links
rabbitmqctl federation_status

# Or via the management API
curl -u admin:adminpassword http://10.1.0.10:15672/api/federation-links | python3 -m json.tool

# Check via management plugin in the browser
# http://10.1.0.10:15672 → Admin → Federation Status
```

## Testing Federation

```bash
# On the downstream broker: declare the downstream exchange, queue, and binding
curl -u admin:adminpassword -H 'content-type:application/json' \
  -X PUT http://10.1.0.10:15672/api/exchanges/%2F/orders \
  -d '{"type":"direct","durable":true,"auto_delete":false,"internal":false,"arguments":{}}'

# On the upstream broker: declare the upstream exchange with the same name
curl -u admin:adminpassword -H 'content-type:application/json' \
  -X PUT http://10.0.0.10:15672/api/exchanges/%2F/orders \
  -d '{"type":"direct","durable":true,"auto_delete":false,"internal":false,"arguments":{}}'

curl -u admin:adminpassword -H 'content-type:application/json' \
  -X PUT http://10.1.0.10:15672/api/queues/%2F/orders-queue \
  -d '{"durable":true,"auto_delete":false,"arguments":{}}'

curl -u admin:adminpassword -H 'content-type:application/json' \
  -X POST http://10.1.0.10:15672/api/bindings/%2F/e/orders/q/orders-queue \
  -d '{"routing_key":"new-order","arguments":{}}'

# Wait until the federation link is running before publishing; binding propagation is asynchronous

# On the upstream broker: publish a message to the upstream exchange
curl -u admin:adminpassword -H 'content-type:application/json' \
  -X PUT http://10.0.0.10:15672/api/exchanges/%2F/orders/publish \
  -d '{"properties":{},"routing_key":"new-order","payload":"{\"order_id\":1}","payload_encoding":"string"}'

# On the downstream broker: fetch the replicated message from the local queue
curl -u admin:adminpassword -H 'content-type:application/json' \
  -X POST http://10.1.0.10:15672/api/queues/%2F/orders-queue/get \
  -d '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto","truncate":50000}' | python3 -m json.tool
```

## Key Takeaways

- Federation is one-directional per link; create reverse upstreams for bidirectional flow.
- `max-hops` prevents infinite loops in complex multi-broker topologies.
- The federation user on the upstream broker needs appropriate permissions (`configure`, `write`, and `read`) on the upstream vhost.
- Use federation for WAN-distributed systems; use clustering for LAN high-availability setups.
