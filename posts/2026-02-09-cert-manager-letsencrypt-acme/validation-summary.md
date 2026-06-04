# Validation Summary: How to Deploy cert-manager with Let's Encrypt ACME

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- cert-manager
- Let's Encrypt
- ACME
- TLS certificates
- Kubernetes Ingress
- kubectl

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager ACME issuer documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager best practice installation and high availability documentation: https://cert-manager.io/v1.16-docs/installation/best-practice/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt expiration email documentation: https://letsencrypt.org/docs/expiration-emails/
- Let's Encrypt upcoming features and certificate lifetime changes: https://letsencrypt.org/upcoming-features/

## Issues Found
- The installation command used cert-manager v1.14.0, which is outdated. Updated the static manifest URL to v1.20.2 to match current cert-manager installation documentation.
- The installation command block was marked as `yaml` even though it contained shell commands. Changed the fence to `bash`.
- The HTTP-01 solver examples used `class: nginx`. Updated them to `ingressClassName: nginx`, which cert-manager recommends for most Ingress controllers in cert-manager 1.12 and later.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: nginx`.
- The post said the guide would explore both HTTP-01 and DNS-01 but only provided HTTP-01 examples. Updated the wording to say the guide uses HTTP-01 for the examples.
- The post stated that Let's Encrypt sends expiration notices to the configured ACME email address. Let's Encrypt ended expiration notification emails in 2025, so the comments and best-practice guidance were updated to recommend monitoring for expiry alerts.
- The post described cert-manager's default renewal timing as a fixed 30-day window. Updated it to describe cert-manager's default renewal scheduling as two-thirds through the actual certificate lifetime, with 90-day certificates renewing roughly 30 days before expiration.
- The post described Let's Encrypt certificates as simply 90-day certificates. Updated the wording to clarify that the default classic profile currently issues 90-day certificates, while Let's Encrypt is rolling out shorter certificate lifetimes over time.
- The HTTP-01 challenge explanation said cert-manager creates a temporary pod and service. Updated it to include the temporary Ingress resource used to route challenge traffic to the acmesolver pod.

## Review Notes
- The tutorial remains focused on namespaced `Issuer` resources in the `default` namespace. For multi-namespace production use, a `ClusterIssuer` is often more practical, but the post explicitly says that is covered separately.
- The examples assume an existing `nginx` IngressClass and working DNS records that route the example domains to the Ingress controller.
