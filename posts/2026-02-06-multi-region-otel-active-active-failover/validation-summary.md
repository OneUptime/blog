# Validation Summary: Use Multi-Region OpenTelemetry Collector Deployments with Active-Active Failover

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector persistent sending queues and file_storage extension
- Kubernetes StatefulSet and topology spread constraints
- AWS Route 53 latency routing and health checks
- Terraform AWS provider
- Prometheus alerting rules
- Grafana Tempo-style OTLP backends

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resiliency docs: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector file_storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector/releases
- Kubernetes StatefulSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes topology spread constraints docs: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Terraform AWS provider aws_route53_record docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Route 53 health check docs: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html

## Issues Found
- The file_storage extension examples referenced queue directories that might not exist. The current file_storage extension requires the directory to already exist unless `create_directory` is enabled, so `create_directory: true` was added to both storage extensions.
- The Route 53 health checks used `.internal.example.com` endpoints. Standard Route 53 endpoint health checks cannot check private/non-routable endpoints, so the example now uses reachable health-check hostnames and notes that private endpoints should use CloudWatch-alarm-based checks or a VPC-based checker.
- The Kubernetes example used a multi-replica Deployment with a single named PVC for persistent queue storage. That is not a reliable pattern for per-pod persistent queues. The example was changed to a StatefulSet with a headless Service and `volumeClaimTemplates`, giving each Collector pod its own persistent queue volume.
- The Kubernetes section title said "Anti-Affinity" even though the manifest used topology spread constraints. The heading was updated to "Kubernetes StatefulSet with Zone-Aware Scheduling."
- The Collector image tag was updated from `otel/opentelemetry-collector-contrib:0.96.0` to `otel/opentelemetry-collector-contrib:0.153.0`, the current release checked during validation.
- The monitoring text mentioned replication lag, but the shown alerts monitor queue depth and exporter failures. The wording was corrected.
- The queue backlog alert annotation described `otelcol_exporter_queue_size` as items. OpenTelemetry documents this metric as queue size in batches, so the annotation now says batches.

## Review Notes
The two OpenTelemetry Collector configuration snippets were validated with `otel/opentelemetry-collector-contrib:0.153.0`. Terraform and Kubernetes CLIs were not installed in the workspace, so those snippets were reviewed against official AWS provider, AWS Route 53, and Kubernetes documentation rather than local CLI validation.
