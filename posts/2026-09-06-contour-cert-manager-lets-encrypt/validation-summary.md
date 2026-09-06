# Validation Summary: Issue and Renew Let's Encrypt Certificates for Contour

## Status
validated

## Post Type
Technical guide / tutorial.

## Technologies Covered
- Kubernetes: Secrets, Ingress, namespaces, NetworkPolicy, and kubectl.
- Contour 1.33, HTTPProxy, and Envoy.
- cert-manager: Certificate, ClusterIssuer, CertificateRequest, Order, Challenge, and cmctl.
- Let's Encrypt, ACME, HTTP-01, DNS-01, TLS, and certificate renewal.
- DNS, IPv4/IPv6, dig, curl, OpenSSL, Bash, YAML, and jq.

## Sources Consulted
- Contour 1.33 cert-manager guide: https://projectcontour.io/docs/1.33/guides/cert-manager/
- Contour 1.33 TLS termination: https://projectcontour.io/docs/1.33/config/tls-termination/
- Contour 1.33 Ingress support and class filtering: https://projectcontour.io/docs/1.33/config/ingress/
- Contour 1.33 API reference: https://projectcontour.io/docs/1.33/config/api/
- cert-manager Certificate resource: https://cert-manager.io/docs/usage/certificate/
- cert-manager HTTP-01 configuration: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager ACME issuers: https://cert-manager.io/docs/configuration/acme/
- cert-manager ACME troubleshooting: https://cert-manager.io/docs/troubleshooting/acme/
- cert-manager webhook troubleshooting: https://cert-manager.io/docs/troubleshooting/webhook/
- cert-manager cmctl reference: https://cert-manager.io/docs/reference/cmctl/
- cert-manager Certificate condition source, including observedGeneration: https://github.com/cert-manager/cert-manager/blob/v1.18.2/pkg/apis/certmanager/v1/types_certificate.go
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt IPv6 behavior: https://letsencrypt.org/docs/ipv6-support/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl get implementation, including single-resource-type watch restriction: https://github.com/kubernetes/kubectl/blob/v0.34.0/pkg/cmd/get/get.go
- BIND dig manual: https://bind9.readthedocs.io/en/latest/manpages.html
- OpenSSL s_client reference: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL x509 reference: https://docs.openssl.org/3.0/man1/openssl-x509/
- curl command reference: https://curl.se/docs/manpage.html
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Unsupported multi-resource watch.** The renewal example used kubectl get certificate,certificaterequest --watch. kubectl restricts watches to a single resource type. Changed this to a Certificate watch and a separate CertificateRequest watch in a second terminal.
2. **Potential stale readiness during promotion.** An immediate Ready wait can see the previous generation's status before cert-manager processes the issuer change. Added a wait for the Ready condition's observedGeneration to match the applied Certificate generation before waiting for Ready=True. External served-certificate verification remains necessary.
3. **DNS check mislabeled as authoritative.** Plain dig commands use the configured resolver; they do not directly query authoritative servers. Corrected the description and specified execution outside the cluster.
4. **Arbitrary HEAD request does not prove solver routing.** Changed curl -I to curl -i so the probe uses GET. Clarified that the test token is only a connectivity probe and that the actual pending challenge URL must return HTTP 200 and its expected key authorization to verify the solver.
5. **OpenSSL inspection presented as certificate verification.** The original s_client pipeline neither enforces hostname validation nor fails on trust errors, and hides diagnostics. Clarified its role as certificate inspection and identified the subsequent curl command as the trust and hostname check. Also clarified that /healthz must be replaced if the application does not provide it.
6. **Missing implementation prerequisites.** Stated the required installed controllers, existing storefront namespace, and shop Service on port 80. Clarified that contour-public requires corresponding Contour configuration; a default instance accepts contour. Added the cert-manager 1.12 minimum for the solver ingressClassName field.
7. **Incomplete network requirements.** Qualified the NetworkPolicy instruction to apply when traffic is restricted and added cert-manager's DNS, ACME server, and HTTP-01 self-check connectivity requirements.

## Review Notes
- Confirmed the cert-manager.io/v1 and projectcontour.io/v1 resource shapes, issuer references, explicit Certificate approach for HTTPProxy, same-namespace Secret behavior, TLS Secret keys, and Contour Valid condition.
- Confirmed staging versus production directories, staging trust behavior, HTTP-01 port 80 and wildcard limitations, DNS-01 alternative, and IPv6 validation caveats. Let's Encrypt can fall back to IPv4 for certain IPv6 connection failures; a wrong IPv6 HTTP response can still prevent validation.
- Confirmed issuerRef changes trigger reissuance, explicit Always key rotation, renewal status fields, lifetime-based default scheduling, and cmctl renew as the supported manual trigger.
- Same-namespace TLS Secrets are appropriate for this example; Contour also supports cross-namespace TLS certificate delegation. The example need not use it.
- The versioned Contour guide contains older installation examples. This post's modern solver class field was checked against cert-manager's own documentation instead of copying those older examples.
- All six official documentation links in the post resolved to the intended resources. Example hostnames, email addresses, and application endpoints are placeholders, not live deployment targets.
- Validation was a documentation and source-code review with local syntax checks. No Kubernetes cluster, public domain, or ACME issuance/renewal was exercised. Deployment-specific routing, policy, trust-store configuration, and timing must be verified in the reader's environment.
