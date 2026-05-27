# Validation Summary: How to Use Ansible to Create Kubernetes Ingress Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible `kubernetes.core` collection
- Kubernetes Ingress `networking.k8s.io/v1`
- Kubernetes TLS Secrets
- ingress-nginx annotations
- cert-manager ingress-shim

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress concept documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- ingress-nginx rewrite annotation example: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The Ingress examples used the legacy `kubernetes.io/ingress.class` annotation for controller selection. Updated the examples to use `spec.ingressClassName: nginx`, which is the current Kubernetes Ingress API field.
- The path rewrite example used regex-style paths and capture groups but omitted `nginx.ingress.kubernetes.io/use-regex: "true"`. Added the annotation to match the ingress-nginx documented rewrite pattern.
- The path-routing explanation said the controller evaluates paths top to bottom. Replaced that with the Kubernetes longest-path priority rule and the ingress-nginx behavior of sorting regex paths by descending length.
- The dynamic Ingress example templated `service.port.number` as a quoted value. Added `| int` so the value is rendered as the integer expected by the Kubernetes Ingress backend port schema.
- The verification debug expression could fail while the Ingress address is still pending because it indexed `status.loadBalancer.ingress[0]` before applying the fallback. Reworked the expression to default to an empty list and print `pending` when no load balancer address exists.
- The description claimed the post covered multiple ingress controllers, but the content covers nginx-style Ingress examples and multi-service routing. Updated the description to match the content.

## Review Notes
- The ingress-nginx `configuration-snippet` annotation is technically valid, but many production clusters disable snippet annotations for security reasons. The post may benefit from a future operational caveat.
- `X-XSS-Protection` is included as a custom header example; it is obsolete in modern browsers but does not make the Kubernetes or ingress-nginx configuration invalid.
