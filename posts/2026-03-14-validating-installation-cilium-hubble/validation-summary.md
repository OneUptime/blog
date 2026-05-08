# Validation Summary: How to Use Validating the Installation in Cilium Hubble

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Hubble
- Hubble Relay
- Hubble UI
- Kubernetes
- Helm
- Prometheus metrics
- kubectl
- cilium CLI
- Hubble CLI

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium monitoring and Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The post used `cilium status --brief`, but the Cilium CLI `status` command does not document or support a `--brief` flag. Changed those examples to `cilium status`.
- The post used `cilium status` from inside Cilium agent pods. Current Cilium documentation uses `cilium-dbg status` for agent-local status checks inside the Cilium pod, so those commands were updated.
- The troubleshooting command used `cilium endpoint regenerate --all` inside the Cilium pod. Updated it to `cilium-dbg endpoint regenerate --all` to match the agent-local CLI used by current Cilium documentation.
- The end-to-end traffic test exposed and curled the nginx pod immediately after creating it, which could race pod readiness. Added a `kubectl wait --for=condition=Ready pod/server --timeout=120s` command before creating and testing the service.

## Review Notes
The Hubble Relay, Hubble CLI, Hubble UI, and Hubble metrics validation flow matches the official Cilium documentation at a high level. The metrics endpoint port `9965` is the documented default when Hubble metrics are enabled, but the post correctly notes that deployments can configure a different port.
