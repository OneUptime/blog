# How to Build RabbitMQ Consumers with Pika in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, RabbitMQ, Pika, Message Queue, Async, Microservices, Event-Driven Architecture, Consumers

Description: Learn how to build robust RabbitMQ consumers in Python using Pika. This guide covers connection management, message acknowledgment, error handling, prefetch settings, and patterns for building reliable message-driven applications.

---

> Message queues are the backbone of distributed systems. RabbitMQ provides reliable message delivery between services, and Pika is the official Python client for interacting with it. This guide shows you how to build production-ready consumers that handle messages reliably.

When building microservices or distributed applications, you need a way for services to communicate asynchronously. RabbitMQ excels at this, providing durable queues, routing capabilities, and delivery guarantees. Pika gives you full control over how your Python application consumes and processes messages.

---

## Setting Up RabbitMQ

### Running RabbitMQ with Docker

Start RabbitMQ locally with the management plugin for monitoring:

```bash
# Run RabbitMQ with management UI
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password \
  rabbitmq:3-management
```

Access the management UI at http://localhost:15672 with admin/password.

### Installing Pika

Install Pika and related packages:

```bash
pip install pika pydantic
```

---

## Connection Management

### Building a Robust Connection Handler

Create a connection manager that handles reconnection and channel management:

```python
# rabbitmq/connection.py
# RabbitMQ connection manager with automatic reconnection
import pika
import time
import logging
from typing import Optional, Callable
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RabbitMQConnection:
    """
    Manages RabbitMQ connections with automatic reconnection.
    Handles connection failures gracefully.
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 5672,
        username: str = "guest",
        password: str = "guest",
        virtual_host: str = "/",
        heartbeat: int = 600,
        connection_attempts: int = 3,
        retry_delay: int = 5,
    ):
        # Store connection parameters
        self.credentials = pika.PlainCredentials(username, password)
        self.parameters = pika.ConnectionParameters(
            host=host,
            port=port,
            virtual_host=virtual_host,
            credentials=self.credentials,
            heartbeat=heartbeat,
            connection_attempts=connection_attempts,
            retry_delay=retry_delay,
            # Block connection until established
            blocked_connection_timeout=300,
        )

        self._connection: Optional[pika.BlockingConnection] = None
        self._channel: Optional[pika.channel.Channel] = None

    def connect(self) -> pika.BlockingConnection:
        """
        Establish connection to RabbitMQ.
        Retries on failure with exponential backoff.
        """
        max_retries = 5
        retry_count = 0

        while retry_count < max_retries:
            try:
                logger.info("Connecting to RabbitMQ...")
                self._connection = pika.BlockingConnection(self.parameters)
                logger.info("Connected to RabbitMQ")
                return self._connection

            except pika.exceptions.AMQPConnectionError as e:
                retry_count += 1
                wait_time = min(2 ** retry_count, 60)  # Cap at 60 seconds
                logger.warning(
                    f"Connection failed: {e}. "
                    f"Retry {retry_count}/{max_retries} in {wait_time}s"
                )
                time.sleep(wait_time)

        raise ConnectionError("Failed to connect to RabbitMQ after multiple attempts")

    def get_channel(self) -> pika.channel.Channel:
        """
        Get a channel, creating connection if needed.
        Channels are lightweight and can be recreated.
        """
        if self._connection is None or self._connection.is_closed:
            self.connect()

        if self._channel is None or self._channel.is_closed:
            self._channel = self._connection.channel()

        return self._channel

    def close(self):
        """Close connection and channel gracefully."""
        try:
            if self._channel and self._channel.is_open:
                self._channel.close()
            if self._connection and self._connection.is_open:
                self._connection.close()
            logger.info("RabbitMQ connection closed")
        except Exception as e:
            logger.error(f"Error closing connection: {e}")

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def with_reconnection(func: Callable) -> Callable:
    """
    Decorator that handles connection drops.
    Automatically reconnects and retries the operation.
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return func(self, *args, **kwargs)
            except (pika.exceptions.AMQPConnectionError,
                    pika.exceptions.ChannelClosedByBroker) as e:
                logger.warning(f"Connection error: {e}. Reconnecting...")
                self.connection.connect()
                if attempt == max_retries - 1:
                    raise
        return None
    return wrapper
```

