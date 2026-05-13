# Validation Summary: How to Set Up Flagger Alerting for Failed Canaries via PagerDuty

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- PagerDuty
- Prometheus
- Alertmanager
- Kubernetes
- Prometheus Operator
- Slack

## Sources Consulted
- Flagger Alerting documentation: https://docs.flagger.app/usage/alerting
- Flagger Monitoring documentation: https://docs.flagger.app/main/usage/monitoring
- Flagger Istio Canary Deployments tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- PagerDuty Prometheus Integration Guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- Flagger does not support `pagerduty` as a native `AlertProvider` type. The post claimed `spec.type: pagerduty` would work, but Flagger's documented AlertProvider types are `slack`, `msteams`, `rocket`, and `discord`. I replaced the invalid PagerDuty AlertProvider examples with a Prometheus alert rule using `flagger_canary_status > 1` and Alertmanager PagerDuty routing.
- The PagerDuty integration key was shown as a Flagger AlertProvider secret with an `address` field. That field is correct for Flagger chat alert providers, but not for Alertmanager PagerDuty configuration. I changed the examples to use Alertmanager `pagerduty_configs` with `routing_key` for PagerDuty Events API v2.
- The canary examples attempted to route PagerDuty alerts from `spec.analysis.alerts`. Flagger canary alerts only reference Flagger AlertProvider resources, so I removed the PagerDuty references from Canary specs and kept PagerDuty routing in Alertmanager.
- The post stated that Flagger would create PagerDuty incidents directly. I changed this to the accurate flow: Flagger updates canary status metrics, Prometheus fires an alert, and Alertmanager sends the PagerDuty event.
- The incident resolution section claimed Flagger does not automatically resolve PagerDuty incidents. With Alertmanager's PagerDuty integration, resolved notifications are sent by default unless `send_resolved: false` is configured. I corrected the section accordingly.
- The test command updated container `podinfo`, but the podinfo examples commonly use container name `podinfod`. I updated the command and changed the failure test to generate HTTP 500 responses during the canary analysis.

## Review Notes
The corrected tutorial assumes Prometheus is scraping Flagger metrics and that Alertmanager is already installed. Kubernetes-specific Alertmanager configuration packaging varies by installation method, so the post now describes the receiver configuration while noting that the Secret name and reload process depend on the user's Alertmanager setup.
