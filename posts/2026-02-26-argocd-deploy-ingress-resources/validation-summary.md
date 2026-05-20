# Validation Summary: How to Deploy Ingress Resources with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- cert-manager
- Kustomize
- AWS Load Balancer Controller
- Helm
- YAML

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotation risk documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations-risk/
- ingress-nginx Helm chart listing: https://artifacthub.io/packages/helm/ingress-nginx/ingress-nginx
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager HTTP01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- AWS Load Balancer Controller annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller IngressClass documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/

## Issues Found
- The Ingress architecture diagram implied that request traffic flows through the Ingress resource itself. Updated the Mermaid diagram so the controller watches the Ingress resource while data-plane traffic flows from the controller to Services.
- The ingress-nginx Helm chart example pinned `targetRevision: 4.9.0`, which is outdated. Updated it to `4.15.1`, the current chart version found during review.
- The cert-manager HTTP01 solver used `class: nginx`. Current cert-manager documentation recommends `ingressClassName` for most controllers, so the example now uses `ingressClassName: nginx`.
- The NGINX annotations example duplicated `proxy-read-timeout` and `proxy-send-timeout` keys in the same YAML mapping and included the unsupported `nginx.ingress.kubernetes.io/websocket-services` annotation. Removed the unsupported annotation and kept a single effective timeout configuration for long-lived WebSocket connections.
- The custom NGINX header snippet did not note that snippet annotations are disabled by default in ingress-nginx. Added a comment documenting that controller-side snippet support is required.
- The custom Argo CD Ingress health check treated any non-empty `status.loadBalancer.ingress` list as healthy. Updated it to require an entry with either `hostname` or `ip`, matching Argo CD's documented health behavior.
- The AWS example used the deprecated `kubernetes.io/ingress.class: alb` annotation and referred to the old ALB Ingress Controller name. Updated the text to AWS Load Balancer Controller and changed the manifest to `spec.ingressClassName: alb`.

## Review Notes
- The examples use valid `networking.k8s.io/v1` Ingress syntax with required `pathType` fields.
- The `configuration-snippet` annotation is powerful and classified as high risk in ingress-nginx documentation; production clusters should enable it only for trusted Ingress authors.
