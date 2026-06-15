# Validation Summary: How to Implement Blackbox Monitoring with Prometheus

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus
- Prometheus Blackbox Exporter
- Prometheus scrape configuration and relabeling
- PromQL alerting rules
- Docker
- Kubernetes Helm charts
- HTTP, TCP, ICMP, DNS, and TLS probes

## Sources Consulted
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter/blob/master/README.md
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter example configuration: https://github.com/prometheus/blackbox_exporter/blob/master/example.yml
- Prometheus Blackbox Exporter source metrics definitions: https://github.com/prometheus/blackbox_exporter
- Prometheus scrape configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Community Helm chart for prometheus-blackbox-exporter: https://artifacthub.io/packages/helm/prometheus-community/prometheus-blackbox-exporter

## Issues Found
- The metrics example used `probe_http_ssl_earliest_cert_expiry`, which is not a current Blackbox Exporter metric. Changed it to `probe_ssl_earliest_cert_expiry`, matching the exporter metric definition and the alerting examples later in the post.
- The SSL certificate warning alert divided the remaining certificate lifetime by `86400` while the annotation used `humanizeDuration`. Prometheus `humanizeDuration` expects seconds, so the annotation would display a days value as seconds. Changed the expression to keep the alert value in seconds.
- The SSL certificate warning alert also matched already expired certificates because negative remaining lifetime is still less than 30 days. Added a lower bound so `SSLCertificateExpiringSoon` applies only to certificates that have not yet expired, leaving expired certificates to the separate critical alert.

## Review Notes
The Docker, Helm, Blackbox Exporter module, Prometheus relabeling, and metric examples are otherwise consistent with current official documentation. ICMP probes can require raw socket privileges or `CAP_NET_RAW` depending on the runtime environment; the post's ICMP configuration is valid, but production deployment docs may need to call out that operational requirement.
