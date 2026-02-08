# How to Implement Event-Driven Architecture with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Event-Driven Architecture, RabbitMQ, Kafka, Microservices, Message Queues, DevOps

Description: Build event-driven microservices with Docker using message brokers like RabbitMQ and Kafka for scalable, decoupled communication.

---

Event-driven architecture decouples services by having them communicate through events rather than direct API calls. Instead of Service A calling Service B synchronously, Service A publishes an event to a message broker, and Service B consumes that event when it is ready. This approach makes your system more resilient, scalable, and maintainable.

Docker is the perfect platform for running event-driven systems because each component - producers, consumers, and the message broker - runs in its own container, independently scalable and deployable.

## Core Concepts

In event-driven architecture, three roles exist. **Producers** generate events when something happens (a user signs up, an order is placed). **Consumers** listen for events and react to them (send a welcome email, update inventory). **Brokers** sit between producers and consumers, storing and routing events (RabbitMQ, Kafka, Redis Streams).

The broker decouples producers from consumers. Producers do not need to know who will process their events. Consumers do not need to know where events originate. This independence lets you add, remove, and scale services without affecting others.

```mermaid
graph LR
    P1[Order Service] -->|OrderPlaced| B[Message Broker]
    P2[User Service] -->|UserCreated| B
    B -->|OrderPlaced| C1[Inventory Service]
    B -->|OrderPlaced| C2[Email Service]
    B -->|UserCreated| C2
    B -->|UserCreated| C3[Analytics Service]
```

## Setting Up RabbitMQ with Docker

RabbitMQ is a popular choice for event-driven systems. It supports multiple messaging patterns and has excellent Docker support.

Docker Compose configuration for RabbitMQ with management UI:

```yaml
# docker-compose.yml
version: "3.8"

services:
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports:
      - "5672:5672"    # AMQP protocol
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secretpass
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  rabbitmq-data:
```

Start it and access the management UI at `http://localhost:15672`.

## Building an Event Producer

Here is a Node.js service that publishes events to RabbitMQ when orders are created.

The order service produces OrderPlaced events:

```javascript
// order-service/index.js
// Publishes OrderPlaced events to RabbitMQ when orders are created

const express = require("express");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

let channel = null;
const EXCHANGE = "events";

async function connectRabbitMQ() {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:secretpass@rabbitmq:5672"
      );
      channel = await connection.createChannel();

      // Declare a topic exchange for routing events
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });

      console.log("Connected to RabbitMQ");
      return;
    } catch (err) {
      console.log(`RabbitMQ not ready, retrying in 3s... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw new Error("Could not connect to RabbitMQ");
}

// Publish an event to the exchange
function publishEvent(routingKey, data) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: routingKey,
    timestamp: new Date().toISOString(),
    data: data,
  };

  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: "application/json",
  });

  console.log(`Published event: ${routingKey}`, event.id);
}

app.post("/orders", (req, res) => {
  const order = {
    orderId: `ord_${Date.now()}`,
    customerId: req.body.customerId,
    items: req.body.items,
    total: req.body.total,
  };

  // Publish the event
  publishEvent("order.placed", order);

  res.status(201).json({ message: "Order created", order });
});

connectRabbitMQ().then(() => {
  app.listen(3000, () => console.log("Order service running on port 3000"));
});
```

## Building Event Consumers

Create separate consumer services that react to events independently.

The email service consumes events and sends notifications:

```javascript
// email-service/index.js
// Consumes OrderPlaced and UserCreated events to send emails

const amqp = require("amqplib");

const EXCHANGE = "events";
const QUEUE = "email-service";

