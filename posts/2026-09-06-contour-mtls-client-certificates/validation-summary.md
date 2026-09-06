# Validation Summary: Require Client Certificates with Contour mTLS

## Status
validated

## Post Type
Technical configuration guide with YAML examples and diagnostic commands.

## Technologies Covered
- Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy downstream TLS and mutual TLS
- Kubernetes Secrets, TLSCertificateDelegation, NetworkPolicy, and kubectl
- X.509 client certificates, CA bundles, certificate revocation lists, and XFCC identity headers
- curl and shell commands

## Sources Consulted
- Contour 1.33 TLS termination and client validation: https://projectcontour.io/docs/1.33/config/tls-termination/
- Contour 1.33 HTTPProxy API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour 1.33 TLS certificate delegation: https://projectcontour.io/docs/1.33/config/tls-delegation/
- Contour 1.33 external authorization: https://projectcontour.io/docs/1.33/guides/external-authorization/
- Contour v1.33.0 Secret validation implementation: https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/secret.go
- Envoy TLS validation overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl
- Envoy TLS validation API, including CRLs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto.html
- Envoy XFCC header semantics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers#x-forwarded-client-cert
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kubectl get output formats: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl create secret generic: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes NetworkPolicy behavior and enforcement requirements: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- curl option reference: https://curl.se/docs/manpage.html

## Issues Found
1. **Invalid diagnostic JSONPath.** The map iteration used Go-template variable syntax inside JSONPath. Local kubectl reproduced a parser error at the comma. Replaced the output expression with a valid Go template that prints the Secret type and key names without exposing values. A client-only dry run with dummy data returned `Opaque keys=ca.crt`.
2. **Overstated CA Secret validation.** Saying Contour establishes that the Secret is usable implied stronger validation than its implementation provides. The v1.33.0 CA bundle check verifies PEM certificate blocks, but does not parse their X.509 contents or prove that client chains validate. Clarified the control-plane checks and the need for Envoy validation and connection testing.
3. **Revocation status conflated with forwarded identity fields.** Subject and URI SAN values do not report revocation status. Separated identity authorization from revocation checking and specified that application-side checking requires certificate data and a revocation source, or that Envoy CRL validation can perform the check.
4. **Ambiguous passthrough configuration name.** Replaced the standalone `TCPProxy` reference with `spec.tcpproxy` on HTTPProxy, identifying the actual configuration field rather than suggesting a separate Kubernetes resource kind.

## Review Notes
- Confirmed the HTTPProxy API version, route/service structure, client-validation field names, required-certificate default, optional mode, skip-validation behavior with a CA reference, CRL fields, and cross-namespace delegation requirements against Contour 1.33 documentation.
- Confirmed XFCC sanitization and selective forwarding. Authorization still needs an application policy, and backend isolation requires a network plugin that enforces NetworkPolicy.
- Confirmed kubectl Secret-generation flags and curl certificate, key, verbosity, failure, and server-verification options. The Secret command deliberately prints a manifest without applying it. curl examples assume the server CA is already trusted; a private server CA requires an appropriate trust-store entry or --cacert.
- All four YAML snippets parsed successfully with PyYAML, and all four shell snippets passed bash -n. The original diagnostic error and corrected template were tested locally with kubectl client-only dry runs using dummy data.
- All five official documentation links in the post resolved to the intended resources. Contour checks were scoped to version 1.33; Envoy latest documentation is a moving reference and does not establish the deployed Envoy version.
- No live Kubernetes resources were changed. End-to-end TLS, CRL refresh, external authorization, and network isolation were not exercised because no test deployment or certificate fixtures were provided. The post's positive and negative connection checks remain deployment validation steps.
