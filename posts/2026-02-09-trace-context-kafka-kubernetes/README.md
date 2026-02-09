# How to Implement Trace Context Propagation Through Kafka Messages in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kafka, OpenTelemetry, Distributed Tracing, Message Queue

Description: Learn how to propagate trace context through Kafka messages in Kubernetes using OpenTelemetry to maintain end-to-end tracing visibility across asynchronous message-driven workflows.

---

Asynchronous messaging through Kafka breaks the synchronous request chain, making distributed tracing challenging. Without proper trace context propagation, you lose visibility when messages enter Kafka topics and emerge in consumer services. OpenTelemetry provides standards for embedding trace context in Kafka message headers, enabling end-to-end tracing across asynchronous workflows.

Trace context propagation through Kafka maintains the connection between producing and consuming services. When a service publishes a message to Kafka, it injects the current trace context into message headers. Consumer services extract this context and continue the distributed trace, creating a complete view of asynchronous request flows.

## Understanding Kafka Trace Propagation

Kafka messages support headers that can carry trace context. OpenTelemetry uses W3C Trace Context format with traceparent and tracestate headers. Producers inject these headers when sending messages. Consumers extract headers and link their spans to the original trace.

The propagation creates span links rather than parent-child relationships. Message production creates one span. Message consumption creates a separate span with a link to the producer span. This accurately represents asynchronous messaging where consumer execution happens independently of producer execution.

## Instrumenting Kafka Producers

Implement trace context injection in a Go Kafka producer:

```go
// producer.go
package messaging

import (
    "context"

    "github.com/segmentio/kafka-go"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
)

type TracedKafkaProducer struct {
    writer *kafka.Writer
    tracer trace.Tracer
}

func NewTracedKafkaProducer(brokers []string, topic string) *TracedKafkaProducer {
    return &TracedKafkaProducer{
        writer: &kafka.Writer{
            Addr:     kafka.TCP(brokers...),
            Topic:    topic,
            Balancer: &kafka.LeastBytes{},
        },
        tracer: otel.Tracer("kafka-producer"),
    }
}

func (p *TracedKafkaProducer) SendMessage(ctx context.Context, key, value []byte) error {
    // Create span for message production
    ctx, span := p.tracer.Start(ctx, "kafka.produce",
        trace.WithSpanKind(trace.SpanKindProducer),
        trace.WithAttributes(
            attribute.String("messaging.system", "kafka"),
            attribute.String("messaging.destination", p.writer.Topic),
            attribute.String("messaging.operation", "publish"),
        ),
    )
    defer span.End()

    // Create Kafka message
    msg := kafka.Message{
        Key:   key,
        Value: value,
    }

    // Inject trace context into message headers
    propagator := otel.GetTextMapPropagator()
    carrier := NewKafkaMessageCarrier(&msg)
    propagator.Inject(ctx, carrier)

    // Add additional metadata
    msg.Headers = append(msg.Headers,
        kafka.Header{Key: "correlation_id", Value: []byte(span.SpanContext().TraceID().String())},
    )

    // Send message
    err := p.writer.WriteMessages(ctx, msg)
    if err != nil {
        span.RecordError(err)
        return err
    }

    span.SetAttributes(
        attribute.Int("messaging.message.size", len(value)),
    )

    return nil
}

// KafkaMessageCarrier implements TextMapCarrier for Kafka message headers
type KafkaMessageCarrier struct {
    msg *kafka.Message
}

func NewKafkaMessageCarrier(msg *kafka.Message) *KafkaMessageCarrier {
    return &KafkaMessageCarrier{msg: msg}
}

func (c *KafkaMessageCarrier) Get(key string) string {
    for _, header := range c.msg.Headers {
        if header.Key == key {
            return string(header.Value)
        }
    }
    return ""
}

func (c *KafkaMessageCarrier) Set(key, value string) {
    // Remove existing header with same key
    filtered := []kafka.Header{}
    for _, header := range c.msg.Headers {
        if header.Key != key {
            filtered = append(filtered, header)
        }
    }

    // Add new header
    c.msg.Headers = append(filtered, kafka.Header{
        Key:   key,
        Value: []byte(value),
    })
}

func (c *KafkaMessageCarrier) Keys() []string {
    keys := make([]string, len(c.msg.Headers))
    for i, header := range c.msg.Headers {
        keys[i] = header.Key
    }
    return keys
}
```

Use the traced producer:

