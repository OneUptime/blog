# Validation Summary: How to Manage OpenTelemetry Collector Config as Terraform-Managed ConfigMaps in

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- Terraform
- HashiCorp Kubernetes Provider
- Kubernetes ConfigMaps
- Kubernetes Deployments
- Kubernetes Services
- HCL
- YAML

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector health check extension package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/healthcheckextension
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector contrib probabilistic sampler documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Terraform Kubernetes provider ConfigMap resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map
- Terraform Kubernetes provider Deployment resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- Terraform Kubernetes provider tutorial: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Terraform templatefile function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile

## Issues Found
- The Deployment configured a liveness probe for `/health` on port `13133`, but the Collector config did not configure or enable the `health_check` extension. Added the `health_check` extension and referenced it from `service.extensions` so the probe endpoint exists.
- The container exposed OTLP and metrics ports but omitted the health check port used by the liveness probe. Added container port `13133` named `health`.
- The Terraform examples referenced `var.kube_context`, `var.collector_cpu_request`, `var.collector_memory_request`, `var.collector_cpu_limit`, and `var.collector_memory_limit`, but the variables section did not define them. Added matching variable definitions.

## Review Notes
The Collector image default `0.96.0` is valid but old as of June 5, 2026; the official OpenTelemetry Collector releases repository lists newer releases. The post intentionally pins a version, so this was noted rather than changed.
