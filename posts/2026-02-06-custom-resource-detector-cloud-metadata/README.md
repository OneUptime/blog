# How to Implement a Custom Resource Detector That Merges Cloud Provider Metadata with Application Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Detector, Cloud Metadata, SDK

Description: Build a custom OpenTelemetry resource detector that fetches cloud provider metadata and merges it with application configuration.

The built-in cloud resource detectors for AWS, GCP, and Azure cover common metadata like region, instance ID, and availability zone. But they do not know about your application's configuration: things like feature flags, deployment version, tenant ID, or team ownership. A custom resource detector can fetch cloud metadata from the instance metadata service and combine it with application-specific config, giving you a single resource that describes both the infrastructure and the application context.

## The Resource Detector Interface

In Python, a resource detector implements the `detect` method:

```python
from opentelemetry.sdk.resources import ResourceDetector, Resource


class CustomDetector(ResourceDetector):
    def detect(self) -> Resource:
        # Return a Resource with discovered attributes
        return Resource.create({"key": "value"})
```

In Go, it implements the `Detect` method:

```go
type Detector interface {
    Detect(ctx context.Context) (*resource.Resource, error)
}
```

## Python: Cloud + App Config Detector

Here is a detector that fetches AWS EC2 metadata and merges it with application config from a YAML file:

```python
# custom_detector.py
import json
import os
import urllib.request
import yaml
from opentelemetry.sdk.resources import ResourceDetector, Resource


class CloudAppResourceDetector(ResourceDetector):
    """Detects cloud provider metadata and merges with app config."""

    def __init__(self, config_path=None):
        self._config_path = config_path or os.getenv(
            "APP_CONFIG_PATH", "/etc/myapp/config.yaml"
        )

    def detect(self) -> Resource:
        attributes = {}

        # Fetch cloud metadata
        cloud_attrs = self._detect_cloud_metadata()
        attributes.update(cloud_attrs)

        # Load application config
        app_attrs = self._load_app_config()
        attributes.update(app_attrs)

        return Resource.create(attributes)

    def _detect_cloud_metadata(self):
        """Fetch metadata from the cloud provider's metadata service."""
        attrs = {}

        # Try AWS EC2 Instance Metadata Service (IMDSv2)
        try:
            # Get token for IMDSv2
            token_req = urllib.request.Request(
                "http://169.254.169.254/latest/api/token",
                method="PUT",
                headers={"X-aws-ec2-metadata-token-ttl-seconds": "300"},
            )
            token_resp = urllib.request.urlopen(token_req, timeout=2)
            token = token_resp.read().decode("utf-8")

            headers = {"X-aws-ec2-metadata-token": token}

            # Fetch instance metadata
            metadata_paths = {
                "cloud.provider": None,  # Set manually
                "cloud.region": "/latest/meta-data/placement/region",
                "cloud.availability_zone": "/latest/meta-data/placement/availability-zone",
                "host.id": "/latest/meta-data/instance-id",
                "host.type": "/latest/meta-data/instance-type",
                "host.name": "/latest/meta-data/hostname",
            }

            attrs["cloud.provider"] = "aws"
            attrs["cloud.platform"] = "aws_ec2"

            for attr_key, path in metadata_paths.items():
                if path is None:
                    continue
                try:
                    req = urllib.request.Request(
                        f"http://169.254.169.254{path}",
                        headers=headers,
                    )
                    resp = urllib.request.urlopen(req, timeout=2)
                    attrs[attr_key] = resp.read().decode("utf-8")
                except Exception:
                    pass

            # Fetch instance tags if available
            try:
                req = urllib.request.Request(
                    "http://169.254.169.254/latest/meta-data/tags/instance",
                    headers=headers,
                )
                resp = urllib.request.urlopen(req, timeout=2)
                tag_keys = resp.read().decode("utf-8").strip().split("\n")

                for tag_key in tag_keys:
                    tag_req = urllib.request.Request(
                        f"http://169.254.169.254/latest/meta-data/tags/instance/{tag_key}",
                        headers=headers,
                    )
                    tag_resp = urllib.request.urlopen(tag_req, timeout=2)
                    tag_value = tag_resp.read().decode("utf-8")
                    # Map common AWS tags to resource attributes
                    if tag_key == "Name":
                        attrs["host.name"] = tag_value
                    elif tag_key == "Environment":
                        attrs["deployment.environment"] = tag_value
                    elif tag_key == "Team":
                        attrs["team.name"] = tag_value
            except Exception:
                pass

        except Exception:
            # Not running on AWS, try other providers or skip
            pass

        return attrs

    def _load_app_config(self):
        """Load application-specific resource attributes from config file."""
        attrs = {}

        if not os.path.exists(self._config_path):
            return attrs

        try:
            with open(self._config_path, "r") as f:
                config = yaml.safe_load(f)

            resource_config = config.get("opentelemetry", {}).get("resource", {})

            # Map config values to resource attributes
            if "service_name" in resource_config:
                attrs["service.name"] = resource_config["service_name"]
            if "service_version" in resource_config:
                attrs["service.version"] = resource_config["service_version"]
            if "team" in resource_config:
                attrs["team.name"] = resource_config["team"]
            if "tenant_id" in resource_config:
                attrs["tenant.id"] = resource_config["tenant_id"]

            # Include feature flags as resource attributes
            features = config.get("features", {})
            for flag_name, flag_value in features.items():
                attrs[f"feature.{flag_name}"] = str(flag_value)

        except Exception as e:
            print(f"Warning: failed to load app config: {e}")

        return attrs
```

