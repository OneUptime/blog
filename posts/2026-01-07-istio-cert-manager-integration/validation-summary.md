# Validation Summary: How to Integrate Istio with cert-manager for TLS Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Istio
- cert-manager
- Kubernetes Gateway API
- Let's Encrypt ACME
- Helm
- Prometheus and Grafana
- Kubernetes NetworkPolicy

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 Gateway API solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager API reference for Certificate, Issuer, and ClusterIssuer resources: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Gateway API documentation: https://gateway-api.sigs.k8s.io/

## Issues Found
- The original post mixed cert-manager's `gatewayHTTPRoute` HTTP-01 solver with Istio's classic `networking.istio.io` Gateway API. Updated the HTTP-01 examples to explicitly use Kubernetes Gateway API `Gateway` resources implemented by Istio, added `gateway.networking.k8s.io` parent reference groups, and replaced the unsupported manual route to a fixed `cm-acme-http-solver` service with the supported temporary `HTTPRoute` flow.
- The cert-manager Helm install example used the older Jetstack repository flow, `v1.14.0`, and `installCRDs=true`. Updated it to the current OCI chart, `v1.20.2`, `crds.enabled=true`, and Gateway API support via `config.enableGatewayAPI=true`.
- The Certificate example requested both `server auth` and `client auth` for a public gateway server certificate and implied the first DNS name becomes the Common Name. Removed `client auth` and clarified that DNS names are Subject Alternative Names.
- The Istio examples used `networking.istio.io/v1beta1` and a file-path `caCertificates` value while describing a Secret. Updated Istio resources to `networking.istio.io/v1` and used `caCertCredentialName` for the client CA Secret.
- The post included stale MeshConfig fields for enabling SDS certificate rotation. Replaced that with a note that Istio ingress gateways use SDS by default for Gateway `credentialName` secrets.
- The NetworkPolicy example selected cert-manager pods with a label that current Helm installs do not use and modeled API server traffic as namespace-selected pod traffic. Updated the selector and control-plane traffic examples.
- The environment-specific HTTP-01 issuer examples had incomplete Gateway API parent references. Added explicit Gateway API `group` and `kind` fields.
- The secret-template example claimed Kubernetes client-side and SealedSecrets annotations provided the described security behavior. Replaced them with a neutral external-secret-management annotation example.

## Review Notes
The article is technically relevant and valid after the corrections. The HTTP-01 path now assumes Gateway API CRDs are installed before cert-manager starts; DNS-01 remains the simpler choice for wildcard certificates and for environments that do not expose port 80.
