# Validation Summary: How to Debug Ingress Routing Problems in Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Portainer (Kubernetes management UI)
- Kubernetes Ingress (`networking.k8s.io/v1`)
- ingress-nginx controller
- kubectl
- cert-manager (TLS Certificate resource)

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes IngressClass documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class
- Deprecation note for `kubernetes.io/ingress.class` annotation: https://kubernetes.io/docs/concepts/services-networking/ingress/#deprecated-annotation
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- cert-manager Certificate API: https://cert-manager.io/docs/usage/certificate/
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes

## Issues Found
- **Deprecated annotation in Step 3 Ingress YAML.** The example used `kubernetes.io/ingress.class: "nginx"` annotation, which has been deprecated since Kubernetes 1.18 in favor of the `ingressClassName` spec field (and the post uses `networking.k8s.io/v1` which is GA from 1.19+). The inline comment in the YAML already referenced `ingressClassName`, but the field below contradicted it by using the deprecated annotation. Replaced the annotation block with `spec.ingressClassName: nginx` and cleaned up the malformed `#    #` comment.

## Review Notes
- Default namespace and label selector for ingress-nginx (`-n ingress-nginx`, `app.kubernetes.io/name=ingress-nginx`) are correct for the official ingress-nginx Helm chart / manifests.
- Step 5 implicitly assumes cert-manager is installed (the `Certificate` CRD is not part of core Kubernetes). This is the most common setup but a brief note about it could help readers without cert-manager.
- The legacy `kubernetes.io/ingress.class` annotation still works for backwards compatibility with most controllers, so older clusters reading this post would not break — but `ingressClassName` is the correct, modern guidance.