## Application Config File

```yaml
# /etc/myapp/config.yaml
opentelemetry:
  resource:
    service_name: "payment-service"
    service_version: "2.3.1"
    team: "payments-team"
    tenant_id: "acme-corp"

features:
  new_checkout_flow: true
  dark_mode: false
```

## Using the Custom Detector

```python
# main.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, get_aggregated_resources, OTELResourceDetector
from custom_detector import CloudAppResourceDetector

# Run detectors in priority order (last wins for conflicts)
detected = get_aggregated_resources([
    CloudAppResourceDetector(config_path="/etc/myapp/config.yaml"),
    OTELResourceDetector(),  # Env vars can override everything
])

# Set up the TracerProvider with the merged resource
provider = TracerProvider(resource=detected)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://collector:4317", insecure=True))
)
trace.set_tracer_provider(provider)
```

## Go Implementation

```go
package detector

import (
    "context"
    "encoding/json"
    "io"
    "net/http"
    "os"
    "time"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "gopkg.in/yaml.v3"
)

type CloudAppDetector struct {
    ConfigPath string
}

func (d *CloudAppDetector) Detect(ctx context.Context) (*resource.Resource, error) {
    attrs := []attribute.KeyValue{}

    // Fetch cloud metadata
    cloudAttrs := d.detectCloudMetadata(ctx)
    attrs = append(attrs, cloudAttrs...)

    // Load app config
    appAttrs := d.loadAppConfig()
    attrs = append(attrs, appAttrs...)

    return resource.NewWithAttributes(semconv.SchemaURL, attrs...), nil
}

func (d *CloudAppDetector) detectCloudMetadata(ctx context.Context) []attribute.KeyValue {
    client := &http.Client{Timeout: 2 * time.Second}
    var attrs []attribute.KeyValue

    // Try AWS IMDSv2
    tokenReq, _ := http.NewRequestWithContext(ctx, "PUT",
        "http://169.254.169.254/latest/api/token", nil)
    tokenReq.Header.Set("X-aws-ec2-metadata-token-ttl-seconds", "300")

    tokenResp, err := client.Do(tokenReq)
    if err != nil {
        return attrs
    }
    defer tokenResp.Body.Close()
    tokenBytes, _ := io.ReadAll(tokenResp.Body)
    token := string(tokenBytes)

    attrs = append(attrs,
        attribute.String("cloud.provider", "aws"),
        attribute.String("cloud.platform", "aws_ec2"),
    )

    // Fetch region
    if val := fetchMetadata(client, token, "/latest/meta-data/placement/region"); val != "" {
        attrs = append(attrs, attribute.String("cloud.region", val))
    }

    return attrs
}
```

## Testing the Custom Detector

```python
# test_custom_detector.py
import tempfile
import os
import yaml
import pytest
from custom_detector import CloudAppResourceDetector


def test_loads_app_config():
    config = {
        "opentelemetry": {
            "resource": {
                "service_name": "test-service",
                "service_version": "1.0.0",
                "team": "platform",
            }
        }
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(config, f)
        config_path = f.name

    try:
        detector = CloudAppResourceDetector(config_path=config_path)
        resource = detector.detect()
        attrs = dict(resource.attributes)

        assert attrs["service.name"] == "test-service"
        assert attrs["service.version"] == "1.0.0"
        assert attrs["team.name"] == "platform"
    finally:
        os.unlink(config_path)
```

A custom resource detector that combines cloud metadata with application config gives you rich context on every span, metric, and log record. The cloud metadata tells you where the telemetry came from, and the application config tells you what was running and who owns it.
