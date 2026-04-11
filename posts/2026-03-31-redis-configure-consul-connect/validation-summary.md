# Validation Summary: How to Configure Redis with Consul Connect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- HashiCorp Consul (Connect / Service Mesh)
- Envoy proxy (sidecar)
- HCL configuration language
- Python (redis-py client library)
- Kubernetes (Consul Helm chart)
- Consul DNS and HTTP API

## Sources Consulted
- Consul CLI reference: `consul connect envoy` — https://developer.hashicorp.com/consul/commands/connect/envoy
- Consul CLI reference: `consul connect proxy` — https://developer.hashicorp.com/consul/commands/connect/proxy
- Consul Connect CA commands — https://developer.hashicorp.com/consul/commands/connect/ca
- Consul intention create reference — https://developer.hashicorp.com/consul/commands/intention/create
- Consul on Kubernetes annotations and labels — https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label
- Consul sidecar proxy configuration reference — https://developer.hashicorp.com/consul/docs/reference/proxy/sidecar

## Issues Found

1. **Incorrect command: `consul connect proxy -sidecar-for redis-1 -log-level debug`**
   - **What was wrong:** The post used `consul connect proxy` to "monitor proxy activity" on an already-running Envoy sidecar. `consul connect proxy` starts Consul's built-in L4 proxy, which is a completely different proxy from Envoy. Running it alongside an existing Envoy sidecar would start a second, conflicting proxy — not monitor the first one.
   - **What was changed:** Replaced with `consul connect envoy -sidecar-for redis-1 -- -l debug`, which correctly starts the Envoy sidecar with debug-level logging to inspect proxy activity.
   - **Why:** The `consul connect envoy` command with `-- -l debug` passes the debug log-level flag through to Envoy, which is the appropriate way to debug the Envoy sidecar proxy.

2. **Misleading comment on `consul connect ca get-config`**
   - **What was wrong:** The comment said "Check Connect certificate for Redis service," but this command displays the global CA provider configuration (provider type, root cert TTL, etc.) — it shows nothing specific to the Redis service.
   - **What was changed:** Updated the comment to "View the Connect CA provider configuration."
   - **Why:** Accurately describes what the command returns.

## Review Notes
- The `consul intention create` CLI commands used in the post are deprecated since Consul 1.9.0 in favor of `service-intentions` config entries managed via `consul config write`. The commands still function but may be removed in a future version. A future update could migrate the examples to config entry-based intentions.
- The Kubernetes Helm chart values shown are compatible with the consul-k8s Helm chart. Field names and structure are correct.
- The HCL service registration syntax, TCP health check configuration, upstream definitions, and Connect sidecar blocks are all correct.
- The Python redis-py client usage is correct and idiomatic.
- DNS query on port 8600 and the HTTP API health endpoint are both correct for default Consul configurations.
