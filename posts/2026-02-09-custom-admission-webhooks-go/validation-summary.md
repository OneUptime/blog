# Validation Summary: How to Build Custom Admission Webhooks Using Go and Kubernetes Client-Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- Go
- Kubernetes client-go and API machinery packages
- JSON Patch
- TLS certificates with OpenSSL
- kubectl
- Kubernetes Deployments, Services, and Secrets

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes admission.k8s.io/v1 AdmissionReview API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- OpenSSL 3.0 local command reference via installed `openssl`

## Issues Found
- The `main.go` snippet imported `encoding/json`, `fmt`, `io`, and `metav1` even though that file did not use them. Removed the unused imports so the file compiles as shown.
- The `mutate.go` snippet used `resource.MustParse` without importing `k8s.io/apimachinery/pkg/api/resource`. Added the missing import.
- The JSON Patch for container resource limits added `/spec/containers/N/resources/limits` even when the parent `/resources` object might not exist in the submitted Pod JSON. Updated the patch generation to add `/resources` when both requests and limits are absent, and add `/resources/limits` only when the parent object already exists.
- The TLS script generated a self-signed serving certificate and instructed readers to use that serving certificate as the webhook `caBundle`. Updated the script to create a CA certificate, sign a SAN-bearing webhook serving certificate, and use `ca.crt` for the `caBundle`.
- The mutation test used `nginx:1.21`, which would be rejected by the validating webhook's approved-registry check when both webhooks are installed. Updated the test command to use the approved registry prefix and required labels.

## Review Notes
- The article targets Kubernetes client libraries v0.29.0. The admissionregistration.k8s.io/v1 configuration fields used in the post remain current in the official Kubernetes documentation reviewed on 2026-06-04.
- `kubectl`, `go`, and a Kubernetes cluster were not available in the local environment, so code and command verification was performed by static review and official documentation rather than executing the full tutorial end to end.
