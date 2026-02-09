# How to Implement Exactly-Once Event Processing with Knative and Kafka on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kafka, Kubernetes, Exactly-Once, Event-Processing

Description: Implement exactly-once semantics for event processing using Knative Eventing with Kafka to ensure reliable message delivery without duplicates in distributed systems.

---

Exactly-once processing guarantees that each event is processed once and only once, even in the presence of failures. This is crucial for financial transactions, inventory management, and other scenarios where duplicate processing causes problems. This guide shows you how to achieve exactly-once semantics using Knative Eventing with Kafka.

## Understanding Exactly-Once Semantics

Distributed systems naturally tend toward at-least-once delivery. Networks fail, pods restart, and messages get retried. Without proper handling, this leads to duplicate processing. Exactly-once semantics require coordination between message brokers, processing logic, and state storage.

Kafka provides exactly-once delivery through transactional producers and idempotent consumers. Knative Eventing can leverage these capabilities when properly configured. The key is ensuring both message consumption and state updates happen atomically.

Three components enable exactly-once processing: idempotent message brokers that deduplicate messages, transactional processing that commits consumption and side effects together, and idempotent handlers that produce the same result when processing duplicates.

## Configuring Kafka for Exactly-Once

Deploy Kafka with transactional support:

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: event-cluster
  namespace: kafka
spec:
  kafka:
    version: 3.5.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      # Enable idempotence
      enable.idempotence: true

      # Transaction settings
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2

      # Reduce transaction timeouts for faster failure detection
      transaction.max.timeout.ms: 900000

      # Log retention
      log.retention.hours: 168
      log.segment.bytes: 1073741824

      # Replication
      default.replication.factor: 3
      min.insync.replicas: 2

      # Performance tuning
      num.partitions: 10
      compression.type: snappy

    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd

  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
```

Create a topic with proper configuration:

```yaml
# exactly-once-topic.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: event-cluster
spec:
  partitions: 10
  replicas: 3
  config:
    # Require acknowledgment from all in-sync replicas
    min.insync.replicas: 2

    # Prevent message loss
    unclean.leader.election.enable: false

    # Retention
    retention.ms: 604800000  # 7 days
    segment.ms: 86400000     # 1 day
```

## Setting Up Knative with Kafka Source

Install Knative Kafka components:

```bash
# Install Knative Eventing Kafka
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/latest/download/eventing-kafka-controller.yaml
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/latest/download/eventing-kafka-broker.yaml

# Create Kafka broker config
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-broker-config
  namespace: knative-eventing
data:
  bootstrap.servers: "event-cluster-kafka-bootstrap.kafka:9092"
  default.topic.replication.factor: "3"
  default.topic.partitions: "10"
EOF
```

Configure Kafka broker with exactly-once support:

```yaml
# kafka-broker-exactly-once.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: orders-broker
  namespace: default
  annotations:
    eventing.knative.dev/broker.class: Kafka
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing

  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: dlq-handler
    retry: 3
    backoffPolicy: exponential
    backoffDelay: PT1S
```

## Implementing Idempotent Event Handlers

Create a service that handles events idempotently using a database for deduplication:

```python
# order_processor.py
from flask import Flask, request, jsonify
import psycopg2
from psycopg2 import sql
import json
import logging
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Database connection
DB_CONN = psycopg2.connect(
    host="postgres",
    database="events",
    user="postgres",
    password="password"
)

