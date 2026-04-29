# Validation Summary: How to Manage CRDs with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- CustomResourceDefinitions (CRDs)
- Custom Resources
- HashiCorp Kubernetes provider
- HCL

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- HashiCorp Kubernetes provider overview: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/templates/index.md.tmpl
- HashiCorp Kubernetes provider `kubernetes_manifest`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/manifest.md
- HashiCorp Kubernetes provider `kubernetes_namespace_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace_v1.md
- HashiCorp tutorial, Manage Kubernetes custom resources: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-crd-faas
- Kubernetes Custom Resources concept: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- Kubernetes task guide, Extend the Kubernetes API with CustomResourceDefinitions: https://kubernetes.io/docs/tasks/access-kubernetes-api/extend-api-custom-resource-definitions/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post title and description were about CRDs, but the body only showed built-in resources such as `Namespace`, `ResourceQuota`, `Deployment`, and `Service`. I replaced the examples with a real `CustomResourceDefinition` and a matching custom resource managed through `kubernetes_manifest` so the content now matches the topic.
- The original flow implied a normal single-pass `tofu plan` and `tofu apply` was sufficient. The official Kubernetes provider documentation states that `kubernetes_manifest` validates against the live API during planning, so custom resources cannot be planned until their CRD already exists. I updated the deployment workflow to a two-stage apply and added an explanation of the planning constraint.
- The provider version constraint was pinned to `~> 2.0`, which is outdated relative to the current Kubernetes provider documentation. I updated the example to `~> 3.0`.
- The `kube_context` variable defaulted to `"default"`, which forces a context name that often does not exist. I changed it to `null` so the provider can fall back to the current kubeconfig context when no explicit context is set.
- The prerequisites said access to a Kubernetes cluster or Docker daemon. Docker alone is not sufficient for the Kubernetes provider, so I corrected the requirement to cluster access plus kubeconfig.
- The original HCL used a hyphenated map key (`managed-by`) without quotes and referenced an undeclared `var.container_image`. I corrected the examples so the HCL is valid and all referenced variables are declared.
- The best-practices section was about generic workload tuning rather than CRD management. I replaced it with CRD-specific guidance covering structural schemas, waiting for the `Established` condition, plan-time API access, and the distinction between defining a CRD and running a controller or operator.

## Review Notes
- OpenTofu was not installed in the workspace, so I could not run `tofu validate`; the review was completed against official documentation instead of a local CLI execution.
- The sample `CronTab` CRD follows the canonical Kubernetes documentation pattern and demonstrates API registration rather than controller behavior. For a real operator-managed resource, the same `kubernetes_manifest` pattern applies once the operator's CRDs are already installed.
