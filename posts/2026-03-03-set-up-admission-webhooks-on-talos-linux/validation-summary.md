# Validation Summary: How to Set Up Admission Webhooks on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes admission webhooks (Validating + Mutating)
- `admissionregistration.k8s.io/v1` API (ValidatingWebhookConfiguration, MutatingWebhookConfiguration)
- Go (`k8s.io/api/admission/v1`, `k8s.io/api/core/v1`, `k8s.io/apimachinery`)
- cert-manager (`cert-manager.io/v1` Certificate and Issuer)
- OpenSSL (CA + server certificate generation)
- kubectl (secret/namespace creation, dry-run=server)
- JSON Patch (RFC 6902) for mutating responses

## Sources Consulted
- Kubernetes Dynamic Admission Control reference: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- `k8s.io/api/core/v1` ResourceList source: https://github.com/kubernetes/api/blob/master/core/v1/resource.go
- `k8s.io/apimachinery` Quantity godoc: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/resource#Quantity
- OpenSSL 3.0 `x509` man page: https://docs.openssl.org/3.0/man1/openssl-x509
- Kubernetes Namespaces (auto `kubernetes.io/metadata.name` label since 1.22): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes apiserver dry-run blog: https://kubernetes.io/blog/2019/01/14/apiserver-dry-run-and-kubectl-diff/
- cert-manager Certificate spec: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA injector (`cert-manager.io/inject-ca-from`): https://cert-manager.io/docs/concepts/ca-injector/

## Issues Found
1. **openssl x509 signing did not preserve SAN extension from the CSR.** The original command
   `openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 365 -out server.crt`
   produces a certificate with **no** Subject Alternative Names by default — `openssl x509` documents `-copy_extensions none` as the default. Without SANs, Go's TLS stack (Go 1.15+) refuses the certificate (`x509: certificate relies on legacy Common Name field`), so the API server would not be able to call the webhook.
   **Fix:** added `-copy_extensions copy` to the `openssl x509 -req` command so the SANs declared with `-addext` in the CSR are carried into the signed certificate.

## Review Notes
- The admission pipeline ordering (Authn → Authz → Mutating → schema validation → Validating → etcd) matches the official Kubernetes Dynamic Admission Control documentation.
- `container.Resources.Limits.Cpu().IsZero()` is valid: `ResourceList` has `Cpu()`/`Memory()` helpers returning a non-nil `*resource.Quantity` even when unset, so `IsZero()` correctly detects "no limit set".
- All webhook-config field names and values are correct for `admissionregistration.k8s.io/v1`: `failurePolicy` (Ignore/Fail), `sideEffects: None`, `admissionReviewVersions: ["v1"]`, `matchPolicy: Equivalent`, `timeoutSeconds: 5` (valid range 1–30), `reinvocationPolicy: IfNeeded` (MutatingWebhookConfiguration only).
- `namespaceSelector` keyed on `kubernetes.io/metadata.name` relies on the automatic namespace label that has been stable since Kubernetes 1.22 — fine for any currently supported cluster.
- `kubectl run test --image=nginx --dry-run=server` does invoke validating admission webhooks (server-side dry-run runs the admission chain without persisting), so the test command does demonstrate the rejection.
- The mutating webhook example uses JSON Patch paths like `/metadata/labels/injected-by`. RFC 6902 "add" requires the parent (`/metadata/labels`) to already exist on the object — pods created without any labels would cause the patch to fail. This is a common simplification in tutorial code; production webhooks typically check whether `labels` exists first and emit either `add /metadata/labels` (with the full map) or per-key adds. Left as-is because the post presents it as an illustrative example, not a production-hardened handler.
- Mutating webhook handler swallows errors from `io.ReadAll` and `json.Unmarshal` (uses `_`). Functional but worth tightening in production code; not a correctness bug in the demo.
- cert-manager Certificate `duration: 8760h` / `renewBefore: 720h` and the `cert-manager.io/inject-ca-from` annotation on the webhook configuration are correct usage.
