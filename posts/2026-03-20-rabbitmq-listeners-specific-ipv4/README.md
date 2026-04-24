# How to Configure RabbitMQ Listeners on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, IPv4, Listeners, Configuration, AMQP, Messaging

Description: Configure RabbitMQ to listen on specific IPv4 addresses for AMQP and management traffic using rabbitmq.conf, restricting exposure to intended network interfaces.

## Introduction

RabbitMQ defaults to listening on port 5672 on all available interfaces for AMQP. When the management plugin is enabled, its HTTP listener also binds to all available interfaces on port 15672. On multi-homed servers, binding to a specific IPv4 address limits exposure to the intended network interface.

## Configuration

```bash
# /etc/rabbitmq/rabbitmq.conf

# Bind AMQP listener to specific IPv4

listeners.tcp.1 = 10.0.0.5:5672

# Also bind to localhost for local AMQP clients
listeners.tcp.2 = 127.0.0.1:5672

# Management plugin binding
management.tcp.ip = 10.0.0.5
management.tcp.port = 15672
```

## Advanced Binding with rabbitmq.conf

```bash
# /etc/rabbitmq/rabbitmq.conf

# Multiple listeners on different interfaces/ports
listeners.tcp.1 = 127.0.0.1:5672
listeners.tcp.2 = 10.0.0.5:5672
listeners.tcp.3 = 10.0.0.5:5673   # Second AMQP port (optional)

# Use only the explicitly configured client listeners
# Note: specifying listeners.tcp.* replaces the default listeners.tcp.default = 5672 listener

# Network settings
tcp_listen_options.backlog = 128
tcp_listen_options.nodelay = true
```

## Erlang-Style Configuration (advanced.config)

```erlang
%% /etc/rabbitmq/advanced.config
%% Use when rabbitmq.conf doesn't support the needed options

[
  {rabbit, [
    {tcp_listeners, [{"10.0.0.5", 5672}, {"127.0.0.1", 5672}]}
  ]}
].
```

## Verifying the Configuration

```bash
# Restart RabbitMQ
sudo systemctl restart rabbitmq-server

# Confirm the node started successfully
sudo rabbitmq-diagnostics status

# Check what ports RabbitMQ is listening on
sudo ss -tlnp | grep -E "beam|rabbitmq|:5672|:15672"
# Expected: 10.0.0.5:5672, 127.0.0.1:5672, and 10.0.0.5:15672

# List active listeners via RabbitMQ CLI
sudo rabbitmq-diagnostics listeners
# Shows interface, port, protocol, and purpose
```

## Testing Connections

```bash
# Test AMQP connection on specific IP
# Use a non-guest user for non-loopback connections
python3 -c "
import pika
credentials = pika.PlainCredentials('appuser', 'strong-password')
params = pika.ConnectionParameters(
    host='10.0.0.5',
    port=5672,
    virtual_host='/',
    credentials=credentials,
)
conn = pika.BlockingConnection(params)
print('Connected')
conn.close()
"

# Test local RabbitMQ CLI access
sudo rabbitmq-diagnostics ping

# Test that an unbound interface address is NOT accessible
nc -zv 10.0.0.6 5672   # Should fail if 10.0.0.6 is another local address not configured above
nc -zv 10.0.0.5 5672  # Should succeed
```

## Conclusion

Specify RabbitMQ listeners with `listeners.tcp.N = ip:port` in `rabbitmq.conf`. This replaces the default `listeners.tcp.default = 5672` listener. Include `127.0.0.1:5672` only if local AMQP clients need loopback access. Verify with `rabbitmq-diagnostics listeners` and `ss -tlnp` after restarting. For management plugin binding, use `management.tcp.ip` and `management.tcp.port`. RabbitMQ CLI tools use the distribution listener, configured separately from AMQP listeners.
