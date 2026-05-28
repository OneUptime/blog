# Validation Summary: How to Debug GKE Admission Webhook Denied Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes admission controllers and admission webhooks
- ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- kubectl
- Kyverno
- OPA Gatekeeper / Policy Controller
- Binary Authorization

## Sources Consulted
- Kubernetes admission controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- GKE webhook stability guidance: https://cloud.google.com/kubernetes-engine/docs/how-to/optimize-webhooks
- GKE Workload Identity Federation concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud Binary Authorization overview: https://cloud.google.com/binary-authorization/docs/overview
- Google Cloud Binary Authorization gcloud policy reference: https://cloud.google.com/sdk/gcloud/reference/container/binauthz/policy
- Google Cloud Policy Controller documentation: https://cloud.google.com/kubernetes-engine/policy-controller/docs
- Kyverno ClusterPolicy overview: https://kyverno.io/docs/policy-types/cluster-policy/overview/
- OPA Gatekeeper constraints documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/

## Issues Found
- The post said admission webhooks are called via HTTP. Kubernetes webhook client configuration uses a service reference or an HTTPS URL, so this was changed to avoid implying plain HTTP is valid.
- The webhook service lookup only showed the service name. The namespace is also part of `clientConfig.service`, so a namespace jsonpath command was added before checking services and pods.
- The timeout section described the 10 second default as GKE-specific. This is the Kubernetes `timeoutSeconds` default, so the wording was corrected.
- The GKE-specific section said Workload Identity may deny pods that lack service account annotations. Workload Identity Federation for GKE normally affects workload authentication to Google Cloud APIs after the Pod is running, not admission denial of Pod creation, so this was corrected and redirected readers to check Policy Controller, Gatekeeper, or other policy engines for identity-related admission errors.

## Review Notes
Kyverno's current documentation marks ClusterPolicy as a legacy policy type, but the commands in the post remain valid for clusters that use Kyverno ClusterPolicy resources. The local environment did not have `kubectl` or `gcloud` installed, so CLI syntax was verified against official command references rather than local help output.