# Initialize database schema
def init_db():
    with DB_CONN.cursor() as cur:
        # Table for processed events (idempotency)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS processed_events (
                event_id VARCHAR(255) PRIMARY KEY,
                event_type VARCHAR(255),
                processed_at TIMESTAMP DEFAULT NOW(),
                result JSONB
            )
        """)

        # Table for orders
        cur.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR(255) PRIMARY KEY,
                customer_id VARCHAR(255),
                total DECIMAL(10, 2),
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)

        DB_CONN.commit()

init_db()

@app.route('/', methods=['POST'])
def handle_event():
    """Handle incoming CloudEvent"""

    try:
        # Extract CloudEvents headers
        event_id = request.headers.get('Ce-Id')
        event_type = request.headers.get('Ce-Type')
        event_source = request.headers.get('Ce-Source')

        if not event_id:
            return jsonify({'error': 'Missing event ID'}), 400

        logging.info(f"Received event {event_id} of type {event_type}")

        # Check if already processed (idempotency)
        if is_already_processed(event_id):
            logging.info(f"Event {event_id} already processed, returning cached result")
            result = get_cached_result(event_id)
            return jsonify(result), 200

        # Extract event data
        event_data = request.get_json()

        # Process event based on type
        if event_type == 'order.created':
            result = process_order_created(event_id, event_data)
        elif event_type == 'order.payment':
            result = process_payment(event_id, event_data)
        else:
            logging.warning(f"Unknown event type: {event_type}")
            result = {'status': 'ignored'}

        # Mark as processed
        mark_as_processed(event_id, event_type, result)

        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Error processing event: {str(e)}")
        # Return 500 to trigger retry
        return jsonify({'error': str(e)}), 500

def is_already_processed(event_id):
    """Check if event was already processed"""
    with DB_CONN.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM processed_events WHERE event_id = %s",
            (event_id,)
        )
        return cur.fetchone() is not None

def get_cached_result(event_id):
    """Get cached processing result"""
    with DB_CONN.cursor() as cur:
        cur.execute(
            "SELECT result FROM processed_events WHERE event_id = %s",
            (event_id,)
        )
        row = cur.fetchone()
        return json.loads(row[0]) if row else {}

def mark_as_processed(event_id, event_type, result):
    """Mark event as processed"""
    with DB_CONN.cursor() as cur:
        cur.execute("""
            INSERT INTO processed_events (event_id, event_type, result)
            VALUES (%s, %s, %s)
            ON CONFLICT (event_id) DO NOTHING
        """, (event_id, event_type, json.dumps(result)))
        DB_CONN.commit()

def process_order_created(event_id, data):
    """Process order creation with idempotency"""

    order_id = data['order_id']
    customer_id = data['customer_id']
    total = data['total']

    logging.info(f"Processing order creation: {order_id}")

    # Use database transaction for atomicity
    with DB_CONN.cursor() as cur:
        try:
            # Insert order (idempotent due to PRIMARY KEY)
            cur.execute("""
                INSERT INTO orders (order_id, customer_id, total, status)
                VALUES (%s, %s, %s, 'pending')
                ON CONFLICT (order_id) DO UPDATE
                SET updated_at = NOW()
                RETURNING order_id, status
            """, (order_id, customer_id, total))

            order_result = cur.fetchone()
            DB_CONN.commit()

            return {
                'status': 'created',
                'order_id': order_result[0],
                'order_status': order_result[1]
            }

        except Exception as e:
            DB_CONN.rollback()
            raise

def process_payment(event_id, data):
    """Process payment with idempotency"""

    order_id = data['order_id']
    payment_id = data['payment_id']

    logging.info(f"Processing payment for order: {order_id}")

    with DB_CONN.cursor() as cur:
        try:
            # Update order status atomically
            cur.execute("""
                UPDATE orders
                SET status = 'paid', updated_at = NOW()
                WHERE order_id = %s AND status = 'pending'
                RETURNING order_id, status
            """, (order_id,))

            result = cur.fetchone()

            if not result:
                # Order already paid or doesn't exist
                logging.warning(f"Order {order_id} not found or already paid")
                return {'status': 'already_processed', 'order_id': order_id}

            DB_CONN.commit()

            return {
                'status': 'payment_processed',
                'order_id': result[0],
                'order_status': result[1],
                'payment_id': payment_id
            }

        except Exception as e:
            DB_CONN.rollback()
            raise

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy the service:

```yaml
# order-processor-deployment.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: order-processor
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/order-processor:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "postgres.default.svc.cluster.local"
        - name: DB_NAME
          value: "events"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
```

## Configuring Triggers with Exactly-Once Delivery

Create triggers that leverage exactly-once semantics:

```yaml
# exactly-once-trigger.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-processor-trigger
  namespace: default
spec:
  broker: orders-broker

  filter:
    attributes:
      type: order.created

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor

  delivery:
    # Retry configuration
    retry: 3
    backoffPolicy: exponential
    backoffDelay: PT2S

    # Dead letter sink for permanent failures
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: dlq-handler
```

## Implementing Transactional Producers

Create a producer that publishes with exactly-once guarantees:

```java
// TransactionalProducer.java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.UUID;

public class TransactionalProducer {

    private final KafkaProducer<String, String> producer;
    private final String topic;

    public TransactionalProducer(String bootstrapServers, String topic) {
        this.topic = topic;

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // Enable idempotence
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Set transaction ID for exactly-once semantics
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-producer-" + UUID.randomUUID());

        // Ensure strong durability
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);

        this.producer = new KafkaProducer<>(props);

        // Initialize transactions
        producer.initTransactions();
    }

    public void publishOrder(String orderId, String orderData) {
        try {
            // Begin transaction
            producer.beginTransaction();

            // Create record
            ProducerRecord<String, String> record = new ProducerRecord<>(
                topic,
                orderId,  // Key for partitioning
                orderData
            );

            // Send record
            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    System.err.println("Failed to send message: " + exception.getMessage());
                } else {
                    System.out.println("Sent message to partition " + metadata.partition() +
                                     " with offset " + metadata.offset());
                }
            });

            // Commit transaction
            producer.commitTransaction();

            System.out.println("Successfully published order: " + orderId);

        } catch (Exception e) {
            // Abort transaction on error
            producer.abortTransaction();
            System.err.println("Transaction aborted: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) {
        TransactionalProducer producer = new TransactionalProducer(
            "event-cluster-kafka-bootstrap.kafka:9092",
            "orders"
        );

        try {
            // Publish sample order
            String orderId = "ORDER-" + UUID.randomUUID();
            String orderData = "{\"customer_id\":\"C123\",\"total\":99.99}";

            producer.publishOrder(orderId, orderData);

        } finally {
            producer.close();
        }
    }
}
```

## Monitoring Exactly-Once Processing

Track deduplication metrics:

```python
# metrics_exporter.py
from prometheus_client import Counter, Histogram, start_http_server
import psycopg2
import time

# Metrics
events_processed = Counter('events_processed_total', 'Total events processed')
events_deduplicated = Counter('events_deduplicated_total', 'Duplicate events detected')
processing_duration = Histogram('event_processing_duration_seconds', 'Event processing duration')

def collect_metrics():
    """Collect metrics from database"""
    conn = psycopg2.connect(
        host="postgres",
        database="events",
        user="postgres",
        password="password"
    )

    while True:
        try:
            with conn.cursor() as cur:
                # Count processed events
                cur.execute("SELECT COUNT(*) FROM processed_events")
                count = cur.fetchone()[0]
                events_processed._value.set(count)

            time.sleep(60)

        except Exception as e:
            print(f"Metrics collection error: {e}")
            time.sleep(10)

if __name__ == '__main__':
    start_http_server(9090)
    collect_metrics()
```

## Best Practices

Always use unique event IDs. Generate IDs upstream and include them in CloudEvents headers. Never rely on auto-generated IDs from message brokers.

Implement idempotent operations. Design handlers so repeated execution with the same input produces the same result. Use database constraints and upserts.

Store processing state transactionally. Commit event consumption and state updates in a single transaction when possible.

Monitor deduplication rates. High deduplication indicates network issues or excessive retries. Investigate and fix root causes.

Set appropriate timeouts. Balance between giving operations time to complete and detecting failures quickly.

Test failure scenarios. Verify exactly-once semantics under pod restarts, network partitions, and database failures.

## Conclusion

Implementing exactly-once processing with Knative and Kafka requires careful coordination between message brokers, event handlers, and state storage. By leveraging Kafka's transactional capabilities, implementing idempotent handlers with database-backed deduplication, and configuring appropriate retry policies, you can build systems that guarantee each event is processed once and only once. This reliability is essential for applications where duplicate processing causes data corruption or financial loss.
