# How to Use the Telemetry Controller for Kubernetes Multi-Tenant Observability with Custom Resource Definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, CRD, Multi-Tenant Observability

Description: Build a Kubernetes controller with custom resource definitions to manage multi-tenant OpenTelemetry observability configurations.

Managing per-tenant observability configurations manually does not scale beyond a handful of teams. A Kubernetes controller that watches custom resources and automatically provisions Collector configurations, pipelines, and routing rules is the scalable approach. This post shows how to build one.

## Defining the Custom Resource

First, define a CRD that represents a tenant's observability configuration:

```yaml
# crd-telemetry-tenant.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: telemetrytenants.observability.platform.io
spec:
  group: observability.platform.io
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: [teamName, namespace]
              properties:
                teamName:
                  type: string
                namespace:
                  type: string
                costCenter:
                  type: string
                signals:
                  type: object
                  properties:
                    traces:
                      type: object
                      properties:
                        enabled:
                          type: boolean
                        samplingRate:
                          type: number
                        rateLimit:
                          type: integer
                    metrics:
                      type: object
                      properties:
                        enabled:
                          type: boolean
                        rateLimit:
                          type: integer
                    logs:
                      type: object
                      properties:
                        enabled:
                          type: boolean
                        retentionDays:
                          type: integer
                        rateLimit:
                          type: integer
                backends:
                  type: array
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                      endpoint:
                        type: string
                      signalTypes:
                        type: array
                        items:
                          type: string
            status:
              type: object
              properties:
                state:
                  type: string
                collectorReady:
                  type: boolean
                lastReconciled:
                  type: string
      subresources:
        status: {}
  scope: Namespaced
  names:
    plural: telemetrytenants
    singular: telemetrytenant
    kind: TelemetryTenant
    shortNames: [tt]
```

## Creating a Tenant Resource

Teams create a TelemetryTenant resource to declare their needs:

```yaml
# tenant-payments.yaml
apiVersion: observability.platform.io/v1alpha1
kind: TelemetryTenant
metadata:
  name: payments-team
  namespace: payments
spec:
  teamName: payments
  namespace: payments
  costCenter: CC-1234
  signals:
    traces:
      enabled: true
      samplingRate: 1.0
      rateLimit: 50000  # spans per second
    metrics:
      enabled: true
      rateLimit: 10000
    logs:
      enabled: true
      retentionDays: 30
      rateLimit: 20000
  backends:
    - name: primary
      endpoint: https://primary-backend:4318
      signalTypes: [traces, metrics, logs]
    - name: compliance
      endpoint: https://compliance-store:4318
      signalTypes: [logs]
```

## The Controller

Build a controller using the Kopf framework (Python Kubernetes operator framework):

