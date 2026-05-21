# Validation Summary: How to Set Up Wildcard TLS Certificates on Istio Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway and VirtualService
- Kubernetes TLS Secrets
- TLS wildcard certificates and SAN hostname matching
- cert-manager Certificate and ClusterIssuer resources
- Let's Encrypt ACME DNS-01 validation
- Cloudflare DNS and AWS Route53 DNS solvers
- Helm, kubectl, OpenSSL, curl, and istioctl

## Sources Consulted
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio InvalidGatewayCredential analyzer documentation: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Route53 DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager API reference for Route53 solver fields: https://cert-manager.io/docs/reference/api-docs/
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/
- Kubernetes kubectl TLS Secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- RFC 6125 wildcard hostname matching rules: https://www.rfc-editor.org/rfc/rfc6125

## Issues Found
- Updated Istio `Gateway` and `VirtualService` examples from `networking.istio.io/v1beta1` to `networking.istio.io/v1` to match current Istio documentation.
- Updated the cert-manager Helm installation command from the older `jetstack/cert-manager` repository form with `installCRDs=true` to the current OCI chart command using `--set crds.enabled=true`.
- Removed `email` from the Cloudflare API token solver example. cert-manager's current Cloudflare API token example uses `apiTokenSecretRef`; `email` is shown with the legacy global API key flow.
- Clarified that the Route53 example assumes cert-manager has AWS credentials available through IRSA, EKS Pod Identity, or another ambient credential source.
- Corrected wildcard certificate wording to state that `*.example.com` covers one level of subdomains, not every nested subdomain.
- Corrected the troubleshooting note about CN and SAN matching. Modern hostname verification relies on the SAN, so the wildcard must be present in the SAN; the CN is not enough.

## Review Notes
The Gateway secret namespace guidance is correct for the default Istio ingress gateway pattern shown here: the TLS secret is created in `istio-system`, the same namespace as the selected ingress gateway workload. The post could later mention that `credentialName` secrets must be available in the gateway workload namespace, but the current examples already follow that requirement.