---

## Basic Consumer

### Simple Message Consumer

Start with a basic consumer that processes messages from a queue:

```python
# consumers/basic_consumer.py
# Basic RabbitMQ consumer with manual acknowledgment
import pika
import json
import logging
from typing import Callable, Any
from rabbitmq.connection import RabbitMQConnection

logger = logging.getLogger(__name__)


class BasicConsumer:
    """
    Simple message consumer with manual acknowledgment.
    Processes one message at a time.
    """

    def __init__(
        self,
        queue_name: str,
        connection: RabbitMQConnection = None,
        prefetch_count: int = 1,
    ):
        self.queue_name = queue_name
        self.connection = connection or RabbitMQConnection()
        self.prefetch_count = prefetch_count
        self._consuming = False

    def setup_queue(self):
        """
        Declare the queue with durability.
        Durable queues survive broker restarts.
        """
        channel = self.connection.get_channel()

        # Declare a durable queue
        channel.queue_declare(
            queue=self.queue_name,
            durable=True,  # Survive broker restart
            arguments={
                # Optional: Set message TTL (milliseconds)
                # 'x-message-ttl': 86400000,  # 24 hours
                # Optional: Dead letter exchange for failed messages
                # 'x-dead-letter-exchange': 'dlx',
            }
        )

        # Set prefetch to control how many unacked messages
        # the consumer can have at once
        channel.basic_qos(prefetch_count=self.prefetch_count)

        logger.info(f"Queue '{self.queue_name}' declared")

    def consume(self, message_handler: Callable[[dict], None]):
        """
        Start consuming messages from the queue.
        Calls message_handler for each message received.
        """
        self.setup_queue()
        channel = self.connection.get_channel()

        def callback(ch, method, properties, body):
            """Internal callback that wraps the message handler."""
            try:
                # Parse JSON message
                message = json.loads(body.decode('utf-8'))
                logger.debug(f"Received message: {method.delivery_tag}")

                # Process the message
                message_handler(message)

                # Acknowledge successful processing
                ch.basic_ack(delivery_tag=method.delivery_tag)
                logger.debug(f"Message {method.delivery_tag} acknowledged")

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in message: {e}")
                # Reject message without requeue (bad message format)
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            except Exception as e:
                logger.error(f"Error processing message: {e}")
                # Reject and requeue for retry
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        # Register consumer
        channel.basic_consume(
            queue=self.queue_name,
            on_message_callback=callback,
            auto_ack=False,  # Manual acknowledgment
        )

        logger.info(f"Starting to consume from '{self.queue_name}'")
        self._consuming = True

        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Stopping consumer...")
            channel.stop_consuming()
        finally:
            self._consuming = False
            self.connection.close()

    def stop(self):
        """Stop the consumer gracefully."""
        if self._consuming:
            channel = self.connection.get_channel()
            channel.stop_consuming()


# Example usage
def process_order(message: dict):
    """Handler function for order messages."""
    order_id = message.get('order_id')
    customer = message.get('customer_id')
    print(f"Processing order {order_id} for customer {customer}")
    # Add your processing logic here


if __name__ == "__main__":
    consumer = BasicConsumer(queue_name="orders")
    consumer.consume(process_order)
```

---

## Advanced Consumer Patterns

### Consumer with Dead Letter Queue

Handle failed messages by routing them to a dead letter queue:

