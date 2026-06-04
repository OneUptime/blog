# Validation Summary: How to Fix Kubernetes Admission Webhook Timeout Errors During Resource Creation

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes admission webhooks
- ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- kubectl
- Go HTTP handlers using k8s.io/api/admission/v1
- Prometheus Go client instrumentation
- cert-manager Certificate resources
- OpenSSL certificate inspection

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager kubectl installation and readiness documentation: https://cert-manager.io/docs/installation/kubectl/
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The connectivity test was described as testing API server connectivity, but a `kubectl run` curl pod only tests in-cluster pod-to-service reachability. Updated the comment and follow-up explanation to avoid overstating what the command proves.
- The temporary-disable section said the webhook could be disabled without deleting the configuration, but the first command deletes the configuration. Updated the wording to accurately describe both deletion and selector narrowing options.
- The namespace selector patch was described as excluding namespaces, but the selector actually makes the webhook run only in namespaces labeled `webhook-enabled=true`. Updated the command comment accordingly.
- The TLS certificate section said certificate issues manifest as timeouts. Kubernetes typically reports TLS handshake or x509 failures distinctly, though they are often investigated during webhook failure incidents. Reworded the claim to avoid conflating all TLS failures with timeouts.
- The `openssl s_client` example could hang waiting for stdin and did not set SNI. Added `-servername security-webhook.webhook-system.svc` and `</dev/null`.
- The testing section reused the same pod name after a dry-run example and labeled a normal `kubectl run --overrides` command as a network-issues test. Updated the pod names and changed the comment to describe what the override command actually tests. Added `apiVersion: "v1"` to the override JSON to match kubectl's documented expectation for override objects.

## Review Notes
The core Kubernetes claims were accurate: admission webhooks are called by the API server before persistence, `timeoutSeconds` defaults to 10 seconds and must be between 1 and 30 seconds, and timed-out calls are handled according to `failurePolicy`. The Go examples are illustrative snippets rather than complete runnable programs because helper functions and server setup are omitted.
