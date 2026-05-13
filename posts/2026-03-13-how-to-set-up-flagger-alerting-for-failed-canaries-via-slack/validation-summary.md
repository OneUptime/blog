# Validation Summary: How to Set Up Flagger Alerting for Failed Canaries via Slack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes
- Slack incoming webhooks
- Helm
- Istio canary deployments

## Sources Consulted
- Flagger alerting documentation: https://docs.flagger.app/main/usage/alerting
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger canary resource documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Helm chart values: https://raw.githubusercontent.com/fluxcd/flagger/main/charts/flagger/values.yaml
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack legacy incoming webhooks documentation: https://docs.slack.dev/legacy/legacy-custom-integrations/legacy-custom-integrations-incoming-webhooks/

## Issues Found
- The post implied that Flagger's `channel` and `username` AlertProvider fields would always control Slack delivery. Slack app-based incoming webhooks are bound to the selected channel and do not allow overriding the channel or username at runtime, so I added caveats explaining that behavior.
- The severity-routing example reused the same Slack webhook Secret for multiple destination channels. With Slack app-based incoming webhooks, each destination channel needs its own webhook URL, so I changed the example to use separate Secret references for critical and informational alerts.
- The global alerting section stated that global alerting sends notifications for all canary events. Flagger's documentation describes global Slack notifications for canary analysis events such as initialization, new revision detection, success, and failure, so I narrowed the wording.
- The testing section said users should see Slack messages for weight advancement. The official global alerting documentation does not guarantee notifications for every traffic weight increment, so I changed the expected messages to new revision detection and final success or failure.

## Review Notes
The Kubernetes Secret, AlertProvider, Canary, Helm values, `kubectl apply`, `kubectl set image`, and `helm upgrade -i` examples are syntactically valid and align with Flagger's documented fields. Slack workspace behavior can vary depending on whether the webhook is app-based, legacy/custom, or bot-token based.
