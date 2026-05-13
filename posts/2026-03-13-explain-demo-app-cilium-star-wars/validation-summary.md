# Validation Summary: Explaining the Demo Application in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- CiliumNetworkPolicy
- HTTP L7 policy enforcement
- Envoy

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Kubernetes network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium eBPF datapath introduction: https://docs.cilium.io/en/stable/network/ebpf/intro/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/latest/security/network/proxy/envoy/
- Cilium TLS inspection documentation: https://docs.cilium.io/en/latest/security/tls-visibility/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg envoy admin listeners` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_listeners/

## Issues Found
- The post used `/v1/health`, but the Star Wars demo application exposes the health endpoint as `/v1/healthz`. Updated the curl command accordingly.
- The post described Cilium as parsing HTTP "at the kernel level." Cilium's eBPF datapath redirects matching traffic to a userspace Envoy proxy, where HTTP is parsed and L7 policy is enforced. Updated the section heading and explanation.
- The inspection commands used `cilium monitor`, `cilium bpf proxy list`, and `cilium policy get`. Current Cilium documentation uses `cilium-dbg` for in-agent debugging, and there is no documented `cilium-dbg bpf proxy list` command in the current command reference. Updated the examples to use `cilium-dbg monitor`, `cilium-dbg envoy admin listeners`, and `cilium-dbg monitor --type policy-verdict`.
- The production HTTPS example implied that Cilium can always apply HTTP path policy to TLS traffic. Updated it to clarify that HTTP-layer enforcement requires the HTTP layer to be visible, such as with plaintext HTTP, TLS termination, or configured TLS inspection.
- The prerequisites mentioned a local Cilium CLI, but the examples run debug commands inside the Cilium agent pod. Updated the prerequisite to require `kubectl` access and `cilium-dbg` in the agent pod.

## Review Notes
The CiliumNetworkPolicy YAML matches the official Star Wars L7 policy structure. The post intentionally focuses on the classic demo policy that allows `POST /v1/request-landing` and rejects `PUT /v1/exhaust-port`; newer or extended demo variants may show additional endpoints or header-based rules, but the policy shown here is valid for the official getting-started flow.
