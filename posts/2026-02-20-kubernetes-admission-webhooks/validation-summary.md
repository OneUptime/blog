# Validation Summary: How to Build Kubernetes Admission Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission controllers
- ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- AdmissionReview API
- JSON Patch
- Python Flask
- Docker
- OpenSSL TLS certificates
- kubectl

## Sources Consulted
- Kubernetes Admission Controllers: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes MutatingWebhookConfiguration API: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes ValidatingWebhookConfiguration API: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl create reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- RFC 6902 JSON Patch: https://datatracker.ietf.org/doc/html/rfc6902
- Python base64 module documentation: https://docs.python.org/3/library/base64.html

## Issues Found
- The validating webhook example claimed to require limits for all Pods but only checked regular containers. Updated it to check both `containers` and `initContainers`.
- The validating and mutating Python snippets contained unused imports and variables. Removed them so the code examples are cleaner and syntactically focused.
- The Dockerfile copied `requirements.txt` even though the post did not provide that file and installed Flask directly. Removed the unnecessary copy step so the Dockerfile can build from the shown files.
- The post built a mutating webhook endpoint but only provided a validating webhook configuration. Added a matching `MutatingWebhookConfiguration` for `/mutate`.
- The TLS secret command assumed the `webhook-system` namespace already existed. Added an idempotent namespace creation command before creating the secret.
- The testing commands did not account for the `namespaceSelector`, so the webhook would not run unless the target namespace was labeled. Added a labeled `webhook-demo` namespace and used it in the test commands.
- The passing test used `kubectl run --limits`, but current `kubectl run` does not support a `--limits` flag. Replaced it with `--overrides` containing a Pod container resource limits object.

## Review Notes
- The Flask development server is acceptable for a minimal tutorial example, but production deployments should normally use a production WSGI server and add health checks.
- The examples use `failurePolicy: Ignore`, which is appropriate for non-critical webhooks as stated, but security-enforcing validating webhooks may need `failurePolicy: Fail`.
