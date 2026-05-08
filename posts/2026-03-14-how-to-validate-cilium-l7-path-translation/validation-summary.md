# Validation Summary: Validating Cilium L7 Path Translation Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEnvoyConfig
- CiliumClusterwideEnvoyConfig
- Envoy
- Hubble
- kubectl

## Sources Consulted
- Cilium L7 Path Translation documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-custom-listener/
- Cilium L7-Aware Traffic Management documentation: https://docs.cilium.io/en/latest/network/servicemesh/l7-traffic-management/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium cilium-dbg envoy admin config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_config.html

## Issues Found
- The prerequisites and config acceptance check only mentioned namespaced `CiliumEnvoyConfig`, but Cilium's official path translation example uses cluster-scoped `CiliumClusterwideEnvoyConfig`. Updated the prerequisite and validation script to accept either resource type.
- The `cilium status | grep "L7 Proxy.*enabled"` check is brittle against current Cilium output, which commonly reports Envoy as `Envoy DaemonSet` in cluster status and reports proxy health as `Proxy Status` through `cilium-dbg status`. Replaced it with a `cilium-dbg status --verbose` proxy status check through the Cilium DaemonSet.
- The introduction said to verify active Envoy routes, but the command block did not inspect Envoy routes. Added `cilium-dbg envoy admin config routes` with a rewrite-related grep, matching the official command reference for Envoy config inspection.
- The backend log validation only grepped for the trace header, which proves request correlation but not path rewriting. Updated it to also grep for the expected rewritten path.
- The troubleshooting advice said to restart the Cilium agent to force Envoy reconfiguration. Cilium documentation says Cilium Envoy config resources have limited validation and errors must be checked in Cilium agent logs and Envoy config/logs. Replaced the restart advice with log and route inspection guidance.

## Review Notes
The sample still uses placeholder workload names and `/expected/rewritten/path`; readers must replace those with the actual client deployment, backend deployment, service name, and rewritten path from their Envoy config. Hubble HTTP observations require Hubble to be enabled and HTTP/L7 visibility to be configured for the relevant traffic.
