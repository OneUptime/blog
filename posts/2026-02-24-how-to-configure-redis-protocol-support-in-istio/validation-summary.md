# Validation Summary: How to Configure Redis Protocol Support in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio service mesh
- Envoy Redis proxy filter
- Kubernetes Services, Deployments, and headless Services
- Redis, Redis Sentinel, and Redis Cluster
- Istio DestinationRule, ServiceEntry, PeerAuthentication, and AuthorizationPolicy
- mTLS and TCP connection pooling

## Sources Consulted
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio pilot-discovery environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Service documentation, including appProtocol and port naming: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service protocol reference: https://kubernetes.io/docs/reference/networking/service-protocols/
- Envoy Redis proxy filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/redis_proxy_filter.html
- Redis RESP protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found
- The post described RESP as a text-based protocol. Redis documents RESP as binary-safe, while still human-readable and simple to parse, so the description was corrected to "binary-safe protocol."
- The post implied Redis protocol support is generally enabled by naming the port `redis`. Istio documents Redis as experimental application protocol support, and the Redis Envoy filter requires `PILOT_ENABLE_REDIS_FILTER`; otherwise traffic is treated as opaque TCP. The relevant text was updated.
- The post listed `tcp-redis` as another way to enable Redis protocol handling. In Istio's port naming convention, `tcp-redis` explicitly selects opaque TCP, not the Redis filter. The wording was corrected to show it as the generic TCP option.
- The post stated that Istio protocol sniffing works reasonably well for Redis. Istio's automatic protocol detection only detects HTTP and HTTP/2, with undetected traffic treated as TCP. The text was corrected to recommend explicit configuration and enabling the Redis filter when Redis-specific handling is needed.
- The external Redis ServiceEntry used `name: redis` with `protocol: TCP`, which could imply Redis protocol handling. Istio ServiceEntry protocol values do not include `REDIS`; for TCP egress this should be represented as TCP. The port name was changed to `tcp-redis` for consistency.

## Review Notes
The remaining Kubernetes and Istio YAML snippets use current API groups and fields. The Redis Cluster bus port and MOVED/ASK behavior match the Redis Cluster specification. The Sentinel port and `SENTINEL GET-MASTER-ADDR-BY-NAME` discussion are consistent with Redis Sentinel documentation. Local `istioctl` and `kubectl` binaries were not installed in this environment, so CLI syntax was checked against official command documentation rather than local help output.