```python
# consumers/dlq_consumer.py
# Consumer with dead letter queue for failed messages
import pika
import json
import logging
from typing import Callable, Optional
from dataclasses import dataclass
from rabbitmq.connection import RabbitMQConnection

logger = logging.getLogger(__name__)


@dataclass
class ConsumerConfig:
    """Configuration for the consumer."""
    queue_name: str
    prefetch_count: int = 10
    max_retries: int = 3
    retry_delay_ms: int = 5000
    dlq_enabled: bool = True


class DLQConsumer:
    """
    Consumer with dead letter queue support.
    Failed messages are sent to DLQ after max retries.
    """

    def __init__(self, config: ConsumerConfig, connection: RabbitMQConnection = None):
        self.config = config
        self.connection = connection or RabbitMQConnection()
        self.dlq_name = f"{config.queue_name}.dlq"
        self.retry_queue = f"{config.queue_name}.retry"

    def setup_queues(self):
        """
        Set up main queue, retry queue, and dead letter queue.
        Creates the exchange and binding topology.
        """
        channel = self.connection.get_channel()

        # Dead letter exchange for failed messages
        channel.exchange_declare(
            exchange="dlx",
            exchange_type="direct",
            durable=True,
        )

        # Retry exchange for delayed retries
        channel.exchange_declare(
            exchange="retry",
            exchange_type="direct",
            durable=True,
        )

        # Dead letter queue
        channel.queue_declare(
            queue=self.dlq_name,
            durable=True,
        )
        channel.queue_bind(
            queue=self.dlq_name,
            exchange="dlx",
            routing_key=self.config.queue_name,
        )

        # Retry queue with TTL - messages return to main queue after delay
        channel.queue_declare(
            queue=self.retry_queue,
            durable=True,
            arguments={
                'x-message-ttl': self.config.retry_delay_ms,
                'x-dead-letter-exchange': '',  # Default exchange
                'x-dead-letter-routing-key': self.config.queue_name,
            }
        )
        channel.queue_bind(
            queue=self.retry_queue,
            exchange="retry",
            routing_key=self.config.queue_name,
        )

        # Main queue with DLQ routing
        channel.queue_declare(
            queue=self.config.queue_name,
            durable=True,
            arguments={
                'x-dead-letter-exchange': 'dlx',
                'x-dead-letter-routing-key': self.config.queue_name,
            }
        )

        channel.basic_qos(prefetch_count=self.config.prefetch_count)
        logger.info(f"Queues configured for '{self.config.queue_name}'")

    def _get_retry_count(self, properties: pika.BasicProperties) -> int:
        """Extract retry count from message headers."""
        if properties.headers and 'x-retry-count' in properties.headers:
            return properties.headers['x-retry-count']
        return 0

    def _retry_message(
        self,
        channel: pika.channel.Channel,
        body: bytes,
        properties: pika.BasicProperties,
        delivery_tag: int,
    ):
        """Send message to retry queue with incremented retry count."""
        retry_count = self._get_retry_count(properties) + 1

        # Update headers with retry count
        headers = dict(properties.headers) if properties.headers else {}
        headers['x-retry-count'] = retry_count

        new_properties = pika.BasicProperties(
            delivery_mode=2,  # Persistent
            headers=headers,
            content_type=properties.content_type,
            correlation_id=properties.correlation_id,
        )

        # Publish to retry queue
        channel.basic_publish(
            exchange="retry",
            routing_key=self.config.queue_name,
            body=body,
            properties=new_properties,
        )

        # Acknowledge original message
        channel.basic_ack(delivery_tag=delivery_tag)
        logger.info(f"Message sent to retry queue (attempt {retry_count})")

    def _send_to_dlq(
        self,
        channel: pika.channel.Channel,
        body: bytes,
        properties: pika.BasicProperties,
        delivery_tag: int,
        error: str,
    ):
        """Send message to dead letter queue with error info."""
        headers = dict(properties.headers) if properties.headers else {}
        headers['x-error'] = str(error)
        headers['x-final-retry-count'] = self._get_retry_count(properties)

        new_properties = pika.BasicProperties(
            delivery_mode=2,
            headers=headers,
            content_type=properties.content_type,
        )

        channel.basic_publish(
            exchange="dlx",
            routing_key=self.config.queue_name,
            body=body,
            properties=new_properties,
        )

        channel.basic_ack(delivery_tag=delivery_tag)
        logger.warning(f"Message sent to DLQ after {self.config.max_retries} retries")

    def consume(self, handler: Callable[[dict], None]):
        """Start consuming with retry and DLQ support."""
        self.setup_queues()
        channel = self.connection.get_channel()

        def callback(ch, method, properties, body):
            retry_count = self._get_retry_count(properties)

            try:
                message = json.loads(body.decode('utf-8'))
                handler(message)
                ch.basic_ack(delivery_tag=method.delivery_tag)

            except Exception as e:
                logger.error(f"Processing failed: {e}")

                if retry_count < self.config.max_retries:
                    self._retry_message(ch, body, properties, method.delivery_tag)
                else:
                    self._send_to_dlq(ch, body, properties, method.delivery_tag, str(e))

        channel.basic_consume(
            queue=self.config.queue_name,
            on_message_callback=callback,
            auto_ack=False,
        )

        logger.info(f"Consuming from '{self.config.queue_name}' with DLQ support")
        channel.start_consuming()
```

