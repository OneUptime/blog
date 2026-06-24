# How to Use Exactly-Once Event Processing with Knative and Kafka on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kafka, Kubernetes, Exactly-Once, Event-Processing

Description: Implement exactly-once semantics for event processing using Knative Eventing with Kafka to ensure reliable message delivery without duplicates in distributed systems.

---

Exactly-once processing is usually implemented as a guarantee that each event changes application state once and only once, even if the event is delivered more than once. This is crucial for financial transactions, inventory management, and other scenarios where duplicate processing causes problems. This guide shows you how to build effectively exactly-once event effects using Knative Eventing with Kafka.

## Understanding Exactly-Once Semantics

Distributed systems naturally tend toward at-least-once delivery. Networks fail, pods restart, and messages get retried. Without proper handling, this leads to duplicate processing. Exactly-once semantics require coordination between message brokers, processing logic, and state storage.

Kafka provides exactly-once primitives through idempotent producers, transactions, and read-committed consumers. Knative Eventing with the Kafka Broker still delivers events to HTTP subscribers with retry-based, at-least-once behavior, so handlers must tolerate duplicate deliveries. The key is ensuring application side effects and processing state are committed atomically.

Three components enable effectively exactly-once processing: idempotent producers that avoid duplicate writes from producer retries, transactional processing where offsets and Kafka output records are committed together when you are consuming from and producing to Kafka, and idempotent handlers that produce the same result when Knative retries duplicate deliveries.

## Configuring Kafka for Exactly-Once

Deploy Kafka with transactional support. Current Strimzi releases use the `v1` API and KRaft node pools:

```yaml
# kafka-cluster.yaml

apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: mixed
  namespace: kafka
  labels:
    strimzi.io/cluster: event-cluster
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: persistent-claim
    size: 100Gi
    class: fast-ssd
    kraftMetadata: shared
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: event-cluster
  namespace: kafka
spec:
  kafka:
    version: 4.2.0
    metadataVersion: 4.2
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
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

Create a topic with proper configuration:

```yaml
# exactly-once-topic.yaml
apiVersion: kafka.strimzi.io/v1
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

## Setting Up Knative with Kafka Broker

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

