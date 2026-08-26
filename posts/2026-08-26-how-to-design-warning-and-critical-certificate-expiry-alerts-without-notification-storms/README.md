# How to Design Warning and Critical Certificate-Expiry Alerts Without Notification Storms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, Prometheus, Alertmanager, Certificate Expiry, Alerting

Description: Build mutually exclusive warning and critical certificate-expiry alerts with stable timing, ownership, grouping, and escalation that avoid duplicate notifications.

---

Certificate-expiry alerting needs enough notice to fix renewal, deployment, and validation failures, but a naïve set of thresholds can page repeatedly for the same certificate. The usual failure pattern is a 30-day warning that remains active after a separate 7-day critical alert starts. Alertmanager then receives two alerts per endpoint, and every replica, SAN, and monitoring location can multiply the noise.

Design the alerts as a state machine:

```text
healthy -> warning window -> critical window -> expired
```

Only one expiry severity should be active for an endpoint at a time. Connectivity and validation failure remain separate states because an expiry metric may disappear when the TLS probe fails.

## Start with a Seconds-Remaining Recording Rule

The Prometheus blackbox exporter exposes `probe_ssl_earliest_cert_expiry` as a Unix timestamp for the earliest expiry in the presented peer certificate chain. Convert it once:

```yaml
groups:
  - name: tls-certificate-recording
    interval: 1m
    rules:
      - record: tls_certificate_seconds_remaining
        expr: probe_ssl_earliest_cert_expiry - time()
```

This preserves the source labels such as `instance`, `job`, region, and vantage point. The earliest chain expiry can belong to an intermediate presented by the server, not necessarily the leaf. That is useful because an expiring served intermediate can also break clients, but dashboards should make the distinction clear when they separately inventory the leaf.

Choose thresholds from the real remediation path. A reasonable starting policy might be:

- warning below 30 days, routed to the owning team's ticket or chat channel;
- critical below 7 days, routed to on-call;
- repeat warnings daily and critical notifications more frequently;
- create a distinct alert when the endpoint cannot be probed.

Short-lived certificates may need thresholds expressed as a percentage of their lifetime or tighter windows. Do not copy a 30/7-day policy blindly onto certificates valid for only a few days.

## Make Warning and Critical Mutually Exclusive

```yaml
groups:
  - name: tls-certificate-alerts
    rules:
      - alert: TLSCertificateExpiryWarning
        expr: |
          (tls_certificate_seconds_remaining < 30 * 24 * 60 * 60)
          and
          (tls_certificate_seconds_remaining >= 7 * 24 * 60 * 60)
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "TLS certificate chain expires within 30 days"
          description: "{{ $labels.instance }} has {{ $value | humanizeDuration }} remaining."
          runbook_url: "https://runbooks.example.com/tls-certificate-expiry"

      - alert: TLSCertificateExpiryCritical
        expr: tls_certificate_seconds_remaining < 7 * 24 * 60 * 60
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "TLS certificate chain expires within 7 days"
          description: "{{ $labels.instance }} has {{ $value | humanizeDuration }} remaining."
          runbook_url: "https://runbooks.example.com/tls-certificate-expiry"

      - alert: TLSProbeFailed
        expr: probe_success{job="blackbox-https"} == 0
        for: 10m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "TLS endpoint probe failed"
          description: "{{ $labels.instance }} cannot be validated from {{ $labels.vantage }}."
```

At exactly seven days, the warning remains active and the critical comparison is false; at the next value below seven days, warning stops and critical begins immediately. The critical rule deliberately has no `for`, avoiding a pending-state gap during escalation. If policy requires “seven days or less” to be critical, use `<=` for critical and `>` for the warning's lower bound.

A negative seconds-remaining value keeps the critical alert active after expiry. That is normally desirable. The runbook should distinguish expired from near expiry in its first diagnostic step.

## Use `for` for Data Stability, Not Procrastination

Prometheus's `for` clause requires the expression to remain active before firing. It can stop one anomalous observation from creating a warning, but it does not preserve an already firing alert when the series disappears. A missing evaluation resets a pending alert and normally resolves a firing alert unless `keep_firing_for` is configured.

