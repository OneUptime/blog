# Validation Summary: How to Implement Resource Detection in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry resource detection processor
- OpenTelemetry Kubernetes attributes processor
- OpenTelemetry semantic conventions
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Java SDK
- AWS, GCP, Azure, and Kubernetes resource metadata

## Sources Consulted
- OpenTelemetry Collector contrib resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector resourcedetection generated detector docs for AWS EC2, AWS ECS, GCP, Azure, system, and Kubernetes API metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor/internal
- OpenTelemetry Collector Kubernetes attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python SDK resources source and AWS SDK extension documentation: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/resources/__init__.py and https://pypi.org/project/opentelemetry-sdk-extension-aws/
- OpenTelemetry Go package documentation for sdk/resource, semconv, GCP detector, and AWS EC2 v2 detector: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource, https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0, https://pkg.go.dev/go.opentelemetry.io/contrib/detectors/gcp, https://pkg.go.dev/go.opentelemetry.io/contrib/detectors/aws/ec2/v2
- OpenTelemetry Java SDK resource documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry semantic conventions for deployment environment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The Collector examples used the deprecated `resourcedetection` component type. Updated examples and pipeline references to `resource_detection`, the current component type.
- The Kubernetes resource detector was shown as `k8s_node`, which is not the current detector name. Updated it to `k8s_api` and added the required `node_from_env_var` example.
- The GCP detector example used non-current attributes such as `gcp.project_id`, `gcp.instance_id`, and `gcp.zone`. Updated it to current resource attributes such as `cloud.account.id` and optional GCE instance attributes.
- The ECS example enabled `aws.ecs.container.arn`, which is not listed in the current ECS detector output. Replaced it with `aws.ecs.task.family`.
- The examples used deprecated `deployment.environment`; updated them to the stable `deployment.environment.name` semantic convention.
- The Node.js examples used older `Resource` and `SemanticResourceAttributes` APIs. Updated them to `resourceFromAttributes` and current semantic convention constants.
- The Python AWS detector import path was incorrect. Updated it to `opentelemetry.sdk.extension.aws.resource.ec2.AwsEc2ResourceDetector`.
- The Python merge order contradicted the comment that manual attributes take precedence. Updated the merge to place manual attributes last.
- The Go example had unused imports and used an older semantic conventions package and deprecated AWS EC2 detector import. Updated imports and semantic convention helper usage.
- The Java example used outdated semantic convention imports and the wrong GCP resource class casing. Updated imports and merge order so manual attributes take precedence.

## Review Notes
The Collector `resource_detection` processor is part of the contrib/k8s distributions, so examples assume an appropriate Collector build. Some SDK resource detector packages are contrib or extension packages and must be installed separately from the base SDK.
