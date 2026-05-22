# Validation Summary: How to Configure Istio for Redis Connections

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Redis
- Redis Sentinel
- Redis Cluster
- Kubernetes
- Amazon ElastiCache
- Prometheus metrics

## Sources Consulted
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guidance: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Redis RESP protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Amazon ElastiCache in-transit encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html

## Issues Found
- The post described RESP as a text-based protocol. Redis documents RESP as binary-safe, so the wording was corrected to "binary-safe serialization protocol".
- The Redis Cluster section said a headless Service alone gives each node a stable DNS name. Kubernetes stable per-pod network identity comes from a StatefulSet with a headless Service, so the text was corrected.
- The Redis Cluster bus port was described as fixed at 16379. Redis uses data port + 10000 by default unless `cluster-port` is configured, so the wording now says 16379 is the default when Redis listens on 6379.
- The mTLS section used `PERMISSIVE` while saying it disabled mTLS. Istio documents `PERMISSIVE` as allowing both plaintext and mTLS; the snippet was changed to `DISABLE` and the text now notes that clients also need a matching client-side `DestinationRule` to send plaintext.
- The monitoring section listed `istio_tcp_connection_duration_seconds`, which is not one of Istio's standard TCP metrics. It was replaced with `istio_tcp_connections_closed_total`.

## Review Notes
The YAML snippets parse successfully. The external Redis TLS example is valid for Istio TLS origination from plaintext application traffic; if an application client already initiates TLS itself, the DestinationRule should not also originate TLS.
