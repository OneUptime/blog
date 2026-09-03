# Deduplicate Incidents Across Prometheus, CloudWatch, and App Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alert Deduplication, Prometheus, AWS CloudWatch, Application Monitoring, Incident Correlation

Description: Normalize and correlate alerts from Prometheus, CloudWatch, and application monitoring into one incident while preserving each source's state and evidence.

---

Deduplicating alerts from different monitoring systems is not string matching. Prometheus may identify a failing service by labels, CloudWatch by an alarm ARN and metric dimensions, and an application monitor by a check ID. The alert names and thresholds can differ even when all three describe one outage.

Use two levels of identity. First deduplicate repeated deliveries of the same source alert. Then correlate distinct source alerts into an incident candidate using normalized entity, symptom, topology, and time. Never discard the original source records.

## Preserve Source-Native Identity

Create a canonical alert envelope while retaining the payload:

~~~json
{
  "source": "cloudwatch",
  "source_alert_id": "arn:aws:cloudwatch:eu-west-1:123456789012:alarm:checkout-errors",
  "source_event_id": "c4c1c1c9-6542-e61b-6ef0-8c4d36933a92",
  "state": "firing",
  "starts_at": "2026-09-03T10:14:40Z",
  "observed_at": "2026-09-03T10:14:42Z",
  "service": "checkout",
  "environment": "production",
  "cluster": "eu-west-primary",
  "symptom": "http_error_rate",
  "severity": "page"
}
~~~

For Prometheus/Alertmanager, the complete label set identifies an alert instance, and current webhook payloads can include an alert fingerprint and group key. Annotations are descriptive and should not define identity. Clients resend firing alerts until resolution, so repeated delivery is expected.

For CloudWatch, use the alarm ARN from `resources` or account/region/alarm name as the source alert identity. CloudWatch alarm state-change events delivered through EventBridge contain an EventBridge event `id`, state, previous state, timestamps, configuration, and alarm name. The event ID identifies the EventBridge event; the alarm ARN identifies the enduring source alarm.

For an application monitor, use its stable monitor/check identifier plus scope-not its display name. Store vendor occurrence IDs when available.

## Make Ingestion Idempotent

Maintain a source-event table keyed by:

~~~text
(source, tenant/account, source_event_id)
~~~

If a source has no event ID, derive a deterministic delivery key from its stable alert ID, state, and source transition timestamp. Do not hash the whole JSON body: field order, generated URLs, and descriptions can change across equivalent deliveries.

Upsert the alert instance separately by:

~~~text
(source, tenant/account, source_alert_id)
~~~

Apply transitions monotonically using source time plus a tie-breaker, but retain out-of-order events for audit. A late firing update must not reopen an incident after a newer resolved transition without an explicit new episode. Store `starts_at`, `ends_at`, source timestamp, and ingestion timestamp independently.

Alertmanager high availability intentionally prefers an occasional duplicate notification over missing one during partitions. Downstream incident creation must therefore remain idempotent even when upstream deduplication is configured.

## Normalize Onto a Service Catalog

Build source-specific mappings:

| Source field | Canonical field |
| --- | --- |
| Prometheus `service`, `environment`, `cluster` labels | service/environment/cluster |
| CloudWatch namespace plus dimensions or resource ARN | catalog resource and owning service |
| Application monitor/check tags | service and endpoint/synthetic location |

Use a versioned catalog. If an EC2 alarm maps to three services, retain the infrastructure resource as the entity and use dependency relationships rather than arbitrarily selecting one owner.

Normalize symptom classes such as availability, latency, error rate, saturation, dependency failure, or data freshness. Preserve the original alert name and expression because two rules in the same symptom class may still provide independent evidence.

Reject or quarantine alerts missing tenant and environment. A global “database down” alert must not merge production with staging merely because names match.

## Correlate Without Collapsing Evidence

An incident candidate key can begin with:

~~~text
tenant + environment + affected service/resource + symptom family + episode
~~~

Then add topology evidence. A CloudWatch load-balancer alarm, Prometheus HTTP-error alert, and synthetic checkout failure may belong together when they share environment, service path, and overlapping onset. Confidence should increase when impact tracks the same cluster or deployment and when traces show the dependency path.

Do not require identical severity. Source systems often classify severity differently. Compute incident priority from user impact and confidence while retaining source severity.

Use an idle gap and hard maximum duration for episodes. A service that flaps for days should not accumulate every future failure in one immortal incident. After a meaningful healthy interval, create a new episode and link it to the previous one.

The incident stores references to all source alerts:

~~~text
incident INC-2041
  Prometheus CheckoutHighErrorRate   firing
  CloudWatch  checkout-alb-5xx       ALARM
  Synthetic   checkout-submit-eu     failing
~~~

Resolving one source does not resolve the incident while material symptoms remain. Define closure policy explicitly-such as all paging signals resolved plus a stability period-and preserve partial recovery.

## Use Native Noise Controls Carefully

Alertmanager can deduplicate, group, route, silence, and inhibit Prometheus alerts. Keep its label set stable and group by bounded service scope. CloudWatch composite alarms can evaluate rules over metric or composite alarm states and can reduce notifications by acting only on the composite. CloudWatch action suppression can also suppress composite alarm actions around a suppressor alarm with wait and extension periods.

These controls reduce source notifications but do not produce a universal cross-platform incident ID. Feed underlying state changes into the correlation layer even when their paging actions are suppressed, subject to cost and security policy. Otherwise, responders lose evidence and cannot evaluate correlation quality.

Avoid circular suppression: if a cross-source incident mutes native alerts, its own failure must not prevent all pages. Prefer notification routing and idempotent incident updates over destructive source silencing.

## Replay Before Enabling Ticket Deduplication

Use historical transitions to measure:

- duplicate deliveries removed per source;
- distinct alerts correctly joined;
- unrelated incidents incorrectly merged;
- one incident incorrectly split;
- delay from first actionable signal to incident creation;
- incidents closed while a material source remained firing;
- mapping failures and unknown catalog entities.

Test simultaneous failures of the same service in two regions, one infrastructure resource shared by many services, a deploy plus unrelated synthetic failure, missing labels, delayed CloudWatch events, Prometheus resends, and out-of-order resolves.

Run shadow mode first. Show the proposed incident key and reasons without suppressing existing pages. Version the normalization map and correlation policy so every join is explainable and historical replays are reproducible.

## Conclusion

Cross-system deduplication needs source identity, idempotent transition handling, and a separate incident-correlation model. Preserve Prometheus fingerprints and labels, CloudWatch alarm ARNs and state events, and application monitor IDs; normalize them through a catalog; then join only when scope, symptom, topology, and episode agree. One incident view can reduce duplicate work while every original signal remains available for diagnosis and audit.

## Official References

- [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alertmanager Alerts API](https://prometheus.io/docs/alerting/latest/alerts_api/)
- [Alertmanager Configuration: Webhook Payload](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Amazon CloudWatch Alarm Events and EventBridge](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-eventbridge.html)
- [Amazon CloudWatch Alarms and Composite Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html)
- [Amazon CloudWatch Alarm Suppression](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-suppression.html)
