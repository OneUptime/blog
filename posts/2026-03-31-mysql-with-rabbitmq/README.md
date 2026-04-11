# How to Use MySQL with RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, RabbitMQ, Message Queue, Integration, Event

Description: Learn how to integrate MySQL with RabbitMQ by publishing database events to queues, ensuring transactional consistency with the outbox pattern, and consuming messages reliably.

---

## Why Combine MySQL and RabbitMQ?

MySQL handles durable data storage while RabbitMQ handles asynchronous messaging. Together they decouple services: a database write triggers a RabbitMQ message that downstream services consume without blocking the original transaction.

## The Challenge: Dual-Write Consistency

Naively writing to both MySQL and RabbitMQ in sequence creates a consistency risk - the database write may succeed but the queue publish may fail, or vice versa. The outbox pattern solves this.

## Implementing the Outbox Pattern

Store outgoing messages in the database within the same transaction as the business data:

```sql
CREATE TABLE outbox_messages (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  exchange     VARCHAR(200) NOT NULL,
  routing_key  VARCHAR(200) NOT NULL,
  payload      JSON NOT NULL,
  status       ENUM('pending','published','failed') NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME DEFAULT NULL,
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB;
```

Write the outbox record in the same transaction as the order:

```sql
START TRANSACTION;

INSERT INTO orders (customer_id, total_amount) VALUES (101, 299.99);

INSERT INTO outbox_messages (exchange, routing_key, payload)
VALUES (
  'orders',
  'orders.created',
  JSON_OBJECT('order_id', LAST_INSERT_ID(), 'customer_id', 101, 'amount', 299.99)
);

COMMIT;
```

## Outbox Relay: Polling and Publishing

A background process polls pending outbox messages and publishes them to RabbitMQ:

```python
import pika
import mysql.connector
import json

conn = mysql.connector.connect(host="db", user="app", password="secret", database="myapp")
rmq  = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
channel = rmq.channel()
channel.exchange_declare(exchange='orders', exchange_type='topic', durable=True)

cur = conn.cursor(dictionary=True)
cur.execute("""
  SELECT id, exchange, routing_key, payload
  FROM outbox_messages
  WHERE status = 'pending'
  ORDER BY id ASC LIMIT 100
  FOR UPDATE SKIP LOCKED
""")
messages = cur.fetchall()

for msg in messages:
    try:
        channel.basic_publish(
            exchange=msg['exchange'],
            routing_key=msg['routing_key'],
            body=msg['payload'],
            properties=pika.BasicProperties(delivery_mode=2)  # persistent
        )
        cur.execute("UPDATE outbox_messages SET status='published', published_at=NOW() WHERE id=%s",
                    (msg['id'],))
    except Exception:
        cur.execute("UPDATE outbox_messages SET status='failed' WHERE id=%s", (msg['id'],))

conn.commit()
```

## Consuming RabbitMQ Messages to Write to MySQL

A consumer receives RabbitMQ messages and writes to MySQL:

```python
def on_message(ch, method, properties, body):
    data = json.loads(body)
    cur.execute(
        "INSERT INTO order_events (order_id, event_type, payload) VALUES (%s, %s, %s)",
        (data['order_id'], method.routing_key, body.decode())
    )
    conn.commit()
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(queue='order-events', on_message_callback=on_message)
channel.start_consuming()
```

## Summary

Integrate MySQL with RabbitMQ using the outbox pattern to guarantee consistency. Store outbox records in the same MySQL transaction as business data, then relay them to RabbitMQ with a background poller using `SELECT FOR UPDATE SKIP LOCKED`. Consumers process messages and write results back to MySQL, using message acknowledgments to prevent loss.