---

## Topic-Based Consumer

### Subscribe to Message Patterns

Use topic exchanges for flexible message routing:

```python
# consumers/topic_consumer.py
# Topic-based consumer for pattern matching subscriptions
import pika
import json
import logging
from typing import Callable, List
from rabbitmq.connection import RabbitMQConnection

logger = logging.getLogger(__name__)


class TopicConsumer:
    """
    Consumer that subscribes to messages matching topic patterns.
    Supports wildcards: * (one word) and # (zero or more words).
    """

    def __init__(
        self,
        exchange_name: str,
        binding_keys: List[str],
        connection: RabbitMQConnection = None,
        prefetch_count: int = 10,
    ):
        self.exchange_name = exchange_name
        self.binding_keys = binding_keys
        self.connection = connection or RabbitMQConnection()
        self.prefetch_count = prefetch_count
        self.queue_name = None  # Will be auto-generated

    def setup(self):
        """Configure exchange and queue with topic bindings."""
        channel = self.connection.get_channel()

        # Declare topic exchange
        channel.exchange_declare(
            exchange=self.exchange_name,
            exchange_type="topic",
            durable=True,
        )

        # Create exclusive queue for this consumer
        result = channel.queue_declare(
            queue='',  # Auto-generate name
            exclusive=True,  # Delete when consumer disconnects
            durable=False,
        )
        self.queue_name = result.method.queue

        # Bind queue to exchange with each routing key pattern
        for binding_key in self.binding_keys:
            channel.queue_bind(
                exchange=self.exchange_name,
                queue=self.queue_name,
                routing_key=binding_key,
            )
            logger.info(f"Bound to '{binding_key}' on '{self.exchange_name}'")

        channel.basic_qos(prefetch_count=self.prefetch_count)

    def consume(self, handler: Callable[[str, dict], None]):
        """
        Start consuming topic messages.
        Handler receives (routing_key, message).
        """
        self.setup()
        channel = self.connection.get_channel()

        def callback(ch, method, properties, body):
            try:
                message = json.loads(body.decode('utf-8'))
                routing_key = method.routing_key

                logger.debug(f"Received on '{routing_key}'")
                handler(routing_key, message)

                ch.basic_ack(delivery_tag=method.delivery_tag)

            except Exception as e:
                logger.error(f"Error: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        channel.basic_consume(
            queue=self.queue_name,
            on_message_callback=callback,
            auto_ack=False,
        )

        logger.info(f"Consuming topics: {self.binding_keys}")
        channel.start_consuming()


# Example: Subscribe to order events
def handle_order_event(routing_key: str, message: dict):
    """Handle order-related events based on routing key."""
    if routing_key.startswith("orders.created"):
        print(f"New order: {message['order_id']}")
    elif routing_key.startswith("orders.shipped"):
        print(f"Order shipped: {message['order_id']}")
    elif routing_key.startswith("orders.cancelled"):
        print(f"Order cancelled: {message['order_id']}")


if __name__ == "__main__":
    # Subscribe to all order events
    consumer = TopicConsumer(
        exchange_name="events",
        binding_keys=[
            "orders.created.*",   # All created events
            "orders.shipped.#",   # All shipped events
            "orders.cancelled.#", # All cancelled events
        ]
    )
    consumer.consume(handle_order_event)
```

