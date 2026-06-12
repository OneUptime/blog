# Validation Summary: How to Use Falco Sidekick for Alerting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Falco
- Falco Sidekick
- Kubernetes
- Helm
- Slack webhooks
- PagerDuty
- Elasticsearch
- Prometheus

## Sources Consulted
- Falco alert forwarding documentation: https://falco.org/docs/concepts/outputs/forwarding/
- Falco Sidekick README and endpoint documentation: https://github.com/falcosecurity/falcosidekick
- Falco Sidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falco Sidekick Slack output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/slack.md
- Falco Sidekick PagerDuty output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/pagerduty.md
- Falco Sidekick Elasticsearch output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/elasticsearch.md
- Falco Sidekick Webhook output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/webhook.md
- Falco Sidekick Prometheus output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/prometheus.md

## Issues Found
- The Helm chart `config.customfields` value was shown as a YAML map. The current Falco Sidekick Helm chart renders this value into the `CUSTOMFIELDS` environment variable and documents it as an escaped comma-separated string, so it was changed to `environment:production\\,cluster:us-east-1\\,team:platform-security`.
- The `/test` endpoint example posted a custom event body. Falco Sidekick documents `/test` as a debug endpoint that sends a built-in test event to enabled outputs, so the body was removed and the request was left as a POST with JSON/accept headers.
- The Prometheus configuration snippet used `config.prometheus.enabled`, which is not a current Falco Sidekick chart value. It was replaced with the supported `config.prometheus.extralabels` example.
- The Prometheus metric names used the old or incorrect `falco_sidekick_*` prefix. Current Falco Sidekick metrics use the `falcosecurity_falcosidekick_` prefix, so the metric examples were updated.

## Review Notes
The Helm command that enables `falcosidekick` as a dependency of the Falco chart is accurate; the Falco chart automatically configures Falco JSON and HTTP output when `falcosidekick.enabled=true`. The standalone Sidekick examples assume the `falco` namespace already exists, which matches the surrounding text saying Falco is already running.
