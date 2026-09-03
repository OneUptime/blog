# Validation Summary: How to Deduplicate the Same Incident Across Prometheus, CloudWatch, and Application Monitoring

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus
- Prometheus Alertmanager
- Amazon CloudWatch alarms
- Amazon EventBridge
- Application and synthetic monitoring
- Alert deduplication and incident correlation

## Sources Consulted

- [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Prometheus Alertmanager Alerts API](https://prometheus.io/docs/alerting/latest/alerts_api/)
- [Prometheus Alertmanager webhook configuration](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Prometheus Alertmanager high availability](https://prometheus.io/docs/alerting/latest/high_availability/)
- [Amazon CloudWatch alarm events and EventBridge](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-eventbridge.html)
- [Amazon CloudWatch composite alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html)
- [Amazon CloudWatch alarm suppression](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-suppression.html)
- [Amazon CloudWatch CompositeAlarm API reference](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_CompositeAlarm.html)

## Issues Found

- The EventBridge event `id` was described as identifying a delivery unit. AWS documents it as the identifier of the event, while EventBridge delivery and retry semantics are a separate concern. Changed the wording to say that the ID identifies the EventBridge event, avoiding an unsupported implication about individual delivery attempts.

## Review Notes

- The canonical envelope and incident-key snippets are illustrative data-model examples, not vendor-native payload schemas.
- The application-monitor guidance is intentionally vendor-neutral; stable check IDs and vendor occurrence IDs depend on the selected provider.
- No product versions are pinned. The Prometheus webhook fields, Alerts API behavior, high-availability duplicate-notification behavior, CloudWatch state-change event fields, composite-alarm rules, and suppression periods were checked against the current official documentation.
