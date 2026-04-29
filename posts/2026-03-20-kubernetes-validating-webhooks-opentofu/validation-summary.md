# Validation Summary: How to Create Kubernetes Validating Webhooks with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes `ValidatingWebhookConfiguration`
- OpenTofu / HCL
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- OPA Gatekeeper

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Validating Admission Policy: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- HashiCorp Kubernetes provider `kubernetes_validating_webhook_configuration_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/validating_webhook_configuration_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider `kubernetes_service_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/service_v1.md
- HashiCorp Helm provider `helm_release`: https://raw.githubusercontent.com/hashicorp/terraform-provider-helm/main/docs/resources/release.md
- OPA Gatekeeper chart values: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.14.0/charts/gatekeeper/values.yaml

## Issues Found
- The webhook `client_config.ca_bundle` values were incorrectly base64-encoded with `base64encode(file(...))`. The Kubernetes provider documents this field as a PEM-encoded CA bundle string, so the correct usage is `file("${path.module}/certs/ca.crt")`. Both webhook examples were updated accordingly.
- The deployment snippet relied on an existing namespace and TLS secret without saying so. A code comment was added to make those prerequisites explicit.

## Review Notes
- The Gatekeeper example is technically valid for chart version `3.14.0`, including `validatingWebhookTimeoutSeconds`, but that pinned version is older than current Gatekeeper releases as of April 29, 2026.
- Kubernetes `ValidatingAdmissionPolicy` is stable starting in Kubernetes `v1.30` and is now a native alternative for some validation use cases that do not require a custom webhook server. The post remains technically correct, but a future revision could mention that option alongside Gatekeeper.
