# Validation Summary: How to Expose Flux Receiver Behind Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller Receiver
- Kubernetes Ingress
- ingress-nginx
- cert-manager
- GitHub webhooks
- kubectl and flux CLI

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux installation and supported Kubernetes versions: https://fluxcd.io/flux/installation/
- Flux release and Kubernetes support policy: https://fluxcd.io/flux/releases/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation for snippet annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Issues Found
- The prerequisites stated that Kubernetes 1.24 or later was sufficient. Current Flux documentation says supported Kubernetes versions depend on the Flux release and warns that EOL Kubernetes versions are not supported. Updated the prerequisite to require a Kubernetes version supported by the chosen Flux release.
- The Ingress examples routed traffic to the `notification-controller` Service. Flux documentation states that the notification controller exposes webhook traffic through the `webhook-receiver` Kubernetes Service on port 80. Updated both Ingress examples to use `webhook-receiver`.
- The Ingress examples used `nginx.ingress.kubernetes.io/configuration-snippet` as a default request-method filter. ingress-nginx documents snippet annotations as potentially dangerous, and the ConfigMap option `allow-snippet-annotations` defaults to `false`, so this is not a generally portable default. Removed the snippet from the examples and adjusted the summary accordingly.
- The curl verification example used `X-Hub-Signature-256`. Flux Receiver documentation for the GitHub receiver specifies the `X-Hub-Signature` header. Updated the test request to include `X-GitHub-Event: ping` and an `X-Hub-Signature` HMAC header.
- The 502 troubleshooting command checked `svc notification-controller`. Since the Ingress should target `webhook-receiver`, updated the troubleshooting command to check `svc webhook-receiver`.

## Review Notes
- The cert-manager `cert-manager.io/cluster-issuer` annotation and `tls.secretName` usage are correct for ingress-shim when a matching `ClusterIssuer` exists.
- The `networking.k8s.io/v1` Ingress shape, `ingressClassName`, `pathType: Prefix`, and service backend syntax are current Kubernetes APIs.
- Flux documentation recommends considering rate limits for public Receiver ingress endpoints. This post does not include rate limiting, but the omission is not technically incorrect.
