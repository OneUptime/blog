# Validation Summary: How to Configure Loki TLS Encryption

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- TLS and mutual TLS (mTLS)
- OpenSSL
- Docker Compose
- Promtail
- Grafana data source provisioning
- Fluent Bit
- Vector
- cert-manager
- Loki Helm chart

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki 2.9 configuration reference: https://grafana.com/docs/loki/v2.9.x/configure/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Promtail 2.9 configuration reference: https://grafana.com/docs/loki/v2.9.x/send-data/promtail/configuration/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Loki Fluent Bit output plugin documentation: https://grafana.com/docs/loki/latest/send-data/fluentbit/fluent-bit-plugin/
- Fluent Bit TLS documentation: https://docs.fluentbit.io/manual/administration/transport-security
- Vector Loki sink documentation: https://vector.dev/docs/reference/configuration/sinks/loki/
- Loki Helm chart values reference: https://grafana.com/docs/loki/latest/setup/install/helm/reference/
- Grafana Loki releases: https://github.com/grafana/loki/releases
- Local OpenSSL 3.0.13 command verification
- Local Loki 3.7.2 `-verify-config` verification

## Issues Found
- The prerequisites said Loki 2.4 or later, but the sample configuration uses TSDB schema v13. Updated the prerequisite to Loki 3.x for the shown v13 examples.
- Promtail is now end of life as of March 2, 2026. Added a note that Promtail snippets are legacy and that new deployments should use Grafana Alloy or another supported client.
- The CA generation command did not explicitly mark the certificate as a CA certificate. Added `-addext` options that generate a CA certificate with CA basic constraints and signing key usage.
- The generated server certificate lacked explicit `serverAuth` extended key usage and used unnecessary key usages. Added appropriate key usage and extended key usage fields.
- The generated client certificates lacked explicit `clientAuth` extended key usage. Added client certificate extension generation and signing with that extension file.
- The Loki filesystem storage snippet used older `common.storage.filesystem` fields. Updated it to the current `storage_config.filesystem.directory` form used by Loki's official filesystem example.
- The Docker Compose example used an old Loki 2.9.4 image while the config uses Loki 3.x schema v13. Updated Loki to `grafana/loki:3.7.2`.
- Distributed and Helm mTLS snippets set `client_ca_file` without requiring and verifying client certificates. Added `client_auth_type: RequireAndVerifyClientCert`.
- The Helm values snippet used top-level `extraVolumes` and `extraVolumeMounts`, which are not the current Loki chart keys for a single-binary deployment. Moved them under `singleBinary`.
- The certificate rotation script generated a replacement server certificate without SANs, which breaks modern hostname validation. Added a SAN extension file to the rotation flow.

## Review Notes
The basic Loki TLS configuration was verified with `grafana/loki:3.7.2 -verify-config`. The OpenSSL CA, server certificate, and client certificate commands were executed locally and verified successfully with `openssl verify`.
