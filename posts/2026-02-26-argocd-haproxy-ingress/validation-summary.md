# Validation Summary: How to Expose ArgoCD with HAProxy Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- HAProxy Kubernetes Ingress Controller
- Helm
- kubectl
- TLS termination and TLS passthrough
- HTTP/2, h2c, gRPC, and gRPC-Web

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- HAProxy Kubernetes Ingress Controller Ingress annotations: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/ingress/
- HAProxy Kubernetes Ingress Controller Service annotations: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/service/
- HAProxy Kubernetes Ingress Controller ConfigMap options: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/configmap/
- HAProxy Kubernetes Ingress Controller Helm values documentation: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/values/
- HAProxy Kubernetes Ingress Controller installation documentation: https://www.haproxy.com/documentation/kubernetes-ingress/community/installation/on-prem/
- HAProxy Helm chart templates: https://github.com/haproxytech/helm-charts/tree/main/kubernetes-ingress/templates

## Issues Found
- The Ingress examples used `haproxy.org/timeout-client`, but current HAProxy documentation lists `timeout-client` as a controller ConfigMap key, not an Ingress annotation. I removed it from the Ingress snippet and added it to the controller ConfigMap example.
- The gRPC example used `haproxy.org/timeout-tunnel`, but `timeout-tunnel` is a controller ConfigMap key. I replaced the annotation with a controller ConfigMap example.
- The connection tuning example listed `timeout-queue` and `timeout-http-keep-alive` as annotations. Current HAProxy documentation lists these as controller ConfigMap keys, so I moved them into a ConfigMap snippet.
- The health check example used unsupported `haproxy.org/check-fall` and `haproxy.org/check-rise` annotations. I removed those lines.
- The IP access control example used `haproxy.org/whitelist`. That annotation still appears in the reference, but current HAProxy docs also provide `haproxy.org/allow-list`; I updated the example to the current terminology.
- The custom ConfigMap example used a generic `haproxy-configmap` name. The Helm install command in the post creates and wires the controller to `haproxy-ingress-kubernetes-ingress`, so I changed the example to use that ConfigMap name.
- The custom backend snippet comment said it enabled server-side HTTP/2, but the directives shown customize HTTP health checks. I corrected the comment.

## Review Notes
The post now uses valid Kubernetes `networking.k8s.io/v1` Ingress syntax and the Argo CD `server.insecure: "true"` setting matches Argo CD's documented pattern for TLS termination at an ingress controller. The HAProxy controller ConfigMap name depends on the Helm release name; the examples are correct for the release name used in this post, `haproxy-ingress`.
