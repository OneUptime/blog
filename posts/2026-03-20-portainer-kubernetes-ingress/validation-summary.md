# Validation Summary: How to Manage Kubernetes Ingress Resources in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Ingress
- ingress-nginx
- kubectl
- TLS/HTTPS

## Sources Consulted
- Portainer cluster setup documentation: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer "Add an Ingress manually" documentation: https://docs.portainer.io/sts/user/kubernetes/networking/ingresses/add
- Portainer "Add an Ingress using a manifest" documentation: https://docs.portainer.io/user/kubernetes/networking/ingresses/manifest
- Portainer "Add a new application using a form" documentation: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer "Remove an Ingress" documentation: https://docs.portainer.io/sts/user/kubernetes/networking/ingresses/remove-an-ingress
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- `kubectl edit` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_edit
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx rewrite and annotation documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/ and https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The ingress-nginx installation command was pinned to `controller-v1.10.0`, which is outdated relative to the current official installation guide. I updated it to `controller-v1.15.1` and clarified that the example applies to bare-metal or local clusters.
- The Portainer UI path was inaccurate. Current Portainer documentation places Ingress management under `Networking -> Ingresses`, not inside the application deployment form. I corrected the setup, creation, and deletion steps accordingly.
- The YAML examples used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingressClassName`, which is the current Kubernetes approach and aligns with how Portainer documents IngressClass usage.
- The basic Ingress example included `nginx.ingress.kubernetes.io/rewrite-target: /` without a rewrite scenario. I removed it because it was unnecessary for the example and could lead to unintended path rewriting.
- The troubleshooting command filtered events using `reason=Sync`, which is too controller-specific for a general Kubernetes troubleshooting step. I replaced it with an event query scoped to the specific Ingress object.

## Review Notes
- The post is technically valid after the corrections above. Kubernetes Ingress remains a current API, although Gateway API is the newer extensibility direction for advanced traffic management.
- The ingress-nginx installation manifest is version-pinned, so it should be rechecked in future reviews against the official install guide.
