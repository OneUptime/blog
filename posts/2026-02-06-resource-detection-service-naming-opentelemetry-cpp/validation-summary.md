# Validation Summary: How to Configure Resource Detection and Service Naming in OpenTelemetry C++

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry C++ SDK
- OpenTelemetry resource model and semantic conventions
- C++ resource detectors
- OTLP HTTP trace exporter
- AWS EC2 and ECS metadata
- Kubernetes Downward API

## Sources Consulted
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry Resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry Service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry C++ SDK headers for `Resource`, `ResourceDetector`, `OTELResourceDetector`, `TracerProvider`, and `BatchSpanProcessor`: https://github.com/open-telemetry/opentelemetry-cpp
- OpenTelemetry C++ generated semantic convention headers: https://github.com/open-telemetry/opentelemetry-cpp/tree/main/api/include/opentelemetry/semconv
- OpenTelemetry C++ getting started documentation for span processors and tracer provider setup: https://opentelemetry-cpp.readthedocs.io/en/latest/sdk/GettingStarted.html
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- AWS ECS environment variables documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-environment-variables.html
- AWS ECS task metadata endpoint v4 documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-metadata-endpoint-v4.html
- AWS EC2 instance metadata documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html

## Issues Found
- The post used `opentelemetry/sdk/resource/semantic_conventions.h` and `resource::SemanticConventions`, which are not the current generated semantic convention APIs. Replaced them with current `opentelemetry/semconv/...` headers and constants.
- The post described C++ resource detection as entirely explicit. Updated this to note that `Resource::Create` reads `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES`, while host, Kubernetes, and cloud metadata still need explicit detectors or custom code.
- The post used deprecated `deployment.environment` and non-standard `deployment.region`. Updated examples to use `deployment.environment.name` and `cloud.region`.
- The post used `service.namespace` for deployment environment. Updated examples to use `service.namespace` for a logical namespace and `deployment.environment.name` for environment.
- The post claimed left-hand `Resource::Merge` precedence. Current OpenTelemetry C++ and the Resource SDK specification give precedence to the resource passed to `Merge`; code and explanation were corrected.
- The post referenced non-existent current C++ detector classes such as `HostResourceDetector` and `EnvironmentResourceDetector`. Updated examples to use `OTELResourceDetector`, `ProcessResourceDetector`, and `ContainerResourceDetector` from the current C++ SDK/source tree.
- The post implied built-in C++ cloud provider detectors and included a non-existent experimental cloud detector header. Updated the text to explain that cloud attributes are supported by the resource model but C++ users typically need custom detectors or Collector resource detection.
- Custom detector examples returned `Resource::Create(attributes)`, which also merges SDK/environment defaults. Updated them to use the `ResourceDetector::Create` helper so detector output contains only detected attributes.
- The EC2 example inferred region by trimming the availability zone. Updated it to read `placement/region` from instance metadata.
- The ECS example used hostname as `container.id`, which is not reliable. Updated it to show parsing container ID from ECS metadata instead.
- The `BatchSpanProcessor` example omitted required `BatchSpanProcessorOptions` and used an imprecise include. Updated the initialization to match the current OpenTelemetry C++ constructor.
- The tracer provider setup used `std::shared_ptr` where the OpenTelemetry API expects `nostd::shared_ptr`. Updated the example to follow the C++ SDK pattern.
- The Kubernetes example's manifest populated `K8S_NAMESPACE`, but the detector only read the service account namespace file. Added an environment-variable fallback.

## Review Notes
The code snippets remain illustrative and assume surrounding includes and placeholder helpers such as `HTTPClient` and JSON parsing. For production use, service instance IDs should be stable opaque IDs such as UUIDs, and cloud/Kubernetes detection is often better centralized in the OpenTelemetry Collector when applications cannot reliably access platform metadata.
