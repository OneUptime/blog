# Validation Summary: How to Handle Webhook Ordering with Other Controllers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes admission webhooks
- Istio sidecar injection and traffic capture annotations
- HashiCorp Vault Agent Injector
- cert-manager webhook
- OPA Gatekeeper constraints
- kubectl commands and Kubernetes admissionregistration.k8s.io/v1 configuration

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes API Reference, MutatingWebhookConfiguration v1: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/#mutatingwebhookconfiguration-v1-admissionregistration-k8s-io
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio CNI and init container compatibility: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio sidecar injection setup: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- HashiCorp Vault Agent Injector: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- cert-manager webhook documentation: https://cert-manager.io/docs/concepts/webhook/
- OPA Gatekeeper Required Resources library template: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources

## Issues Found
- The post incorrectly claimed that Kubernetes processes mutating webhooks alphabetically by MutatingWebhookConfiguration name. Kubernetes documentation says mutating webhook invocation order is not stable and should not be relied on. Updated the introduction, webhook explanation, examples, and best practices to avoid presenting sorted names as execution order.
- The `reinvocationPolicy` section described reinvocation as guaranteed. Kubernetes only says webhooks with `IfNeeded` may be reinvoked, and the number/order of reinvocations is not guaranteed. Updated the wording and changed the JSON patch operation from `replace` to `add` so it works when the field is absent.
- The Istio sidecar injection description always mentioned `istio-init`. Istio CNI replaces the privileged `istio-init` traffic-redirection model. Updated the text to note the CNI exception.
- The Vault example used incorrect Istio annotation keys: `traffic.istio.io/excludeOutboundIPRanges` and `traffic.istio.io/excludeOutboundPorts`. Updated them to `traffic.sidecar.istio.io/excludeOutboundIPRanges` and `traffic.sidecar.istio.io/excludeOutboundPorts`, matching Istio documentation.
- The Vault annotation example omitted the Vault role annotation required in common annotation-based injection setups. Added `vault.hashicorp.com/role`.
- The cert-manager section described its webhook position alphabetically relative to Istio. Updated it to describe cert-manager's actual webhook functions: validation, defaulting, and conversion for cert-manager resources.
- The Gatekeeper `K8sRequiredResources` example used a non-existent `exemptContainers` parameter. The official Gatekeeper library template supports `exemptImages`. Updated the example to use `limits`, `requests`, and `exemptImages`.
- The `sideEffects: None` explanation incorrectly said Kubernetes can skip the webhook during dry-run. Updated it to say Kubernetes can safely call the webhook during dry-run.
- The best practices list used the wrong Istio annotation prefix and reinforced deterministic ordering. Updated it to describe webhook interactions and the correct `traffic.sidecar.istio.io` annotation.

## Review Notes
kubectl was not installed in the local environment, so command syntax was checked against Kubernetes documentation rather than local `kubectl --help` output. The remaining `kubectl` examples use standard documented flags and resource names.
