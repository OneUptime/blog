# Validation Summary: How to Configure Consul Connect for Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul service mesh / Consul Connect
- Envoy sidecar proxies
- Consul intentions
- Consul configuration entries
- mTLS certificate authority configuration
- Python HTTP client code
- Go HTTP and PostgreSQL client code
- systemd service units

## Sources Consulted
- HashiCorp Consul service mesh agent configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/service-mesh
- HashiCorp Consul Envoy proxy configuration reference: https://developer.hashicorp.com/consul/docs/reference/proxy/envoy
- HashiCorp Consul `connect envoy` CLI reference: https://developer.hashicorp.com/consul/commands/connect/envoy
- HashiCorp Consul sidecar proxy configuration reference: https://developer.hashicorp.com/consul/docs/reference/proxy/sidecar
- HashiCorp Consul service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul create and manage intentions guide: https://developer.hashicorp.com/consul/docs/secure-mesh/intention/create
- HashiCorp Consul service defaults configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-defaults
- HashiCorp Consul service router configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-router
- HashiCorp Consul service splitter configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-splitter
- HashiCorp Consul service resolver configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-resolver
- HashiCorp Consul proxy defaults configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/proxy-defaults
- HashiCorp Consul configuration entries guide: https://developer.hashicorp.com/consul/docs/fundamentals/config-entry

## Issues Found
- The `service-defaults` traffic management example used `Connect { UpstreamDefaults { ... } }`, which does not match the current Consul configuration entry schema. Changed it to `UpstreamConfig { Defaults { ... } }` so `ConnectTimeoutMs` and `MeshGateway` are in the documented location.
- The exposed path example used `ListenerPort`, but Consul documents the field as `ListenPort`. Updated the field name.
- The service registration defined database and cache upstreams but the application examples also treated upstream HTTP calls as if database/cache local ports were HTTP services. Added an `auth` HTTP upstream on local port `8001` and changed the Python and Go HTTP examples to call that HTTP upstream instead.
- The observability example used `envoy_extra_static_clusters_json` under the "Access logging" comment, but that does not enable Consul-managed Envoy access logs. Replaced it with the documented `AccessLogs` block in `proxy-defaults`.

## Review Notes
The examples are VM/agent-style Consul service mesh examples rather than Kubernetes injector examples. In production with ACLs enabled, sidecar proxy startup also requires an ACL token with the documented service identity permissions, provided by `-token`, `CONSUL_HTTP_TOKEN`, `-token-file`, or `CONSUL_HTTP_TOKEN_FILE`.
