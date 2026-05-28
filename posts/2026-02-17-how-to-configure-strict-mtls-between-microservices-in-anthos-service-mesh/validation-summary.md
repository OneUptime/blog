# Validation Summary: How to Configure Strict mTLS Between Microservices in Anthos Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Service Mesh / Anthos Service Mesh
- Istio security APIs
- PeerAuthentication
- DestinationRule
- Kubernetes kubectl
- Envoy sidecar telemetry and certificates
- Cloud Monitoring

## Sources Consulted
- Google Cloud Service Mesh transport security documentation: https://docs.cloud.google.com/service-mesh/v1.20/docs/security/configuring-mtls
- Google Cloud Cloud Service Mesh overview: https://docs.cloud.google.com/service-mesh/docs/overview
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio application health check documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio certificate management documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Istio API snippets used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. Updated examples to the current stable `security.istio.io/v1` and `networking.istio.io/v1` APIs used in current Istio documentation.
- The port-level mTLS exception used `PERMISSIVE`. Updated it to `DISABLE` and clarified that `portLevelMtls` uses the workload port, matching the Istio PeerAuthentication examples for plaintext exceptions.
- The post stated that a mesh-wide DestinationRule is required for client-side mTLS. Current Cloud Service Mesh and Istio enable auto mTLS by default, so this is not normally required. Reworded the section to explain when an explicit DestinationRule is needed and changed the sample to a service-specific DestinationRule.
- The certificate verification command attempted to inspect `localhost:15012`, which is not a workload service endpoint. Updated the example to inspect the certificate chain from an mTLS connection to the target service.
- The external service and database guidance implied that mTLS must always be disabled with DestinationRules. Updated the text to account for auto mTLS and to warn that disabling mTLS to a STRICT meshed workload will fail.
- The health probe check referenced the mesh config key `rewriteAppHTTPProbers`. Updated the command to check the sidecar injector configuration for `rewriteAppHTTPProbe`, consistent with Istio health check documentation.
- The troubleshooting note for external services implied sidecars always try mTLS for external hosts. Updated it to focus on broad DestinationRules that explicitly force `ISTIO_MUTUAL`.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are generic and assume a sidecar-based Cloud Service Mesh/Istio deployment with `istio-system` as the root namespace; installations using a different root namespace should substitute that namespace.
