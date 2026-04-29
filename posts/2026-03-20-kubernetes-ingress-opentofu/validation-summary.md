# Validation Summary: How to Create Ingress Resources with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HashiCorp Kubernetes provider
- Kubernetes Ingress
- Kubernetes Services
- Kubernetes Deployments
- Kubernetes ResourceQuota
- ingress-nginx annotations

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings and `terraform` block compatibility: https://opentofu.org/docs/language/settings/
- OpenTofu CLI `init`: https://opentofu.org/docs/cli/init/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply`: https://opentofu.org/docs/cli/commands/apply/
- Kubernetes Ingress concept and controller requirements: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes ResourceQuota resource names: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- HashiCorp Kubernetes provider configuration: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- HashiCorp Kubernetes provider `kubernetes_namespace_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace_v1.md
- HashiCorp Kubernetes provider `kubernetes_resource_quota_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/resource_quota_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider `kubernetes_service_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/service_v1.md
- HashiCorp Kubernetes provider `kubernetes_ingress_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/ingress_v1.md
- ingress-nginx annotation reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- HashiCorp Kubernetes provider releases: https://github.com/hashicorp/terraform-provider-kubernetes/releases

## Issues Found
- The post did not create any Ingress resource even though the title, description, and conclusion claimed it covered Kubernetes Ingress with TLS, path routing, and annotations. I added a `kubernetes_ingress_v1` example with `ingress_class_name`, TLS, two path rules, and an ingress-nginx HTTPS redirect annotation.
- The `ResourceQuota` snippet used invalid resource names such as `requests_cpu` and `limits_memory`. Kubernetes quota keys use names like `requests.cpu` and `limits.memory`, so those keys were corrected.
- The example referenced `var.container_image` without defining it. I added the missing variable and documented that the image must listen on port `8080` and expose `/health`.
- The namespace variable defaulted to `default`, which would conflict with the built-in Kubernetes `default` namespace when the example tries to create it. I changed the default namespace to `ingress-demo`.
- The prerequisites said a Docker daemon was sufficient, which is inaccurate for applying Kubernetes resources and especially for creating usable Ingress resources. I updated the prerequisites to require a Kubernetes cluster, a configured kubeconfig context, an installed Ingress controller, and an existing TLS secret or cert-manager-managed certificate.
- The examples used older non-`_v1` resource names while the current provider documentation uses `*_v1` resources for these APIs. I updated the snippets to `kubernetes_namespace_v1`, `kubernetes_resource_quota_v1`, `kubernetes_deployment_v1`, and `kubernetes_service_v1`, and aligned the provider constraint to the current `3.x` line.
- The best-practices section said to use liveness and readiness probes, but the workload example only defined liveness. I added a readiness probe so the example matches the stated guidance.

## Review Notes
- Kubernetes documents Ingress as stable but frozen, and recommends Gateway API for newer feature development. Ingress remains supported, so the post is still technically relevant.
- TLS behavior and annotation semantics depend on the chosen ingress controller. The corrected example uses an ingress-nginx-specific annotation and assumes an `IngressClass` such as `nginx`.
- Neither `tofu` nor `terraform` was installed in this workspace, so the review was performed against official documentation rather than by executing the snippets locally.
