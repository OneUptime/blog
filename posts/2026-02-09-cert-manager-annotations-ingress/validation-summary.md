# Validation Summary: How to Use cert-manager Annotations to Request Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- cert-manager
- TLS certificates
- ACME HTTP-01 and DNS-01 challenge configuration
- ingress-nginx
- Traefik Kubernetes Ingress
- kubectl

## Sources Consulted
- cert-manager documentation: Annotated Ingress resource: https://cert-manager.io/docs/usage/ingress/
- cert-manager documentation: Annotation reference: https://cert-manager.io/docs/reference/annotations/
- cert-manager documentation: Certificate resource: https://cert-manager.io/docs/usage/certificate/
- Kubernetes documentation: Ingress concept: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes API reference: networking.k8s.io/v1 Ingress: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/ingress/

## Issues Found
- The post described annotation-based management as working "without additional Certificate objects." cert-manager ingress-shim actually creates Certificate resources automatically, so the wording was changed to clarify that users avoid writing separate Certificate manifests, not that Certificate resources do not exist.
- The examples used the deprecated `kubernetes.io/ingress.class` annotation. Updated the Ingress examples to use `spec.ingressClassName`, which is the current Kubernetes field for newly created Ingress resources.
- The namespace-scoped Issuer example suggested explicitly setting `cert-manager.io/issuer-kind: "Issuer"`. Current cert-manager documentation says `issuer-kind` and `issuer-group` are only needed for out-of-tree issuers, so the example was adjusted to avoid unnecessary configuration.
- The DNS-01 section said DNS-01 challenges were configured via annotations. cert-manager determines ACME solver behavior from the Issuer or ClusterIssuer configuration, so the wording was changed to say the annotated Ingress uses an issuer configured for DNS-01.
- The "Disabling Automatic Certificate Creation" example used `cert-manager.io/issuer: ""`. cert-manager documentation says automatic Certificate creation is triggered by supported issuer annotations, so the example was corrected to omit cert-manager issuer annotations entirely.
- A debugging bullet said the Ingress controller might be "not compatible with cert-manager." This was made more precise: the likely issues are the controller not reading the referenced TLS secret or an ACME solver Ingress class mismatch.

## Review Notes
The examples use `networking.k8s.io/v1` Ingress resources with required `pathType` and current backend service fields, which matches the Kubernetes v1 Ingress API. The cert-manager annotations for duration, renewal timing, private key settings, and common name match current cert-manager annotation reference documentation.
