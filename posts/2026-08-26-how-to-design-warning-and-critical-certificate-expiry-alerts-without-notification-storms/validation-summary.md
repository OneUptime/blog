# Validation Summary: How to Design Certificate Expiry Alerts Without Notification Storms

## Status
validated

## Post Type
Technical guide / configuration guide

## Technologies Covered
- TLS and X.509 certificate expiry monitoring
- Prometheus recording rules and alerting rules
- PromQL arithmetic, comparison, set operations, `time()`, and `absent()`
- Prometheus blackbox exporter
- Alertmanager routing, grouping, deduplication, inhibition, and notification timing
- Prometheus alert templates
- `promtool` and `amtool`

## Sources Consulted
- Prometheus alerting rules — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules — https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- PromQL operators — https://prometheus.io/docs/prometheus/latest/querying/operators/
- PromQL functions (`time()` and `absent()`) — https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus template reference (`$labels`, `$value`, and `humanizeDuration`) — https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus command-line flags (`for`-state outage tolerance and grace period) — https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus `promtool` command reference — https://github.com/prometheus/prometheus/blob/main/docs/command-line/promtool.md
- Prometheus rule reload and `for`-state restoration source — https://github.com/prometheus/prometheus/blob/main/rules/group.go and https://github.com/prometheus/prometheus/blob/main/rules/manager.go
- Alertmanager concepts — https://prometheus.io/docs/alerting/latest/alertmanager/
- Alertmanager configuration, route timers, inhibition semantics, and `amtool` verification — https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager high-availability persistence behavior — https://prometheus.io/docs/alerting/latest/high_availability/
- Blackbox exporter TLS metric definition and calculation — https://github.com/prometheus/blackbox_exporter/blob/master/prober/prober.go and https://github.com/prometheus/blackbox_exporter/blob/master/prober/tls.go
- Blackbox exporter HTTP probe metric emission — https://github.com/prometheus/blackbox_exporter/blob/master/prober/http.go
- Blackbox exporter TLS configuration defaults — https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Go `crypto/tls` connection-state documentation — https://pkg.go.dev/crypto/tls#ConnectionState

## Issues Found
1. **The expiry and failure rules covered different job scopes.** The recording rule selected `probe_ssl_earliest_cert_expiry` from every job, while `TLSProbeFailed` covered only `job="blackbox-https"`. Scoped the recording expression to `{job="blackbox-https"}` so every expiry series in the example has the corresponding probe-failure coverage.
2. **Post-expiry behavior was stated unconditionally.** With normal certificate verification, an expired certificate can fail the TLS handshake, causing the expiry metric to disappear rather than become negative. Clarified that a negative value keeps the critical alert active only while the metric remains available, and that `TLSProbeFailed` becomes actionable when validation removes the metric.
3. **The phrase “missing evaluation” could incorrectly imply that a failed or skipped rule evaluation resets alert state.** Clarified that reset or resolution occurs when a successful evaluation no longer returns the series.
4. **The description of pending-state loss across edits and restarts was overbroad for current Prometheus.** Ordinary matching rule reloads copy alert state, and Prometheus attempts to restore `for` state after a restart. Replaced the claim with the accurate caveats: alert name or label changes can reset identity, and restart restoration is bounded by `--rules.alert.for-outage-tolerance` and availability of the stored prior state.
5. **The grouping description overstated the effect of adding `instance`.** Alertmanager groups by the complete configured `group_by` key, so an endpoint can still have separate groups for other grouped labels. Updated the wording to describe separate groups per endpoint and per other grouped labels.
6. **The inhibition example was too broad.** Matching only `severity="critical"` and `severity="warning"` could let `TLSProbeFailed` or any unrelated critical alert inhibit any warning with the same `job` and `instance`. Added source and target `alertname` matchers so only `TLSCertificateExpiryCritical` inhibits `TLSCertificateExpiryWarning`.
7. **The `certificate_group` advice did not state how the label produces one work item.** A shared label does not itself deduplicate notifications. Clarified that the stable label must be used by Alertmanager grouping or downstream ticket deduplication.
8. **The CLI examples omitted their input files.** Added rule and Alertmanager configuration paths so `promtool check rules` and interactive `amtool check-config` invocations are directly runnable.

## Review Notes
- Both Prometheus rule snippets passed `promtool check rules` using Prometheus 3.12.0: the recording block produced one valid rule, and the alerting block produced three valid rules.
- The Alertmanager route and inhibition fragments, combined with minimal definitions for the two referenced receivers, passed `amtool check-config` using Alertmanager 0.33.1 in both default and UTF-8 strict matcher modes.
- The threshold expressions are mutually exclusive as described, preserve seconds remaining as `$value`, and handle the exact seven-day boundary correctly.
- `probe_ssl_earliest_cert_expiry` is calculated from the earliest `NotAfter` value among the presented peer certificates, so the earliest certificate can be a served intermediate rather than the leaf.
- `humanizeDuration`, `keep_firing_for`, timer inheritance, the `repeat_interval` multiple guidance, missing/empty-label inhibition semantics, and the fixed-target versus fleet-wide `absent()` explanation are current and accurate.
- The Alertmanager route shown is intentionally a fragment; a complete configuration must define receivers named `team-notifications` and `platform-oncall`.
