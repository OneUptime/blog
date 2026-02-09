# How to Create an OpenTelemetry Standards Document Defining Span Naming, Attribute, and Metric Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Standards, Semantic Conventions, Observability

Description: A step-by-step approach to building an OpenTelemetry standards document that defines span naming, attribute schemas, and metric conventions across your organization.

When you have five services, ad-hoc telemetry conventions are manageable. When you have fifty, they become a nightmare. Dashboards break because one team uses `http.status` and another uses `http.status_code`. Queries return partial results because span names follow different patterns. The solution is a standards document that every team references.

Here is how to create one that actually gets adopted.

## Structure of the Document

Your standards document should have four major sections:

1. Resource attributes (service identity)
2. Span naming conventions
3. Span attribute conventions
4. Metric naming and attribute conventions

Keep each section focused and include plenty of examples. Engineers will skim this document looking for the section relevant to their current task.

## Resource Attributes

Resource attributes describe the service itself. They are attached to every piece of telemetry a service emits. Define the required set:

```yaml
# Required resource attributes for all services
resource:
  service.name: "order-service"          # Must match the Kubernetes deployment name
  service.version: "2.4.1"               # Semantic version from build pipeline
  service.namespace: "commerce"           # Business domain grouping
  deployment.environment: "production"    # One of: production, staging, development
  service.instance.id: "${POD_NAME}"      # Unique instance identifier
```

Document which attributes are required versus optional. If a service ships telemetry without `service.name`, your collector should reject it or add a warning label.

## Span Naming Conventions

Span names are the most visible part of your telemetry. They show up in trace views, search results, and alerting rules. Bad span names make all of these worse.

Define a clear pattern:

```
# HTTP server spans
HTTP <method> <route>
Example: HTTP GET /api/v1/orders/{id}

# HTTP client spans
HTTP <method> <host>/<route>
Example: HTTP POST payment-service/api/v1/charges

# Database spans
<db.system> <db.operation> <db.sql.table>
Example: postgresql SELECT orders

# Message queue spans
<messaging.system> <operation> <destination>
Example: kafka publish order.events

# Custom business logic spans
<domain>.<operation>
Example: order.validate_inventory
Example: payment.process_refund
```

The key rule: span names must have low cardinality. Never put IDs, timestamps, or user-specific data in the span name. Those go in attributes.

## Span Attribute Conventions

Start with the OpenTelemetry semantic conventions. They already define attributes for HTTP, database, messaging, and RPC operations. Your document should reference those and then add your domain-specific extensions.

```python
# Standard OpenTelemetry attributes (follow upstream conventions)
span.set_attribute("http.request.method", "POST")
span.set_attribute("http.response.status_code", 201)
span.set_attribute("url.path", "/api/v1/orders")

# Organization-specific attributes (prefix with your domain)
span.set_attribute("order.id", "ord_abc123")
span.set_attribute("order.type", "subscription")
span.set_attribute("order.currency", "USD")
span.set_attribute("customer.tier", "enterprise")
```

Create a table in your document listing every custom attribute:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| order.id | string | yes | Unique order identifier |
| order.type | string | yes | One of: one-time, subscription, trial |
| order.currency | string | yes | ISO 4217 currency code |
| customer.tier | string | no | Customer pricing tier |

## Metric Conventions

Metrics need even more discipline than traces because they directly power dashboards and alerts. A renamed metric silently breaks every alert that depends on it.

```yaml
# Metric naming pattern: <domain>.<entity>.<measurement>
# Always include the unit in the metric name or description

# Good examples
orders.checkout.duration_ms:       # Histogram, measures checkout latency
  type: histogram
  unit: milliseconds
  description: "Time from cart submission to order confirmation"
  attributes:
    - payment.method    # low cardinality: credit_card, paypal, wire
    - order.type        # low cardinality: one-time, subscription

orders.created.count:              # Counter, counts new orders
  type: counter
  unit: "1"
  description: "Number of orders successfully created"
  attributes:
    - order.type

# Bad examples (do NOT do this)
checkout_time:                     # No domain prefix, ambiguous unit
order_metric:                      # Completely meaningless name
orders.created.count:
  attributes:
    - order.id          # NEVER: high cardinality in metric attributes
```

## Enforcement Strategies

A standards document without enforcement is just a suggestion. Build enforcement into your workflow:

**Linting**: Use OpenTelemetry Weaver or custom linters that check span names and attribute keys against your conventions at build time.

**Collector-level validation**: Configure your OpenTelemetry Collector to drop or rename telemetry that does not match your conventions using the transform processor:

```yaml
processors:
  transform:
    error_mode: ignore
    trace_statements:
      - context: span
        # Flag spans with unnamed or generic span names
        statements:
          - set(attributes["convention.warning"], "generic-span-name")
            where name == "doWork" or name == "handle" or name == "process"
```

**Code review checklists**: Add instrumentation quality to your PR review process. Reviewers should check that new spans follow naming conventions and include required attributes.

## Versioning and Evolution

Your conventions will evolve. Use semantic versioning for the document itself. When you introduce a breaking change (renaming an attribute or metric), provide a migration path:

- Announce the change with a deprecation notice
- Support both old and new conventions for one release cycle
- Update the collector to transform old names to new ones during the transition
- Remove the old convention after the migration window closes

## Getting Buy-In

The hardest part is not writing the document. It is getting teams to follow it. Present the standards document as a tool that reduces confusion, not as bureaucracy. Show concrete examples of debugging sessions that were harder than necessary because of inconsistent naming. When engineers see how conventions directly improve their on-call experience, adoption follows naturally.

Store your standards document in a central repository, link it from your service templates, and review it every quarter. Treat it as living infrastructure, not a one-time deliverable.
