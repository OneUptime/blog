# How to Alert on probe_ssl_earliest_cert_expiry with Prometheus Blackbox Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Blackbox Exporter, SSL Monitoring, TLS, Certificate Expiry, Alerting

Description: Configure strict TLS probes and reliable warning, critical, and probe-failure alerts from Blackbox Exporter's certificate-expiry timestamp.

---

Blackbox Exporter exposes `probe_ssl_earliest_cert_expiry` as a Unix timestamp in seconds. Its implementation takes the earliest nonzero `notAfter` among the certificates sent by the peer in the TLS handshake. Subtract Prometheus `time()` to turn that fixed timestamp into remaining lifetime.

An expiry rule is only one part of the monitor. An expired, untrusted, or hostname-mismatched certificate can make the handshake fail, in which case the expiry series may be absent. Always alert on probe failure too.

## Build a Certificate-Focused TLS Module

A TCP TLS probe avoids coupling certificate health to an HTTP status code:

```yaml
modules:
  tls_certificate:
    prober: tcp
    timeout: 10s
    tcp:
      tls: true
      tls_config:
        insecure_skip_verify: false
        min_version: TLS12
```

Use hostname targets so Blackbox Exporter can send that hostname as SNI and verify it against the certificate:

```yaml
scrape_configs:
  - job_name: blackbox-tls-certificate
    metrics_path: /probe
    params:
      module: [tls_certificate]
    scrape_interval: 5m
    scrape_timeout: 15s
    static_configs:
      - targets:
          - api.example.com:443
          - login.example.com:443
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc:9115
```

If you target an IP address, configure an explicit `tls_config.server_name` in a dedicated module. Otherwise the probe can receive a default virtual-host certificate or try to verify an IP identity.

Inspect one probe before adding rules:

```bash
curl --silent --show-error --get \
  --data-urlencode 'module=tls_certificate' \
  --data-urlencode 'target=api.example.com:443' \
  http://localhost:9115/probe |
sed -n '/^probe_success\|^probe_ssl_earliest_cert_expiry/p'
```

Expect `probe_success 1` and an expiry value around the current Unix epoch. A value such as `1789000000` is a timestamp, not seconds remaining.

## Record Remaining Lifetime

A recording rule makes dashboards and alerts readable:

```yaml
groups:
  - name: tls-certificate-recording
    interval: 1m
    rules:
      - record: probe_ssl_earliest_cert_expiry_seconds_remaining
        expr: probe_ssl_earliest_cert_expiry - time()
```

For a dashboard in days:

```promql
probe_ssl_earliest_cert_expiry_seconds_remaining / 86400
```

There is no need for `predict_linear()`. Certificate `notAfter` is already a fixed deadline, and subtracting the current time produces the exact linear countdown.

## Add Non-Overlapping Warning and Critical Alerts

Use thresholds that match renewal lead time rather than copying a universal number. This example warns inside 30 days and becomes critical inside 7 days:

```yaml
groups:
  - name: tls-certificate-alerts
    interval: 1m
    rules:
      - alert: TLSCertificateExpiresSoon
        expr: |
          probe_ssl_earliest_cert_expiry_seconds_remaining < 30 * 24 * 60 * 60
          and
          probe_ssl_earliest_cert_expiry_seconds_remaining >= 7 * 24 * 60 * 60
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "TLS certificate chain expires soon for {{ $labels.instance }}"
          description: "The earliest certificate sent by the peer expires in {{ $value | humanizeDuration }}."

      - alert: TLSCertificateExpiresCritical
        expr: probe_ssl_earliest_cert_expiry_seconds_remaining < 7 * 24 * 60 * 60
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "TLS certificate chain is near expiry for {{ $labels.instance }}"
          description: "The earliest certificate sent by the peer expires in {{ $value | humanizeDuration }}."
```

The warning range excludes the critical range, so both alerts do not fire for the same target. Another valid design is overlapping rules plus Alertmanager inhibition, but make that relationship explicit.

`for` filters brief changes caused by a partial load-balancer rollout. It must still be short relative to the critical response window. A 24-hour `for` on a 7-day threshold needlessly consumes remediation time.

## Alert When No Valid Certificate Can Be Measured

Add probe and scrape alerts:

```yaml
      - alert: TLSCertificateProbeFailed
        expr: probe_success{job="blackbox-tls-certificate"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "TLS certificate probe failed for {{ $labels.instance }}"
          description: "Check SNI, DNS, reachability, hostname validation, trust chain, and certificate validity."

      - alert: BlackboxCertificateScrapeFailed
        expr: up{job="blackbox-tls-certificate"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Prometheus cannot scrape the Blackbox probe for {{ $labels.instance }}"
```

`probe_success` describes the target probe. Prometheus `up` describes whether Prometheus successfully scraped the exporter endpoint. They answer different questions.

If a target is deleted from service discovery, all of its series disappear and neither per-target expression can identify the removed target. Reconcile service discovery against a separate, owner-reviewed certificate inventory.

## Understand What “Earliest” Means

The gauge iterates over `tls.ConnectionState.PeerCertificates`: the exact list sent by the peer, with the leaf first. Therefore:

- an intermediate that expires before the leaf correctly advances the alert;
- a server that omits an intermediate may not expose that intermediate's expiry, but strict verification should set `probe_success` to `0`;
- a superfluous certificate sent by a misconfigured server can make the gauge conservative even if a client builds another valid path; and
- the trust anchor normally is not sent, so monitor private and public root lifetimes from the CA inventory as well.

Current Blackbox Exporter also exposes `probe_ssl_last_chain_expiry_timestamp_seconds`, derived from verified chains, but it has different path-selection semantics. Do not silently exchange the two metrics in existing alerts. Investigate the served chain with `openssl s_client -showcerts` when they disagree.

## Validate the Alert Path

Test three controlled cases before relying on notification delivery:

1. A valid certificate inside the warning threshold.
2. A hostname mismatch or untrusted chain, which should trigger `TLSCertificateProbeFailed`.
3. A stopped or unreachable exporter, which should trigger the `up` alert.

Run `promtool check rules` against the rule file in your own validation workflow, then use Prometheus's Rules page to confirm pending and firing states. Also route warning and critical labels through Alertmanager and verify that the intended team, runbook, and deduplication keys survive.

## Official Documentation

- [Blackbox Exporter metric declaration](https://github.com/prometheus/blackbox_exporter/blob/master/prober/prober.go)
- [Blackbox Exporter earliest-expiry calculation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/tls.go)
- [Blackbox Exporter configuration reference](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus `time()` and query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Conclusion

Alert on `probe_ssl_earliest_cert_expiry - time()` with explicit warning and critical windows, but treat expiry and availability as separate signals. Keep TLS verification enabled, use hostname targets for SNI, and alert on both `probe_success` and `up` so a broken handshake cannot hide behind a missing expiry series.
