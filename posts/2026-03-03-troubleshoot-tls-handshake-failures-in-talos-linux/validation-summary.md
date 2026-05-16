# Validation Summary: How to Troubleshoot TLS Handshake Failures in Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- TLS and mutual TLS
- X.509 certificates and certificate authorities
- Kubernetes API endpoint configuration
- YAML machine configuration
- OpenSSL

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/timesyncconfig
- Talos Linux insecure flag documentation: https://www.talos.dev/v1.10/talos-guides/configuration/insecure/
- Talos Linux network connectivity documentation: https://www.talos.dev/v1.10/learn-more/talos-network-connectivity/
- Talos Linux certificate management documentation: https://docs.siderolabs.com/talos/v1.9/security/cert-management
- Talos Linux CA rotation documentation: https://docs.siderolabs.com/talos/v1.10/security/ca-rotation

## Issues Found
- The post used `talosctl services`, but the current CLI command is `talosctl service`. Updated the example command.
- The post showed `talosctl gen config` as regenerating a talosconfig from existing cluster secrets without passing a secrets file. Added `--with-secrets secrets.yaml` so the command matches the stated intent.
- The NTP example used the older `machine.time.servers` shape. Updated it to the current `TimeSyncConfig` document with `ntp.servers`.
- The post recommended `apply-config --insecure` as the normal fix for clock skew when TLS credentials fail. Updated the guidance to use normal authenticated `apply-config`, with `--insecure` only when the node is still in maintenance mode.
- The Talos API SAN fix used `cluster.apiServer.certSANs`, which configures Kubernetes API server certificate SANs, not the Talos API server certificate SANs. Updated the snippet to `machine.certSANs`.
- The recovery section described `--insecure` as a general certificate verification bypass and used `talosctl disks --insecure`. Updated it to explain that `--insecure` is limited to maintenance/initial setup operations and replaced the unsupported disk command example with `talosctl get rd --insecure`.

## Review Notes
The post is now technically accurate for current Talos documentation. A future improvement would be to add a dedicated example for renewing an expired client talosconfig with `talosctl config new`, but the existing guidance is sufficient for this troubleshooting overview.