```python
# controller.py
import kopf
import kubernetes
import yaml
import json
from kubernetes import client

@kopf.on.create("observability.platform.io", "v1alpha1", "telemetrytenants")
@kopf.on.update("observability.platform.io", "v1alpha1", "telemetrytenants")
def reconcile_tenant(spec, meta, status, namespace, logger, **kwargs):
    """Reconcile a TelemetryTenant resource."""
    team_name = spec["teamName"]
    tenant_ns = spec["namespace"]
    logger.info(f"Reconciling TelemetryTenant for team: {team_name}")

    # Generate Collector configuration
    collector_config = generate_collector_config(spec)

    # Create or update the ConfigMap
    api = client.CoreV1Api()
    config_map = client.V1ConfigMap(
        metadata=client.V1ObjectMeta(
            name=f"otel-collector-{team_name}",
            namespace=tenant_ns,
            labels={
                "app": "otel-collector",
                "team": team_name,
                "managed-by": "telemetry-controller",
            },
        ),
        data={"config.yaml": yaml.dump(collector_config)},
    )

    try:
        api.replace_namespaced_config_map(
            f"otel-collector-{team_name}", tenant_ns, config_map
        )
        logger.info(f"Updated ConfigMap for {team_name}")
    except kubernetes.client.exceptions.ApiException as e:
        if e.status == 404:
            api.create_namespaced_config_map(tenant_ns, config_map)
            logger.info(f"Created ConfigMap for {team_name}")
        else:
            raise

    # Deploy or update the Collector DaemonSet
    deploy_collector(spec, tenant_ns, team_name, logger)

    # Update status
    return {
        "state": "Ready",
        "collectorReady": True,
        "lastReconciled": kopf.datetime.datetime.utcnow().isoformat(),
    }


def generate_collector_config(spec):
    """Generate an OTel Collector config from the tenant spec."""
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
            "batch": {"send_batch_size": 4096, "timeout": "1s"},
            "memory_limiter": {
                "check_interval": "5s",
                "limit_mib": 1536,
            },
            "resource": {
                "attributes": [
                    {"key": "team.name", "value": spec["teamName"],
                     "action": "upsert"},
                    {"key": "team.cost_center",
                     "value": spec.get("costCenter", "unknown"),
                     "action": "upsert"},
                ]
            },
        },
        "exporters": {},
        "service": {"pipelines": {}},
    }

    # Add exporters based on backend configuration
    for backend in spec.get("backends", []):
        exporter_name = f"otlphttp/{backend['name']}"
        config["exporters"][exporter_name] = {
            "endpoint": backend["endpoint"],
        }

    # Build pipelines based on enabled signals
    signals = spec.get("signals", {})
    for signal_type in ["traces", "metrics", "logs"]:
        signal_config = signals.get(signal_type, {})
        if not signal_config.get("enabled", False):
            continue

        processors = ["memory_limiter", "resource", "batch"]

        # Add sampling for traces
        if signal_type == "traces" and "samplingRate" in signal_config:
            rate = signal_config["samplingRate"]
            config["processors"]["probabilistic_sampler"] = {
                "sampling_percentage": rate * 100
            }
            processors.insert(2, "probabilistic_sampler")

        # Determine exporters for this signal
        exporters = []
        for backend in spec.get("backends", []):
            if signal_type in backend.get("signalTypes", []):
                exporters.append(f"otlphttp/{backend['name']}")

        config["service"]["pipelines"][signal_type] = {
            "receivers": ["otlp"],
            "processors": processors,
            "exporters": exporters,
        }

    return config


def deploy_collector(spec, namespace, team_name, logger):
    """Deploy or update the Collector DaemonSet."""
    apps_api = client.AppsV1Api()

    daemonset = client.V1DaemonSet(
        metadata=client.V1ObjectMeta(
            name=f"otel-collector-{team_name}",
            namespace=namespace,
        ),
        spec=client.V1DaemonSetSpec(
            selector=client.V1LabelSelector(
                match_labels={"app": f"otel-collector-{team_name}"}
            ),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(
                    labels={"app": f"otel-collector-{team_name}"}
                ),
                spec=client.V1PodSpec(
                    containers=[client.V1Container(
                        name="collector",
                        image="otel/opentelemetry-collector-contrib:0.96.0",
                        args=["--config", "/etc/otel/config.yaml"],
                        volume_mounts=[client.V1VolumeMount(
                            name="config",
                            mount_path="/etc/otel",
                        )],
                    )],
                    volumes=[client.V1Volume(
                        name="config",
                        config_map=client.V1ConfigMapVolumeSource(
                            name=f"otel-collector-{team_name}",
                        ),
                    )],
                ),
            ),
        ),
    )

    try:
        apps_api.replace_namespaced_daemon_set(
            f"otel-collector-{team_name}", namespace, daemonset
        )
    except kubernetes.client.exceptions.ApiException as e:
        if e.status == 404:
            apps_api.create_namespaced_daemon_set(namespace, daemonset)
        else:
            raise

    logger.info(f"Collector DaemonSet deployed for {team_name}")


@kopf.on.delete("observability.platform.io", "v1alpha1", "telemetrytenants")
def cleanup_tenant(spec, namespace, logger, **kwargs):
    """Clean up resources when a tenant is deleted."""
    team_name = spec["teamName"]
    logger.info(f"Cleaning up resources for team: {team_name}")

    api = client.CoreV1Api()
    apps_api = client.AppsV1Api()

    try:
        api.delete_namespaced_config_map(
            f"otel-collector-{team_name}", namespace)
        apps_api.delete_namespaced_daemon_set(
            f"otel-collector-{team_name}", namespace)
    except kubernetes.client.exceptions.ApiException:
        pass
```

## Wrapping Up

A Kubernetes controller with CRDs provides a declarative, self-service interface for multi-tenant observability. Teams create a TelemetryTenant resource, and the controller handles the rest: generating Collector configs, deploying DaemonSets, and managing lifecycle. This scales to hundreds of teams without manual intervention from the platform team.
