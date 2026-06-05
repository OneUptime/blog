# Validation Summary: How to Troubleshoot Missing Resource Attributes When the Resource Detection

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry resource detection processor
- OpenTelemetry Kubernetes attributes processor
- OpenTelemetry resource processor
- Kubernetes
- AWS EC2 Instance Metadata Service
- Google Cloud metadata server
- Azure Instance Metadata Service

## Sources Consulted
- OpenTelemetry Collector resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourceprocessor
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- AWS CLI modify-instance-metadata-options documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-metadata-options.html
- Google Cloud Compute Engine metadata documentation: https://docs.cloud.google.com/compute/docs/metadata/predefined-metadata-keys
- Azure Instance Metadata Service documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- The post used the deprecated Collector component name `resourcedetection`. Updated examples and references to the current `resource_detection` component name.
- The AWS detector example used `aws`, but the official Resource Detection processor uses `ec2` for EC2 metadata detection. Updated the detector list to use `ec2`.
- The source list claimed containerd support through the container runtime detector. The documented Docker detector queries the Docker daemon and does not support containerd directly. Updated the text to say Docker only and to recommend `system` plus `k8sattributes` for containerd-based Kubernetes clusters.
- The Docker metadata section said to mount cgroup information. The official Docker detector requires access to the Docker socket. Replaced the cgroup hostPath example with a `/var/run/docker.sock` mount.
- The Collector resource processor fallback used `action: upsert` while the comment said "Only set if not already present." Changed those actions to `insert`, which matches the documented behavior.
- The timeout section said timed-out attributes are silently missing. Updated the wording because current Resource Detection processor documentation says configured detector failures can propagate or be logged, depending on detector behavior.

## Review Notes
- The cloud metadata `curl` checks and the AWS `modify-instance-metadata-options --http-put-response-hop-limit 2` command are consistent with official cloud provider documentation.
- `OTEL_SERVICE_NAME` precedence over `service.name` in `OTEL_RESOURCE_ATTRIBUTES` is correct for SDK environment configuration, but Collector-side `resource_detection` reads `OTEL_RESOURCE_ATTRIBUTES`; `OTEL_SERVICE_NAME` should be understood as an application instrumentation setting.
- `k8sattributes` can extract container image attributes, but accurate association for multi-container pods requires incoming `container.id` or `k8s.container.name` resource attributes.
