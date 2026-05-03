# Validation Summary: How to Deploy Ingress Controllers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Kubernetes Ingress (kubernetes_ingress_v1)
- NGINX Ingress Controller (Helm chart `ingress-nginx` v4.9.1)
- AWS Load Balancer Controller (Helm chart v1.7.1, controller v2.7.1)
- Helm provider (`helm_release`)
- AWS IAM (IRSA / OIDC trust policy)
- `data "http"` provider
- cert-manager (referenced via annotation)

## Sources Consulted
- ingress-nginx Helm chart values.yaml v4.9.1: https://github.com/kubernetes/ingress-nginx/blob/helm-chart-4.9.1/charts/ingress-nginx/values.yaml
- ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Kubernetes Ingress documentation (IngressClass / ingressClassName): https://kubernetes.io/docs/concepts/services-networking/ingress/
- AWS Load Balancer Controller IAM policy (v2.7.1): https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v2.7.1/docs/install/iam_policy.json
- AWS Load Balancer Controller Helm chart: https://github.com/aws/eks-charts/tree/master/stable/aws-load-balancer-controller
- AWS load balancer service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.7/guide/service/annotations/
- Terraform/OpenTofu `kubernetes_ingress_v1` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- Terraform/OpenTofu `helm_release` resource docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release

## Issues Found

1. **Invalid ConfigMap key `use-real-ip`** (NGINX Ingress Controller `controller.config`).
   - Problem: `use-real-ip` is not a valid ingress-nginx ConfigMap key. The correct key for enabling X-Real-IP header processing is `enable-real-ip`.
   - Fix: Renamed `use-real-ip` to `enable-real-ip`.

2. **Invalid Helm value structure `controller.podDisruptionBudget`** (ingress-nginx chart v4.9.1).
   - Problem: The chart does not accept a `controller.podDisruptionBudget` block with `enabled` and `minAvailable` keys. The chart accepts `controller.minAvailable` (or `controller.maxUnavailable`) directly at the top level, and creates a PDB automatically when replica count permits.
   - Fix: Replaced the nested `podDisruptionBudget` block with `minAvailable = 1` directly under `controller`.

3. **Deprecated `kubernetes.io/ingress.class` annotation** in the sample Ingress resource.
   - Problem: This annotation has been deprecated since Kubernetes 1.18 and superseded by the `spec.ingressClassName` field. ingress-nginx still supports the annotation for backward compatibility, but new tutorials targeting modern Kubernetes (1.22+) should use the field.
   - Fix: Removed the annotation and added `ingress_class_name = "nginx"` to the `spec` block of the `kubernetes_ingress_v1` resource.

## Review Notes
- The NLB service annotations on the NGINX controller are valid for the in-tree AWS cloud provider. If users adopt the AWS Load Balancer Controller for the NGINX service as well, they would need to switch to the controller-specific annotations (`service.beta.kubernetes.io/aws-load-balancer-nlb-target-type`, etc.).
- The `data "http"` resource correctly uses `response_body` (introduced in hashicorp/http v2.2.0); older `body` attribute is deprecated.
- The `helm_release` `set` block syntax shown is valid for hashicorp/helm provider v2.x. A future helm provider v3 may change this syntax; pin the provider version accordingly.
- The IAM policy URL pinned at controller tag `v2.7.1` matches the chart version `1.7.1`, which is correct alignment.
- The IRSA trust policy correctly uses `sts:AssumeRoleWithWebIdentity` with both `:sub` and `:aud` conditions — this is the recommended pattern.
