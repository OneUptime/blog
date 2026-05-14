# Validation Summary: How to Configure Flagger Alerting with Slack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux
- Slack incoming webhooks
- Kubernetes Secrets
- Kubernetes custom resources
- kubectl

## Sources Consulted
- Flagger alerting documentation: https://fluxcd.io/flagger/usage/alerting/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack legacy incoming webhooks documentation: https://docs.slack.dev/legacy/legacy-custom-integrations/legacy-custom-integrations-incoming-webhooks/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The per-canary Slack webhook Secret was created in `flagger-system`, while the AlertProvider using it was created in `default`. Flagger's AlertProvider examples and secretRef behavior require the referenced Secret to be in the AlertProvider namespace, so I changed the Secret namespace to `default` for the per-canary examples.
- The post implied that the Slack channel and username in the AlertProvider can always control where and how messages are posted. Slack app-based incoming webhooks are bound to the channel selected when the webhook is created and do not allow overriding the channel or username at send time, so I clarified the comments and the multiple-channel guidance.
- The cluster-level AlertProvider example referenced a Secret in `flagger-system` but did not state that the Secret must exist there. I added that note so the cross-namespace provider example is complete.
- The troubleshooting guidance for `channel_not_found` assumed the AlertProvider channel alone was enough. I updated it to account for app-based Slack webhooks being created for a specific channel.

## Review Notes
The Flagger `AlertProvider` and Canary `analysis.alerts` fields match the current Flagger documentation, including severity values `info`, `warn`, and `error`, and `providerRef.namespace` for cross-namespace references. The Kubernetes Secret `stringData` usage and `kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default` command are consistent with Kubernetes documentation.
