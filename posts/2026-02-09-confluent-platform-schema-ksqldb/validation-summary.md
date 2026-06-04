# Validation Summary: How to Deploy Confluent Platform on Kubernetes with Schema Registry and ksqlDB

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Confluent Platform
- Apache Kafka
- ZooKeeper
- Kubernetes StatefulSets, Deployments, Services, Jobs, and PersistentVolumeClaims
- Confluent Schema Registry
- ksqlDB
- Confluent Control Center
- Prometheus Operator ServiceMonitor
- Python confluent-kafka client
- Avro

## Sources Consulted
- Confluent Docker Configuration Parameters for Confluent Platform 7.5: https://docs.confluent.io/platform/7.5/installation/docker/config-reference.html
- Confluent Kafka listener documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- Confluent Schema Registry production deployment documentation: https://docs.confluent.io/platform/current/schema-registry/installation/deployment.html
- Confluent ksqlDB Docker installation documentation: https://docs.confluent.io/platform/current/ksqldb/operate-and-deploy/installation/install-ksqldb-with-docker.html
- Confluent ksqlDB Schema Registry integration documentation: https://docs.confluent.io/platform/current/ksqldb/operate-and-deploy/installation/avro-schema.html
- Confluent ksqlDB array and SPLIT behavior documentation: https://docs.confluent.io/platform/current/ksqldb/how-to-guides/query-structured-data.html
- Confluent Control Center 7.5 configuration reference: https://docs.confluent.io/platform/7.5/control-center/installation/configuration.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/7.5/clients/confluent-kafka-python/html/index.html
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The ZooKeeper StatefulSet read `ZOOKEEPER_SERVER_ID` from a nonexistent annotation. Updated the container startup command to derive the required numeric server ID from the StatefulSet pod ordinal.
- The Kafka StatefulSet used `metadata.name` directly as `KAFKA_BROKER_ID`, but Kafka broker IDs must be numeric. Updated startup to derive the broker ID from the StatefulSet ordinal.
- The Kafka advertised listeners used empty hostnames and included an external listener without per-broker external exposure. Updated the example to use an internal listener advertised as the stable StatefulSet pod DNS name.
- Schema Registry used the pod name as `SCHEMA_REGISTRY_HOST_NAME`, which is not generally resolvable for Deployment pods. Updated it to use the pod IP from the Kubernetes Downward API and added the listener protocol to the Kafka bootstrap server list.
- The Python producer configured `value.serializer` on `Producer`, but Confluent's Python serializer API expects that configuration on `SerializingProducer`. Updated the import and producer construction.
- The architecture list included Kafka Connect as though the guide deployed it, but no Kafka Connect deployment is provided. Marked Kafka Connect as optional.
- The ServiceMonitor example selected a `jmx` port even though the article did not define one. Updated the text to make the JMX exporter prerequisite explicit and changed the selected port to `metrics`.

## Review Notes
- The post uses Confluent Platform 7.5.0 with ZooKeeper. This is still version-specific content, but Confluent documents ZooKeeper as deprecated for new deployments as of Confluent Platform 7.5, so a future revision should consider a KRaft-based deployment.
- The Kubernetes manifests were syntax-checked as YAML, and the Python example was checked with `py_compile`. The Kubernetes resources were not applied to a live cluster.