async function startConsumer() {
  const maxRetries = 10;
  let connection, channel;

  for (let i = 0; i < maxRetries; i++) {
    try {
      connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:secretpass@rabbitmq:5672"
      );
      channel = await connection.createChannel();
      break;
    } catch (err) {
      console.log(`Waiting for RabbitMQ... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Declare exchange and queue
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });

  // Bind to events this service cares about
  await channel.bindQueue(QUEUE, EXCHANGE, "order.placed");
  await channel.bindQueue(QUEUE, EXCHANGE, "user.created");

  // Limit to 1 unacknowledged message at a time
  await channel.prefetch(1);

  console.log("Email service waiting for events...");

  channel.consume(QUEUE, async (msg) => {
    const event = JSON.parse(msg.content.toString());
    console.log(`Received event: ${event.type}`, event.id);

    try {
      switch (event.type) {
        case "order.placed":
          await sendOrderConfirmation(event.data);
          break;
        case "user.created":
          await sendWelcomeEmail(event.data);
          break;
        default:
          console.log(`Unknown event type: ${event.type}`);
      }

      // Acknowledge successful processing
      channel.ack(msg);
    } catch (err) {
      console.error(`Error processing event: ${err.message}`);
      // Reject and requeue for retry
      channel.nack(msg, false, true);
    }
  });
}

async function sendOrderConfirmation(order) {
  console.log(`Sending order confirmation for ${order.orderId} to customer ${order.customerId}`);
  // Actual email sending logic goes here
}

async function sendWelcomeEmail(user) {
  console.log(`Sending welcome email to ${user.email}`);
  // Actual email sending logic goes here
}

startConsumer().catch(console.error);
```

The inventory service consumes order events to update stock:

```javascript
// inventory-service/index.js
// Consumes OrderPlaced events to update inventory

const amqp = require("amqplib");

const EXCHANGE = "events";
const QUEUE = "inventory-service";

async function startConsumer() {
  let connection, channel;
  const maxRetries = 10;

  for (let i = 0; i < maxRetries; i++) {
    try {
      connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:secretpass@rabbitmq:5672"
      );
      channel = await connection.createChannel();
      break;
    } catch (err) {
      console.log(`Waiting for RabbitMQ... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });

  // Only listen to order events
  await channel.bindQueue(QUEUE, EXCHANGE, "order.*");
  await channel.prefetch(1);

  console.log("Inventory service waiting for events...");

  channel.consume(QUEUE, async (msg) => {
    const event = JSON.parse(msg.content.toString());

    if (event.type === "order.placed") {
      for (const item of event.data.items) {
        console.log(`Reducing stock for ${item.productId} by ${item.quantity}`);
        // Database update logic here
      }
    }

    channel.ack(msg);
  });
}

startConsumer().catch(console.error);
```

## The Complete Docker Compose Setup

Tie all services together in a single Compose file:

```yaml
# docker-compose.yml
version: "3.8"

services:
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secretpass
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 5

  order-service:
    build: ./order-service
    ports:
      - "3000:3000"
    environment:
      RABBITMQ_URL: amqp://admin:secretpass@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy

  email-service:
    build: ./email-service
    environment:
      RABBITMQ_URL: amqp://admin:secretpass@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy

  inventory-service:
    build: ./inventory-service
    environment:
      RABBITMQ_URL: amqp://admin:secretpass@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy

volumes:
  rabbitmq-data:
```

Scale consumers independently based on load:

```bash
docker compose up -d --scale email-service=3 --scale inventory-service=2
```

## Using Kafka for High-Throughput Events

For systems processing millions of events per second, Apache Kafka is the standard choice.

Docker Compose for a Kafka cluster using KRaft mode (no Zookeeper):

```yaml
version: "3.8"

services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
    volumes:
      - kafka-data:/var/lib/kafka/data

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092

volumes:
  kafka-data:
```

## Dead Letter Queues

Handle failed events with dead letter queues to prevent message loss:

```javascript
// Set up a dead letter exchange and queue
await channel.assertExchange("dlx", "direct", { durable: true });
await channel.assertQueue("dead-letters", { durable: true });
await channel.bindQueue("dead-letters", "dlx", "");

// Create the main queue with dead letter configuration
await channel.assertQueue("email-service", {
  durable: true,
  arguments: {
    "x-dead-letter-exchange": "dlx",
    "x-message-ttl": 300000, // 5 minutes TTL
  },
});
```

When a message is rejected without requeue, it automatically moves to the dead letter queue for later inspection and manual retry.

## Conclusion

Event-driven architecture with Docker gives you loosely coupled, independently scalable services. RabbitMQ handles most use cases well with its routing flexibility. Kafka excels at high-throughput scenarios where you need durable event logs. Docker Compose makes it straightforward to run the entire event-driven system locally. Start with a single event type, get the producer-broker-consumer pipeline working, then expand to more events and services as your system grows. The key is to design your events as immutable facts about what happened, not commands about what should happen.
