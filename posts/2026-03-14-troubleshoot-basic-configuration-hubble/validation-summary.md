# Validation Summary: How to Troubleshoot Basic Configuration in Cilium Hubble

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Hubble Relay
- Hubble UI
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Cilium documentation: Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Hubble internals: https://docs.cilium.io/en/stable/internals/hubble/
- Cilium documentation: Configure TLS with Hubble: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium documentation: Service Map & Hubble UI: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium documentation: Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.19.3 Helm chart values and templates: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium

## Issues Found
- The TLS remediation command enabled `hubble.relay.tls.server.enabled=true`, which configures TLS for clients connecting to Hubble Relay and is not the fix for Relay-to-agent mTLS mismatches. Updated the command to reset Hubble, Hubble Relay, and Hubble agent/Relay mTLS settings with automatic certificate generation.
- The test traffic command used plain HTTP against `kubernetes.default/healthz`. The Kubernetes API service is normally HTTPS, so the command was changed to use `https://kubernetes.default.svc/healthz` with `-k`.
- The event buffer check used `cilium status --verbose | grep "current/max"`, but the current/max flow buffer information is exposed by Hubble status output. Updated the command to use `hubble status`.
- The Hubble UI relay connectivity check targeted `hubble-relay:4245`. The Cilium chart exposes the `hubble-relay` service on port `80` by default and forwards to the Relay process port. Updated the check to test TCP connectivity to `hubble-relay 80` from a temporary pod in the same namespace.
- The metrics verification implied port `9965` is always available. Hubble metrics are configurable and disabled unless enabled, so the verification comment now states that the check applies when Hubble metrics are enabled.

## Review Notes
The guide is technically relevant and generally aligned with current Cilium/Hubble behavior. Some commands depend on tools available inside the selected container image, such as `wget` in the Cilium agent image; if those utilities are absent in a particular deployment, equivalent connectivity checks should be run from a temporary debug pod.
