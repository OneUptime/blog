# How to Set Up Kafka Event Sources for Knative Eventing on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Knative, Kafka, Serverless, Event-Driven

Description: Learn how to configure Kafka event sources in Knative Eventing to build event-driven serverless applications on Kubernetes with practical examples.

---

Knative Eventing provides a powerful framework for building event-driven applications on Kubernetes. When combined with Apache Kafka as an event source, you get a scalable, reliable messaging system that can power complex serverless workflows. This guide walks you through setting up Kafka event sources for Knative Eventing.

## Understanding Knative Eventing and Kafka Integration

Knative Eventing extends Kubernetes to provide event-driven capabilities. It uses CloudEvents as the standard format for events and supports multiple event sources. Kafka integration allows you to consume messages from Kafka topics and route them to Knative services.

The KafkaSource component acts as a bridge between Kafka and Knative. It creates Kafka consumers that read from specified topics and convert Kafka messages into CloudEvents. These events then flow through Knative's eventing infrastructure to your services.

## Prerequisites and Installation

Before setting up Kafka event sources, you need a Kubernetes cluster with Knative Serving and Eventing installed. You also need a running Kafka cluster accessible from your Kubernetes environment.

Install Knative Eventing if you haven't already:

```bash
# Install Knative Eventing CRDs
kubectl apply -f https://github.com/knative/eventing/releases/latest/download/eventing-crds.yaml

# Install Knative Eventing core components
kubectl apply -f https://github.com/knative/eventing/releases/latest/download/eventing-core.yaml

# Verify installation
kubectl get pods -n knative-eventing
```

Next, install the Kafka event source:

```bash
# Install Kafka Source
kubectl apply -f https://github.com/knative-sandbox/eventing-kafka/releases/latest/download/source.yaml

# Verify Kafka controller is running
kubectl get pods -n knative-eventing | grep kafka
```

## Configuring Kafka Connection Settings

Create a ConfigMap to store Kafka connection details. This approach centralizes configuration and makes it easier to manage multiple KafkaSource instances:

```yaml
# kafka-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-config
  namespace: default
data:
  bootstrap.servers: "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092"
  security.protocol: "SASL_SSL"
  sasl.mechanism: "PLAIN"
```

If your Kafka cluster requires authentication, create a Secret:

```yaml
# kafka-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: kafka-credentials
  namespace: default
type: Opaque
stringData:
  sasl.username: "your-username"
  sasl.password: "your-password"
  # For SSL/TLS
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    Your CA certificate here
    -----END CERTIFICATE-----
```

Apply these configurations:

```bash
kubectl apply -f kafka-config.yaml
kubectl apply -f kafka-secret.yaml
```

## Creating a Basic KafkaSource

A KafkaSource defines which Kafka topics to consume from and where to send the events. Here's a basic example:

```yaml
# kafka-source.yaml
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: user-events-source
  namespace: default
spec:
  # Kafka connection details
  bootstrapServers:
    - kafka-broker-1:9092
    - kafka-broker-2:9092
    - kafka-broker-3:9092

  # Topics to consume from
  topics:
    - user-registrations
    - user-logins

  # Consumer group ID
  consumerGroup: knative-user-events

  # Where to send events
  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: user-event-processor
```

Apply the KafkaSource:

```bash
kubectl apply -f kafka-source.yaml

# Check status
kubectl get kafkasource user-events-source -o yaml
```

## Creating the Event Processor Service

Your sink service needs to accept CloudEvents. Here's a simple Node.js example:

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json());

// CloudEvents handler
app.post('/', (req, res) => {
  // Extract CloudEvent headers
  const eventType = req.headers['ce-type'];
  const eventSource = req.headers['ce-source'];
  const eventId = req.headers['ce-id'];

  // Kafka-specific extensions
  const kafkaTopic = req.headers['ce-kafkatopic'];
  const kafkaPartition = req.headers['ce-kafkapartition'];
  const kafkaOffset = req.headers['ce-kafkaoffset'];

  console.log(`Received event ${eventId} from ${kafkaTopic}`);
  console.log(`Type: ${eventType}, Partition: ${kafkaPartition}, Offset: ${kafkaOffset}`);

  // Process the event data
  const eventData = req.body;
  processEvent(eventData);

  res.status(200).send('Event processed');
});