```go
// order_service.go
func handleCreateOrder(ctx context.Context, order Order) error {
    tracer := otel.Tracer("order-service")
    
    ctx, span := tracer.Start(ctx, "create_order")
    defer span.End()

    // Save order to database
    if err := saveOrder(ctx, order); err != nil {
        return err
    }

    // Publish order created event with trace context
    producer := NewTracedKafkaProducer(
        []string{"kafka:9092"},
        "order-events",
    )

    eventData, _ := json.Marshal(OrderCreatedEvent{
        OrderID: order.ID,
        Amount:  order.Amount,
    })

    return producer.SendMessage(ctx, []byte(order.ID), eventData)
}
```

## Instrumenting Kafka Consumers

Implement trace context extraction in a Kafka consumer:

```go
// consumer.go
package messaging

import (
    "context"

    "github.com/segmentio/kafka-go"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
)

type TracedKafkaConsumer struct {
    reader *kafka.Reader
    tracer trace.Tracer
}

func NewTracedKafkaConsumer(brokers []string, topic, groupID string) *TracedKafkaConsumer {
    return &TracedKafkaConsumer{
        reader: kafka.NewReader(kafka.ReaderConfig{
            Brokers: brokers,
            Topic:   topic,
            GroupID: groupID,
        }),
        tracer: otel.Tracer("kafka-consumer"),
    }
}

func (c *TracedKafkaConsumer) ConsumeMessage(ctx context.Context, handler func(context.Context, kafka.Message) error) error {
    msg, err := c.reader.ReadMessage(ctx)
    if err != nil {
        return err
    }

    // Extract trace context from message headers
    propagator := otel.GetTextMapPropagator()
    carrier := NewKafkaMessageCarrier(&msg)
    ctx = propagator.Extract(ctx, carrier)

    // Create span for message consumption
    ctx, span := c.tracer.Start(ctx, "kafka.consume",
        trace.WithSpanKind(trace.SpanKindConsumer),
        trace.WithAttributes(
            attribute.String("messaging.system", "kafka"),
            attribute.String("messaging.source", msg.Topic),
            attribute.String("messaging.operation", "receive"),
            attribute.Int("messaging.message.size", len(msg.Value)),
            attribute.Int64("messaging.message.offset", msg.Offset),
            attribute.Int("messaging.message.partition", msg.Partition),
        ),
    )
    defer span.End()

    // Process message
    if err := handler(ctx, msg); err != nil {
        span.SetStatus(codes.Error, "message processing failed")
        span.RecordError(err)
        return err
    }

    span.SetStatus(codes.Ok, "message processed")
    return nil
}
```

Implement a consumer service:

```go
// notification_service.go
func main() {
    ctx := context.Background()
    
    consumer := NewTracedKafkaConsumer(
        []string{"kafka:9092"},
        "order-events",
        "notification-service",
    )

    for {
        err := consumer.ConsumeMessage(ctx, handleOrderEvent)
        if err != nil {
            log.Printf("Error consuming message: %v", err)
        }
    }
}

func handleOrderEvent(ctx context.Context, msg kafka.Message) error {
    tracer := otel.Tracer("notification-service")
    
    // Create child span for business logic
    ctx, span := tracer.Start(ctx, "process_order_event")
    defer span.End()

    var event OrderCreatedEvent
    if err := json.Unmarshal(msg.Value, &event); err != nil {
        return err
    }

    span.SetAttributes(
        attribute.String("order.id", event.OrderID),
        attribute.Float64("order.amount", event.Amount),
    )

    // Send notification
    return sendNotification(ctx, event)
}
```

## Deploying Kafka and Services in Kubernetes

Deploy Kafka and traced services:

```yaml
# kafka-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka
  namespace: messaging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.5.0
        ports:
        - containerPort: 9092
        env:
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "PLAINTEXT://kafka:9092"
---
# order-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: order-service:v1.0.0
        env:
        - name: KAFKA_BROKERS
          value: "kafka.messaging.svc.cluster.local:9092"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
---
# notification-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: notification-service:v1.0.0
        env:
        - name: KAFKA_BROKERS
          value: "kafka.messaging.svc.cluster.local:9092"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
```

## Visualizing Kafka Traces

Query traces that span Kafka boundaries:

```bash
# Find traces with Kafka operations
curl 'http://tempo:3100/api/search' -d '{
  "tags": {
    "messaging.system": "kafka",
    "span.kind": "producer"
  }
}'

# Find slow message processing
curl 'http://tempo:3100/api/search' -d '{
  "tags": {
    "messaging.system": "kafka",
    "span.kind": "consumer"
  },
  "minDuration": "5s"
}'
```

Trace context propagation through Kafka maintains end-to-end visibility across asynchronous workflows. By injecting and extracting trace context from message headers, you create complete distributed traces that span synchronous and asynchronous operations in Kubernetes environments.
