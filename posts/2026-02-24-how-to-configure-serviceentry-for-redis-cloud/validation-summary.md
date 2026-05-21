# Validation Summary: How to Configure ServiceEntry for Redis Cloud

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Envoy TCP/TLS proxying and Redis proxy support
- Redis / RESP
- Redis Cloud
- Amazon ElastiCache for Redis OSS / Valkey
- Google Cloud Memorystore for Redis
- Azure Cache for Redis
- Kubernetes and istioctl debugging commands
- Prometheus / Istio TCP metrics

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Redis proxy filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/redis_proxy_filter.html
- Redis RESP protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Redis Cloud connection documentation: https://redis.io/docs/latest/operate/rc/databases/connect/
- Redis Cloud TLS documentation: https://redis.io/docs/latest/operate/rc/security/database-security/tls-ssl/
- AWS ElastiCache endpoint documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Endpoints.html
- Google Cloud Memorystore in-transit encryption documentation: https://cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption
- Azure Cache for Redis TLS configuration documentation: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-tls-configuration
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said Envoy does not understand RESP. Envoy has a Redis proxy filter, and Istio lists Redis as experimental protocol support when enabled. Changed the wording to clarify that Redis is treated as opaque TCP unless Redis protocol support or Envoy's Redis proxy filter is explicitly configured.
- The Azure Cache for Redis port statement was too broad. Updated it to specify that port 6380 for TLS and 6379 for non-TLS applies to Basic, Standard, and Premium non-clustered caches, with Enterprise and clustered cache caveats.
- The TLS origination example used port 16379 even though the post's TLS examples used 16380. Updated the ServiceEntry port in that example to 16380 so Envoy originates TLS to the TLS Redis endpoint shown in the article.
- The connection pool sizing guidance treated `maxConnections` as if it should exceed the sum of all pods' Redis pools. Istio/Envoy connection pool limits are applied per proxy for the upstream host, unless using a shared egress gateway. Updated the guidance accordingly.
- The monitoring section labeled `istio_tcp_connections_opened_total` as active connections. Istio documents it as a counter for opened connections. Updated the label to "Connections opened to Redis."
- The common issues list tied connection pool exhaustion only to too many pods and `maxConnections`. Updated it to cover client pools or Envoy connection limits being too low.

## Review Notes
The YAML snippets use current `networking.istio.io/v1` APIs and valid ServiceEntry/DestinationRule fields. For TLS passthrough ServiceEntries using `protocol: TLS`, clients should send SNI matching the configured host for host-based TLS matching. Google Memorystore for Redis with in-transit encryption uses port 6378 for non-clustered instances, while the post's Memorystore example is for the non-TLS private IP case on port 6379.
