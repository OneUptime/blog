# Validation Summary: How to Use cert-manager HTTP-01 Challenge with Ingress for Domain Validation

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Kubernetes Ingress
- cert-manager ClusterIssuer and Certificate resources
- ACME HTTP-01 challenges
- Let's Encrypt
- ingress-nginx
- Traefik
- kubectl

## Sources Consulted
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- Kubernetes ingress-nginx retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt port 80 best practice: https://letsencrypt.org/docs/allow-port-80/

## Issues Found
- Replaced cert-manager HTTP-01 solver `ingress.class` examples with `ingress.ingressClassName`. cert-manager documents `ingressClassName` as the recommended solver field, while `class` is retained mainly for ingress-gce compatibility and causes cert-manager to set the deprecated `kubernetes.io/ingress.class` annotation on solver Ingresses.
- Replaced `kubernetes.io/ingress.class` annotations in Kubernetes Ingress examples with `spec.ingressClassName`, which is the current Kubernetes field for newly created Ingress resources.
- Added `spec.ingressClassName: nginx` to the multi-domain Ingress example so it selects the intended controller consistently instead of relying on a default IngressClass.
- Corrected the custom solver `podTemplate` example. cert-manager HTTP-01 solver resources are configured under `podTemplate.spec.resources`; the original `podTemplate.spec.containers` field is not supported by the solver API.
- Updated the ingress-nginx static manifest URL from controller v1.10.0 to v1.15.1 to match the current official installation documentation.
- Added a caveat that the community-maintained ingress-nginx project was retired after March 2026 and that new production deployments should evaluate Gateway API or another maintained Ingress controller.
- Corrected the solver pod log command to use the certificate/challenge namespace placeholder instead of the `cert-manager` namespace, because HTTP-01 solver pods are created in the namespace where the challenge is being solved.
- Tightened the HTTP-to-HTTPS redirect troubleshooting wording. Let's Encrypt follows valid HTTP-01 redirects, so redirects are only a problem when they prevent the challenge token from being served on an allowed HTTP or HTTPS URL.

## Review Notes
The corrected examples use current `networking.k8s.io/v1` Ingress fields and current cert-manager HTTP-01 solver fields. All YAML code fences in the post were parsed successfully after the edits. HTTP-01 requirements around port 80 and lack of wildcard support were checked against Let's Encrypt documentation.
