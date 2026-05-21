# Validation Summary: How to Configure SAN (Subject Alternative Name) in Istio Certs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio workload certificates and mTLS
- X.509 Subject Alternative Name (SAN)
- SPIFFE URI identities
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio DestinationRule
- Istio Gateway TLS credentials
- Kubernetes TLS Secrets
- OpenSSL certificate generation and inspection

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio trust domain migration task: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Istio SPIRE integration guide: https://istio.io/latest/docs/ops/integrations/spire/
- Istio secure gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OpenSSL req manual: https://docs.openssl.org/3.3/man1/openssl-req/
- RFC 5280, Internet X.509 Public Key Infrastructure Certificate and CRL Profile: https://www.rfc-editor.org/rfc/rfc5280

## Issues Found
- The `istioctl proxy-config secret` examples selected `dynamicActiveSecrets[0]`, which depends on Envoy secret ordering. Updated the `jq` filters to select the active workload certificate named `default`, matching Istio's documented troubleshooting examples.
- The post said `AuthorizationPolicy.source.namespaces` expands to match any SPIFFE ID containing that namespace. Updated this to state that Istio matches the source namespace derived from the peer certificate and that the field requires mTLS.
- The post said `trustDomainAliases` makes the mesh trust certificates with SANs from the listed trust domains. Updated this to clarify that aliases affect Istio identity and policy evaluation, while cross-mesh TLS trust still requires the appropriate trust bundle or CA trust.
- The external-service `DestinationRule` example omitted the service-registry requirement. Added a note that SAN validation for an external host should be used with a matching `ServiceEntry` or another service-registry entry, because Istio ignores destination rules for services outside the registry.

## Review Notes
The YAML examples use current Istio `networking.istio.io/v1` and `security.istio.io/v1` APIs. The OpenSSL command uses `req -x509` with `-addext`, which is supported by current OpenSSL versions. Local verification of `istioctl` and `kubectl` command help was not possible because those binaries are not installed in this environment, so their syntax was checked against official documentation and Istio examples.
