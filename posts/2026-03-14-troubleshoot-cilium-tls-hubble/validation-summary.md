# Validation Summary: How to Troubleshoot Cilium TLS with Hubble Configuration

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- cert-manager
- Prometheus Operator
- OpenSSL

## Sources Consulted
- Cilium documentation: Configure TLS with Hubble - https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium documentation: Helm Reference - https://docs.cilium.io/en/stable/helm-reference/
- Cilium documentation: Setting up Hubble Observability - https://docs.cilium.io/en/stable/observability/hubble/setup/
- cert-manager documentation: Prometheus Metrics - https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Local OpenSSL `x509 -help` output for certificate inspection flags.

## Issues Found
- The relay-to-agent connectivity test used `wget` against `https://$AGENT_POD_IP:4244`. Hubble on port 4244 is a TLS-secured gRPC endpoint requiring mTLS and the correct Hubble server name, so `wget` without the relay client certificate is not a valid positive connectivity test. Replaced it with the Cilium-documented `hubble-cli` and `openssl s_client` flow using the relay client certificate, key, CA file, peer IP, and `TLS.ServerName`.
- The post said restarted pods were needed to pick up regenerated certificates. Cilium documents that Hubble server and Hubble Relay hot reload TLS certificates, including CA certificates. Updated the text to say restart is only a fallback if new connections still fail.
- The troubleshooting note said SANs may not cover agent pod IPs. Cilium documents that the Hubble server certificate CN/SAN must match `*.{cluster-name}.hubble-grpc.cilium.io`, and relay uses peer `TLS.ServerName` values. Updated the note to focus on DNS SAN/server-name matching instead of pod IP coverage.

## Review Notes
- The core secret names, Helm values for `hubble.tls.auto.method`, cert-manager issuer settings, Hubble mTLS behavior, and OpenSSL certificate inspection commands match the current Cilium documentation.
- `kubectl` and `helm` binaries were not installed in the local review environment, so their command forms were checked against official documentation rather than local `--help` output.
