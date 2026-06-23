# Validation Summary: How to Use RabbitMQ with Pika in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- RabbitMQ (message broker)
- Pika (synchronous AMQP 0-9-1 client)
- aio-pika (asyncio AMQP client)
- AMQP 0-9-1 (exchanges, queues, bindings, routing)
- Docker (RabbitMQ management image)

## Sources Consulted
- Pika documentation — https://pika.readthedocs.io/en/stable/
- Pika `BlockingConnection` / `BlockingChannel` API — https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Pika exceptions module (`UnroutableError`, `NackError`, `AMQPConnectionError`, `ChannelClosedByBroker`) — https://pika.readthedocs.io/en/stable/modules/exceptions.html
- RabbitMQ tutorials (Python/Pika) — https://www.rabbitmq.com/tutorials
- RabbitMQ topic exchange / AMQP concepts — https://www.rabbitmq.com/tutorials/amqp-concepts.html
- RabbitMQ priority queues — https://www.rabbitmq.com/priority.html
- RabbitMQ dead letter exchanges — https://www.rabbitmq.com/dlx.html
- RabbitMQ publisher confirms — https://www.rabbitmq.com/confirms.html
- aio-pika documentation — https://aio-pika.readthedocs.io/en/latest/
- Docker Hub `rabbitmq` image — https://hub.docker.com/_/rabbitmq

## Issues Found
1. **Health check used a non-existent Pika internal attribute** (`check_connection`). The code read `connection._impl.transport.params.host` to report the host. Pika's connection internals do not expose a `transport.params` attribute, so this line raises `AttributeError`, which is swallowed by the broad `except Exception`, causing `check_connection` to report `"unhealthy"` even when the connection succeeds. Changed it to `self.parameters.host`, which the class already holds, so a successful connection now correctly reports `"healthy"`.

2. **`rpc_client.py` was missing `import time`.** The `call()` method uses `time.time()` for its timeout loop, but the module's top-level imports omitted `time` (it was only imported in the trailing usage snippet). As a standalone file this raises `NameError`. Added `import time` to the `rpc_client.py` import block.

## Review Notes
- `datetime.utcnow()` is used in several places. It still works but is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. Not changed since it remains functional and is widely used; worth modernizing in a future revision.
- The robust consumer's retry path calls `time.sleep(delay)` inside the message callback, which blocks the connection's I/O loop (and can interfere with heartbeats for long delays). The post acknowledges this ("using a delayed message plugin or sleep"); for production, a delayed-message plugin or a delay queue with TTL + DLX is preferable. Left as-is since it is presented as an illustrative example.
- The `heartbeat=600` comment ("Send heartbeat every 10 minutes") is slightly imprecise: 600 is the negotiated heartbeat *timeout* in seconds; Pika sends heartbeat frames at roughly half that interval. The numeric value is correct, so left unchanged.
- Topic-exchange wildcard semantics (`*` matches exactly one word, `#` matches zero or more) and the worked routing examples are accurate.
- Pika exception names, `confirm_delivery()` + `mandatory=True` behavior with `BlockingConnection`, passive queue declaration, DLX/DLQ argument keys (`x-dead-letter-exchange`, `x-message-ttl`, `x-max-priority`), and the aio-pika API (`connect_robust`, `set_qos`, `declare_queue`, `message.process()`) all verified correct and current.
