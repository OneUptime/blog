# How to Set Up Istio for Event Sourcing Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Event Sourcing, Architecture, Service Mesh, Distributed Systems

Description: Configure Istio to support event sourcing architectures with proper routing for event stores, projections, and command handlers in a microservices environment.

---

Event sourcing stores every state change as an immutable event rather than overwriting the current state. Instead of a database row that says "Order #123: status=shipped", you have a sequence of events: "Order Created", "Payment Received", "Order Shipped". The current state is reconstructed by replaying the events.

When you build event sourcing on top of a microservices architecture, Istio helps manage the complex traffic patterns between event producers, event stores, event consumers, and projection services. Istio does not replace your event infrastructure (Kafka, NATS, etc.), but it manages the HTTP/gRPC traffic around it: API calls to create events, queries against projections, and health monitoring of event processing services.

## Architecture Overview

A typical event sourcing system with Istio has these components:

- **Command Service**: Accepts commands (create order, update payment) and writes events to the event store
- **Event Store**: Stores the immutable event log (could be a service wrapping Kafka or a dedicated event store like EventStoreDB)
- **Projection Service**: Reads events and builds read-optimized views (materialized views)
- **Query Service**: Serves queries from the materialized views
- **API Gateway**: Istio ingress gateway that routes commands and queries

## Deploying the Components

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: command-handler
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      role: command-handler
  template:
    metadata:
      labels:
        app: order-service
        role: command-handler
    spec:
      containers:
      - name: handler
        image: my-registry/order-command-handler:latest
        ports:
        - containerPort: 8080
        env:
        - name: EVENT_STORE_URL
          value: "http://event-store:80"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: query-handler
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: order-service
      role: query-handler
  template:
    metadata:
      labels:
        app: order-service
        role: query-handler
    spec:
      containers:
      - name: handler
        image: my-registry/order-query-handler:latest
        ports:
        - containerPort: 8080
        env:
        - name: READ_DB_HOST
          value: "postgres-read"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: projection-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
      role: projection
  template:
    metadata:
      labels:
        app: order-service
        role: projection
    spec:
      containers:
      - name: projector
        image: my-registry/order-projector:latest
        ports:
        - containerPort: 8080
        env:
        - name: KAFKA_BROKERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092"
        - name: WRITE_DB_HOST
          value: "postgres-projections"
```

## Services for Each Component

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-commands
  namespace: production
spec:
  selector:
    app: order-service
    role: command-handler
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: order-queries
  namespace: production
spec:
  selector:
    app: order-service
    role: query-handler
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: projection-service
  namespace: production
spec:
  selector:
    app: order-service
    role: projection
  ports:
  - port: 80
    targetPort: 8080
```

## Routing Commands and Queries

Use Istio VirtualService to route based on the operation type:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-api
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  # Commands - create and modify events
  - match:
    - uri:
        prefix: /api/orders
      method:
        exact: POST
    route:
    - destination:
        host: order-commands
        port:
          number: 80
    timeout: 10s
    retries:
      attempts: 0
  - match:
    - uri:
        prefix: /api/orders
      method:
        exact: PUT
    route:
    - destination:
        host: order-commands
        port:
          number: 80
    timeout: 10s
    retries:
      attempts: 0
  # Queries - read from projections
  - match:
    - uri:
        prefix: /api/orders
      method:
        exact: GET
    route:
    - destination:
        host: order-queries
        port:
          number: 80
    timeout: 3s
    retries:
      attempts: 2
      perTryTimeout: 1s
      retryOn: 5xx,connect-failure
  # Event stream endpoint
  - match:
    - uri:
        prefix: /api/orders/events
    route:
    - destination:
        host: event-store
        port:
          number: 80
    timeout: 0s
```

The event stream endpoint has `timeout: 0s` which disables the timeout - important for long-lived streaming connections.

## Traffic Policies for Event Store Communication

The command handler writes to the event store on every command. This path needs strong reliability:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: event-store
  namespace: production
spec:
  host: event-store
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 5s
      baseEjectionTime: 10s
```

Tight circuit breaking on the event store means command handlers fail fast if the event store is down, rather than building up a backlog of pending requests.

## Handling Idempotent Event Writes

Event sourcing naturally lends itself to idempotency. Each event has a unique ID, and the event store can reject duplicates. But the network layer still needs to account for retries. Configure the command handler's route to not retry writes (to avoid accidental duplicate events in systems that do not have built-in deduplication):

```yaml
  http:
  - match:
    - uri:
        prefix: /api/orders
      method:
        exact: POST
    route:
    - destination:
        host: order-commands
    retries:
      attempts: 0
    timeout: 10s
```

If the client wants to retry a failed command, the client should resend the same command with the same idempotency key. The command handler and event store handle deduplication.

## Protecting the Projection Service

The projection service reads from the event stream and writes to the read database. It is a critical component - if it falls behind, queries return stale data. Apply appropriate traffic policies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: projection-service
  namespace: production
spec:
  host: projection-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 30
      http:
        http1MaxPendingRequests: 15
        http2MaxRequests: 30
```

The projection service should not receive external traffic directly. Use an AuthorizationPolicy to restrict access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: projection-service-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
      role: projection
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/production/sa/admin-service
  - to:
    - operation:
        paths:
        - "/health"
        - "/metrics"
```

Only the admin service and health/metrics endpoints can reach the projection service. It primarily interacts with Kafka directly (not through Istio) and writes to the database.

## Event Replay Handling

When you need to rebuild projections (after a schema change or bug fix), the projection service replays all events from the beginning. This generates a lot of internal traffic. To prevent this from affecting other services, use traffic policies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: event-store-internal
  namespace: production
spec:
  hosts:
  - event-store
  http:
  - match:
    - sourceLabels:
        role: projection
      headers:
        x-replay-mode:
          exact: "true"
    route:
    - destination:
        host: event-store
    timeout: 300s
  - route:
    - destination:
        host: event-store
    timeout: 30s
```

Replay requests from the projection service get a much longer timeout (5 minutes) since they fetch large batches of events. Normal event store access keeps the standard 30-second timeout.

## Monitoring Event Processing Lag

Track the lag between event production and projection updates:

```
# Command handler request rate (events being produced)
sum(rate(istio_requests_total{destination_service="order-commands.production.svc.cluster.local",response_code="201"}[5m]))

# Query handler request rate (reads from projections)
sum(rate(istio_requests_total{destination_service="order-queries.production.svc.cluster.local"}[5m]))
```

Set up alerts for projection lag through your event platform metrics (Kafka consumer lag, etc.) rather than through Istio, since the event consumption happens outside the HTTP/gRPC layer that Istio observes.

## Scaling Strategy

Each component scales independently based on its workload:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: query-handler-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: query-handler
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: command-handler-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: command-handler
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Query handlers scale aggressively because reads are typically 10-100x more frequent than writes. Command handlers scale more conservatively.

## Summary

Istio supports event sourcing architectures by managing the HTTP/gRPC traffic between commands, queries, event stores, and projection services. Route commands and queries to separate services using method-based matching in VirtualService. Apply different traffic policies - no retries for writes, aggressive retries for reads. Protect the projection service with AuthorizationPolicy. Use different timeouts for normal operations versus event replay. Scale each component independently based on its workload characteristics. Istio handles the network layer while your event platform (Kafka, NATS, EventStoreDB) handles the actual event streaming.
