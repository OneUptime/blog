# Validation Summary: How to Secure Flux Receiver Endpoint with TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller Receiver webhooks
- Kubernetes Ingress
- Kubernetes Gateway API
- cert-manager
- Let's Encrypt ACME HTTP-01 and DNS-01
- ingress-nginx
- OpenSSL
- kubectl

## Sources Consulted
- Flux documentation, "Setup Webhook Receivers": https://fluxcd.io/flux/guides/webhook-receivers/
- cert-manager documentation, "Securing Ingress Resources": https://cert-manager.io/docs/usage/ingress/
- cert-manager documentation, "ACME DNS01": https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager documentation, "Cloudflare": https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager documentation, "Annotated Gateway resource": https://cert-manager.io/docs/usage/gateway/
- Kubernetes documentation, "Ingress": https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl reference, "kubectl create secret tls": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- ingress-nginx documentation, "Annotations": https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx documentation, "ConfigMap": https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

## Issues Found
- The Ingress examples routed traffic to the `notification-controller` Service. Flux's official Receiver guide documents the `webhook-receiver` Service on port `80` for Ingress and HTTPRoute exposure, so both Ingress snippets were updated to use `webhook-receiver`.
- The Gateway API section stated that cert-manager can provision certificates for Gateway resources when annotations are set. cert-manager's Gateway integration also requires Gateway API support to be enabled, so the sentence was updated to include that prerequisite.
- The HSTS example used `nginx.ingress.kubernetes.io/hsts`, `nginx.ingress.kubernetes.io/hsts-max-age`, and `nginx.ingress.kubernetes.io/hsts-include-subdomains` as Ingress annotations. ingress-nginx documents these as controller ConfigMap keys, so the example was changed to a ConfigMap `data` snippet.
- The verification section said HTTP should return a `301` redirect. ingress-nginx currently defaults HTTPS redirects to `308`, so the comment was updated to say the response should be a redirect such as `308`.
- The verification section said the HTTPS `curl` command should return `200`. A Flux Receiver URL requires the generated Receiver path and a valid webhook signature for provider requests, so the comment was updated to avoid promising a fixed status code for a generic curl request.

## Review Notes
- The post is technically relevant and includes actionable Kubernetes, Flux, cert-manager, ingress-nginx, and OpenSSL examples.
- The `configuration-snippet` example is valid for ingress-nginx, but clusters must allow snippet annotations for it to be accepted by the controller.
