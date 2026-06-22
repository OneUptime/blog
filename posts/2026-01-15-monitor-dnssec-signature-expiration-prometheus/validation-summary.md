# Validation Summary: How to Monitor DNSSEC Signature Expiration with Prometheus

## Status
validated

## Post Type
Tutorial / Guide (hands-on, with exporters, config, PromQL, alerting, and deployment manifests)

## Technologies Covered
- DNSSEC (RRSIG records, signature inception/expiration, validation, SERVFAIL behavior)
- Prometheus (scrape config, recording rules, alerting rules, PromQL)
- `prometheus-dnssec-exporter` (chrj) — purpose-built DNSSEC exporter
- `dns_exporter` (tykling) — generic multi-target DNS exporter
- Custom Python exporter using `dnspython` and `prometheus-client`
- Alertmanager (routing, PagerDuty/Slack/OneUptime receivers)
- Grafana (dashboard JSON)
- Docker / Docker Compose, Kubernetes (Deployment, Service, ConfigMap, ServiceMonitor)
- `dig` / `delv` troubleshooting commands

## Sources Consulted
- chrj/prometheus-dnssec-exporter — README, flags, metrics, config: https://github.com/chrj/prometheus-dnssec-exporter
- chrj/prometheus-dnssec-exporter — sample TOML config: https://raw.githubusercontent.com/chrj/prometheus-dnssec-exporter/master/config.sample
- tykling/dns_exporter — repo: https://github.com/tykling/dns_exporter
- dns_exporter docs — Quick Start (default port 15353, install, scrape config): https://dns-exporter.readthedocs.io/latest/quickstart.html
- dns_exporter docs — Configuration reference (module fields, validate_* options): https://dns-exporter.readthedocs.io/latest/configuration.html
- dns_exporter — example config (modules, edns_do, validate_response_flags): https://raw.githubusercontent.com/tykling/dns_exporter/main/src/dns_exporter/dns_exporter_example.yml
- dnspython docs — Resolver / RRSIG rdata / use_edns (verified `find_rrset`, `rrsig.expiration/inception`, `dns.flags.DO/AD`): https://dnspython.readthedocs.io/
- Prometheus docs — scrape/relabel/recording/alerting templating: https://prometheus.io/docs/

## Issues Found

1. **Option 1 referenced a non-existent exporter and a fabricated download URL.** The post described a `prometheus-community/dnssec_exporter` and a `wget` of `https://github.com/prometheus-community/dnssec_exporter/releases/download/v1.0.0/...`. No such repository or release exists (it 404s). The real purpose-built DNSSEC exporter is **chrj/prometheus-dnssec-exporter**. Rewrote the section to reference the correct repo and install it with `go install github.com/chrj/prometheus-dnssec-exporter@latest`.

2. **Option 1 config format was wrong.** The post showed a YAML `zones:`/`nameservers:`/`record_types:` config with a `settings:` block. The real exporter uses a **TOML** file (default `/etc/dnssec-checks`) made of `[[records]]` blocks (`zone`, `record`, `type`); resolvers/listen-address/timeout are passed as CLI flags, not in the file. Replaced the YAML with an accurate TOML example and clarified flag usage.

3. **Option 1 systemd flags were invented.** `--config.file`, `--web.listen-address`, and `--web.telemetry-path` are not flags of this exporter. Corrected to the real single-dash flags `-config`, `-listen-address`, `-resolvers`, `-timeout`, fixed the binary name, and pointed `Documentation=` at the correct repo. Also corrected the "Start the Exporter" steps (the config is a file, not a directory).

4. **Option 1 metrics table was fabricated.** The eight listed metrics (`dnssec_rrsig_expiration_timestamp`, etc.) are not what this exporter emits. Replaced with the exporter's actual three metrics: `dnssec_zone_record_days_left`, `dnssec_zone_record_earliest_rrsig_expiry`, `dnssec_zone_record_resolves` (with correct labels). Added a note that the post's PromQL/alerts/dashboards are written against the **custom Python exporter** (Option 3) metric names and must be adapted if using this exporter.

5. **Option 2 named the wrong project, image, and port.** The post used `prometheuscommunity/dns-exporter:latest` on port `9153`. The real project is **tykling/dns_exporter** (Docker image `tykling/dns_exporter:latest`, PyPI `dns_exporter`), default port **15353** (9153 is CoreDNS's metrics port). Corrected image, port, and the `-c` config flag.

6. **Option 2 config used Blackbox-exporter syntax, not dns_exporter syntax.** The post's `prober: dns` / `dns:` / `preferred_ip_protocol` / `valid_rcodes` / `validate: true` block is Blackbox-style and is not valid for dns_exporter. Rewrote modules using the real schema: `query_type`, `recursion_desired`, `edns_do: true` (sets the EDNS0 DO flag), and `validate_response_flags: { fail_if_any_absent: ["AD"] }` to require the Authenticated Data flag.

7. **Prometheus multi-target scrape job did not match dns_exporter.** It used `metrics_path: /probe`, `module: [dnssec_check]`, `__param_target`, and port 9204. dns_exporter exposes `/query`, the per-scrape domain is passed via `query_name`, and it listens on 15353. Updated path to `/query`, module to `dnssec_a`, added a `server` param, relabeled targets to `__param_query_name`, and fixed the address to `localhost:15353`.

## Review Notes
- The custom Python exporter (Option 3) is technically sound: `dns.resolver.Resolver.use_edns(edns=0, ednsflags=dns.flags.DO, payload=4096)`, `response.find_rrset(..., RRSIG, covers=rdtype)`, and the `rrsig.expiration` / `rrsig.inception` Unix-timestamp fields are all correct dnspython usage. The `dns.flags`, `dns.name`, and `dns.rdataclass` submodules are referenced without explicit `import` lines but are pulled in transitively by `import dns.resolver`, so it runs — adding explicit imports would make it more robust against future dnspython changes.
- `datetime.utcfromtimestamp()` / `datetime.utcnow()` are deprecated as of Python 3.12 (still functional). A future update could switch to timezone-aware `datetime.now(timezone.utc)`.
- After fixing Option 1 to TOML, the only inline example of the custom exporter's own YAML config (`zones:` / `settings.nameserver`) now lives in the Kubernetes ConfigMap section, which still demonstrates the format the Python `load_config` expects — so Option 3 remains followable, but an inline YAML example near Option 3 would improve clarity.
- Docker image tags used elsewhere (`prom/prometheus:v2.47.0`, `prom/alertmanager:v0.26.0`, `grafana/grafana:10.1.0`) are real, valid versions. `version: '3.8'` in Compose is obsolete but still works.
- PromQL functions used (`deriv`, `predict_linear`, `bottomk`, `sort_desc`) and Alertmanager templating (`humanizeDuration`) are valid. OneUptime webhook URLs/tokens are illustrative placeholders, left as-is.
