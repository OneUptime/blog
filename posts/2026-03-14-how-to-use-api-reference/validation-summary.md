# Validation Summary: Using the Cilium API Reference

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium Agent API
- Cilium Operator API
- Hubble gRPC API
- Kubernetes
- kubectl
- curl
- jq

## Sources Consulted
- Cilium API Reference: https://docs.cilium.io/en/stable/api/
- Cilium administrative API enablement documentation: https://docs.cilium.io/en/stable/configuration/api-restrictions/
- Cilium gRPC API Reference: https://docs.cilium.io/en/stable/grpcapi/
- Cilium Hubble internals documentation: https://docs.cilium.io/en/stable/internals/hubble/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium v1.19.3 Agent OpenAPI specification: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/api/v1/openapi.yaml
- Cilium v1.19.3 Operator OpenAPI specification: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/api/v1/operator/openapi.yaml

## Issues Found
- The post described the Cilium API reference as covering generic collaboration opportunities. Updated the wording to focus on the Cilium agent and related APIs, which matches the official API reference.
- The post described Hubble as exposing API "endpoints" alongside the REST-style agent API. Updated this to identify Hubble as a gRPC API for network observability.
- The local access example attempted to list available API endpoints by calling `/v1/`, which is not part of the documented Cilium Agent OpenAPI paths. Replaced it with the officially documented `cilium-dbg -H unix:///var/run/cilium/cilium.sock status` access pattern and kept documented REST paths for direct curl calls.
- The post listed `GET /v1/policy` as a current policy-tree endpoint. The OpenAPI specification marks `/policy` as deprecated for removal in v1.19, so it was replaced with `GET /v1/policy/selectors`.
- The endpoint-specific curl example used a bare numeric ID without explaining Cilium endpoint ID prefixes. Updated it to use the documented `cilium-local:` prefix and added a verification note to choose an ID from `GET /v1/endpoint`.
- The troubleshooting section contained unrelated community-meeting, Slack, GitHub permission, and timezone advice. Replaced those bullets with API-specific troubleshooting notes for Unix socket access, administrative API restrictions, endpoint ID lookup, and missing local tools.
- The conclusion contained an incomplete sentence and community-participation wording unrelated to the API guide. Replaced it with a technically accurate summary of the API reference's purpose.

## Review Notes
The curl examples are syntactically valid for clients with `curl` support for Unix sockets, but Cilium's official documentation recommends using `cilium-dbg -H unix:///var/run/cilium/cilium.sock` as the easiest supported local client. Some Cilium deployments can also administratively disable individual API handlers, causing otherwise correct calls to return HTTP 403.
