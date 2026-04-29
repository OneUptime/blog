# Validation Summary: How to Create Kubernetes Mutating Webhooks with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Mutating Admission Webhooks
- OpenTofu
- HashiCorp Kubernetes provider
- HCL

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/mutating-webhook-configuration-v1/
- Kubernetes Admission Controllers overview: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- HashiCorp Kubernetes provider `kubernetes_mutating_webhook_configuration_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/mutating_webhook_configuration_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider `kubernetes_service_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/service_v1.md
- HashiCorp Kubernetes provider `kubernetes_namespace_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace_v1.md

## Issues Found
- The webhook `ca_bundle` values were incorrectly wrapped in `base64encode(...)`. The Kubernetes provider expects a PEM-encoded CA bundle string for `ca_bundle`, so I changed both webhook snippets to use `file("${path.module}/certs/ca.crt")`.
- The sidecar injector comment said the webhook matched an annotation, but `object_selector` only matches labels. I corrected the comment to match Kubernetes behavior.
- The namespace selector comment said the webhook excluded only `kube-system`, but the configuration also excluded `kube-public`. I corrected the comment.
- The label defaulting webhook used one rule that mixed core `pods` and `apps/v1` `deployments` in a single tuple expansion. Kubernetes documents `RuleWithOperations` as tuple-based and recommends keeping all tuple expansions valid, so I split this into two explicit `rule` blocks.
- The deployment and service assumed a `webhook-system` namespace existed. I added a `kubernetes_namespace_v1` resource and referenced it from the other resources so the example is deployable as written.
- The summary implied `failure_policy = "Fail"` guarantees the webhook is applied. I corrected that wording to the documented behavior: requests are rejected if the webhook cannot be called successfully.

## Review Notes
- The example still assumes the TLS Secret `webhook-tls-certs` and the local CA file `certs/ca.crt` already exist. That is acceptable for a focused webhook configuration example, but certificate provisioning is still an external prerequisite.
- Using `object_selector` makes the webhook opt-in, which is appropriate here, but Kubernetes notes that end users can bypass opt-in webhooks by controlling those labels.
