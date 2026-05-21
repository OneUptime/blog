# Validation Summary: How to Document Istio Configuration for Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio PeerAuthentication and mTLS
- Istio AuthorizationPolicy
- Istio Telemetry and Envoy access logs
- Kubernetes kubectl, ConfigMap, labels, and JSONPath
- Bash and jq
- SOC 2, PCI DSS, HIPAA, and ISO/IEC 27001 compliance evidence mapping

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio mTLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Envoy access logging task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- AICPA Trust Services Criteria, CC6.7 transmission control: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf
- PCI Security Standards Council document library for PCI DSS 4.0/4.0.1: https://www.pcisecuritystandards.org/document_library/
- eCFR 45 CFR 164.312 HIPAA technical safeguards: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312
- ISO/IEC 27001 official standard page: https://www.iso.org/standard/27001

## Issues Found
- Updated framework mappings for current control references: SOC 2 encryption-in-transit evidence maps more directly to CC6.7, PCI DSS 4.0 uses requirements 4.2, 7.2, and 10.2 for the cited themes, and ISO/IEC 27001:2022 uses Annex A controls A.8.20, A.5.14, A.5.15, and A.8.3 instead of older 2013 control numbers.
- Changed the AuthorizationPolicy example from `security.istio.io/v1beta1` to the current `security.istio.io/v1` API version used in current Istio documentation.
- Fixed jq expressions that would fail when an AuthorizationPolicy has no `selector` or no annotations by defaulting missing maps to `{}`.
- Corrected default-deny detection to identify ALLOW policies with no rules, which Istio documents as the semantic default-deny pattern, rather than relying on specific policy names.
- Corrected the mTLS compliance count so a mesh-wide STRICT PeerAuthentication in the root namespace is treated as enforcing STRICT mTLS for namespaces, instead of requiring one STRICT policy per namespace.
- Replaced the certificate evidence command that assumed `/var/run/secrets/istio/cert-chain.pem` exists in the sidecar with an `openssl s_client -showcerts` check against a live service connection, matching Istio's documented certificate verification approach.
- Changed the access-log documentation wording from saying Istio logs always capture identity and TLS fields to saying the logs should be configured to capture those fields.
- Hardened the pre-audit mTLS check to verify mesh-wide STRICT mode and look for explicit PERMISSIVE/DISABLE policies rather than miscounting policy objects as namespaces.

## Review Notes
The compliance scripts remain illustrative and assume `istio-system` is the Istio root namespace and that namespaces use the `istio-injection=enabled` label. Clusters using revision-based injection, ambient mode, or a custom root namespace would need small adaptations before using the scripts as audit evidence.
