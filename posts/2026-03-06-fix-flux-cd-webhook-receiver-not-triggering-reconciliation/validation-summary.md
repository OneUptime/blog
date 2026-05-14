# Validation Summary: How to Fix Flux CD Webhook Receiver Not Triggering Reconciliation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD notification-controller
- Flux CD Receiver custom resources
- Kubernetes Ingress, Service, and NetworkPolicy
- GitHub, GitLab, and Bitbucket webhooks
- kubectl, curl, openssl, and JSONPath commands

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receivers setup guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux notification-controller options: https://fluxcd.io/flux/components/notification/options/
- Flux notification-controller source code, receiver handler validation: https://github.com/fluxcd/notification-controller
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The Ingress example routed to `notification-controller` on port `80`, but Flux exposes receiver traffic through the `webhook-receiver` Service on port `80`. Updated the backend service name to `webhook-receiver`.
- The LoadBalancer Service example reused the built-in `webhook-receiver` Service name, which can conflict with the Service Flux already creates. Renamed the example Service to `receiver`, matching the official guide pattern.
- The port-forward example targeted `svc/notification-controller`, but Flux's receiver Service is `svc/webhook-receiver`. Updated the command and removed the unsigned empty-body GitHub test request, which would fail receiver validation.
- The manual GitHub test request included a valid HMAC signature but omitted `X-GitHub-Event: push`; with `events: ["ping", "push"]`, Flux filters by that header. Added the event header.
- The resource verification section checked `Kustomization` and `HelmRelease` resources, but Flux recommends receivers reconcile source or image resources and let downstream appliers react to source revision changes. Updated the text and commands to check source/image resources.

## Review Notes
The post is technically relevant and generally aligned with current Flux documentation after the fixes. Ingress remains stable in Kubernetes, but Kubernetes documentation now recommends Gateway API for new traffic routing designs; the post's Ingress example is still valid.
