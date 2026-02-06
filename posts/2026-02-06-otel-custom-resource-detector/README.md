# How to Implement a Custom Resource Detector That Auto-Discovers Your Deployment Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Detector, Custom SDK, Auto-Discovery, Environment

Description: Implement a custom OpenTelemetry resource detector that automatically discovers and populates deployment environment attributes from your infrastructure.

Resource detectors automatically populate the `Resource` that gets attached to every piece of telemetry. The built-in detectors cover AWS, GCP, Azure, and Kubernetes. But if your company has a custom deployment platform, a home-grown container orchestrator, or specific metadata endpoints, you need a custom resource detector to pull in that information.

## What Resource Detectors Do

When your application starts, resource detectors run and discover attributes about the environment:

```
Resource: {
  "service.name": "payment-service",
  "service.version": "2.4.1",
  "deployment.environment": "production",
  "host.name": "prod-node-042",
  "cloud.provider": "aws",
  "cloud.region": "us-east-1",
  "mycompany.cluster": "prod-east",      // Custom
  "mycompany.deploy.id": "deploy-12345", // Custom
  "mycompany.team": "payments",          // Custom
}
```

The built-in detectors fill in the standard attributes. Your custom detector fills in the company-specific ones.

## Python: Custom Resource Detector

```python
# custom_resource_detector.py
import os
import json
import socket
import logging
from typing import Optional

import requests
from opentelemetry.sdk.resources import Resource, ResourceDetector

logger = logging.getLogger(__name__)


class CompanyResourceDetector(ResourceDetector):
    """
    Detects resource attributes from our company's internal metadata service.
    Every host in our infrastructure runs a metadata agent on port 9898
    that returns deployment information.
    """

    METADATA_ENDPOINT = "http://localhost:9898/v1/metadata"
    TIMEOUT = 5  # seconds

    def detect(self) -> Resource:
        """Discover resource attributes from the environment."""
        attributes = {}

        # Source 1: Internal metadata service
        metadata = self._fetch_metadata()
        if metadata:
            attributes.update({
                "mycompany.cluster": metadata.get("cluster", "unknown"),
                "mycompany.deploy.id": metadata.get("deploy_id", "unknown"),
                "mycompany.deploy.timestamp": metadata.get("deploy_timestamp", ""),
                "mycompany.team": metadata.get("team", "unknown"),
                "mycompany.cost_center": metadata.get("cost_center", ""),
                "mycompany.region": metadata.get("region", "unknown"),
                "mycompany.datacenter": metadata.get("datacenter", ""),
            })

        # Source 2: Environment variables set by our deploy tooling
        env_mappings = {
            "DEPLOY_VERSION": "service.version",
            "DEPLOY_ENV": "deployment.environment",
            "SERVICE_NAME": "service.name",
            "CANARY_WEIGHT": "mycompany.canary.weight",
            "BUILD_SHA": "mycompany.build.sha",
            "BUILD_BRANCH": "mycompany.build.branch",
        }
        for env_var, attr_name in env_mappings.items():
            value = os.environ.get(env_var)
            if value:
                attributes[attr_name] = value

        # Source 3: Labels file written by our container runtime
        labels = self._read_container_labels()
        if labels:
            attributes.update({
                "mycompany.container.id": labels.get("container_id", ""),
                "mycompany.pod.name": labels.get("pod_name", ""),
                "mycompany.namespace": labels.get("namespace", ""),
            })

        # Source 4: System information
        attributes["host.name"] = socket.gethostname()

        # Filter out empty values
        attributes = {k: v for k, v in attributes.items() if v}

        return Resource(attributes)

    def _fetch_metadata(self) -> Optional[dict]:
        """Fetch metadata from the internal metadata service."""
        try:
            response = requests.get(
                self.METADATA_ENDPOINT,
                timeout=self.TIMEOUT,
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            # Never crash if metadata service is unavailable
            logger.warning(f"Failed to fetch metadata: {e}")
        return None

    def _read_container_labels(self) -> Optional[dict]:
        """Read container labels from the labels file."""
        labels_path = "/etc/mycompany/container-labels.json"
        try:
            with open(labels_path) as f:
                return json.load(f)
        except FileNotFoundError:
            # Not running in our container runtime
            logger.debug("Container labels file not found")
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid container labels file: {e}")
        return None
```

## Registering the Detector

