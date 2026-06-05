# How to Migrate from OpenTelemetry OTEL_* Env Variables to Declarative Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Migration, Environment Variable, Declarative Configuration

Description: A practical migration guide for moving from OTEL_* environment variables to OpenTelemetry declarative YAML configuration files.

If your services are running OpenTelemetry with environment variables today, migrating to declarative configuration files is worth the effort. But doing it all at once across a fleet of services is risky. This guide gives you a practical, incremental migration path with a mapping table for every common environment variable.

## Environment Variable to YAML Mapping

Here is the reference table you will need. Each `OTEL_*` variable maps to a specific location in the YAML structure:

```text
OTEL_SERVICE_NAME
  -> resource.attributes[] entry named service.name

OTEL_RESOURCE_ATTRIBUTES
  -> resource.attributes_list (comma-separated key-value list)
  -> resource.attributes[] entries

OTEL_EXPORTER_OTLP_ENDPOINT
  -> tracer_provider.processors[].batch.exporter.otlp_grpc.endpoint
  -> meter_provider.readers[].periodic.exporter.otlp_grpc.endpoint
  -> logger_provider.processors[].batch.exporter.otlp_grpc.endpoint
  -> or the corresponding otlp_http.endpoint fields with /v1/traces,
     /v1/metrics, and /v1/logs paths

OTEL_EXPORTER_OTLP_PROTOCOL
  -> choose the otlp_grpc or otlp_http exporter key
  -> for http/json, set otlp_http.encoding

OTEL_EXPORTER_OTLP_HEADERS
  -> *.otlp_grpc.headers_list or *.otlp_http.headers_list
  -> or *.headers[] entries

OTEL_EXPORTER_OTLP_COMPRESSION
  -> *.otlp_grpc.compression or *.otlp_http.compression

OTEL_EXPORTER_OTLP_TIMEOUT
  -> *.otlp_grpc.timeout or *.otlp_http.timeout (milliseconds)

OTEL_TRACES_SAMPLER
  -> tracer_provider.sampler

OTEL_TRACES_SAMPLER_ARG
  -> tracer_provider.sampler (nested under sampler type)

OTEL_PROPAGATORS
  -> propagator.composite_list
  -> or propagator.composite[] entries

OTEL_TRACES_EXPORTER
  -> tracer_provider.processors[].*.exporter

OTEL_METRICS_EXPORTER
  -> meter_provider.readers[].*.exporter

OTEL_LOGS_EXPORTER
  -> logger_provider.processors[].*.exporter

OTEL_ATTRIBUTE_COUNT_LIMIT
  -> attribute_limits.attribute_count_limit

OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT
  -> tracer_provider.limits.attribute_count_limit

OTEL_SPAN_EVENT_COUNT_LIMIT
  -> tracer_provider.limits.event_count_limit

OTEL_SPAN_LINK_COUNT_LIMIT
  -> tracer_provider.limits.link_count_limit
```

## Step 1: Audit Your Current Environment Variables

Before writing any YAML, collect all the OpenTelemetry environment variables currently in use across your services. A quick script to audit a Kubernetes namespace:

```bash
#!/bin/bash
# audit-otel-env-vars.sh

# Finds all OTEL_* environment variables in a Kubernetes namespace

NAMESPACE="${1:-default}"

echo "Auditing OTEL env vars in namespace: $NAMESPACE"
echo "=============================================="

# Get all deployments and their OTEL env vars
kubectl get deployments -n "$NAMESPACE" -o json | \
  jq -r '
    .items[] |
    .metadata.name as $deploy |
    .spec.template.spec.containers[] |
    .name as $container |
    (.env // [])[] |
    select(.name | startswith("OTEL_")) |
    "\($deploy)/\($container): \(.name)=\(.value // "<from-secret>")"
  ' | sort
```

Sample output:

```text
cart-service/app: OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
cart-service/app: OTEL_EXPORTER_OTLP_PROTOCOL=grpc
cart-service/app: OTEL_RESOURCE_ATTRIBUTES=service.name=cart-service,deployment.environment=production
cart-service/app: OTEL_TRACES_SAMPLER=parentbased_traceidratio
cart-service/app: OTEL_TRACES_SAMPLER_ARG=0.1
order-service/app: OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
order-service/app: OTEL_EXPORTER_OTLP_PROTOCOL=grpc
order-service/app: OTEL_RESOURCE_ATTRIBUTES=service.name=order-service,deployment.environment=production
```

## Step 2: Generate the YAML from Existing Variables

Write a conversion script to bootstrap your YAML file:

