# Validation Summary: How to Set Up Horizontal Pod Autoscaler with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HashiCorp Kubernetes provider
- Horizontal Pod Autoscaler (HPA)
- Prometheus Adapter / custom metrics API

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `terraform` block syntax: https://opentofu.org/docs/language/settings/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- HashiCorp Kubernetes provider overview: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/index.md
- HashiCorp Kubernetes provider `kubernetes_horizontal_pod_autoscaler_v2` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/horizontal_pod_autoscaler_v2.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider versioned resource guide: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/guides/versioned-resources.md
- HashiCorp Kubernetes provider registry API metadata: https://registry.terraform.io/v1/providers/hashicorp/kubernetes

## Issues Found
- The post pinned the Kubernetes provider to `~> 2.24`, which is outdated as of April 30, 2026. I updated it to the current v3.1 release line.
- The deployment example used `kubernetes_deployment`, which is deprecated in provider v3. I updated it to `kubernetes_deployment_v1` and fixed the HPA reference to match.
- The multi-metric comment said HPA scales up if either threshold is exceeded. I corrected it to reflect Kubernetes' documented behavior: HPA uses the largest replica recommendation across configured metrics.
- The custom-metrics example said it requires `metrics-server + custom metrics adapter`. I corrected this to require a custom metrics adapter such as Prometheus Adapter; `metrics-server` is for resource metrics like CPU and memory.

## Review Notes
- The post remains technically valid with OpenTofu using the standard `terraform` block; OpenTofu documentation explicitly retains that syntax.
- `tofu`, `terraform`, and `kubectl` were not installed in the review environment, so validation was performed against official documentation and the provider's published source/docs rather than local CLI execution.