function processEvent(data) {
  // Your business logic here
  console.log('Processing event:', JSON.stringify(data, null, 2));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Event processor listening on port ${PORT}`);
});
```

Deploy this as a Knative Service:

```yaml
# event-processor.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: user-event-processor
  namespace: default
spec:
  template:
    spec:
      containers:
        - image: your-registry/user-event-processor:latest
          ports:
            - containerPort: 8080
          env:
            - name: LOG_LEVEL
              value: "info"
```

## Advanced Configuration with Authentication

For production environments, you'll need proper authentication. Here's a KafkaSource with SASL authentication:

```yaml
# kafka-source-auth.yaml
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: secure-kafka-source
  namespace: default
spec:
  bootstrapServers:
    - kafka-broker.example.com:9093

  topics:
    - orders
    - payments

  consumerGroup: knative-order-processor

  # Authentication configuration
  net:
    sasl:
      enable: true
      user:
        secretKeyRef:
          name: kafka-credentials
          key: sasl.username
      password:
        secretKeyRef:
          name: kafka-credentials
          key: sasl.password
      type:
        secretKeyRef:
          name: kafka-credentials
          key: sasl.mechanism
    tls:
      enable: true
      caCert:
        secretKeyRef:
          name: kafka-credentials
          key: ca.crt

  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
```

## Configuring Consumer Groups and Scaling

KafkaSource uses consumer groups to manage message distribution. You can configure the number of consumers to scale message processing:

```yaml
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: high-volume-source
spec:
  bootstrapServers:
    - kafka-broker:9092
  topics:
    - high-volume-events
  consumerGroup: knative-high-volume

  # Number of consumers (should match partition count)
  consumers: 10

  # Consumer configuration
  config:
    auto.offset.reset: "earliest"
    session.timeout.ms: "30000"
    max.poll.interval.ms: "300000"

  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: batch-processor
```

## Monitoring and Troubleshooting

Monitor your KafkaSource with these commands:

```bash
# Check KafkaSource status
kubectl get kafkasource -A

# View detailed status
kubectl describe kafkasource user-events-source

# Check consumer lag (requires Kafka tools)
kubectl run kafka-consumer-groups -it --rm \
  --image=confluentinc/cp-kafka:latest \
  --restart=Never \
  -- kafka-consumer-groups \
  --bootstrap-server kafka-broker:9092 \
  --group knative-user-events \
  --describe

# View logs from Kafka source adapter
kubectl logs -n knative-eventing -l eventing.knative.dev/sourceName=user-events-source
```

## Best Practices

Always use consumer groups wisely. Set the number of consumers equal to the number of partitions in your Kafka topics for optimal parallelism. Use dedicated consumer groups for each KafkaSource to avoid conflicts.

Configure appropriate timeouts and poll intervals. Longer processing times require larger max.poll.interval.ms values to prevent rebalancing. Monitor consumer lag regularly to ensure your system keeps up with message production.

Use secrets for all sensitive data like passwords and certificates. Never hardcode credentials in your YAML manifests. Consider using external secret management solutions like Sealed Secrets or External Secrets Operator.

Implement proper error handling in your sink services. Return appropriate HTTP status codes to indicate success or failure. Use dead letter sinks for messages that fail processing repeatedly.

## Conclusion

Kafka event sources provide a robust foundation for event-driven architectures on Kubernetes. By integrating Kafka with Knative Eventing, you get the reliability and scalability of Kafka combined with the serverless benefits of Knative. This setup enables you to build reactive systems that automatically scale based on event volume while maintaining strong delivery guarantees. Start with simple configurations and gradually add authentication, monitoring, and advanced features as your requirements grow.
