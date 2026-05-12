# Validation Summary: How to Set Up TLS on the Hubble API in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble (peer service, Relay, UI)
- Kubernetes
- Helm
- cert-manager
- OpenSSL (manual cert generation)
- gRPC / TLS

## Sources Consulted
- Cilium official Hubble TLS docs: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium Hubble setup docs: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Helm chart values: https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/values.yaml
- Cilium agent ConfigMap template: https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/templates/cilium-configmap.yaml
- Hubble CLI source (flags definition): cilium/cilium hubble/cmd/common/config/flags.go

## Issues Found
1. **Incorrect Hubble CLI TLS CA flag.** The post used `--tls-ca-cert ca.crt`, but the actual flag exposed by the Hubble CLI is `--tls-ca-cert-files` (plural — it accepts a list of CA cert files). Fixed the command in the "Validate TLS is Active" section to `hubble --tls --tls-ca-cert-files ca.crt status`.
2. **Non-existent `--tls` flag on `cilium hubble port-forward`.** The `cilium hubble port-forward` command in the cilium-cli does not accept a `--tls` flag — TLS handling is configured at the Hubble client (CLI) layer, not at the port-forward command. Removed the `--tls` flag from `cilium hubble port-forward --tls &` so it now reads `cilium hubble port-forward &`.

## Review Notes
- The Helm values for cert-manager auto mode (`hubble.tls.enabled=true`, `hubble.tls.auto.enabled=true`, `hubble.tls.auto.method=certmanager`, `hubble.tls.auto.certManagerIssuerRef.name/kind`) are all valid against the upstream Cilium Helm chart.
- The cilium-config ConfigMap key `hubble-tls-cert-file` used in the verification step is a valid key set by the chart when TLS is enabled.
- The manual TLS section creates secrets named `hubble-ca-secret` and `hubble-server-certs`, but the post does not show the corresponding Helm overrides needed to make Cilium actually consume those manually created secrets (e.g., `hubble.tls.ca.cert`, `hubble.tls.server.cert/key` or the `userGenerated` method). The commands shown are syntactically correct, but a reader following only this section would need to refer to the Cilium docs for the final wiring step. This is a content completeness gap rather than a technical error, so no edit was made.
- The CN `*.hubble-grpc.cilium.io` used for the manual cert is a reasonable convention matching Cilium's default Hubble peer service SAN pattern; no change required.
- When connecting to Hubble through a local port-forward, the user may also need `--tls-server-name` (or `--tls-allow-insecure`) since the cert SAN won't match `localhost`. Not strictly an error in the post, but worth noting for readers debugging connections.
