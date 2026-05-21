# Validation Summary: How to Configure Istio Ingress for TLS-Only Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway and VirtualService resources
- Istio ingress gateway TLS termination
- Istio ingress gateway mutual TLS
- Istio TLS passthrough and SNI routing
- Kubernetes Secrets
- cert-manager Certificate and ClusterIssuer resources
- Let's Encrypt ACME HTTP-01 validation
- curl and OpenSSL verification commands

## Sources Consulted
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Ingress Gateway without TLS Termination task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio cert-manager integration guide: https://istio.io/latest/docs/ops/integrations/certmanager/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/

## Issues Found
- The cert-manager installation command used the older `v1.14.0` release manifest. Updated it to the current documented static manifest URL, `v1.20.2`, so the command matches current cert-manager installation guidance.
- The ACME HTTP-01 solver example used `ingress.class`. Updated it to `ingress.ingressClassName`, which cert-manager documents as the recommended field for Kubernetes ingress controllers; `class` is now mainly recommended for ingress-gce compatibility.

## Review Notes
The Istio Gateway examples use current `networking.istio.io/v1` resources and valid TLS settings. The `credentialName`, `httpsRedirect`, `MUTUAL`, `PASSTHROUGH`, SNI routing, `minProtocolVersion`, and `cipherSuites` examples are consistent with the current Istio documentation. For production ACME HTTP-01 issuance, the HTTP challenge endpoint on port 80 must remain reachable while cert-manager validates domain ownership.
