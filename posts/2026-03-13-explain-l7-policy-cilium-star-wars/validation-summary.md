# Validation Summary: Explaining L7 HTTP-Aware Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- Envoy
- xDS
- Hubble

## Sources Consulted
- Cilium Envoy documentation: https://docs.cilium.io/en/latest/security/network/proxy/envoy/
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for `cilium-dbg envoy admin`: https://docs.cilium.io/en/stable/cmdref/

## Issues Found
- The post stated that Envoy always runs as a shared process in each Cilium agent pod. Current Cilium documentation says this is the default embedded mode, but Envoy can also run as a dedicated `cilium-envoy` DaemonSet. I updated the wording to include both supported deployment modes.
- The redirect diagram and explanation implied a fixed Envoy proxy port, `10001`, and referred to a specific eBPF proxy map entry. Cilium documentation describes L7 traffic being redirected to the local proxy, but the specific listener details are implementation-dependent. I changed the wording to avoid a fixed port and describe the endpoint/port L7 redirect more generally.
- The inspection commands used `cilium bpf proxy list`, `cilium proxy log`, and `cilium monitor --type l7`. Current Cilium command documentation exposes the relevant agent-side commands through `cilium-dbg`, so I replaced them with `cilium-dbg envoy admin listeners`, `cilium-dbg envoy admin config`, and `cilium-dbg monitor --type l7`.
- The xDS inspection command used `cilium debuginfo | grep -A 20 "xDS"`, which is not a reliable documented way to view delivered Envoy configuration. I replaced it with `cilium-dbg envoy admin config`.
- The Hubble description said denied requests would be shown as dropped. Cilium's Star Wars demo and Hubble L7 output distinguish forwarded and denied L7 verdicts, so I changed this to "forwarded or denied."
- The performance section gave a specific 50-200 microsecond latency range without an official source and used a shell `time` parsing example that would not produce a useful numeric average for typical `real 0m0.000s` output. I changed the claim to a qualitative workload-dependent note and replaced the command with `curl -w "%{time_total}"` plus `awk` averaging.

## Review Notes
The post is technically correct after the targeted fixes. The remaining performance guidance is intentionally qualitative because official Cilium documentation does not publish a single general-purpose latency overhead number for L7 policy enforcement.
