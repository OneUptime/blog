# How to Configure RocketMQ for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RocketMQ, Pub/Sub, Messaging, Apache, Microservice

Description: Configure Apache RocketMQ as a Dapr pub/sub component for high-throughput, reliable messaging in distributed systems.

---

## Overview

Apache RocketMQ is a distributed messaging and streaming platform with low latency, high throughput, and financial-grade reliability. Dapr's RocketMQ pub/sub component makes it accessible via a standard API, enabling microservices to publish and consume messages without coupling to RocketMQ-specific client libraries.

## Deploying RocketMQ

Deploy RocketMQ using Docker Compose for local development:

```yaml
version: '3'
services:
  namesrv:
    image: apache/rocketmq:5.1.0
    container_name: namesrv
    ports:
      - "9876:9876"
    command: sh mqnamesrv

  broker:
    image: apache/rocketmq:5.1.0
    container_name: broker
    ports:
      - "10909:10909"
      - "10911:10911"
    environment:
      - NAMESRV_ADDR=namesrv:9876
    command: sh mqbroker -n namesrv:9876
    depends_on:
      - namesrv
```

Start the services:

```bash
docker-compose up -d

# Verify the broker is registered
docker exec -it broker sh mqadmin clusterList -n namesrv:9876
```

## Creating Topics

Create the required topics using the RocketMQ admin tool:

```bash
docker exec -it broker sh mqadmin updateTopic \
  -n namesrv:9876 \
  -b broker:10911 \
  -t orders \
  -r 8 \
  -w 8

docker exec -it broker sh mqadmin updateTopic \
  -n namesrv:9876 \
  -b broker:10911 \
  -t notifications \
  -r 4 \
  -w 4
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rocketmq-pubsub
  namespace: default
spec:
  type: pubsub.rocketmq
  version: v1
  metadata:
  - name: nameServer
    value: "namesrv:9876"
  - name: groupName
    value: "dapr-consumer-group"
  - name: retries
    value: "3"
  - name: consumerModel
    value: "clustering"
  - name: consumeOrderly
    value: "false"
  - name: maxReconsumeTimes
    value: "3"
  - name: autoCommit
    value: "true"
```

For production with access credentials:

```yaml
  - name: accessKey
    secretKeyRef:
      name: rocketmq-secret
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: rocketmq-secret
      key: secretKey
  - name: nameServerDomain
    value: "http://mq-instance.mq-internet-access.mq-domain.aliyuncs.com:80"
```

## Publishing and Consuming Messages

Publish from a Java service:

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;

public class OrderPublisher {
    public static void main(String[] args) {
        try (DaprClient client = new DaprClientBuilder().build()) {
            OrderEvent order = new OrderEvent("ord-001", 299.99);

            client.publishEvent(
                "rocketmq-pubsub",
                "orders",
                order
            ).block();

            System.out.println("Order published: " + order.getOrderId());
        }
    }
}
```

Subscribe with a Spring Boot controller:

```java
@RestController
public class OrderConsumer {

    @Topic(name = "orders", pubsubName = "rocketmq-pubsub")
    @PostMapping("/orders")
    public Mono<Void> processOrder(@RequestBody CloudEvent<OrderEvent> event) {
        OrderEvent order = event.getData();
        System.out.println("Processing order: " + order.getOrderId());
        return Mono.empty();
    }
}
```

## Ordered Consumption

For strictly ordered message processing, enable `consumeOrderly`:

```yaml
  - name: consumeOrderly
    value: "true"
```

## Summary

RocketMQ with Dapr is ideal for high-throughput financial and e-commerce workloads that require transactional messaging and ordered consumption. The Dapr abstraction means switching from RocketMQ to Kafka or Redis Streams only requires a component YAML change with no application code modifications. Consumer group configuration enables horizontal scaling of message processors.
