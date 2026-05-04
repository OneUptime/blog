# How to Configure RabbitMQ Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, IPv6, Message Broker, Cluster, AMQP, Erlang, DevOps

Description: Configure a RabbitMQ broker cluster to accept AMQP connections and perform cluster communication over IPv6, covering Erlang distribution, listener configuration, and management UI.

---

RabbitMQ is built on Erlang, which has its own networking layer. Configuring RabbitMQ for IPv6 requires both Erlang network settings and RabbitMQ listener configuration.

## RabbitMQ IPv6 Configuration File

```bash
# /etc/rabbitmq/rabbitmq.conf

# Listen on all interfaces including IPv6

listeners.tcp.default = :::5672

# Or specific IPv6 address
# listeners.tcp.1 = 2001:db8::1:5672

# Management plugin on IPv6
management.tcp.port = 15672
management.tcp.ip = ::

# AMQPS (TLS) listener on IPv6
listeners.ssl.default = :::5671

# Cluster configuration
# Use hostnames that resolve to IPv6 addresses; Erlang node names
# do not support literal IPv6 addresses, so define entries in DNS
# or /etc/hosts (e.g. rabbit-node1 -> 2001:db8::1).
cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config
cluster_formation.classic_config.nodes.1 = rabbit@rabbit-node1
cluster_formation.classic_config.nodes.2 = rabbit@rabbit-node2
cluster_formation.classic_config.nodes.3 = rabbit@rabbit-node3
```

## Erlang Distribution for IPv6

RabbitMQ's Erlang distribution layer also needs IPv6 configuration:

```erlang
%% /etc/rabbitmq/advanced.config
[
  {kernel, [
    {inet_dist_listen_options, [inet6]},   %% Erlang distribution listens on IPv6
    {inet_dist_connect_options, [inet6]},  %% and connects to peers over IPv6
    {inet_default_connect_options, [{nodelay, true}]},
    {inet_default_listen_options, [{nodelay, true}]}
  ]},
  {rabbit, [
    {tcp_listen_options, [
      {backlog, 128},
      {nodelay, true},
      {sndbuf, 32768},
      {recbuf, 32768}
    ]}
  ]}
].
```

You also need to create an `erl_inetrc` file so Erlang's name resolver
prefers IPv6:

```erlang
%% /etc/rabbitmq/erl_inetrc
{inet6, true}.
{distribution, inet6_tcp}.
```

## Environment Variables for IPv6

```bash
# /etc/rabbitmq/rabbitmq-env.conf

# Tell the Erlang VM to use IPv6 for distribution and to read the
# erl_inetrc file we created in the previous step. The same flags
# must be passed to rabbitmqctl so it can talk to the broker.
RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="-proto_dist inet6_tcp -kernel inetrc '\"/etc/rabbitmq/erl_inetrc\"'"
RABBITMQ_CTL_ERL_ARGS="-proto_dist inet6_tcp -kernel inetrc '\"/etc/rabbitmq/erl_inetrc\"'"

# RabbitMQ node name (use a hostname that resolves to an IPv6 address)
NODENAME=rabbit@$(hostname -f)
```

## Starting RabbitMQ with IPv6

```bash
# Start RabbitMQ
sudo systemctl start rabbitmq-server

# Verify listening on IPv6
ss -tlnp | grep "5672\|15672"
# Should show [::]:5672

# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Check RabbitMQ status
sudo rabbitmqctl status

# Check node is accessible over IPv6 (use the resolvable hostname,
# not a literal IPv6 address — Erlang node names do not accept those).
sudo rabbitmqctl -n rabbit@rabbit-node1 status
```

## Forming a RabbitMQ Cluster over IPv6

```bash
# On node 2, join the cluster (node names use hostnames that resolve to IPv6)
sudo rabbitmqctl stop_app
sudo rabbitmqctl join_cluster rabbit@rabbit-node1
sudo rabbitmqctl start_app

# Verify cluster status
sudo rabbitmqctl cluster_status

# On node 3
sudo rabbitmqctl stop_app
sudo rabbitmqctl join_cluster rabbit@rabbit-node1
sudo rabbitmqctl start_app
```

## Connecting to RabbitMQ over IPv6

```python
# Python with pika over IPv6
import pika

# Connect to RabbitMQ via IPv6
credentials = pika.PlainCredentials('guest', 'guest')
parameters = pika.ConnectionParameters(
    host='2001:db8::1',   # IPv6 host (no brackets in pika)
    port=5672,
    credentials=credentials
)

connection = pika.BlockingConnection(parameters)
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='test_ipv6_queue', durable=True)

# Publish message
channel.basic_publish(
    exchange='',
    routing_key='test_ipv6_queue',
    body='Hello from IPv6 producer!'
)

print("Message sent over IPv6")
connection.close()
```

## TLS for RabbitMQ over IPv6

```bash
# /etc/rabbitmq/rabbitmq.conf
listeners.ssl.default = :::5671

ssl_options.cacertfile = /etc/ssl/certs/ca.crt
ssl_options.certfile   = /etc/ssl/certs/rabbitmq.crt
ssl_options.keyfile    = /etc/ssl/private/rabbitmq.key
ssl_options.verify     = verify_peer
ssl_options.fail_if_no_peer_cert = false
```

## Firewall Rules for RabbitMQ IPv6

```bash
# AMQP
sudo ip6tables -A INPUT -p tcp --dport 5672 -j ACCEPT
# AMQPS (TLS)
sudo ip6tables -A INPUT -p tcp --dport 5671 -j ACCEPT
# Management UI
sudo ip6tables -A INPUT -p tcp --dport 15672 -j ACCEPT
# Erlang distribution
sudo ip6tables -A INPUT -p tcp --dport 25672 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 4369 -j ACCEPT   # EPMD

sudo ip6tables-save > /etc/iptables/rules.v6
```

RabbitMQ's combination of Erlang distribution settings and AMQP listener configuration provides complete IPv6 support for message broker clusters, enabling event-driven architectures on IPv6 networks.
