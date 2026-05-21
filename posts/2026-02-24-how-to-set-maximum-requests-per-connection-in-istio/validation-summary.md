# Validation Summary: How to Set Maximum Requests Per Connection in Istio

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio DestinationRule
- Envoy connection pooling
- Kubernetes
- HTTP/1.1, HTTP/2, and gRPC
- Envoy admin stats
- Istio outlier detection

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Envoy connection pooling documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling
- Envoy Life of a Request documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/life_of_a_request
- Envoy cluster configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html

## Issues Found
- The post implied that long-lived upstream connections prevent Envoy from making new load-balancing decisions and leave newly scaled pods idle. Envoy selects an endpoint per request and then uses that endpoint's connection pool, so I changed the explanation to say long-lived connections can keep active traffic concentrated but do not stop endpoint selection for new requests.
- The post said `maxRequestsPerConnection` closes a connection and triggers a fresh load-balancing decision. Envoy drains/replaces affected connections after the configured request limit; load balancing is performed when a request is routed to an upstream endpoint. I updated the wording from "close" to "drain" where appropriate.
- The post used `networking.istio.io/v1beta1` in DestinationRule examples. Current Istio documentation uses `networking.istio.io/v1`, so I updated the examples to the stable API version.
- The post described `http1MaxPendingRequests` and `http2MaxRequests` as HTTP-version-specific in the combined example. Istio documents these settings as applying to both HTTP/1.1 and HTTP/2, so I corrected the bullet descriptions.
- The post stated that default unlimited requests means connections stay open indefinitely. I clarified that other mechanisms, such as idle timeout, endpoint health changes, and shutdown, can still close connections.
- The post gave a precise connection-creation calculation. I changed it to an estimate because actual connection churn depends on endpoint count, protocol, concurrency, worker threads, and connection-pool capacity.
- The post described `interval: 5s` as checking every 5 seconds. Istio documents this as the outlier-detection analysis interval, so I adjusted the wording.

## Review Notes
The YAML snippets use valid Istio DestinationRule fields. A local Ruby YAML parser was unavailable, and no Istio CRDs are installed in this workspace for server-side validation, so syntax was checked by source review against the official Istio schema documentation.
