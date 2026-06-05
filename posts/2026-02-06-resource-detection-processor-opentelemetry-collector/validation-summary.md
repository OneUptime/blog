# Validation Summary: How to Configure the Resource Detection Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- Resource Detection Processor
- Resource Processor
- Kubernetes Attributes Processor
- AWS EC2, ECS, and EKS metadata detection
- Google Cloud metadata detection
- Azure VM and AKS metadata detection
- Docker metadata detection
- Kubernetes API and OpenShift metadata detection

## Sources Consulted
- OpenTelemetry Collector Contrib Resource Detection Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- Resource Detection generated AWS EC2 detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/aws/ec2/documentation.md
- Resource Detection generated AWS ECS detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/aws/ecs/documentation.md
- Resource Detection generated AWS EKS detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/aws/eks/documentation.md
- Resource Detection generated GCP detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/gcp/documentation.md
- Resource Detection generated Azure detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/azure/documentation.md
- Resource Detection generated AKS detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/azure/aks/documentation.md
- Resource Detection generated Docker detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/docker/documentation.md
- Resource Detection generated Kubernetes API detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/k8sapi/documentation.md
- Resource Detection generated OpenShift detector attributes: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/openshift/documentation.md

## Issues Found
- Updated processor type names from the deprecated `resourcedetection` alias to the current `resource_detection` type used in official docs.
- Corrected detector merge-order comments. The official docs state that when multiple detectors insert the same attribute, the first detector to insert wins.
- Corrected the `override` default description. The processor default is `true`; the examples explicitly set `false` when preserving application-provided resource attributes.
- Replaced the unsupported `kubernetes` detector with the supported `k8s_api` detector, including the required `K8S_NODE_NAME` downward API environment variable and RBAC note.
- Removed unsupported `gke` detector usage. GKE is handled by the `gcp` detector.
- Corrected Docker detector behavior. It queries the Docker daemon socket and does not populate `container.id` or `container.image.tag` as listed in the original post.
- Corrected ECS, EKS, Azure, AKS, OpenShift, and system detector attribute lists to match generated official detector documentation.
- Changed EC2 tag examples to regex patterns, as the EC2 detector `tags` field accepts regular expressions for tag keys.
- Adjusted production processor ordering so resource enrichment and Kubernetes attribute enrichment run before batching.

## Review Notes
All YAML and JSON fenced blocks were parsed successfully after the corrections. The OneUptime blog links were left unchanged because they are internal cross-links and are plausible for the referenced related posts.
