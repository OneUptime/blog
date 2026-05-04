# How to Configure RabbitMQ to Listen on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RabbitMQ, Message Queue, AMQP, Messaging

Description: Learn how to configure RabbitMQ to listen on IPv6 addresses for AMQP, management UI, and clustering, enabling IPv6 and dual-stack messaging deployments.

## RabbitMQ IPv6 Configuration File

```ini
# /etc/rabbitmq/rabbitmq.conf

# Listen on specific IPv6 address
listeners.tcp.1 = 2001:db8::10:5672

# Listen on IPv6 loopback
listeners.tcp.2 = ::1:5672

# Listen on all IPv6 interfaces
# listeners.tcp.1 = :::5672

# Management plugin (HTTP API + UI)
management.tcp.ip = 2001:db8::10
management.tcp.port = 15672
```

## Advanced Erlang Configuration

```erlang
%% /etc/rabbitmq/advanced.config
[
  {rabbit, [
    {tcp_listeners, [
      {"2001:db8::10", 5672},
      {"::1", 5672}
    ]},
    {ssl_listeners, [
      {"2001:db8::10", 5671}
    ]}
  ]},
  {rabbitmq_management, [
    {listener, [
      {ip, "2001:db8::10"},
      {port, 15672}
    ]}
  ]}
].
```

## Verify and Test

```bash
# Restart RabbitMQ

systemctl restart rabbitmq-server

# Check listening ports
ss -6 -tlnp | grep beam
# Expected: [2001:db8::10]:5672, [2001:db8::10]:15672

# Check RabbitMQ status
rabbitmqctl status | grep -A 10 "listeners"

# Test AMQP connection with netcat
nc -6 -zv 2001:db8::10 5672

# Test management API
curl -6 -u guest:guest http://[2001:db8::10]:15672/api/overview
```

## RabbitMQ Cluster with IPv6

Set the node name (use FQDN or hostname, not an IP) via `RABBITMQ_NODENAME` or in `/etc/rabbitmq/rabbitmq-env.conf`:

```bash
# /etc/rabbitmq/rabbitmq-env.conf
NODENAME=rabbit@node1.example.com
```

Then configure clustering and the distribution listener in `rabbitmq.conf`:

```ini
# /etc/rabbitmq/rabbitmq.conf

# Cluster formation peer discovery
cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config
cluster_formation.classic_config.nodes.1 = rabbit@node1.example.com
cluster_formation.classic_config.nodes.2 = rabbit@node2.example.com
cluster_formation.classic_config.nodes.3 = rabbit@node3.example.com

# Distribution listener (inter-node)
distribution.listener.interface = 2001:db8::10
distribution.listener.port_range.min = 25672
distribution.listener.port_range.max = 25672
```

## Python Pika Client over IPv6

```python
import pika

# Connect to RabbitMQ via IPv6
connection_params = pika.ConnectionParameters(
    host='2001:db8::10',
    port=5672,
    virtual_host='/',
    credentials=pika.PlainCredentials('guest', 'guest'),
    socket_timeout=10
)

connection = pika.BlockingConnection(connection_params)
channel = connection.channel()

# Declare a queue
channel.queue_declare(queue='ipv6-test', durable=True)

# Publish a message
channel.basic_publish(
    exchange='',
    routing_key='ipv6-test',
    body='Hello from IPv6!',
    properties=pika.BasicProperties(delivery_mode=2)  # Persistent
)

print("Message published successfully over IPv6")
connection.close()
```

## Firewall Rules

```bash
# Allow AMQP over IPv6
ip6tables -A INPUT -p tcp --dport 5672 -j ACCEPT

# Allow management UI
ip6tables -A INPUT -p tcp --dport 15672 -j ACCEPT

# Allow cluster communication
ip6tables -A INPUT -p tcp --dport 25672 -j ACCEPT

# Using firewalld
firewall-cmd --add-port=5672/tcp --permanent
firewall-cmd --add-port=15672/tcp --permanent
firewall-cmd --reload
```

## Summary

Configure RabbitMQ for IPv6 by setting `listeners.tcp.1 = 2001:db8::10:5672` in `rabbitmq.conf`, and `management.tcp.ip = 2001:db8::10` for the management UI. For advanced configuration, use `advanced.config` with Erlang `{tcp_listeners, [{"2001:db8::10", 5672}]}`. Restart with `systemctl restart rabbitmq-server`. Test with `nc -6 -zv 2001:db8::10 5672` and the management API at `http://[2001:db8::10]:15672/api/overview`.
