# How to Implement Conditional Attribute Copying with OTTL Where Clauses Based on Service Name

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Conditional Logic, Transform Processor

Description: Implement conditional attribute copying in OTTL using where clauses to apply different transformations per service name in the Collector.

In a multi-service environment, different services need different transformations. Your API gateway needs URL normalization, your payment service needs PCI-related redaction, and your frontend service needs user session attributes flattened. OTTL where clauses let you apply transformations conditionally based on `resource.attributes["service.name"]` or any other attribute.

## Basic Where Clause Syntax

Every OTTL statement can have a `where` clause that acts as a filter:

```yaml
- set(attributes["key"], "value") where <condition>
```

The statement only executes when the condition evaluates to true.

## Service-Specific Transformations

```yaml
processors:
  transform/per_service:
    trace_statements:
      - context: span
        statements:
          # API Gateway: normalize URL paths
          - set(attributes["http.route"], "/api/users/{id}") where resource.attributes["service.name"] == "api-gateway" and attributes["http.route"] == nil

          # Payment Service: redact card numbers
          - set(attributes["card.last_four"], "XXXX") where resource.attributes["service.name"] == "payment-service" and attributes["card.number"] != nil
          - delete_key(attributes, "card.number") where resource.attributes["service.name"] == "payment-service"

          # Frontend Service: add user tier from session
          - set(attributes["user.tier"], "free") where resource.attributes["service.name"] == "frontend" and attributes["user.is_premium"] == false
          - set(attributes["user.tier"], "premium") where resource.attributes["service.name"] == "frontend" and attributes["user.is_premium"] == true
```

## Copying Attributes Between Services

When one service sets an attribute under a different key than what downstream services expect:

```yaml
processors:
  transform/normalize_attrs:
    trace_statements:
      - context: span
        statements:
          # Service A uses "customer_id", Service B uses "user.id"
          # Normalize to a single key
          - set(attributes["user.id"], attributes["customer_id"]) where resource.attributes["service.name"] == "legacy-service" and attributes["customer_id"] != nil
          - delete_key(attributes, "customer_id") where resource.attributes["service.name"] == "legacy-service" and attributes["customer_id"] != nil

          # Service C uses "req.method", standard is "http.method"
          - set(attributes["http.method"], attributes["req.method"]) where resource.attributes["service.name"] == "service-c" and attributes["req.method"] != nil
          - delete_key(attributes, "req.method") where resource.attributes["service.name"] == "service-c"
```

## Using Compound Conditions

Combine multiple conditions with `and` and `or`:

```yaml
processors:
  transform/compound:
    trace_statements:
      - context: span
        statements:
          # Apply to multiple services at once
          - set(attributes["team"], "payments") where resource.attributes["service.name"] == "payment-service" or resource.attributes["service.name"] == "billing-service" or resource.attributes["service.name"] == "invoice-service"

          # Apply only when multiple conditions are met
          - set(attributes["alert.priority"], "high") where resource.attributes["service.name"] == "checkout-service" and attributes["http.response.status_code"] >= 500 and attributes["http.route"] == "/api/checkout"
```

## Conditional Attribute Enrichment by Namespace

If you organize services by Kubernetes namespace:

```yaml
processors:
  transform/by_namespace:
    trace_statements:
      - context: span
        statements:
          # Add team ownership based on namespace
          - set(attributes["team.owner"], "platform") where resource.attributes["k8s.namespace.name"] == "platform"
          - set(attributes["team.owner"], "backend") where resource.attributes["k8s.namespace.name"] == "backend-services"
          - set(attributes["team.owner"], "data") where resource.attributes["k8s.namespace.name"] == "data-pipeline"

          # Set different sampling hints per namespace
          - set(attributes["sampling.priority"], 1) where resource.attributes["k8s.namespace.name"] == "staging"
          - set(attributes["sampling.priority"], 10) where resource.attributes["k8s.namespace.name"] == "production"
```

## Conditional Copying from Resource to Span

Copy different resource attributes depending on the service:

```yaml
processors:
  transform/conditional_copy:
    trace_statements:
      - context: span
        statements:
          # For API services: copy HTTP-relevant resource attributes
          - set(attributes["cloud.region"], resource.attributes["cloud.region"]) where resource.attributes["service.name"] == "api-gateway"
          - set(attributes["host.name"], resource.attributes["host.name"]) where resource.attributes["service.name"] == "api-gateway"

          # For worker services: copy queue-relevant resource attributes
          - set(attributes["k8s.pod.name"], resource.attributes["k8s.pod.name"]) where resource.attributes["service.name"] == "queue-worker"
          - set(attributes["k8s.node.name"], resource.attributes["k8s.node.name"]) where resource.attributes["service.name"] == "queue-worker"
```

## Pattern Matching with IsMatch

For more flexible service name matching, use `IsMatch` which supports regex:

```yaml
processors:
  transform/pattern_match:
    trace_statements:
      - context: span
        statements:
          # Match all services starting with "payment-"
          - set(attributes["domain"], "payments") where IsMatch(resource.attributes["service.name"], "payment-.*")

          # Match all services ending with "-api"
          - set(attributes["service.type"], "api") where IsMatch(resource.attributes["service.name"], ".*-api$")

          # Match services with version suffixes
          - set(attributes["legacy"], true) where IsMatch(resource.attributes["service.name"], ".*-v1$")
```

## Full Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/service_specific:
    trace_statements:
      - context: span
        statements:
          # Team assignment
          - set(attributes["team"], "checkout") where resource.attributes["service.name"] == "cart-service" or resource.attributes["service.name"] == "checkout-service"
          - set(attributes["team"], "search") where resource.attributes["service.name"] == "search-service" or resource.attributes["service.name"] == "indexer-service"

          # Service-specific redaction
          - delete_key(attributes, "user.email") where resource.attributes["service.name"] == "notification-service"
          - delete_key(attributes, "user.phone") where resource.attributes["service.name"] == "notification-service"

          # Environment-specific defaults
          - set(attributes["log.level.threshold"], "DEBUG") where resource.attributes["deployment.environment"] == "development"
          - set(attributes["log.level.threshold"], "INFO") where resource.attributes["deployment.environment"] == "staging"
          - set(attributes["log.level.threshold"], "WARN") where resource.attributes["deployment.environment"] == "production"

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/service_specific, batch]
      exporters: [otlp]
```

## Performance Notes

Each `where` clause adds a condition evaluation per span. For high-throughput Collectors processing millions of spans per second:

1. Put the most common services first in the statement list
2. Avoid regex patterns when simple equality checks work
3. Consider using separate transform processor instances per pipeline if service-specific logic is complex

Conditional OTTL transformations let you manage a fleet of diverse services through a single Collector configuration. Each service gets the transformations it needs without affecting other services in the pipeline.