```python
# main.py
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

from custom_resource_detector import CompanyResourceDetector

# Run the custom detector
detected_resource = CompanyResourceDetector().detect()

# Merge with any manually specified attributes
# Manual attributes take precedence over detected ones
manual_resource = Resource.create({
    "service.name": "payment-service",
    "service.namespace": "payments",
})

resource = manual_resource.merge(detected_resource)

# Create the tracer provider with the combined resource
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://localhost:4317")
    )
)
```

## Go: Custom Resource Detector for the Collector

For the collector itself, you can write a custom resource detection processor:

```go
// detector.go
package mydetector

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "time"

    "go.opentelemetry.io/collector/pdata/pcommon"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

type CompanyDetector struct {
    metadataURL string
    client      *http.Client
}

func NewCompanyDetector() *CompanyDetector {
    return &CompanyDetector{
        metadataURL: "http://localhost:9898/v1/metadata",
        client: &http.Client{
            Timeout: 5 * time.Second,
        },
    }
}

func (d *CompanyDetector) Detect(ctx context.Context) (*resource.Resource, error) {
    attrs := []attribute.KeyValue{}

    // Fetch from metadata service
    resp, err := d.client.Get(d.metadataURL)
    if err == nil && resp.StatusCode == 200 {
        defer resp.Body.Close()
        var metadata map[string]string
        if json.NewDecoder(resp.Body).Decode(&metadata) == nil {
            for k, v := range metadata {
                attrs = append(attrs,
                    attribute.String("mycompany."+k, v))
            }
        }
    }

    // Read environment variables
    envMappings := map[string]string{
        "DEPLOY_VERSION": "service.version",
        "DEPLOY_ENV":     "deployment.environment",
    }
    for envVar, attrName := range envMappings {
        if val := os.Getenv(envVar); val != "" {
            attrs = append(attrs, attribute.String(attrName, val))
        }
    }

    return resource.NewWithAttributes(
        semconv.SchemaURL,
        attrs...,
    ), nil
}
```

## Java: Custom Resource Provider

```java
// CompanyResourceProvider.java
import io.opentelemetry.sdk.autoconfigure.spi.ResourceProvider;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.AttributeKey;

public class CompanyResourceProvider implements ResourceProvider {

    @Override
    public Resource createResource(ConfigProperties config) {
        var builder = Attributes.builder();

        // Read from environment
        String deployEnv = System.getenv("DEPLOY_ENV");
        if (deployEnv != null) {
            builder.put(AttributeKey.stringKey("deployment.environment"), deployEnv);
        }

        String team = System.getenv("TEAM_NAME");
        if (team != null) {
            builder.put(AttributeKey.stringKey("mycompany.team"), team);
        }

        // Read from metadata service
        try {
            var metadata = fetchMetadata();
            builder.put(AttributeKey.stringKey("mycompany.cluster"),
                       metadata.getOrDefault("cluster", "unknown"));
            builder.put(AttributeKey.stringKey("mycompany.deploy.id"),
                       metadata.getOrDefault("deploy_id", "unknown"));
        } catch (Exception e) {
            // Gracefully handle metadata service being unavailable
        }

        return Resource.create(builder.build());
    }
}
```

Register it via `META-INF/services/io.opentelemetry.sdk.autoconfigure.spi.ResourceProvider`.

## Testing the Detector

```python
# test_detector.py
from unittest.mock import patch, mock_open
from custom_resource_detector import CompanyResourceDetector

def test_detects_from_environment():
    with patch.dict(os.environ, {
        "DEPLOY_VERSION": "2.4.1",
        "DEPLOY_ENV": "production",
    }):
        resource = CompanyResourceDetector().detect()
        assert resource.attributes["service.version"] == "2.4.1"
        assert resource.attributes["deployment.environment"] == "production"

def test_graceful_when_metadata_unavailable():
    # Should not raise even if metadata service is down
    with patch("requests.get", side_effect=ConnectionError):
        resource = CompanyResourceDetector().detect()
        assert resource is not None
```

## Wrapping Up

Custom resource detectors ensure that every piece of telemetry from your application carries the right deployment context. The key design principle is graceful degradation: if a metadata source is unavailable, the detector should return what it can and never crash the application. Run detectors once at startup, merge their results with manual resource attributes, and you get rich context on every span, metric, and log record.