Expiry normally decreases monotonically, so delaying the critical tier adds little value and creates an escalation gap after the mutually exclusive warning ends. Let the critical tier fire immediately, then use Alertmanager's `group_wait` to absorb near-simultaneous related alerts. Apply `for` to genuinely noisy probe-failure or rollout signals according to their failure budget.

Do not use a multi-day `for` to simulate a second threshold. A rule edit or a Prometheus restart can reset pending state, and the alert annotation still describes the wrong boundary. Put calendar policy in the expression and use `for` only for stability.

`keep_firing_for` can prevent false resolutions when data momentarily disappears, but use it carefully on expiry alerts. A separate `TLSProbeFailed` rule is still required, and a long keep-firing period can delay the visible resolution after a successful rotation.

## Group and Repeat Deliberately in Alertmanager

Alertmanager deduplicates alerts with the same label set and can group related endpoint alerts into one notification:

```yaml
route:
  receiver: team-notifications
  group_by: [alertname, team]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 24h
  routes:
    - receiver: platform-oncall
      matchers:
        - severity="critical"
      repeat_interval: 2h
```

Grouping by `instance` creates one notification per endpoint. Leaving `instance` out groups a fleet's expiring certificates by alert name and team, while the notification template can list every affected instance. Select the behavior the receiver can act on.

`group_wait` allows related alerts to arrive before the first notification. `group_interval` governs updates to an existing group. `repeat_interval` governs reminders when nothing changed and should be a multiple of `group_interval`.

Add inhibition as defense in depth if warning and critical rules might overlap during a migration:

```yaml
inhibit_rules:
  - source_matchers:
      - severity="critical"
    target_matchers:
      - severity="warning"
    equal: [job, instance]
```

Make sure every label in `equal` exists on both alerts. In Alertmanager, a missing label and an empty label are equivalent; careless inhibition can suppress unrelated alerts.

## Control Label Cardinality and Duplicate Coverage

The same certificate can be observed through several DNS names, IP families, regions, and probe locations. Decide whether those are independent failure domains.

- Keep `vantage` and `ip_family` when they identify a path that can fail independently.
- Add a stable `certificate_owner` or `service` label for routing.
- Add a `certificate_group` label when many endpoints intentionally share one managed certificate and should produce one work item.
- Do not put a changing days-remaining value or full certificate PEM in labels.
- Avoid monitoring every SAN as a separate target unless each hostname is independently served and operationally owned.

Prometheus alert identity is its complete label set. Changing routing labels while an alert fires can look like a resolution plus a new alert, so keep identity labels stable.

## Cover Missing Data Explicitly

An expiry rule returns nothing when the exporter, scrape target, DNS lookup, or TLS handshake fails. Add alerts for:

- `probe_success == 0`;
- missing `probe_success` for an expected target;
- Prometheus scrape failure for the blackbox exporter;
- inventory entries that no longer have any monitor series.

The expected-target inventory is important. `absent(probe_success{instance="..."})` works for a fixed endpoint, but fleet-wide absence requires comparing observed targets with a separate inventory; one healthy target makes a broad selector nonempty.

## Test the Notification Lifecycle

Before relying on the policy, test these cases in a staging rule group:

1. warning threshold crossed;
2. critical threshold crossed and warning resolves;
3. certificate rotates and both severities resolve;
4. probe fails while expiry was firing;
5. many shared-certificate endpoints fire together;
6. Alertmanager restarts and retains notification state as designed;
7. a silence covers planned work but does not outlive its maintenance window.

Use `promtool check rules` and `amtool check-config` where available to check syntax. This is distinct from application-specific blog validation.

## Official Documentation

- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Alertmanager concepts](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Prometheus template reference](https://prometheus.io/docs/prometheus/latest/configuration/template_reference/)
- [Prometheus blackbox exporter TLS metrics source](https://github.com/prometheus/blackbox_exporter/blob/master/prober/prober.go)

## Conclusion

Good expiry alerting produces one actionable state, not overlapping reminders. Convert expiry to seconds remaining, use non-overlapping warning and critical windows, keep probe failures separate, and let Alertmanager group, inhibit, and repeat according to urgency. The result gives teams early notice without training them to ignore certificate alerts.
