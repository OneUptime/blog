# Validation Summary: How to Rate Limit Flux Receiver to Prevent API Throttling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller Receiver
- Flux GitRepository and Kustomization resources
- Kubernetes Ingress, Service, Deployment, ResourceQuota, and Kustomize patches
- ingress-nginx rate limiting annotations and ConfigMap settings
- Gateway API and Envoy Gateway BackendTrafficPolicy
- GitHub and GitLab webhooks

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Envoy Gateway global rate limit documentation: https://gateway.envoyproxy.io/latest/tasks/traffic/global-rate-limit/
- GitHub webhook failed delivery documentation: https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries
- GitHub REST API rate limit documentation: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub IP address and Meta API documentation: https://docs.github.com/en/github/authenticating-to-github/about-githubs-ip-addresses
- GitLab webhook documentation: https://docs.gitlab.com/user/project/integrations/webhooks/

## Issues Found
- The Ingress example pointed at `notification-controller`; Flux's webhook receiver guide documents the in-cluster Service as `webhook-receiver` on port 80. Updated the backend service name.
- The ingress-nginx example used `limit-rate-after` as if it controlled rejected request status codes. That setting controls response transmission rate after a byte threshold. Updated the text to explain the default 503 response and the controller ConfigMap `limit-req-status-code` setting for 429.
- The GitHub webhook IP whitelist example used hard-coded partial CIDRs. Replaced them with placeholders and noted that current webhook CIDRs should come from the `hooks` field of the GitHub Meta API.
- The Flux interval section described `interval` as a cap on reconciliation frequency. Updated it to clarify that it controls polling requeues and does not cap webhook-triggered reconciliations.
- The Envoy Gateway `BackendTrafficPolicy` example included an outdated `rateLimit.type` field and matched `:path` through headers. Updated it to the current documented `rateLimit.global.rules` shape with a `path` client selector.
- The GitHub section claimed branch filtering was available directly for GitHub webhooks and that GitHub automatically retries failed deliveries. Updated it to recommend Flux or middleware filtering for branches and to state that GitHub does not automatically redeliver failed webhook deliveries.
- Updated the debouncer upstream URL to point to the Flux `webhook-receiver` Service.
- Updated verification and troubleshooting text to reflect ingress-nginx's default 503 status and optional 429 behavior.

## Review Notes
All YAML snippets were parsed locally after the edits. Future updates should re-check Envoy Gateway because its rate limit APIs are still under `v1alpha1` and may change.
