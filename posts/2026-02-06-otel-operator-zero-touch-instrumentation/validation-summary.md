# Validation Summary: How to Use OpenTelemetry Operator for Zero-Touch Instrumentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetry auto-instrumentation
- Kubernetes Deployments, Namespaces, and mutating admission webhooks
- Helm
- cert-manager
- Kyverno mutation policies
- Python, Java, and Node.js OpenTelemetry instrumentation

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator GitHub README and examples: https://github.com/open-telemetry/opentelemetry-operator
- Kyverno mutate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/

## Issues Found
- The Helm install command used `otel/opentelemetry-collector-contrib` as the chart's collector image repository. The current OpenTelemetry Helm chart documentation uses `otel/opentelemetry-collector-k8s`, so I updated the example to that repository.
- The Instrumentation section said to create one resource per language, but the example defines multiple language settings in one `Instrumentation` resource. I changed the text to say the resource contains the language settings to support in the namespace.
- The Python instrumentation example used a shared OTLP gRPC endpoint on port `4317` without overriding Python's default OTLP/HTTP exporter endpoint. The OpenTelemetry Operator docs call out that Python auto-instrumentation uses OTLP/HTTP by default, so I added `OTEL_EXPORTER_OTLP_ENDPOINT` pointing at port `4318`.
- The Node.js auto-instrumentation image name used `autoinstrumentation-node`, which does not match the official image naming. I changed it to `autoinstrumentation-nodejs`.
- The namespace-level injection section used custom labels even though the OpenTelemetry Operator supports namespace annotations directly. I replaced the namespace example with the documented `instrumentation.opentelemetry.io/inject-python` annotation and renamed the section accordingly.
- The Collector custom resource used `apiVersion: opentelemetry.io/v1alpha1` and a block string for `spec.config`. Current OpenTelemetry docs show `OpenTelemetryCollector` as `opentelemetry.io/v1beta1` with `spec.config` as a YAML object, so I updated the example.

## Review Notes
The post is technically relevant and valid after the fixes. The examples intentionally use `latest` auto-instrumentation images for brevity, but production deployments should pin versions and verify language-agent compatibility with the deployed OpenTelemetry Operator version.
