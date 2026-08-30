# How to Set Stable `service.name` and `service.namespace` in Beyla

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OpenTelemetry, Kubernetes, Metadata

Description: Give Beyla metrics and traces stable OpenTelemetry service identities using workload resources, Pod annotations, labels, and documented precedence.

---

The `service.namespace` and `service.name` pair is the service identity used to join dashboards, traces, service graphs, and alerts. If a rollout changes `service.name` from a Deployment name to a generated Pod name, the backend sees a new service. If two unrelated applications share both identity attributes, the backend treats them as the same logical service.

Beyla now follows OpenTelemetry Operator-style resource discovery. The old `name` and `namespace` fields inside `discovery.instrument` still exist but are deprecated because one discovery entry can match multiple services and assign all of them the same identity.

## Understand Beyla's precedence

For each attribute not explicitly set by the deprecated discovery fields, Beyla derives `service.name` and `service.namespace` independently in this order:

1. `OTEL_SERVICE_NAME` for the name and values in `OTEL_RESOURCE_ATTRIBUTES` for either attribute on the **instrumented application process or container**. If both set `service.name`, `OTEL_SERVICE_NAME` wins.
2. Pod annotations `resource.opentelemetry.io/service.name` and `resource.opentelemetry.io/service.namespace`.
3. Pod labels: the first of `app.kubernetes.io/instance` and `app.kubernetes.io/name` becomes the service name, and `app.kubernetes.io/part-of` becomes the service namespace.
4. For the service name, Kubernetes owner metadata, preferring Deployment and then other workload owners before Pod and container names.
5. For the service name, the executable name.

If no higher-precedence source sets `service.namespace`, Beyla uses the Kubernetes namespace, or leaves the attribute empty outside Kubernetes.

This hierarchy explains many apparent overrides. Setting a Pod annotation does not beat an `OTEL_SERVICE_NAME` already present in the application container. Do not set that variable on the Beyla DaemonSet: Beyla still consumes it as the deprecated global `service_name` setting, which can assign one name to multiple matched processes.

## Use Pod-template annotations for an explicit identity

Put the resource annotations on the workload's Pod template so every replica receives the same values:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-v2
  namespace: retail-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
  template:
    metadata:
      labels:
        app.kubernetes.io/name: checkout
        app.kubernetes.io/part-of: retail
      annotations:
        resource.opentelemetry.io/service.name: checkout-api
        resource.opentelemetry.io/service.namespace: retail
    spec:
      containers:
        - name: checkout
          image: registry.example.com/checkout:2.4.1
```

Here, the annotations win over the labels and owner name, so a Deployment rename or blue/green suffix does not create another service. Replicas still receive distinct `service.instance.id` values; service identity should be stable while instance identity remains unique.

`service.namespace` is a logical OpenTelemetry grouping, not Beyla's Kubernetes namespace selector. It can equal the Kubernetes namespace, but it often represents a product, tenant, or domain that remains stable across `retail-staging` and `retail-prod` clusters. Keep environment in a separate resource attribute such as `deployment.environment.name` rather than encoding it inconsistently into service names.

## Set resources from the application when appropriate

An application or injected SDK may already be configured with standard resource environment variables:

```yaml
env:
  - name: OTEL_SERVICE_NAME
    value: checkout-api
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: service.namespace=retail,service.version=2.4.1,deployment.environment.name=production
```

Because these process-level OpenTelemetry environment variables have the highest precedence in Beyla's resource discovery, this is the best option when the service owns its telemetry contract. Use exactly the same values for SDK and Beyla pipelines so metrics, traces, and service graphs join correctly.

Avoid setting replica-specific values such as Pod name in `service.name`. Put those in `k8s.pod.name` or leave instance decoration to Beyla.

## Standardize alternate Kubernetes labels

If the platform already has authoritative custom labels, map them once in Beyla:

```yaml
attributes:
  kubernetes:
    enable: true
    resource_labels:
      service.name:
        - telemetry.example.com/service
        - app.kubernetes.io/name
      service.namespace:
        - telemetry.example.com/domain
        - app.kubernetes.io/part-of
```

Beyla uses the first existing label in each list. Keep the standard labels as fallbacks during migration. This configuration affects automatic resource derivation; it is not a discovery rule.

## Avoid the deprecated shortcut

This configuration appears convenient but is unsafe for a broad match:

```yaml
discovery:
  instrument:
    - k8s_namespace: "retail-*"
      name: checkout-api
      namespace: retail
```

Every matching process can inherit the same service identity. Use it only as a temporary compatibility measure for a selector proven to match one logical service, then migrate to application resources, annotations, or labels.

## Validate metrics and traces

Generate traffic to two replicas and inspect:

- a Beyla RED metric grouped by `service_name` and `service_namespace` in Prometheus naming;
- a Tempo span's Resource section for `service.name` and `service.namespace`;
- `service.instance.id` in OTLP or Tempo (or `instance` in Beyla's Prometheus output), which should differ between replicas;
- Kubernetes resource attributes such as `k8s.namespace.name` and `k8s.deployment.name`.

If the name is unexpected, check the precedence from top to bottom. Inspect the application container environment, not only the Deployment YAML, because admission webhooks can inject `OTEL_*` variables.

Allow old time series to become stale before deciding that a rename failed. A corrected identity stops new samples under the old label but cannot rewrite stored telemetry.

## Conclusion

Treat `service.name` and `service.namespace` as a stable contract. Prefer application-level OpenTelemetry resources when the service owns them, otherwise use Pod-template resource annotations or standard Kubernetes labels. Do not name broad discovery groups with deprecated fields, and keep per-replica identity in `service.instance.id` and Kubernetes attributes.

## Official Documentation

- [Beyla service-name and namespace precedence](https://grafana.com/docs/beyla/latest/configure/service-discovery/#override-service-name-and-namespace)
- [Configure Beyla Kubernetes attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/#kubernetes-decorator)
- [OpenTelemetry resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/)
- [OpenTelemetry service resource conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
