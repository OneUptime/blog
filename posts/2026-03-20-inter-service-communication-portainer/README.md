# How to Set Up Inter-Service Communication in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Microservice, Networking, Service Mesh, Communication

Description: Configure reliable inter-service communication between Docker containers using shared networks, DNS resolution, and message queues managed via Portainer.

## Introduction

Microservices need to communicate with each other reliably. Docker provides built-in DNS-based service discovery within networks. This guide covers synchronous HTTP/gRPC communication, asynchronous messaging with RabbitMQ, and patterns for resilient inter-service calls - all managed through Portainer.

## Communication Patterns

**Synchronous**: Service A directly calls Service B and waits for a response (HTTP REST, gRPC)
**Asynchronous**: Service A publishes an event to a message bus; Service B consumes it when ready (RabbitMQ, Kafka, Redis Streams)

## Step 1: Configure Shared Networks

All services that need to communicate must share a Docker network:

```yaml
# docker-compose.yml - Shared network setup

networks:
  # Internal shared network
  services_net:
    driver: bridge

services:
  service_a:
    image: my-service-a:latest
    networks:
      - services_net
    # Service A can reach service_b via http://service_b:8080

  service_b:
    image: my-service-b:latest
    networks:
      - services_net
    ports:
      - "8080:8080"  # Only needed for external access
```

## Step 2: Synchronous HTTP Communication

```python
# Python example: Service A calling Service B
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def call_user_service(user_id: str) -> dict:
    """
    Call user service with automatic retry on failure.
    Uses Docker DNS to resolve 'user_service' to the container IP.
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(
            f"http://user_service:8002/users/{user_id}",
            headers={"X-Service-Name": "order-service"}
        )
        response.raise_for_status()
        return response.json()
```

## Step 3: gRPC Communication

```yaml
# docker-compose.yml - gRPC services
networks:
  grpc_net:
    driver: bridge

services:
  grpc_server:
    image: my-grpc-server:latest
    networks:
      - grpc_net
    # Common gRPC port
    expose:
      - "50051"

  grpc_client:
    image: my-grpc-client:latest
    networks:
      - grpc_net
    environment:
      # gRPC server address uses Docker DNS
      - GRPC_SERVER_ADDR=grpc_server:50051
```

```go
// Go: gRPC client connecting to another container
conn, err := grpc.NewClient(
    os.Getenv("GRPC_SERVER_ADDR"),  // "grpc_server:50051"
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithDefaultServiceConfig(`{"loadBalancingConfig":[{"round_robin":{}}]}`),
)
```

## Step 4: Asynchronous Messaging with RabbitMQ

```yaml
# docker-compose.yml - RabbitMQ message bus
networks:
  services_net:
    driver: bridge

volumes:
  rabbitmq_data:

services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: rabbitmq
    networks:
      - services_net
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=rabbitmq_pass
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      retries: 5

  # Publisher service
  order_service:
    image: my-order-service:latest
    networks:
      - services_net
    environment:
      - RABBITMQ_URL=amqp://admin:rabbitmq_pass@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy

  # Consumer service
  notification_service:
    image: my-notification-service:latest
    networks:
      - services_net
    environment:
      - RABBITMQ_URL=amqp://admin:rabbitmq_pass@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy
```

```python
# Publisher (Order Service)
import json
import os

import pika

def publish_order_created(order: dict):
    connection = pika.BlockingConnection(
        pika.URLParameters(os.environ['RABBITMQ_URL'])
    )
    channel = connection.channel()

    # Declare exchange
    channel.exchange_declare(
        exchange='orders',
        exchange_type='topic',
        durable=True
    )

    # Publish event
    channel.basic_publish(
        exchange='orders',
        routing_key='order.created',
        body=json.dumps(order),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Persistent message
            content_type='application/json'
        )
    )
    connection.close()
```

```python
# Consumer (Notification Service)
import json
import os

import pika

def start_consumer():
    connection = pika.BlockingConnection(
        pika.URLParameters(os.environ['RABBITMQ_URL'])
    )
    channel = connection.channel()

    channel.exchange_declare(exchange='orders', exchange_type='topic', durable=True)
    result = channel.queue_declare(
        queue='notification_service.order_created',
        durable=True
    )
    queue_name = result.method.queue

    channel.queue_bind(
        exchange='orders',
        queue=queue_name,
        routing_key='order.created'
    )

    def callback(ch, method, properties, body):
        order = json.loads(body)
        send_order_confirmation_email(order)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    channel.start_consuming()
```

## Step 5: Circuit Breaker Pattern

```go
// Go: Circuit breaker for resilient service calls
package main

import (
    "fmt"
    "github.com/sony/gobreaker"
    "io"
    "net/http"
    "time"
)

var httpClient = &http.Client{
    Timeout: 5 * time.Second,
}

var userServiceBreaker = gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "UserService",
    MaxRequests: 3,
    Interval:    10 * time.Second,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        // Open circuit if 50% of requests fail
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 3 && failureRatio >= 0.5
    },
})

func getUser(userID string) ([]byte, error) {
    result, err := userServiceBreaker.Execute(func() (interface{}, error) {
        resp, err := httpClient.Get("http://user_service:8002/users/" + userID)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()

        if resp.StatusCode >= http.StatusInternalServerError {
            return nil, fmt.Errorf("user service returned %d", resp.StatusCode)
        }

        body, err := io.ReadAll(resp.Body)
        if err != nil {
            return nil, err
        }
        return body, nil
    })

    if err != nil {
        // Request failed or circuit is open, return fallback
        return getFallbackUser(userID), nil
    }
    return result.([]byte), nil
}
```

## Step 6: Health Check Dependencies

```yaml
# Ensure service B is healthy before service A starts
services:
  service_b:
    image: service-b:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  service_a:
    image: service-a:latest
    depends_on:
      service_b:
        condition: service_healthy
```

## Monitoring Inter-Service Communication in Portainer

```bash
# View service-to-service connectivity
docker compose exec service_a curl -s http://service_b:8080/health

# Inspect the Compose-created network (replace <project> with your Compose project name)
docker network inspect <project>_services_net

# Check DNS resolution from the service container
docker compose exec service_a nslookup service_b
```

## Conclusion

You now have multiple patterns for reliable inter-service communication in Docker managed by Portainer. Synchronous HTTP with retry logic handles most use cases, while asynchronous messaging via RabbitMQ decouples services for better resilience. Circuit breakers prevent cascade failures when services go down. Portainer lets you manage Docker networks and inspect container network settings, making it easier to debug communication issues.
