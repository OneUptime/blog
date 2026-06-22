# Validation Summary: How to Implement Alerting Rules in Grafana

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana Alerting
- Grafana provisioning
- Grafana notification policies, contact points, silences, and mute timings
- Prometheus and PromQL
- Kubernetes metrics from kube-state-metrics
- Node Exporter filesystem metrics
- Webhook-based incident management integration

## Sources Consulted
- Grafana documentation: Use configuration files to provision alerting resources - https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana documentation: Configure Grafana-managed alert rules - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana documentation: Queries and conditions - https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/queries-conditions/
- Grafana documentation: Template annotations and labels - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/
- Grafana documentation: Configure notification policies - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-notification-policy/
- Grafana documentation: Configure silences - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-silence/
- Grafana documentation: Configure mute timings and active time intervals - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/mute-timings/
- Grafana documentation: Configure webhook notifications - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/
- Grafana official provisioning alerting examples - https://github.com/grafana/provisioning-alerting-examples
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Histograms and summaries - https://prometheus.io/docs/practices/histograms/
- Prometheus documentation: Alertmanager - https://prometheus.io/docs/alerting/latest/alertmanager/
- OneUptime documentation: Grafana integration - https://oneuptime.com/docs/en/integrations/grafana

## Issues Found
- The post described silences and mute timings as suppressing alerts or preventing alerts from firing. Grafana documents these features as suppressing notifications while alert evaluation continues, so the wording was corrected.
- Several PromQL examples embedded the threshold comparison directly in the query while also configuring a Grafana threshold condition. The queries were changed to return measured values, leaving threshold evaluation to Grafana.
- The burn-rate example returned a burn-rate value but did not state the matching Grafana threshold after the query was corrected. Added the explicit `IS ABOVE 14.4` condition.
- Annotation examples used `{{ $values.A }}` where Grafana's alert-rule templating reference uses `{{ $values.A.Value }}` for query values. Updated the annotation templates accordingly.
- The first annotation example tried to read a static routing label via `$labels.service`. Since `$labels` represents query labels, the example summary was changed to static text.
- The alert-rule provisioning example lacked the reduce expression typically needed before thresholding a time series in Grafana-managed alerting. Added the reduce and threshold expression chain and required expression datasource metadata.
- The notification policy YAML used non-Grafana field names such as `contact_point` and `match`. Updated it to Grafana provisioning-style `policies`, `receiver`, and `matchers`.
- The silence API payload omitted `isEqual` on matchers. Added `isEqual: true` to make the matcher semantics explicit.
- The mute timing provisioning example omitted `orgId`. Added `orgId: 1` to match Grafana's documented provisioning shape.
- The OneUptime contact point example used invalid Grafana provisioning keys and an unsupported-looking fixed endpoint. Updated it to `contactPoints` / `receivers` and a OneUptime workflow webhook URL variable, consistent with OneUptime's Grafana integration documentation.

## Review Notes
The post is technically relevant and current for modern Grafana Alerting. Grafana 13 deprecates some legacy `/api` routes in favor of newer `/apis` routes, but the Alertmanager silence endpoint shown remains commonly documented and usable for Grafana-managed Alertmanager silences.
