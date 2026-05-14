# Validation Summary: Compare L7 Network Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF datapath
- Envoy L7 proxy
- Hubble
- kubectl

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium `cilium-dbg envoy admin` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_envoy_admin/
- Cilium `cilium-dbg envoy admin listeners` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_listeners/

## Issues Found
- The post described Cilium L7 HTTP inspection as "eBPF-based." Cilium uses the datapath to redirect matching traffic, but HTTP inspection and L7 policy enforcement are performed by Envoy. Updated the wording to describe Envoy proxy-based HTTP inspection.
- The L3/L4 exhaust-port example included `Panic: deathstar exploded!` with an exclamation mark. The official Cilium Star Wars demo shows `Panic: deathstar exploded`. Updated the expected output text.
- The denied L7 request was described as returning `403 Forbidden` directly with `curl -s`. The official demo returns the body `Access denied`, while the L7 flow records show an HTTP 403 policy denial. Updated the expected output to `Access denied` and kept the HTTP 403 explanation.
- The Hubble command used `--to-pod default/deathstar`, which does not match the official Star Wars demo pattern because `deathstar` is not the exact pod name. Updated it to `--pod deathstar --protocol http`, matching current Cilium Hubble documentation.
- The post used outdated or incorrect `cilium-dbg proxy list` and `cilium-dbg proxy stats` commands. Replaced them with `cilium-dbg status --verbose`, `cilium-dbg envoy admin listeners`, and `cilium-dbg envoy admin metrics`, which match current Cilium command references.
- The conclusion said no additional proxies are deployed. Since Cilium uses Envoy for L7 enforcement, clarified that no sidecar proxies are required.

## Review Notes
The CiliumNetworkPolicy YAML is valid for the documented Star Wars L7 policy and matches the official Cilium demo structure. The post does not pin a Cilium version, so the validation used current stable and latest Cilium documentation available on 2026-05-14.
