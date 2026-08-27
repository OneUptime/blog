# Validation Summary: How to Secure the CockroachDB Operator Admission Webhooks with Your Own CA

## Status

validated

## Post Type

Technical guide / operational runbook

## Technologies Covered

- CockroachDB Public Operator (`crdb.cockroachlabs.com/v1alpha1`)
- CockroachDB GA Operator (`crdb.cockroachlabs.com/v1beta1`)
- Kubernetes admission webhooks, Services, EndpointSlices, Secrets, and server-side dry-run
- TLS and X.509 certificate authorities
- OpenSSL 3.x
- `kubectl`
- Helm

## Sources Consulted

- [CockroachDB Public Operator webhook certificate management](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes#secure-the-webhooks)
- [Public Operator v2.18.4 webhook certificate generation and CA bundle updates](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/webhook_certificates.go)
- [Public Operator v2.18.4 webhook startup and certificate-file handling](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/cmd/cockroach-operator/prep_webhooks.go)
- [Public Operator v2.18.4 manager flags, certificate directory, and webhook port](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/cmd/cockroach-operator/main.go)
- [Public Operator v2.18.4 Secret loading](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/resource/certificate.go)
- [Public Operator v2.18.4 PKCS#1 RSA private-key parser](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/pkg/security/certificate.go)
- [Public Operator v2.18.4 standard Kubernetes manifest](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/install/operator.yaml)
- [Public Operator v2.18.4 OLM/OpenShift deployment patch](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.4/config/templates/deployment_patch.yaml.in)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes API dry-run semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [`kubectl create secret tls`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/)
- [`kubectl port-forward`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [OpenSSL 3.5 `genrsa`](https://docs.openssl.org/3.5/man1/openssl-genrsa/)
- [OpenSSL 3.5 `req`](https://docs.openssl.org/3.5/man1/openssl-req/)
- [OpenSSL 3.5 certificate verification options](https://docs.openssl.org/3.5/man1/openssl-verification-options/)
- [OpenSSL 3.5 `s_client`](https://docs.openssl.org/3.5/man1/openssl-s_client/)
- [OpenSSL 3.5 X.509 extension configuration](https://docs.openssl.org/3.5/man5/x509v3_config/)
- [GA Operator webhook certificate modes](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md#operator-tls-certificates-selfsignedoperatorcerts)
- [Official CockroachDB v2 Helm chart index](https://charts.cockroachdb.com/v2/index.yaml)

## Issues Found

No technical issues found.

## Review Notes

- The legacy behavior was checked against the current Public Operator release, v2.18.4, including the exact Secret keys, PKCS#1 RSA parser, generated DNS SANs, pod-local serving certificate, webhook configuration names, RBAC, single replica, Service port mapping, and `-skip-webhook-config` path.
- The GA comparison was checked against the published `cockroachdb-operator-chart` 1.0.0 as well as the upstream chart source. Its `selfSignedOperatorCerts` ownership, persistence, Helm-upgrade, and Secret-deletion rules match the post.
- The OpenSSL CA block and client-side `kubectl` Secret/template commands were executed with OpenSSL 3.6.2 and `kubectl` 1.34.1. They produced the required `RSA PRIVATE KEY` encoding, valid CA extensions, matching certificate/key material, and the documented Secret keys.
- `openssl genrsa -traditional` is an OpenSSL 3.x command. OpenSSL 1.1.1 does not support that flag but already emits traditional PKCS#1 RSA keys by default; the post explicitly targets current OpenSSL and links to the 3.5 documentation.
- The `master` and `/docs/stable/` links in the post are valid as of 2026-08-27 but are mutable. Pinning source links to v2.18.4 would improve future reproducibility without changing the post's current technical accuracy.
