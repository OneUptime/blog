# Validation Summary: How to Expose Grafana Through Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio AuthorizationPolicy
- Grafana
- Grafana Generic OAuth
- Grafana Live WebSockets
- cert-manager
- Kubernetes Secrets and PersistentVolumeClaims
- Helm
- kubectl

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ingress authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana reverse proxy tutorial: https://grafana.com/tutorials/run-grafana-behind-a-proxy/
- Grafana Live documentation: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-live/
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana Helm installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/

## Issues Found
- The AuthorizationPolicy example used `remoteIpBlocks` without explaining when it applies. Istio distinguishes `remoteIpBlocks` for original client IPs derived from `X-Forwarded-For` or PROXY protocol from `ipBlocks` for preserved packet source addresses such as `externalTrafficPolicy: Local`. Added that distinction before the example.
- The root URL section described skipped `root_url` configuration as causing CORS errors. Grafana Live checks the WebSocket `Origin` header against the configured `root_url`, so the wording was changed to origin-check errors.
- The troubleshooting section described embedding failures as CORS errors and tied them to `GF_SECURITY_ALLOW_EMBEDDING`. Grafana's `allow_embedding` setting controls the `X-Frame-Options` response header, not CORS. Updated the note to describe browser frame blocking and `X-Frame-Options: deny`.

## Review Notes
The Istio Gateway, VirtualService, TLS secret, cert-manager Certificate, Grafana root URL, sub-path, Generic OAuth, persistent volume, and kubectl command examples are technically valid for the assumptions in the post. The short service host `grafana` works when the Grafana Service is in the same namespace as the VirtualService, but Istio recommends fully qualified service names to avoid namespace ambiguity in more complex deployments.