Configure the Kafka broker with retry and dead-letter handling. These settings provide at-least-once delivery to the subscriber, so the handler still needs the idempotency logic shown below:

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
import json
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Database connection
DB_CONN = psycopg2.connect(
    host=os.getenv("DB_HOST", "postgres"),
    database=os.getenv("DB_NAME", "events"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", "password")
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
                duplicate_count INTEGER DEFAULT 0,
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
        if not event_id:
            return jsonify({'error': 'Missing event ID'}), 400

        logging.info(f"Received event {event_id} of type {event_type}")

        # Extract event data
        event_data = request.get_json() or {}

        # Use one database transaction for the idempotency record and side effects.
        with DB_CONN:
            with DB_CONN.cursor() as cur:
                cur.execute("""
                    INSERT INTO processed_events (event_id, event_type)
                    VALUES (%s, %s)
                    ON CONFLICT (event_id) DO NOTHING
                    RETURNING event_id
                """, (event_id, event_type))
                inserted = cur.fetchone()

                if not inserted:
                    cur.execute("""
                        UPDATE processed_events
                        SET duplicate_count = duplicate_count + 1
                        WHERE event_id = %s
                        RETURNING result
                    """, (event_id,))
                    cached_result = cur.fetchone()[0]
                    logging.info(f"Event {event_id} already processed, returning cached result")
                    return jsonify(cached_result or {'status': 'already_processed'}), 200

                # Process event based on type
                if event_type == 'order.created':
                    result = process_order_created(cur, event_id, event_data)
                elif event_type == 'order.payment':
                    result = process_payment(cur, event_id, event_data)
                else:
                    logging.warning(f"Unknown event type: {event_type}")
                    result = {'status': 'ignored'}

                # Mark as processed in the same transaction as the side effect
                mark_as_processed(cur, event_id, result)

        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Error processing event: {str(e)}")
        # Return 500 to trigger retry
        return jsonify({'error': str(e)}), 500

def mark_as_processed(cur, event_id, result):
    """Mark event as processed"""
    cur.execute("""
        UPDATE processed_events
        SET result = %s
        WHERE event_id = %s
    """, (json.dumps(result), event_id))

def process_order_created(cur, event_id, data):
    """Process order creation with idempotency"""

    order_id = data['order_id']
    customer_id = data['customer_id']
    total = data['total']

    logging.info(f"Processing order creation: {order_id}")

    # Insert order (idempotent due to PRIMARY KEY)
    cur.execute("""
        INSERT INTO orders (order_id, customer_id, total, status)
        VALUES (%s, %s, %s, 'pending')
        ON CONFLICT (order_id) DO UPDATE
        SET updated_at = NOW()
        RETURNING order_id, status
    """, (order_id, customer_id, total))

    order_result = cur.fetchone()

    return {
        'status': 'created',
        'order_id': order_result[0],
        'order_status': order_result[1]
    }

def process_payment(cur, event_id, data):
    """Process payment with idempotency"""

    order_id = data['order_id']
    payment_id = data['payment_id']

    logging.info(f"Processing payment for order: {order_id}")

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

    return {
        'status': 'payment_processed',
        'order_id': result[0],
        'order_status': result[1],
        'payment_id': payment_id
    }

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

## Configuring Triggers with Idempotent Delivery

Create triggers that route events to an idempotent subscriber:

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

Create a producer that publishes to Kafka transactionally:

```java
// TransactionalProducer.java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.Future;

public class TransactionalProducer {

    private final KafkaProducer<String, String> producer;
    private final String topic;

    public TransactionalProducer(String bootstrapServers, String topic, String transactionalId) {
        this.topic = topic;

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // Enable idempotence
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Use a stable transaction ID for this producer instance across restarts
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, transactionalId);

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

            // Send record and fail the transaction if the send fails
            Future<RecordMetadata> sendResult = producer.send(record);
            RecordMetadata metadata = sendResult.get();
            System.out.println("Sent message to partition " + metadata.partition() +
                             " with offset " + metadata.offset());

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
            "orders",
            "order-producer-0"
        );

        try {
            // Publish sample order
            String orderId = "ORDER-" + UUID.randomUUID();
            String orderData = "{\"order_id\":\"" + orderId + "\",\"customer_id\":\"C123\",\"total\":99.99}";

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
from prometheus_client import Gauge, start_http_server
import psycopg2
import time

# Metrics
events_processed = Gauge('events_processed_total', 'Total events processed')
events_deduplicated = Gauge('events_deduplicated_total', 'Duplicate events detected')

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
                events_processed.set(count)

                # Count duplicate deliveries recorded by the handler
                cur.execute("SELECT COALESCE(SUM(duplicate_count), 0) FROM processed_events")
                duplicate_count = cur.fetchone()[0]
                events_deduplicated.set(duplicate_count)

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

Store processing state transactionally. Commit application side effects and the idempotency record in a single transaction when possible. For Kafka-to-Kafka processors, commit consumed offsets and produced records in the same Kafka transaction.

Monitor deduplication rates. High deduplication indicates network issues or excessive retries. Investigate and fix root causes.

Set appropriate timeouts. Balance between giving operations time to complete and detecting failures quickly.

Test failure scenarios. Verify idempotent behavior under pod restarts, network partitions, retries, and database failures.

## Conclusion

Implementing effectively exactly-once processing with Knative and Kafka requires careful coordination between message brokers, event handlers, and state storage. By leveraging Kafka's transactional capabilities where they apply, implementing idempotent handlers with database-backed deduplication, and configuring appropriate retry policies, you can build systems where each event changes application state once even when delivery is retried. This reliability is essential for applications where duplicate processing causes data corruption or financial loss.
