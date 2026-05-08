# Validation Summary: Understanding the Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF
- Kubernetes network policy concepts
- HTTP-aware Layer 7 policy enforcement

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium security identities documentation: https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium policy enforcement documentation: https://docs.cilium.io/en/stable/security/network/policyenforcement.html
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html

## Issues Found
- The apply command used the floating `HEAD` URL for the Cilium example manifest. I changed it to the current stable documentation version, `1.19.3`, so the command matches the official Star Wars demo instructions and is reproducible.
- The Cilium inspection command used `cilium policy get` inside the Cilium DaemonSet. Current Cilium documentation uses the in-pod `cilium-dbg` CLI for agent inspection. I changed the command to `kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list`, which matches the official demo's documented DaemonSet form for inspecting endpoints and policy enforcement.

## Review Notes
- The CiliumNetworkPolicy YAML snippets match the official Star Wars demo policy structure for L3/L4 and HTTP-aware L7 enforcement.
- The L7 policy behavior described in the post is accurate: empire-labeled sources can reach the selected deathstar endpoints on TCP port 80, and the HTTP rule limits allowed requests to `POST /v1/request-landing`.
- Cilium's current documentation also notes that policy enforcement is stateful for session-based protocols, so allowed request traffic automatically permits corresponding reply packets.
