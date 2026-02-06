# How to Implement Policy-as-Code for Observability: Enforce Minimum Instrumentation Standards with OPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OPA, Policy as Code, Governance

Description: Use Open Policy Agent to enforce minimum OpenTelemetry instrumentation standards across all services in your organization.

Open Policy Agent (OPA) is a general-purpose policy engine that can enforce rules anywhere in your stack. By writing policies that check for proper OpenTelemetry instrumentation, you can prevent under-instrumented services from reaching production. This post shows how to build and enforce observability policies with OPA.

## What Policies to Enforce

Here are common observability policies organizations should consider:

- Every Kubernetes deployment must have a sidecar Collector or point to a Collector endpoint.
- All services must set `service.name` and `service.version` resource attributes.
- Sampling rates for critical services must be at least 50%.
- All HTTP endpoints must have tracing enabled.
- Log retention must meet compliance minimums.

## Writing OPA Policies

Create Rego policies that validate Kubernetes manifests and Collector configurations:

```rego
# policies/require_otel_sidecar.rego
package observability.kubernetes

# Deny deployments without an OTel collector sidecar or env var pointing to one
deny[msg] {
    input.kind == "Deployment"
    not has_collector_sidecar(input)
    not has_collector_endpoint_env(input)
    msg := sprintf(
        "Deployment '%s' in namespace '%s' must have an OTel Collector "
        "sidecar or OTEL_EXPORTER_OTLP_ENDPOINT environment variable",
        [input.metadata.name, input.metadata.namespace]
    )
}

has_collector_sidecar(deployment) {
    some i
    container := deployment.spec.template.spec.containers[i]
    contains(container.image, "opentelemetry-collector")
}

has_collector_endpoint_env(deployment) {
    some i
    container := deployment.spec.template.spec.containers[i]
    some j
    env := container.env[j]
    env.name == "OTEL_EXPORTER_OTLP_ENDPOINT"
    env.value != ""
}
```

```rego
# policies/require_service_name.rego
package observability.kubernetes

# Every container must have OTEL_SERVICE_NAME or OTEL_RESOURCE_ATTRIBUTES
# with service.name set
deny[msg] {
    input.kind == "Deployment"
    some i
    container := input.spec.template.spec.containers[i]
    not has_service_name(container)
    # Skip collector sidecars
    not contains(container.image, "opentelemetry-collector")
    msg := sprintf(
        "Container '%s' in deployment '%s' must set "
        "OTEL_SERVICE_NAME environment variable",
        [container.name, input.metadata.name]
    )
}

has_service_name(container) {
    some i
    env := container.env[i]
    env.name == "OTEL_SERVICE_NAME"
    env.value != ""
}

has_service_name(container) {
    some i
    env := container.env[i]
    env.name == "OTEL_RESOURCE_ATTRIBUTES"
    contains(env.value, "service.name=")
}
```

```rego
# policies/validate_collector_config.rego
package observability.collector

# Collector configs must have memory_limiter processor
deny[msg] {
    not input.processors.memory_limiter
    msg := "Collector configuration must include memory_limiter processor"
}

# All pipelines must have the batch processor
deny[msg] {
    some pipeline_name
    pipeline := input.service.pipelines[pipeline_name]
    not array_contains(pipeline.processors, "batch")
    msg := sprintf(
        "Pipeline '%s' must include the batch processor",
        [pipeline_name]
    )
}

# Critical services must have high sampling rates
deny[msg] {
    input.processors.probabilistic_sampler
    rate := input.processors.probabilistic_sampler.sampling_percentage
    # Check if this is a critical service
    some i
    attr := input.processors.resource.attributes[i]
    attr.key == "service.criticality"
    attr.value == "high"
    rate < 50
    msg := sprintf(
        "Critical services must have at least 50%% sampling, got %v%%",
        [rate]
    )
}

array_contains(arr, elem) {
    some i
    arr[i] == elem
}
```

## Integrating OPA with Kubernetes Admission Control

Deploy OPA as a Gatekeeper admission controller:

```yaml
# gatekeeper-constraint-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requireotelinstrumentation
spec:
  crd:
    spec:
      names:
        kind: RequireOtelInstrumentation
      validation:
        openAPIV3Schema:
          type: object
          properties:
            exemptNamespaces:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requireotelinstrumentation

        violation[{"msg": msg}] {
            input.review.object.kind == "Deployment"
            namespace := input.review.object.metadata.namespace
            not is_exempt(namespace)
            not has_otel_config(input.review.object)
            msg := sprintf(
                "Deployment %s/%s must have OpenTelemetry instrumentation configured",
                [namespace, input.review.object.metadata.name]
            )
        }

        is_exempt(namespace) {
            some i
            input.parameters.exemptNamespaces[i] == namespace
        }

        has_otel_config(obj) {
            some i
            container := obj.spec.template.spec.containers[i]
            some j
            container.env[j].name == "OTEL_EXPORTER_OTLP_ENDPOINT"
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireOtelInstrumentation
metadata:
  name: require-otel-all-namespaces
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    excludedNamespaces:
      - kube-system
      - flux-system
      - observability
  parameters:
    exemptNamespaces:
      - kube-system
      - monitoring
```

## CI Pipeline Integration

Run OPA checks in CI before deployment:

```yaml
# .github/workflows/policy-check.yaml
name: Observability Policy Check
on:
  pull_request:
    paths:
      - "k8s/**"
      - "helm/**"

jobs:
  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
          chmod +x opa
          sudo mv opa /usr/local/bin/

      - name: Check Kubernetes manifests
        run: |
          FAILED=0
          for manifest in k8s/*.yaml; do
            echo "Checking $manifest..."
            RESULT=$(opa eval --data policies/ \
              --input "$manifest" \
              "data.observability.kubernetes.deny" \
              --format pretty)
            if [ "$RESULT" != "[]" ]; then
              echo "POLICY VIOLATION in $manifest:"
              echo "$RESULT"
              FAILED=1
            fi
          done
          if [ $FAILED -eq 1 ]; then
            echo "Policy checks failed. Fix violations before merging."
            exit 1
          fi
          echo "All policy checks passed."
```

## Wrapping Up

Policy-as-code for observability ensures that instrumentation standards are enforced consistently across your entire organization. OPA lets you write these rules in a declarative language, enforce them at admission time in Kubernetes, and validate them in CI pipelines. The result is that no under-instrumented service can reach production.