---

## Message Publisher

### Publishing Messages to Queues

Create a publisher for sending messages:

```python
# rabbitmq/publisher.py
# Message publisher with delivery confirmation
import pika
import json
import logging
from typing import Optional, Dict, Any
from rabbitmq.connection import RabbitMQConnection

logger = logging.getLogger(__name__)


class MessagePublisher:
    """
    Publishes messages with delivery confirmation.
    Supports direct queue and exchange publishing.
    """

    def __init__(self, connection: RabbitMQConnection = None):
        self.connection = connection or RabbitMQConnection()

    def publish_to_queue(
        self,
        queue_name: str,
        message: Dict[str, Any],
        correlation_id: Optional[str] = None,
        priority: int = 0,
    ) -> bool:
        """
        Publish message directly to a queue.
        Returns True if message was confirmed by broker.
        """
        channel = self.connection.get_channel()

        # Enable delivery confirmations
        channel.confirm_delivery()

        # Ensure queue exists
        channel.queue_declare(queue=queue_name, durable=True)

        properties = pika.BasicProperties(
            delivery_mode=2,  # Persistent message
            content_type='application/json',
            correlation_id=correlation_id,
            priority=priority,
        )

        try:
            channel.basic_publish(
                exchange='',  # Default exchange
                routing_key=queue_name,
                body=json.dumps(message).encode('utf-8'),
                properties=properties,
                mandatory=True,  # Ensure message reaches a queue
            )
            logger.info(f"Published to queue '{queue_name}'")
            return True

        except pika.exceptions.UnroutableError:
            logger.error(f"Message could not be routed to '{queue_name}'")
            return False

    def publish_to_exchange(
        self,
        exchange_name: str,
        routing_key: str,
        message: Dict[str, Any],
        exchange_type: str = "topic",
    ) -> bool:
        """Publish message to an exchange with routing key."""
        channel = self.connection.get_channel()
        channel.confirm_delivery()

        # Declare exchange
        channel.exchange_declare(
            exchange=exchange_name,
            exchange_type=exchange_type,
            durable=True,
        )

        properties = pika.BasicProperties(
            delivery_mode=2,
            content_type='application/json',
        )

        try:
            channel.basic_publish(
                exchange=exchange_name,
                routing_key=routing_key,
                body=json.dumps(message).encode('utf-8'),
                properties=properties,
            )
            logger.info(f"Published to '{exchange_name}' with key '{routing_key}'")
            return True

        except Exception as e:
            logger.error(f"Failed to publish: {e}")
            return False

    def publish_batch(
        self,
        queue_name: str,
        messages: list[Dict[str, Any]],
    ) -> int:
        """
        Publish multiple messages efficiently.
        Returns count of successfully published messages.
        """
        channel = self.connection.get_channel()
        channel.confirm_delivery()
        channel.queue_declare(queue=queue_name, durable=True)

        published = 0
        properties = pika.BasicProperties(
            delivery_mode=2,
            content_type='application/json',
        )

        for message in messages:
            try:
                channel.basic_publish(
                    exchange='',
                    routing_key=queue_name,
                    body=json.dumps(message).encode('utf-8'),
                    properties=properties,
                )
                published += 1
            except Exception as e:
                logger.error(f"Failed to publish message: {e}")

        logger.info(f"Published {published}/{len(messages)} messages")
        return published


# Example usage
if __name__ == "__main__":
    publisher = MessagePublisher()

    # Publish single message
    publisher.publish_to_queue(
        queue_name="orders",
        message={"order_id": "ORD-001", "customer_id": "CUST-123"},
    )

    # Publish to topic exchange
    publisher.publish_to_exchange(
        exchange_name="events",
        routing_key="orders.created.premium",
        message={"order_id": "ORD-002", "priority": "high"},
    )
```

