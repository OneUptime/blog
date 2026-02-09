# How to Build a Self-Service Observability Platform Where Teams Declare Their Telemetry Needs in YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Self-Service, Platform Engineering, YAML Configuration

Description: Build a self-service observability platform where development teams declare their telemetry requirements in a simple YAML manifest.

Platform teams should not be the bottleneck for observability. Instead of having developers file tickets to get their services instrumented, give them a YAML file format to declare what they need. A controller reads these declarations and automatically provisions Collector configs, dashboards, and alerts. This is how you build it.

## The Telemetry Manifest

Define a simple YAML format that developers fill out for each service:

```yaml
# telemetry-manifest.yaml
apiVersion: observability.platform/v1
kind: TelemetryManifest
metadata:
  name: payment-service
  team: payments
  owner: alice@company.com
  cost_center: CC-1234

spec:
  # What signals this service produces
  signals:
    traces:
      enabled: true
      sampling_rate: 1.0  # 100% for critical path
    metrics:
      enabled: true
      custom_metrics:
        - name: payment.transactions.total
          type: counter
          description: "Total payment transactions"
        - name: payment.amount.sum
          type: histogram
          description: "Payment amounts"
          unit: USD
    logs:
      enabled: true
      retention_days: 30

  # SLO definitions
  slos:
    - name: availability
      target: 99.99
      indicator: success_rate
      window: 30d
    - name: latency
      target: 99.0
      threshold_ms: 500
      indicator: latency_p99
      window: 30d

  # What dashboards to auto-generate
  dashboards:
    - type: service-overview
    - type: slo-tracker
    - type: dependency-map

  # Alert rules
  alerts:
    - name: high-error-rate
      condition: "error_rate > 5%"
      duration: 5m
      severity: critical
      notify:
        - slack: "#payments-oncall"
        - pagerduty: payments-team

    - name: high-latency
      condition: "p99_latency > 2s"
      duration: 10m
      severity: warning
      notify:
        - slack: "#payments-alerts"

  # Resource requirements for the sidecar collector
  collector:
    resources:
      cpu: "500m"
      memory: "512Mi"
```

## The Controller

Build a controller that watches for TelemetryManifest files and generates the necessary configurations:

```python
# controller.py
import yaml
import os
import json
from pathlib import Path
from jinja2 import Template

class ObservabilityController:
    def __init__(self, manifests_dir, output_dir):
        self.manifests_dir = manifests_dir
        self.output_dir = output_dir

    def reconcile(self):
        """Process all telemetry manifests and generate configs."""
        manifests = self.load_manifests()
        for manifest in manifests:
            name = manifest["metadata"]["name"]
            print(f"Processing manifest for {name}...")

            # Generate Collector config
            collector_config = self.generate_collector_config(manifest)
            self.write_output(
                f"collectors/{name}/config.yaml",
                yaml.dump(collector_config)
            )

            # Generate dashboard config
            dashboard = self.generate_dashboard(manifest)
            self.write_output(
                f"dashboards/{name}.json",
                json.dumps(dashboard, indent=2)
            )

            # Generate alert rules
            alerts = self.generate_alerts(manifest)
            self.write_output(
                f"alerts/{name}.yaml",
                yaml.dump(alerts)
            )

        print(f"Processed {len(manifests)} manifests")

    def load_manifests(self):
        manifests = []
        for path in Path(self.manifests_dir).glob("**/telemetry-manifest.yaml"):
            with open(path) as f:
                manifests.append(yaml.safe_load(f))
        return manifests

    def generate_collector_config(self, manifest):
        """Generate an OTel Collector config from the manifest."""
        name = manifest["metadata"]["name"]
        team = manifest["metadata"]["team"]
        spec = manifest["spec"]

        config = {
            "receivers": {
                "otlp": {
                    "protocols": {
                        "grpc": {"endpoint": "0.0.0.0:4317"},
                        "http": {"endpoint": "0.0.0.0:4318"},
                    }
                }
            },
            "processors": {
                "batch": {
                    "send_batch_size": 4096,
                    "timeout": "1s"
                },
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": name,
                         "action": "upsert"},
                        {"key": "team.name", "value": team,
                         "action": "upsert"},
                    ]
                }
            },
            "exporters": {},
            "service": {"pipelines": {}}
        }

        # Add sampling processor based on manifest
        if spec["signals"].get("traces", {}).get("enabled"):
            rate = spec["signals"]["traces"].get("sampling_rate", 0.1)
            config["processors"]["probabilistic_sampler"] = {
                "sampling_percentage": rate * 100
            }

        # Configure exporters
        config["exporters"]["otlphttp"] = {
            "endpoint": "https://gateway.observability:4318"
        }

        # Build pipelines from enabled signals
        for signal in ["traces", "metrics", "logs"]:
            if spec["signals"].get(signal, {}).get("enabled", False):
                processors = ["resource", "batch"]
                if signal == "traces":
                    processors.insert(1, "probabilistic_sampler")
                config["service"]["pipelines"][signal] = {
                    "receivers": ["otlp"],
                    "processors": processors,
                    "exporters": ["otlphttp"]
                }

        return config

    def generate_dashboard(self, manifest):
        """Generate a Grafana dashboard JSON from the manifest."""
        name = manifest["metadata"]["name"]
        panels = []
        y_pos = 0

        for dashboard_type in manifest["spec"].get("dashboards", []):
            if dashboard_type["type"] == "service-overview":
                panels.extend(self._service_overview_panels(name, y_pos))
                y_pos += 16

        return {
            "dashboard": {
                "title": f"{name} - Auto-Generated",
                "tags": ["auto-generated", manifest["metadata"]["team"]],
                "panels": panels,
            }
        }

    def generate_alerts(self, manifest):
        """Generate alert rules from the manifest."""
        name = manifest["metadata"]["name"]
        rules = []

        for alert in manifest["spec"].get("alerts", []):
            rules.append({
                "alert": f"{name}-{alert['name']}",
                "expr": self._build_alert_expr(name, alert),
                "for": alert.get("duration", "5m"),
                "labels": {
                    "severity": alert.get("severity", "warning"),
                    "team": manifest["metadata"]["team"],
                    "service": name,
                },
                "annotations": {
                    "summary": f"{alert['name']} for {name}",
                }
            })

        return {"groups": [{"name": name, "rules": rules}]}

    def _build_alert_expr(self, service, alert):
        condition = alert["condition"]
        if "error_rate" in condition:
            threshold = condition.split(">")[1].strip().rstrip("%")
            return (f'(sum(rate(http_server_request_duration_seconds_count'
                    f'{{service_name="{service}",http_response_status_code=~"5.."}}[5m]))'
                    f'/sum(rate(http_server_request_duration_seconds_count'
                    f'{{service_name="{service}"}}[5m])))*100>{threshold}')
        return condition

    def write_output(self, path, content):
        full_path = os.path.join(self.output_dir, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)

if __name__ == "__main__":
    controller = ObservabilityController(
        manifests_dir="./services",
        output_dir="./generated"
    )
    controller.reconcile()
```

## Developer Workflow

1. Developer creates `telemetry-manifest.yaml` in their service repo.
2. CI runs the controller to generate configs.
3. Generated configs are applied via GitOps (ArgoCD/FluxCD).
4. Developer gets Collectors, dashboards, and alerts without filing tickets.

## Wrapping Up

A self-service observability platform removes the platform team as a bottleneck while maintaining standards and consistency. Developers get what they need by filling out a YAML file, and the platform team controls the templates and generation logic. Everyone wins.
