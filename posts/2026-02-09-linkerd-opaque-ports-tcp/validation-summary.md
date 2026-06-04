# Validation Summary: How to Configure Linkerd Opaque Ports for Non-HTTP TCP Protocol Handling

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Linkerd
- Kubernetes
- TCP proxying and protocol detection
- Opaque ports
- mTLS
- Prometheus metrics
- MySQL
- Redis
- gRPC

## Sources Consulted
- Linkerd TCP Proxying and Protocol Detection documentation: https://linkerd.io/2.18/features/protocol-detection/
- Linkerd Proxy Metrics documentation: https://linkerd.io/2.18/reference/proxy-metrics/
- Linkerd Viz CLI reference: https://linkerd.io/2.18/reference/cli/viz/
- Linkerd Protocol Detection Errors documentation: https://linkerd.io/2.16/common-errors/protocol-detection/
- Linkerd 2021 opaque ports explanation: https://linkerd.io/2021/02/23/protocol-detection-and-opaque-ports-in-linkerd/

## Issues Found
- Corrected the explanation that Linkerd "assumes traffic is HTTP." Linkerd performs protocol detection and falls back to plain TCP when HTTP cannot be detected, with server-first or idle protocols potentially hitting the protocol detection timeout.
- Updated observability language from connection-level latency/success-rate claims to transport-level metrics such as open TCP connections and bytes transferred, matching Linkerd proxy metrics.
- Added `appProtocol: linkerd.io/opaque` to Service port examples where Service-based routing is used, because current Linkerd documentation recommends declaring Service port protocol where possible.
- Clarified that `config.linkerd.io/opaque-ports` annotation values replace the default opaque port list rather than augmenting it.
- Corrected the current CLI command from `linkerd stat` to `linkerd viz stat`, and added `linkerd viz check` to prerequisites because the stat command belongs to the Viz extension.
- Corrected the Redis explanation: Redis on port 6379 is in Linkerd's default opaque port list; Linkerd does not "detect Redis" as an application protocol.
- Replaced the gRPC-Web/custom gRPC statement with a more accurate edge case: standard unencrypted gRPC is HTTP/2 and normally works with protocol detection, while application-level TLS or nonstandard framing may need opaque handling.
- Added missing Service manifests for MySQL, Redis, and mixed-protocol examples where the text or test commands rely on Kubernetes Service routing.
- Clarified that the quick `kubectl run` MySQL client is unmeshed, so an injected client workload is needed for Linkerd mTLS on that client-to-server connection.
- Corrected skip-port guidance to say skip ports bypass Linkerd, `skip-outbound-ports` belongs on the source workload, and opaque ports are configured on the destination.

## Review Notes
The guide is technically relevant and salvageable. Future improvements could include a dedicated example for validating mTLS with an injected client workload and a clearer distinction between Service `appProtocol`, workload annotations, namespace annotations, and egress `EgressNetwork` configuration.
