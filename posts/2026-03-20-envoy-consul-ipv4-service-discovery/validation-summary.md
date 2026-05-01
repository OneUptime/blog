# Validation Summary: How to Integrate Envoy with Consul for IPv4 Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Envoy
- HashiCorp Consul
- Consul service mesh
- xDS / ADS
- DNS-based service discovery
- IPv4 networking

## Sources Consulted
- HashiCorp Consul Envoy proxy configuration reference: https://developer.hashicorp.com/consul/docs/reference/proxy/envoy
- HashiCorp Consul sidecar proxy deployment reference: https://developer.hashicorp.com/consul/docs/connect/proxy/sidecar
- HashiCorp Consul `connect envoy` CLI reference: https://developer.hashicorp.com/consul/commands/connect/envoy
- HashiCorp Consul agent service API reference: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- HashiCorp Consul static DNS query reference: https://developer.hashicorp.com/consul/docs/discover/service/static
- Envoy dynamic control-plane quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/configuration-dynamic-control-plane.html
- Envoy service discovery architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy DNS cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/dns/v3/dns_cluster.proto
- Envoy endpoint API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto

## Issues Found
- The original post described Consul xDS as a generic service-catalog feed for Envoy. I corrected this to match the official Consul documentation: Envoy consumes xDS from the local Consul agent as part of Consul service mesh.
- The original Consul service registration example only registered a plain service, which is insufficient for Envoy xDS integration. I updated the example to register a sidecar-enabled service with an upstream definition so the xDS workflow is technically valid.
- The original JSON example contained a JavaScript-style comment inside a `json` block, which is not valid JSON. I removed the comment.
- The original bootstrap section hand-wrote an Envoy xDS bootstrap that pointed at a Consul server IP and used older cluster HTTP/2 wiring. I replaced it with the documented `consul connect envoy -bootstrap` workflow, which is the recommended and accurate way to generate Envoy bootstrap config for Consul.
- The original verification command used Envoy admin port `9901`, but Consul's `connect envoy` workflow defaults Envoy admin to `localhost:19000`. I corrected the command accordingly.
- The original static DNS fallback used older top-level DNS cluster fields. I updated the example to Envoy's DNS cluster extension form so the example uses the current cluster configuration pattern.
- The original takeaways implied that any service registered in Consul would automatically be pushed to Envoy via EDS. I corrected this to clarify that Envoy receives upstream endpoint updates for services declared in the proxy's upstream configuration.

## Review Notes
- Consul's gRPC listener for Envoy xDS is environment-dependent: plaintext commonly uses `8502`, TLS commonly uses `8503`, and the listener must be enabled in the Consul agent configuration.
- The corrected post now reflects Consul service-mesh behavior. For non-mesh service discovery, Consul DNS remains the simpler integration path for Envoy.
