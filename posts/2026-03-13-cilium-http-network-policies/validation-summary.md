# Validation Summary: HTTP Policies with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- HTTP Layer 7 policy
- Envoy
- Hubble
- eBPF

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Envoy documentation: https://docs.cilium.io/en/latest/security/network/proxy/envoy.html
- Cilium API reference for `PortRuleHTTP`: https://pkg.go.dev/github.com/cilium/cilium@v1.19.3/pkg/policy/api#PortRuleHTTP
- Hubble CLI `observe --help` output excerpt in cilium/hubble issue: https://github.com/cilium/hubble/issues/1280

## Issues Found
- The blocked path test targeted `user-service`, but the path-based policy example applies to `api-server`. Updated that test to use `public-client-pod` calling `http://api-server:8080/api/v1/admin`, so the expected 403 is produced by the shown path policy.
- The test commands used a generic `client-pod`, even though the policies select clients by labels such as `role: read-client` and `role: public-client`. Updated the command examples to use `read-client-pod` and `public-client-pod` to make the source identity assumptions explicit.

## Review Notes
- The Cilium HTTP policy schema, including `apiVersion: cilium.io/v2`, `CiliumNetworkPolicy`, `toPorts.rules.http`, `method`, `path`, and `headers`, matches current Cilium documentation.
- Hubble supports the demonstrated `--namespace`, `--verdict`, `--type`, `--follow`, `--protocol`, and `--http-status` filters.
- Cilium documentation notes that L7 policies proxy matching traffic through node-local Envoy and that denied HTTP requests receive a 403 response, which is consistent with the post.
