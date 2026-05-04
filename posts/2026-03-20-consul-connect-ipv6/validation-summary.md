# Validation Summary: How to Configure Consul Connect with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul (agent configuration, HCL config)
- Consul Connect (service mesh, intentions, sidecar proxies)
- Envoy proxy (admin API, sidecar)
- IPv6 networking (addressing, AAAA DNS records, ULA `fd00::/8`)
- mTLS / service-to-service auth
- Kubernetes (Deployments, dual-stack networking, pod annotations)
- Helm (Consul Helm chart `hashicorp/consul`)
- consul-dataplane sidecar container
- BIND `dig` CLI
- `ip6tables` (transparent proxy)

## Sources Consulted
- HashiCorp Consul agent configuration reference: https://developer.hashicorp.com/consul/docs/agent/config/config-files
- Consul service definition reference: https://developer.hashicorp.com/consul/docs/services/usage/define-services
- Consul Connect service mesh docs: https://developer.hashicorp.com/consul/docs/connect
- Consul service intentions config entry: https://developer.hashicorp.com/consul/docs/connect/config-entries/service-intentions
- Consul on Kubernetes Helm chart values reference: https://developer.hashicorp.com/consul/docs/k8s/helm
- Official Consul Helm chart values.yaml: https://github.com/hashicorp/consul-k8s/blob/main/charts/consul/values.yaml
- Consul K8s annotations reference (`consul.hashicorp.com/connect-inject`, `consul.hashicorp.com/transparent-proxy`): https://developer.hashicorp.com/consul/docs/k8s/annotations-and-labels
- `consul connect envoy` CLI: https://developer.hashicorp.com/consul/commands/connect/envoy
- `dig` man page (BIND 9) for `@server` and `-p` flag semantics
- RFC 4291 (IPv6 Addressing Architecture) for valid hextet syntax (hex digits 0-9, a-f only)

## Issues Found

1. **Invalid IPv6 literal `2001:db8::consul-node`** — IPv6 hextets only allow hex digits (0-9, a-f); the substring `consul-node` contains non-hex characters (`o`, `s`, `u`, `l`, `-`) and would be rejected by Consul/parsers. Replaced with `2001:db8::1`.

2. **Invalid IPv6 literal `2001:db8::web-node`** (in service `address` and the health-check URL) — same problem. Replaced with `2001:db8::10`, including in the bracketed URL form `http://[2001:db8::10]:8080/health`.

3. **Incorrect Helm chart structure** — the original placed `connectInject` under `global` (no such key exists at `global.connectInject` in the chart), and placed `transparentProxy` at the top level. Per the official `hashicorp/consul` chart `values.yaml`, `connectInject` is a top-level key and `transparentProxy.defaultEnabled` is nested under `connectInject`. Restructured the snippet so `connectInject.transparentProxy.defaultEnabled` is correctly nested and the duplicate/misplaced `connectInject` under `global` is removed.

4. **Non-standard `dig` syntax `@[::1]:8600`** — `dig` (BIND) does not parse `[host]:port` as a server+port spec; the standard form uses `@server` plus the `-p` flag. Changed both queries to `dig @::1 -p 8600 ...`.

## Review Notes

- The legacy `consul intention create` CLI is shown alongside the modern `service-intentions` config entry. Both still work in current Consul versions, but `consul intention` was deprecated in favor of config entries (Consul 1.9+). Worth noting for readers but not technically wrong.
- `bind_addr = "::"` correctly binds Consul to all IPv6 interfaces; on Linux dual-stack systems with `IPV6_V6ONLY=0` this also accepts IPv4 connections via IPv4-mapped addresses, which is the typical desired behavior.
- The `consul-dataplane` container name (used in `kubectl exec -c consul-dataplane`) is correct for Consul-K8s 1.14+, where the consul-dataplane binary replaced the legacy in-pod Consul agent sidecar.
- The `2001:db8::/32` prefix used for examples is the documentation-only range reserved by RFC 3849, which is appropriate.
- `fd00:` matches the ULA prefix (`fc00::/7`) per RFC 4193 — appropriate for filtering Envoy cluster output for pod IPv6 addresses on most CNIs.
- The Envoy admin endpoint (`localhost:19000`) and the standard sidecar listener port (`21000`) match Consul's defaults.
