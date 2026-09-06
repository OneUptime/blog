# Validation Summary: Share Wildcard TLS Secrets with Contour Certificate Delegation

## Status
validated

## Post Type
Tutorial / configuration guide with Kubernetes manifests and diagnostic commands.

## Technologies Covered
- Contour 1.33, HTTPProxy, and TLSCertificateDelegation
- Kubernetes Secrets, namespaces, RBAC, and kubectl
- cert-manager Certificate and ClusterIssuer resources
- ACME DNS-01 and wildcard TLS certificates
- Envoy certificate configuration and rotation
- OpenSSL certificate inspection

## Sources Consulted
- [Contour 1.33 TLS certificate delegation](https://projectcontour.io/docs/1.33/config/tls-delegation/)
- [Contour 1.33 TLS termination](https://projectcontour.io/docs/1.33/config/tls-termination/)
- [Contour 1.33 API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 inclusion and delegation](https://projectcontour.io/docs/1.33/config/inclusion-delegation/)
- [Contour 1.33 architecture](https://projectcontour.io/docs/1.33/architecture/)
- [Contour v1.33.0 HTTPProxy processor source](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go)
- [Contour v1.33.0 Secret source](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/secret.go)
- [cert-manager Certificate resource](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager DNS-01 configuration](https://cert-manager.io/docs/configuration/acme/dns01/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [kubectl wait](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [OpenSSL 3.0 s_client](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [OpenSSL 3.0 x509](https://docs.openssl.org/3.0/man1/openssl-x509/)
- [RFC 9525, section 6.3: wildcard matching](https://www.rfc-editor.org/rfc/rfc9525.html#section-6.3)
- [Let's Encrypt challenge types](https://letsencrypt.org/docs/challenge-types/)
- [Let's Encrypt certificate revocation](https://letsencrypt.org/docs/revoking/)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all three YAML examples against the documented APIs. The Certificate fields, explicit private-key rotation policy, delegation namespace and allowlist, and HTTPProxy namespace/name reference are correct. README.md required no changes.
- Confirmed that Contour 1.33 documents a positive Valid condition on TLSCertificateDelegation. Cross-namespace CA Secret references also use delegation. Route inclusion is a separate mechanism.
- Confirmed namespace watch requirements, TLS Secret type and data keys, and the distinction between permission to use a certificate and Kubernetes API permission to read its Secret. Delegation does not establish hostname ownership.
- Verified wildcard scope against RFC 9525 and DNS-01 support against Let's Encrypt documentation. The existing ClusterIssuer must have a working DNS-01 solver and credentials.
- Reviewed renewal, private-key replacement, centralized Secret updates, and revocation guidance. The explicit rotationPolicy: Always avoids depending on cert-manager's default, which changed in version 1.18.
- Checked all shell blocks with bash -n and reviewed kubectl flags, resource forms, JSONPath expressions, and OpenSSL options against official command references. The OpenSSL pipeline displays the served certificate; it does not itself enforce hostname or trust verification, consistent with its inspection purpose in the post.
- All six links under Official Documentation resolved to the intended resources. Contour findings are scoped to the cited 1.33 documentation and source, without asserting that version is the latest release.
- This was a documentation and static review. No live Kubernetes cluster, ACME issuance, Envoy renewal, or delegation removal was exercised. Runtime use assumes installed controllers and CRDs, existing namespaces, an accessible shop Service on port 80, configured DNS, and suitable controller RBAC. The five-minute issuance wait can time out when DNS propagation or issuance takes longer.
- Revocation by removing a namespace assumes no other TLSCertificateDelegation still grants that namespace access to the same Secret. Certificate replacement and CA revocation remain necessary after private-key exposure.