```python
#!/usr/bin/env python3
# convert_env_to_yaml.py
# Converts OTEL_* environment variables into a declarative config YAML

import os
import yaml

def build_config():
    """Build an OTel config dict from current environment variables."""
    config = {"file_format": "1.0"}

    # Resource attributes
    service_name = os.environ.get("OTEL_SERVICE_NAME", "")
    resource_attrs_str = os.environ.get("OTEL_RESOURCE_ATTRIBUTES", "")

    resource_attrs = {}
    if resource_attrs_str:
        for pair in resource_attrs_str.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                resource_attrs[key.strip()] = value.strip()
    if service_name:
        resource_attrs["service.name"] = service_name

    if resource_attrs:
        config["resource"] = {
            "attributes": [
                {"name": key, "value": value}
                for key, value in resource_attrs.items()
            ]
        }

    # OTLP exporter settings
    protocol = os.environ.get("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
    default_endpoint = "http://localhost:4317" if protocol == "grpc" else "http://localhost:4318"
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", default_endpoint)

    exporter_name = "otlp_grpc" if protocol == "grpc" else "otlp_http"
    exporter_config = {
        "endpoint": endpoint,
    }
    if protocol == "http/json":
        exporter_config["encoding"] = "json"

    compression = os.environ.get("OTEL_EXPORTER_OTLP_COMPRESSION")
    if compression:
        exporter_config["compression"] = compression

    timeout = os.environ.get("OTEL_EXPORTER_OTLP_TIMEOUT")
    if timeout:
        exporter_config["timeout"] = int(timeout)

    headers = os.environ.get("OTEL_EXPORTER_OTLP_HEADERS")
    if headers:
        exporter_config["headers_list"] = headers

    def exporter_for_signal(signal):
        signal_config = dict(exporter_config)
        if exporter_name == "otlp_http":
            signal_config["endpoint"] = f"{endpoint.rstrip('/')}/v1/{signal}"
        return {exporter_name: signal_config}

    # Tracer provider
    sampler_name = os.environ.get("OTEL_TRACES_SAMPLER", "parentbased_always_on")
    sampler_arg = os.environ.get("OTEL_TRACES_SAMPLER_ARG", "1.0")

    sampler = {}
    if sampler_name == "parentbased_traceidratio":
        sampler = {
            "parent_based": {
                "root": {
                    "trace_id_ratio_based": {
                        "ratio": float(sampler_arg)
                    }
                }
            }
        }
    elif sampler_name == "always_on":
        sampler = {"always_on": {}}
    elif sampler_name == "always_off":
        sampler = {"always_off": {}}
    elif sampler_name == "traceidratio":
        sampler = {"trace_id_ratio_based": {"ratio": float(sampler_arg)}}
    elif sampler_name == "parentbased_always_on":
        sampler = {"parent_based": {"root": {"always_on": {}}}}
    elif sampler_name == "parentbased_always_off":
        sampler = {"parent_based": {"root": {"always_off": {}}}}

    config["tracer_provider"] = {
        "processors": [{"batch": {"exporter": exporter_for_signal("traces")}}],
        "sampler": sampler,
    }

    # Meter provider
    config["meter_provider"] = {
        "readers": [{"periodic": {"exporter": exporter_for_signal("metrics")}}]
    }

    # Logger provider
    config["logger_provider"] = {
        "processors": [{"batch": {"exporter": exporter_for_signal("logs")}}]
    }

    # Propagators
    propagators = os.environ.get("OTEL_PROPAGATORS", "tracecontext,baggage")
    config["propagator"] = {"composite_list": propagators}

    return config

if __name__ == "__main__":
    config = build_config()
    print(yaml.dump(config, default_flow_style=False, sort_keys=False))
```

Run it with your current environment:

```bash
# Source your current env vars then generate the YAML
source /path/to/current-env-vars.sh
python convert_env_to_yaml.py > otel-config.yaml
```

## Step 3: Deploy Side by Side

The safest migration path is running the config file alongside existing env vars for a transition period. When both are present, the config file takes precedence:

```yaml
# Kubernetes deployment - transition period
env:
  # New: point to the config file
  - name: OTEL_CONFIG_FILE
    value: "/etc/otel/otel-config.yaml"
  # Old: keep env vars as fallback documentation
  # These are ignored when config file is present
  - name: OTEL_SERVICE_NAME
    value: "order-service"
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://collector:4317"
  - name: OTEL_EXPORTER_OTLP_PROTOCOL
    value: "grpc"
```

## Step 4: Validate Telemetry Output

After deploying with the config file, verify your telemetry is unchanged:

```bash
# Check that spans are still being exported
kubectl logs -l app=order-service -c app | grep "Exporting spans"

# Verify resource attributes in your observability backend
# Query for your service and check the resource attributes match
```

## Step 5: Remove the Old Environment Variables

Once you have confirmed everything works, remove the old environment variables in a separate deployment:

```yaml
# Kubernetes deployment - after migration
env:
  - name: OTEL_CONFIG_FILE
    value: "/etc/otel/otel-config.yaml"
  # All OTEL_* env vars removed
```

## Wrapping Up

Migrating from environment variables to declarative configuration is a one-time cost that makes every future configuration change easier. Audit what you have, generate a baseline YAML, deploy side by side, verify telemetry, then clean up the old variables. Do it one service at a time to limit blast radius, and validate the YAML in CI to prevent regressions.
