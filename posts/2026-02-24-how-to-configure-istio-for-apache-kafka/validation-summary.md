# Validation Summary: How to Configure Istio for Apache Kafka

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Istio
- Kubernetes Services and StatefulSets
- Kubernetes DNS
- Confluent Platform Kafka container configuration
- Confluent Cloud and AWS MSK external Kafka connectivity
- ZooKeeper

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Apache Kafka listener configuration documentation: https://kafka.apache.org/40/security/listener-configuration/
- Confluent Kafka listener configuration documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- Confluent Platform Docker image reference: https://docs.confluent.io/platform/current/installation/docker/image-reference.html
- Confluent Cloud networking documentation: https://docs.confluent.io/cloud/current/networking/overview.html
- AWS MSK bootstrap broker documentation: https://docs.aws.amazon.com/msk/latest/developerguide/get-bootstrap-cli.html
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/

## Issues Found
- The `KAFKA_ADVERTISED_LISTENERS` example referenced `$(POD_NAME)` before `POD_NAME` was defined. Kubernetes dependent environment variable expansion is order-sensitive, so I moved `POD_NAME` before `KAFKA_ADVERTISED_LISTENERS`.
- The StatefulSet snippet was presented as though it were a complete Kafka StatefulSet, but the shown `cp-kafka` configuration omits required deployment-specific Kafka settings such as KRaft or ZooKeeper configuration, broker IDs, and storage. I changed the surrounding text to make clear that it is the Kafka container portion and that the normal Kafka deployment settings still need to be present.
- The external Kafka example configured `tls.mode: SIMPLE`, which makes Istio originate TLS. That is incorrect for Confluent Cloud and other Kafka endpoints where the Kafka client already uses TLS or SASL_SSL. I changed the ServiceEntry port to `protocol: TLS`, changed the DestinationRule to `tls.mode: DISABLE`, and clarified that the Kafka client should originate TLS for those endpoints.

## Review Notes
The Istio API versions, TCP route structure, DestinationRule TCP connection pool fields, AuthorizationPolicy fields, Kubernetes Service and StatefulSet fields, ZooKeeper TCP port naming guidance, and Istio TCP metric names were consistent with the referenced documentation. The Kafka deployment snippets are still intentionally minimal and should not be treated as a production-ready Kafka manifest.
