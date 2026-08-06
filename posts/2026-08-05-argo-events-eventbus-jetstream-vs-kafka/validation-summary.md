# Validation Summary: Argo Events EventBus: JetStream vs Kafka

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered

- Argo Events
- Argo Events EventBus, EventSource, and Sensor resources
- NATS JetStream
- Apache Kafka
- Kubernetes StatefulSets, Services, Secrets, and persistent volumes
- TLS, SASL, and Kafka ACLs
- Event streaming, persistence, recovery, and horizontal scaling

## Sources Consulted

- [Argo Events JetStream EventBus documentation](https://argoproj.github.io/argo-events/eventbus/jetstream/)
- [Argo Events Kafka EventBus documentation](https://argoproj.github.io/argo-events/eventbus/kafka/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events Sensor high-availability documentation](https://argoproj.github.io/argo-events/sensors/ha/)
- [Argo Events EventSource high-availability documentation](https://argoproj.github.io/argo-events/eventsources/ha/)
- [Argo Events controller configuration at reviewed commit 77cb8cb](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/manifests/base/controller-manager/controller-config.yaml)
- [Argo Events Kafka client configuration source at reviewed commit 77cb8cb](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/eventbus/kafka/base/kafka.go)
- [Argo Events Kafka Sensor implementation at reviewed commit 77cb8cb](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/eventbus/kafka/sensor/kafka_sensor.go)
- [NATS JetStream concepts](https://docs.nats.io/nats-concepts/jetstream)
- [NATS JetStream disaster recovery](https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/disaster_recovery)
- [Apache Kafka documentation](https://kafka.apache.org/documentation/)
- [Apache Kafka authorization and ACL documentation](https://kafka.apache.org/42/security/authorization-and-acls/)

## Issues Found

- The security guidance could be read as allowing separate Kafka principals for Argo EventSources and Sensors within one EventBus. The EventBus has one TLS/SASL configuration shared by both paths. The text now states that the principal needs their combined topic, consumer-group, and transactional-ID permissions and that the API does not expose separate credentials for the two paths within one EventBus.
- A Kafka cost bullet described a "three-topic-per-Sensor" model, which obscured that the event topic is shared across the EventBus. It now states the exact topology: one shared event topic plus two Sensor-specific coordination topics per Sensor.

## Review Notes

- Both EventBus YAML examples parse correctly and use fields present in the current `argoproj.io/v1alpha1` API.
- NATS Server `2.10.29` is present in the reviewed Argo Events controller configuration, as the post states. Supported versions remain specific to the installed controller configuration.
- The example `standard` StorageClass must exist in the target Kubernetes cluster.
- All six links in the post's Official Documentation section returned HTTP 200 during validation.
