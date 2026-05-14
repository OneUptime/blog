# Validation Summary: How to Configure Flux Notification Provider for Rocket.Chat

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets
- kubectl
- Flux CLI
- Rocket.Chat incoming webhooks

## Sources Consulted
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI reference for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux notification-controller provider source: https://github.com/fluxcd/notification-controller/blob/main/api/v1beta3/provider_types.go
- Flux notification-controller Rocket notifier source: https://github.com/fluxcd/notification-controller/blob/main/internal/notifier/rocket.go
- Rocket.Chat integrations documentation: https://docs.rocket.chat/docs/integrations

## Issues Found
- The Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation exposes `Provider` and `Alert` under `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert manifests to use `v1beta3`.
- The Rocket.Chat provider type was listed as `rocketchat`, but Flux documents and implements the provider type as `rocket`. Updated all Provider manifests and comments to use `type: rocket`.
- The Rocket.Chat webhook URL example used a shortened `/hooks/TOKEN_VALUE` shape. Rocket.Chat documents incoming webhook URLs as `/hooks/{integrationId}/{token}`. Updated the examples accordingly.
- The post said the Flux `channel` field should not include `#`. Rocket.Chat channel destinations are documented with `#channel-name`, and Flux passes the channel value in the webhook payload. Updated the examples to use `#deployments`, `#production-alerts`, and `#dev-updates`, and clarified that Rocket.Chat must allow body payloads to override the destination channel when using Flux channel routing.
- The TLS troubleshooting note suggested mounting a CA bundle into the notification controller. Flux Provider supports `certSecretRef` for trusted CA certificates. Updated the note to recommend `certSecretRef`.
- The proxy note suggested controller environment variables. Flux Provider supports `proxySecretRef` for per-provider proxy configuration. Updated the note to recommend `proxySecretRef`.

## Review Notes
The `flux reconcile kustomization flux-system --with-source` command and the `kubectl create secret generic ... --from-literal=address=...` command are valid. The multiple-channel example depends on the Rocket.Chat incoming webhook setting that permits destination channel override from request body parameters.
