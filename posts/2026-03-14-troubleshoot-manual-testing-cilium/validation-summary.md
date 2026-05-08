# Validation Summary: Troubleshooting Manual Testing for Cilium Network Security

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium L7 policy and proxylib parsers
- CiliumNetworkPolicy
- Cilium Envoy proxy
- Hubble
- Kubernetes CLI troubleshooting
- Bash diagnostic scripting

## Sources Consulted
- Cilium command reference: `cilium-dbg endpoint list` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference: `cilium-dbg endpoint get` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference: `cilium-dbg status --all-redirects` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium command reference: `cilium-dbg monitor --type l7` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium command reference: Envoy admin commands - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin/
- Cilium command reference: `cilium-dbg envoy admin clusters` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_clusters/
- Cilium command reference: `cilium-dbg envoy admin serverinfo` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_serverinfo/
- Cilium Hubble CLI guide - https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Helm reference for debug options - https://docs.cilium.io/en/stable/helm-reference/
- Cilium policy API reference for `l7proto` and generic L7 rules - https://pkg.go.dev/github.com/cilium/cilium/pkg/policy/api
- Cilium Envoy/proxylib parser development documentation - https://docs.cilium.io/en/stable/security/network/proxy/envoy/

## Issues Found
- The post used old in-agent `cilium` debug commands such as `cilium endpoint list`, `cilium status`, `cilium monitor`, and `cilium config set`. Updated these to the current documented `cilium-dbg` equivalents where applicable.
- The post used `cilium bpf proxy list`, which is not present in the current documented Cilium debug command reference. Replaced proxy redirect checks with `cilium-dbg status --all-redirects`, which is documented for displaying redirects.
- The post checked Envoy through raw `curl` calls to localhost port 9901. Replaced these with documented `cilium-dbg envoy admin serverinfo` and `cilium-dbg envoy admin clusters` commands.
- The post used `kubectl get endpoints` for service backend checks. Updated this to `kubectl get endpointslices`, which is the current Kubernetes discovery API direction and avoids relying on the legacy Endpoints resource.
- The Hubble verification command used `--type l7`, which is not the documented Hubble CLI pattern in the Cilium guide. Replaced it with a namespace-scoped `hubble observe --last 5` command.

## Review Notes
The guide intentionally uses placeholder resources such as `protocol-client`, `myprotocol`, and `test-server`; those are environment-specific examples rather than standard Cilium commands. They remain technically plausible but require a matching test workload and client implementation.
