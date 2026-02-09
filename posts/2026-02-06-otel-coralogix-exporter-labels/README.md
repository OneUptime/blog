# How to Send OpenTelemetry Data to Coralogix Using the Coralogix Exporter with Application and Subsystem Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Coralogix, Exporter, Observability

Description: Configure the OpenTelemetry Collector's Coralogix exporter with application and subsystem labels for organized data ingestion.

Coralogix has a dedicated exporter in the OpenTelemetry Collector that handles authentication and the Coralogix-specific concepts of Application and Subsystem labels. These labels are central to how Coralogix organizes and queries your data. While you can use the generic OTLP exporter, the Coralogix exporter simplifies the mapping between OpenTelemetry resource attributes and Coralogix's labeling system.

## Application and Subsystem Labels

Coralogix groups all telemetry under two labels:

- **Application**: Usually maps to your service or product name (e.g., "ecommerce-platform")
- **Subsystem**: Maps to a component within that application (e.g., "checkout-service", "inventory-api")

These labels control data routing, retention policies, and alerting scopes in Coralogix.

## Collector Configuration

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

  # Set resource attributes that the Coralogix exporter maps to labels
  resource:
    attributes:
      - key: cx.application.name
        value: "ecommerce-platform"
        action: upsert
      - key: cx.subsystem.name
        from_attribute: service.name
        action: upsert

exporters:
  coralogix:
    # Your Coralogix private key for data ingestion
    private_key: "${CORALOGIX_PRIVATE_KEY}"

    # Domain based on your Coralogix region
    domain: "coralogix.com"  # US1
    # Other options: coralogix.us, eu2.coralogix.com, coralogix.in, coralogixsg.com

    # Map resource attributes to Coralogix application/subsystem
    application_name_attributes:
      - "cx.application.name"
      - "service.namespace"
    subsystem_name_attributes:
      - "cx.subsystem.name"
      - "service.name"

    # Fallback values if attributes are missing
    application_name: "default-app"
    subsystem_name: "default-subsystem"

    # Separate endpoints per signal type
    traces:
      endpoint: "ingress.coralogix.com:443"
    metrics:
      endpoint: "ingress.coralogix.com:443"
    logs:
      endpoint: "ingress.coralogix.com:443"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [coralogix]
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [coralogix]
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [coralogix]
```

## How Label Mapping Works

The Coralogix exporter looks through `application_name_attributes` in order and uses the first one it finds on the resource:

```yaml
application_name_attributes:
  - "cx.application.name"    # Check this first
  - "service.namespace"       # Fall back to this
```

If neither attribute exists on a given telemetry record, the exporter uses the `application_name` fallback value. The same logic applies to `subsystem_name_attributes`.

This is useful in multi-service deployments. Each service sets its own `service.name`, which automatically becomes the subsystem label. The application label can be set at the Collector level via the resource processor.

## Dynamic Label Assignment per Service

If you have multiple services sending to the same Collector and you want different application labels per service, use the resource processor with conditions:

```yaml
processors:
  # For services that already set service.namespace
  # the Coralogix exporter will use it automatically
  resource/defaults:
    attributes:
      - key: cx.application.name
        value: "ecommerce-platform"
        action: insert  # Only set if not already present
```

Using `insert` instead of `upsert` means the attribute is only added if it does not already exist. Services that set their own `cx.application.name` in the SDK will keep their value.

## SDK-Level Configuration

You can also set the Coralogix labels from your application code:

```javascript
// Node.js OpenTelemetry SDK setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'checkout-service',
    'service.namespace': 'ecommerce-platform',
    // These attributes will be picked up by the Coralogix exporter
    'cx.application.name': 'ecommerce-platform',
    'cx.subsystem.name': 'checkout-service',
  }),
  traceExporter: new OTLPTraceExporter({
    // Point at your Collector
    url: 'http://otel-collector:4317',
  }),
});

sdk.start();
```

## Region-Specific Endpoints

Coralogix has different endpoints per region. Make sure you use the correct one:

```yaml
# US1
domain: "coralogix.com"

# US2
domain: "coralogix.us"

# EU1
domain: "coralogix.com"  # with eu1 ingress

# EU2
domain: "eu2.coralogix.com"

# AP1 (India)
domain: "coralogix.in"

# AP2 (Singapore)
domain: "coralogixsg.com"
```

Using the wrong region endpoint will result in authentication failures even if your private key is correct.

## Adding Retry Logic

For production deployments, configure retries and a sending queue:

```yaml
exporters:
  coralogix:
    private_key: "${CORALOGIX_PRIVATE_KEY}"
    domain: "coralogix.com"
    application_name_attributes: ["cx.application.name"]
    subsystem_name_attributes: ["service.name"]
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

## Verifying in Coralogix

After deploying, navigate to the Coralogix dashboard and check the Application and Subsystem dropdowns. You should see your configured labels. If data appears under "default-app" or "default-subsystem", it means the attribute mapping is not working and the fallback values are being used. Double-check that your resource attributes match the names configured in `application_name_attributes` and `subsystem_name_attributes`.

The Coralogix exporter streamlines the integration by handling the label mapping natively, so you do not need to fiddle with custom headers or pre-processing logic.
