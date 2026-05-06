# Validation Summary: How to Configure Consul Cluster with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HashiCorp Consul
- Consul service discovery
- Consul service mesh / Envoy
- IPv6 networking
- systemd-resolved
- ip6tables
- DNS (`dig`)

## Sources Consulted
- HashiCorp Consul agent configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- HashiCorp Consul general agent parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- HashiCorp Consul join parameters: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/join
- HashiCorp Consul agent CLI reference: https://developer.hashicorp.com/consul/commands/agent
- HashiCorp Consul configure agent guide: https://developer.hashicorp.com/consul/docs/fundamentals/agent
- HashiCorp Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- HashiCorp Consul health check reference: https://developer.hashicorp.com/consul/docs/reference/service/health-check
- HashiCorp Consul sidecar proxy deployment guide: https://developer.hashicorp.com/consul/docs/connect/proxy/sidecar
- HashiCorp Consul Connect Envoy CLI reference: https://developer.hashicorp.com/consul/commands/connect/envoy
- HashiCorp Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- systemd `resolved.conf.d` reference: https://www.freedesktop.org/software/systemd/man/257/resolved.conf.d.html

## Issues Found
- The configuration snippets were labeled as `.json` files but contained `//` comments, which makes them invalid JSON. I removed the comments so the examples are syntactically valid as written.
- The `retry_join` examples used bare IPv6 literals. Consul requires literal IPv6 join addresses to be enclosed in square brackets, so I updated both the config snippets and CLI example to use bracketed IPv6 join targets.
- The post's service-mesh example was incomplete: the client agent did not enable the gRPC port needed by `consul connect envoy`, and the service definition did not register a sidecar proxy. I added `ports.grpc`, added a `connect.sidecar_service` block, and updated the Envoy command to use the IPv6 loopback gRPC address.
- The verification commands assumed the default HTTP API address and used `dig @[::1]`, which does not parse as a valid `dig` server argument. I updated the Consul CLI commands to use explicit `-http-addr='http://[::1]:8500'` and corrected the DNS example to `dig @::1`.
- The server example enabled an HTTPS listener without showing the TLS configuration required for Consul's HTTPS API. I removed the unused HTTPS listener from the example to avoid implying that the HTTPS API would work as shown.
- The firewall section was missing required protocol coverage and mesh-related ports. I added UDP 8302 for Serf WAN, TCP 8600 for Consul DNS, and the default sidecar proxy port range `21000:21255`.

## Review Notes
- Current Consul documentation shows `connect.enabled` as enabled by default, but the gRPC and gRPC TLS listeners are still disabled by default and must be explicitly enabled for Envoy sidecars or dataplanes.
- The post now enables plaintext gRPC on port `8502` because it does not introduce TLS certificates. For production deployments with TLS, HashiCorp recommends using `grpc_tls` on port `8503`.
- The persistence command `ip6tables-save > /etc/ip6tables/rules.v6` is distro-specific and is appropriate on systems that use `iptables-persistent` or a compatible layout.
