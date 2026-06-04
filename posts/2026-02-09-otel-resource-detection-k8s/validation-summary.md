# Validation Summary: How to configure OpenTelemetry resource detection for Kubernetes attributes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector resource detection processor
- OpenTelemetry Collector Kubernetes attributes processor
- Kubernetes RBAC and Downward API
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry JavaScript / Node.js SDK

## Sources Consulted
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector k8sattributes processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Collector troubleshooting / debug exporter documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector debug exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry resource concepts documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python SDK resource documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- opentelemetry-resourcedetector-kubernetes package documentation: https://pypi.org/project/opentelemetry-resourcedetector-kubernetes/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java Resource Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-common/latest/io/opentelemetry/sdk/resources/Resource.html
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript semantic conventions documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html

## Issues Found
- The Collector configuration used the deprecated `resourcedetection` component type and deprecated `k8snode` detector name. Updated the processor type to `resource_detection/k8s` and the detector to `k8s_api`.
- The Collector configuration used the deprecated `logging` exporter and `loglevel` option. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The Collector deployment claimed several pod environment variables were used by resource detection, but the `k8s_api` detector requires the node name environment variable. Removed unused Collector pod variables and clarified that `K8S_NODE_NAME` is required for `k8s_api`.
- The Python example imported a non-existent Kubernetes detector path and passed `Resource` objects to `get_aggregated_resources` instead of resource detectors. Updated it to use `KubernetesDownwardAPIEnvironmentResourceDetector(prefix="OTEL_RD")` and merge the detected resource with the base resource.
- The examples used `deployment.environment`, which has been superseded by `deployment.environment.name` in current OpenTelemetry resource semantic conventions. Updated the Python, Java, and Node.js snippets.
- The Java example said Kubernetes attributes were detected from environment variables but did not add them to the resource. Updated it to add Downward API Kubernetes attributes when present and avoided passing null environment values to the resource builder.
- The Node.js example used the deprecated `SemanticResourceAttributes` namespace and `new Resource(...)` pattern. Updated it to use `resourceFromAttributes` and current `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants.
- The application deployment environment variable names did not match the Python Downward API detector contract. Updated Kubernetes metadata variables to the `OTEL_RD_K8S_*` names used by the corrected SDK examples.

## Review Notes
The Collector `k8sattributes` processor configuration and RBAC shape are consistent with the current upstream documentation. The Python Kubernetes resource detector package is a separate package rather than part of the core OpenTelemetry Python SDK, so future maintenance should re-check that package before publishing version-specific guidance.
