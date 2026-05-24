# Validation Summary: How to Create Kubernetes Ingress Resources with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (`hashicorp/kubernetes` ~> 2.25)
- Kubernetes Ingress API (`networking.k8s.io/v1`, `kubernetes_ingress_v1` resource)
- NGINX Ingress Controller (annotations)
- cert-manager (for automatic TLS issuance)
- Kubernetes Secret (`kubernetes.io/tls` type)

## Sources Consulted
- HashiCorp Kubernetes provider docs — `kubernetes_ingress_v1` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- HashiCorp Kubernetes provider docs — `kubernetes_secret` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- NGINX Ingress Controller annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- NGINX Ingress Controller ConfigMap reference (for HSTS settings): https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- cert-manager Ingress annotations: https://cert-manager.io/docs/usage/ingress/
- Terraform `optional()` object type attribute docs: https://developer.hashicorp.com/terraform/language/expressions/type-constraints

## Issues Found
1. **Invalid HSTS annotations in the TLS Termination example.** The post used `nginx.ingress.kubernetes.io/hsts` and `nginx.ingress.kubernetes.io/hsts-max-age` as per-ingress annotations. The NGINX Ingress Controller does not expose HSTS through per-ingress annotations — HSTS is configured globally via the controller's ConfigMap (`hsts`, `hsts-max-age`, `hsts-include-subdomains`, `hsts-preload`). These annotations would be silently ignored and would mislead readers into thinking HSTS was being enabled by the example. Removed the two HSTS annotation entries (and the associated comment) from the TLS Termination Ingress example. The `nginx.ingress.kubernetes.io/ssl-redirect` annotation (which IS a valid per-ingress annotation) was kept.

## Review Notes
- The `kubernetes.io/ingress.class` annotation is deprecated since Kubernetes 1.18 in favor of `spec.ingressClassName`, but it is still supported by NGINX Ingress Controller and many other controllers. Modern Kubernetes installations may prefer the field-based approach, but using the annotation is not technically incorrect.
- The path-based routing example uses regex paths (`/api(/|$)(.*)`) together with `path_type = "ImplementationSpecific"` and the `rewrite-target` annotation. This is the standard NGINX Ingress idiom for path stripping and is correct.
- The `nginx.ingress.kubernetes.io/configuration-snippet` annotation in the advanced example is valid but in recent versions of NGINX Ingress Controller (≥1.9) requires `allow-snippet-annotations: "true"` to be set in the controller's ConfigMap (default is now `false` due to CVE-2023-5043). Readers using newer controllers may need to enable this or migrate to other mechanisms.
- `optional(bool, true)` inside an object type constraint is available in Terraform 1.3+ and stable. The post correctly requires Terraform ≥ 1.0, but readers should be aware they need at least 1.3 for the dynamic example with the `tls_enabled` optional attribute.
- `cors-allow-methods` value uses comma-space delimited methods which matches the NGINX Ingress default format.
- The `kubernetes_secret.tls_cert.metadata[0].name` reference style is correct for the HashiCorp Kubernetes provider (metadata is exposed as a list).
