# Validation Summary: How to Configure cert-manager Certificate Chain Validation and Trust Anchors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- trust-manager
- TLS and X.509 certificate chains
- OpenSSL
- Go TLS client configuration
- Python SSL and requests
- Node.js HTTPS client configuration
- Kubernetes admission webhooks
- Prometheus Operator PrometheusRule
- Prometheus blackbox_exporter

## Sources Consulted
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager CA injector documentation: https://cert-manager.io/v1.9-docs/concepts/ca-injector/
- trust-manager documentation: https://cert-manager.io/docs/trust/trust-manager/
- trust-manager API reference: https://cert-manager.io/docs/trust/trust-manager/api-reference/
- trust-manager installation documentation: https://cert-manager.io/v1.14-docs/trust/trust-manager/installation/
- Kubernetes ValidatingWebhookConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls
- Go os.ReadFile documentation: https://pkg.go.dev/os#ReadFile
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- Node.js TLS checkServerIdentity documentation: https://nodejs.org/api/tls.html#tlscheckserveridentityhostname-cert
- Prometheus blackbox_exporter configuration documentation: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- RFC 5280, Internet X.509 Public Key Infrastructure Certificate and CRL Profile: https://datatracker.ietf.org/doc/html/rfc5280

## Issues Found
- The custom CA issuer example referenced `selfsigned-issuer` and `root-ca-issuer` without defining them. Added the missing `ClusterIssuer` resources so the YAML sequence can actually bootstrap a root CA, create a root CA issuer, and then issue the intermediate CA.
- The ACME HTTP-01 solver example used `class: nginx`; cert-manager's current documentation recommends `ingressClassName` for most Ingress controllers, including nginx. Updated the example to `ingressClassName: nginx`.
- The trust-manager `Bundle` example configured a Secret target, but the installation command did not enable Secret targets or the extra RBAC required by trust-manager. Removed the Secret target and kept the ConfigMap target used later by the pod example.
- The pod trust-store text said standard TLS libraries would automatically trust the mounted bundle. Narrowed this to applications that honor `SSL_CERT_FILE` or are explicitly configured to use the mounted path.
- The Go example did not compile because it used `fmt.Errorf` without importing `fmt`. It also used deprecated `ioutil.ReadFile` and set `ClientAuth`, which is a server-side client-certificate policy, on a client TLS configuration. Updated it to use `os.ReadFile`, added `fmt`, and removed `ClientAuth`.
- The Node.js example overrode `checkServerIdentity` and always returned success, which disabled hostname verification. Removed the override and kept `rejectUnauthorized: true` with the supplied CA bundle.
- The `ValidatingWebhookConfiguration` v1 example omitted required `admissionReviewVersions` and `sideEffects` fields. Added both fields.
- The CA injector explanation said `caBundle` is populated with the certificate chain. Corrected this to CA data from the referenced cert-manager `Certificate`.
- The OpenSSL manual verification command did not pass intermediates as untrusted certificates. Added a step to split the first PEM certificate and changed verification to use `-untrusted cert.pem cert-1.pem`. Also added SNI to `openssl s_client` examples.
- The Prometheus alert examples used non-existent `probe_ssl_last_chain_info` labels such as `chain_valid` and `chain_depth`. Replaced them with blackbox_exporter metrics that exist: `probe_success` for failed TLS probes and `probe_ssl_earliest_cert_expiry` for certificate expiry monitoring.

## Review Notes
- The article remains a high-level tutorial and does not pin cert-manager, trust-manager, Kubernetes, Node.js, Python, or Go versions. The corrected examples align with current upstream documentation as of 2026-06-04, but chart values and API behavior should be rechecked for future major version changes.
- trust-manager documentation recommends copying trusted roots into a dedicated ConfigMap or Secret for safer CA rotation instead of pointing directly at cert-manager-managed issuer Secrets. The post already includes CA rotation as a best practice, but a future revision could expand that operational caveat.