---

## Async Consumer with asyncio

### Non-blocking Consumer

For applications that need async support:

```python
# consumers/async_consumer.py
# Async RabbitMQ consumer using aio-pika
import asyncio
import json
import logging
from typing import Callable, Awaitable
import aio_pika
from aio_pika import IncomingMessage

logger = logging.getLogger(__name__)


class AsyncConsumer:
    """
    Asynchronous RabbitMQ consumer using aio-pika.
    Integrates with asyncio event loops.
    """

    def __init__(
        self,
        queue_name: str,
        amqp_url: str = "amqp://guest:guest@localhost/",
        prefetch_count: int = 10,
    ):
        self.queue_name = queue_name
        self.amqp_url = amqp_url
        self.prefetch_count = prefetch_count
        self._connection = None
        self._channel = None

    async def connect(self):
        """Establish async connection to RabbitMQ."""
        self._connection = await aio_pika.connect_robust(self.amqp_url)
        self._channel = await self._connection.channel()
        await self._channel.set_qos(prefetch_count=self.prefetch_count)

        logger.info("Connected to RabbitMQ (async)")

    async def consume(
        self,
        handler: Callable[[dict], Awaitable[None]],
    ):
        """
        Start consuming messages asynchronously.
        Handler should be an async function.
        """
        await self.connect()

        # Declare queue
        queue = await self._channel.declare_queue(
            self.queue_name,
            durable=True,
        )

        async def process_message(message: IncomingMessage):
            async with message.process():
                try:
                    body = json.loads(message.body.decode())
                    await handler(body)
                except Exception as e:
                    logger.error(f"Processing error: {e}")
                    # Message will be requeued due to process() context

        # Start consuming
        await queue.consume(process_message)
        logger.info(f"Consuming from '{self.queue_name}'")

        # Keep running
        await asyncio.Future()

    async def close(self):
        """Close the connection."""
        if self._connection:
            await self._connection.close()


# Example usage
async def handle_message(message: dict):
    """Async message handler."""
    print(f"Processing: {message}")
    await asyncio.sleep(0.1)  # Simulate async work


async def main():
    consumer = AsyncConsumer(queue_name="orders")
    try:
        await consumer.consume(handle_message)
    except KeyboardInterrupt:
        await consumer.close()


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

1. **Always use manual acknowledgment** - Prevents message loss on consumer crashes
2. **Set appropriate prefetch counts** - Balance throughput and memory usage
3. **Implement dead letter queues** - Handle poison messages gracefully
4. **Use persistent messages** - Set delivery_mode=2 for durability
5. **Handle connection failures** - Implement reconnection logic
6. **Monitor queue depths** - Set up alerts for growing queues
7. **Use correlation IDs** - Track messages through the system
8. **Idempotent handlers** - Messages may be delivered more than once

---

*Running RabbitMQ in production? [OneUptime](https://oneuptime.com) provides queue monitoring, consumer health checks, and alerting to keep your message-driven systems running smoothly.*

**Related Reading:**
- [How to Build Event-Sourced Apps with EventStoreDB in Python](https://oneuptime.com/blog/post/2026-01-24-event-sourcing-eventstoredb-python/view)
- [How to Implement CQRS Pattern in Python](https://oneuptime.com/blog/post/2026-01-22-cqrs-pattern-python/view)
