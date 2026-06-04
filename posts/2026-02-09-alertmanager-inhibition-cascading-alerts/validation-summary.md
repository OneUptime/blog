# Validation Summary: Set Up Alertmanager Inhibition Rules to Suppress Cascading Kubernetes Alerts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager inhibition rules
- Alertmanager routing
- Kubernetes alerting
- PromQL
- amtool
- Alertmanager HTTP API v2

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager concepts documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager GitHub README for amtool route testing examples: https://github.com/prometheus/alertmanager

## Issues Found
- The inhibition examples used deprecated Alertmanager matcher fields: `source_match`, `target_match`, and `target_match_re`. Updated the examples to use current `source_matchers` and `target_matchers` syntax.
- The routing example used the deprecated route `match` field. Updated it to use route `matchers`.
- The post stated that inhibition requires equal labels. Alertmanager's `equal` list is optional, though strongly recommended for related-alert suppression. Reworded this to say inhibition usually includes equal labels.
- The post said inhibited alerts immediately become active again when the source alert resolves. Inhibited alerts are already firing but suppressed; when inhibition ends, they can notify according to routing timing. Reworded this for accuracy.
- The deployment section said annotations can automatically create alerts during deployments. Annotations alone do not create alerts, so this was changed to deployment automation or alerting rules.
- The testing `curl` examples omitted the JSON content type header. Added `-H 'Content-Type: application/json'`.
- The monitoring section described `alertmanager_alerts{state="suppressed"}` as inhibited alerts by rule. This metric tracks suppressed alerts, including silenced and inhibited alerts, and the shown query groups by alert name rather than by rule. Updated the wording and comments.
- The debugging section suggested using `amtool config routes test` to check inhibition label matching. That command tests routing, not inhibition rules directly. Updated the section to recommend `amtool check-config` for configuration validation and to use route testing only for routing verification.

## Review Notes
The examples are generic and depend on alert labels such as `node`, `cluster`, `namespace`, `deployment`, and `persistentvolumeclaim` being present consistently on both source and target alerts. The post now uses current Alertmanager matcher syntax, which is also better aligned with Alertmanager UTF-8 matcher guidance.
