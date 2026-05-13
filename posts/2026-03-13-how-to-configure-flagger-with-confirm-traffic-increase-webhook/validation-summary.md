# Validation Summary: How to Configure Flagger with confirm-traffic-increase Webhook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Flagger webhooks
- Flagger load tester
- Kubernetes `kubectl exec`
- YAML and JSON configuration

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger Deployment Strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger `CanaryWebhookPayload` and Canary analysis API source: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- Flagger load tester gate implementation: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/server.go
- Flagger load tester Helm chart values: https://github.com/fluxcd/flagger/blob/main/charts/loadtester/values.yaml

## Issues Found
- The webhook payload example omitted the `checksum` field. Flagger's documented and source-defined `CanaryWebhookPayload` includes `name`, `namespace`, `phase`, `checksum`, and `metadata`, so the example was updated to include `checksum`.
- The load tester gate example used `/gate/approve` while describing pause/resume behavior with `/gate/open` and `/gate/close`. `/gate/approve` always returns success; stateful manual gating uses `/gate/check`. The webhook URLs were changed to `/gate/check` where the post describes pausing and resuming traffic increases.
- The `/gate/open` and `/gate/close` commands did not include the canary payload. The load tester decodes the request body to identify the gate key, so the commands were updated to send `{"name":"my-app","namespace":"default"}`.

## Review Notes
The post is technically relevant and the Flagger `confirm-traffic-increase`, `stepWeight`, `stepWeights`, webhook metadata, and load tester command examples are otherwise consistent with current Flagger documentation and source behavior.
