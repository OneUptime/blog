# Validation Summary: How to Use Flux CD Capacitor Dashboard for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization, Source, Helm, Notification, and Image Toolkit APIs
- Flux Capacitor dashboard
- Kubernetes Deployments, Services, Ingress, RBAC, and port-forwarding
- NGINX Ingress basic authentication
- Slack notifications through Flux notification-controller

## Sources Consulted
- Flux Capacitor repository and v0.4.3 installation/RBAC manifests: https://github.com/gimlet-io/capacitor
- Flux blog introduction to Capacitor and supported resource views: https://fluxcd.io/blog/2024/02/introducing-capacitor/
- Flux ecosystem listing for Capacitor: https://fluxcd.io/ecosystem
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider documentation, including Slack examples: https://fluxcd.io/flux/components/notification/providers/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- NGINX Ingress basic authentication example: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/

## Issues Found
- The RBAC example said Capacitor needed read access to standard Kubernetes resources, but only granted namespaces and events in the core API group. Added read-only access for pods, pod logs, services, configmaps, deployments, ingresses, and events.k8s.io events so the dashboard can inspect the standard Kubernetes resources Capacitor displays. Secret read access was intentionally not added to preserve the post's stated safe read-only visibility model for development teams.

## Review Notes
- The deployment image and port match the historical Capacitor v0.4.3 Kubernetes manifests. The upstream project now emphasizes Capacitor Next and publishes newer self-hosting manifests, so a future article refresh could cover Capacitor Next separately rather than mixing it into this v0.4.3-oriented guide.
- The Flux Slack Provider and Alert snippets use the current notification.toolkit.fluxcd.io/v1beta3 API and match the official Slack provider pattern.
