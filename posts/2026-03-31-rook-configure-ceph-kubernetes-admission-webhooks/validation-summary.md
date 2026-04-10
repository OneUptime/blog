# Validation Summary: How to Configure Ceph for Kubernetes Admission Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (Admission Webhooks, PersistentVolumeClaims, Deployments)
- Rook/Ceph (StorageClass: rook-ceph-block)
- Python / Flask (webhook server)
- kubectl CLI

## Sources Consulted
- Kubernetes official documentation: Dynamic Admission Control (https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- Kubernetes API reference: ValidatingWebhookConfiguration (https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#validatingwebhookconfiguration-v1-admissionregistration-k8s-io)
- Kubernetes API reference: AdmissionReview / AdmissionResponse (https://kubernetes.io/docs/reference/config-api/apiserver-webhookconfiguration.v1/)
- kubectl label documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)

## Issues Found

1. **Wrong Kubernetes resource kind for webhook registration**: The YAML used `kind: ValidatingAdmissionWebhook` which is not a valid Kubernetes resource kind. Changed to `kind: ValidatingWebhookConfiguration`, which is the correct resource kind in the `admissionregistration.k8s.io/v1` API group.

2. **Incorrect `kubectl label` syntax**: The command `kubectl label namespace production storage-policy: enforced` uses colon-space syntax (YAML style), but `kubectl label` requires `key=value` syntax. Changed to `kubectl label namespace production storage-policy=enforced`.

3. **Unused Python imports**: The code imported `base64` and `json` but never used either module. Removed both unused imports to avoid confusion for readers following the tutorial.

## Review Notes
- The Python webhook code uses a simplistic size parser (`int(storage.replace("Gi", ""))`) that only handles `Gi` suffixed values. Storage requests using `Mi`, `Ti`, or plain bytes would cause a crash or incorrect results. This is acceptable for a tutorial example but readers should be aware it is not production-ready.
- The webhook logic overwrites the `message` variable, so if both the StorageClass check and the size check fail, only the size error message is returned. A production implementation should collect all violations.
- The Deployment exposes port 8443 but the Flask app does not configure TLS or bind to that port in the shown code. Readers would need to add TLS configuration (using the mounted `/certs` volume) and set the Flask app to listen on port 8443 with SSL context for this to work end-to-end.
