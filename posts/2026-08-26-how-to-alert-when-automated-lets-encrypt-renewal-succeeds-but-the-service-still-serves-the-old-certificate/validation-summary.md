# Validation Summary: How to Alert When Automated Let’s Encrypt Renewal Succeeds but the Service Still Serves the Old Certificate

## Status
validated

## Post Type
Technical monitoring and troubleshooting guide

## Technologies Covered
- Let’s Encrypt and ACME Renewal Information (ARI)
- Certbot renewal and deploy hooks
- Nginx and systemd service reloads
- Bash shell scripting
- OpenSSL, X.509 certificates, TLS, SNI, and hostname verification
- Prometheus, PromQL, and alerting rules
- Prometheus blackbox exporter HTTP probes
- Prometheus node exporter textfile collector
- DNS, CDNs, load balancers, containers, and multi-node certificate deployment

## Sources Consulted
- Certbot User Guide: renewal, exit status, deploy hooks, hook environment variables, and dry-run behavior - https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates
- Certbot User Guide: certificate file layout and `fullchain.pem` ordering - https://eff-certbot.readthedocs.io/en/stable/using.html#where-are-my-certificates
- Certbot 5.7.0 changelog: ARI support and early renewal behavior - https://raw.githubusercontent.com/certbot/certbot/v5.7.0/certbot/CHANGELOG.md
- Certbot 5.7.0 renewal decision implementation - https://raw.githubusercontent.com/certbot/certbot/v5.7.0/certbot/src/certbot/_internal/renewal.py
- Let’s Encrypt rate limits and ARI renewal exemptions - https://letsencrypt.org/docs/rate-limits/
- Nginx command-line parameters and configuration testing - https://nginx.org/en/docs/switches.html
- Nginx reload behavior - https://nginx.org/en/docs/control.html
- GNU Bash manual: pipeline status and `pipefail` - https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- OpenSSL 3.6 `s_client` documentation - https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenSSL 3.6 `x509` documentation - https://docs.openssl.org/3.6/man1/openssl-x509/
- OpenSSL certificate verification options - https://docs.openssl.org/3.6/man1/openssl-verification-options/
- RFC 5280, Section 4.1.2.2: certificate serial-number uniqueness - https://www.rfc-editor.org/rfc/rfc5280.html#section-4.1.2.2
- Prometheus blackbox exporter 0.28.0 HTTP probe TLS metric source - https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go
- Prometheus blackbox exporter 0.28.0 fingerprint implementation - https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go
- Prometheus logical/set operators and vector matching - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting-rule syntax and `for` semantics - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus text exposition format and label escaping - https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus node exporter textfile collector - https://github.com/prometheus/node_exporter/blob/v1.12.1/README.md#textfile-collector

## Issues Found
- The post described `certbot renew` as acting only on certificates near expiry. Current Certbot can consider a certificate due based on ARI, including CA-requested early renewal. Changed the wording from “near expiry” to “Certbot considers due for renewal.”
- The fingerprint pipelines did not enable Bash `pipefail`, so a failed `openssl s_client` or `openssl x509` command could be hidden by successful `sed` or `tr` commands. The three independent `test` commands could also leave a successful final status when both fingerprints were empty. Added `set -euo pipefail`, required both parsed values to match the 64-character lowercase SHA-256 format, and made the validation predicates one `&&` chain so command, parsing, empty-value, and mismatch failures cannot be reported as a match.
- The blackbox exporter sample used a literal `...` inside a label set, which is useful shorthand but is not valid Prometheus exposition syntax. Replaced it with the metric’s actual current label names and quoted placeholder values.
- The textfile collector advice did not state that the temporary filename must avoid the `.prom` suffix. Node exporter scans every `*.prom` file, so a suffix-matching temporary file can still be scraped while it is being written. Clarified that the temporary name must not end in `.prom` before the atomic rename to the final `.prom` file.
- The original `unless` expression returned the served certificate whenever expected state was missing, causing the old-certificate alert to claim a mismatch without evidence of the expected fingerprint. Added an `and on (endpoint_id)` presence gate in both PromQL examples and clarified that missing expected state requires its own alert.

## Review Notes
The remaining Certbot hook, environment-variable, exit-status, dry-run, and certificate-layout claims match Certbot 5.7.0 documentation. The blackbox exporter metric and lowercase, colon-free SHA-256 label format were verified in release 0.28.0. The expected-set rollout logic remains valid because Prometheus set operators match all eligible series. `systemctl reload nginx` depends on the host’s service unit, which the post already addresses by telling readers to use the service’s documented command. For production probes, retain a bounded external timeout; when pinning a raw IPv6 address with `openssl s_client`, enclose it in brackets in `-connect` while keeping the DNS name in `-servername` and `-verify_hostname`.
