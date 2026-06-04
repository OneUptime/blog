# Validation Summary: How to Configure Kubernetes API Server Client Certificate Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server authentication
- Kubernetes CertificateSigningRequest API
- Kubernetes RBAC
- Kubernetes audit policy
- Kubernetes API server Prometheus metrics
- OpenSSL
- X.509 / PKI
- kubectl

## Sources Consulted
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes CertificateSigningRequest documentation: https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes API reference for CertificateSigningRequest v1: https://kubernetes.io/docs/reference/kubernetes-api/certificates/certificate-signing-request-v1/
- Kubernetes task guide for issuing API client certificates with CSR: https://kubernetes.io/docs/tasks/tls/certificate-issue-client-csr/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes audit documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubectl certificate approve reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_certificate/kubectl_certificate_approve/
- OpenSSL 3.0 command behavior checked locally with `openssl req` and `openssl x509`.

## Issues Found
- The automation certificate section called the certificate a service account certificate and used a `system:` username. Changed it to a normal client certificate identity (`CN=ci-bot/O=automation`) and updated RBAC/audit examples to bind the `ci-bot` user. This avoids implying that an X.509 CN creates a Kubernetes ServiceAccount identity and avoids using the Kubernetes-reserved `system:` username space for a custom automation user.
- The rotation script extracted the subject using OpenSSL's default display format, which produces `CN = alice, O = developers` on OpenSSL 3.x and is not accepted by `openssl req -subj`. Added `-nameopt compat` and anchored the `sed` expression so the script produces `/CN=alice/O=...`, which OpenSSL accepts.
- The revocation command used `--field-selector subjects[*].name=alice`, but Kubernetes field selectors do not support arbitrary nested fields on RBAC bindings. Replaced it with commands to list bindings that reference the user and delete the specific bindings created earlier in the guide.
- The CA rotation example showed `--client-ca-file` as a comma-separated list of CA files. Kubernetes expects this flag to reference a file containing one or more certificate authorities, so the example now builds a CA bundle file and points `--client-ca-file` to that bundle.
- The Prometheus examples used `apiserver_authentication_attempts_total` with `authenticator` and `username` labels, which does not match the current Kubernetes metrics reference. Replaced the queries with current metrics for authenticated requests by username and client certificate expiration.

## Review Notes
- The CertificateSigningRequest examples use the current `certificates.k8s.io/v1` API and the correct `kubernetes.io/kube-apiserver-client` signer.
- The direct OpenSSL signing examples are usable for clusters where administrators have access to the cluster CA, but the CSR API remains the safer operational path for production as the post states.
- The client certificate expiration metric is documented as an alpha Kubernetes metric, so dashboards should be validated against the exact Kubernetes version in use.
