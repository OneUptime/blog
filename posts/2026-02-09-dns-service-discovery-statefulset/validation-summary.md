# Validation Summary: How to Use DNS-Based Service Discovery for StatefulSet Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes Services and headless Services
- Kubernetes DNS service discovery
- Kubernetes Downward API and environment variable expansion
- PostgreSQL container deployment patterns
- Apache Cassandra container deployment patterns
- Apache Kafka / Confluent Platform container configuration
- kubectl commands

## Sources Consulted
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet basics tutorial: https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Kafka listeners documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- Docker Official Cassandra image documentation: https://hub.docker.com/_/cassandra
- DataStax Cassandra 4.x configuration changes documentation: https://docs.datastax.com/en/luna-cassandra/guides/upgrade/cassandra-4-configuration-changes.html

## Issues Found
- The DNS naming pattern assumed `cluster.local` without saying it is the default cluster domain. Updated the text to make that assumption explicit.
- The PostgreSQL example referenced the `database` namespace and `postgres-secret` Secret without defining them. Added a Namespace and Secret manifest so the snippet has the prerequisites it references.
- The Cassandra 4.0 example exposed a `thrift` Service port on 9160. Cassandra 4.0 removed the Thrift protocol, so this port was removed from the Service.
- The Kafka example referenced the `messaging` namespace without defining it. Added a Namespace manifest.
- The Kafka example used `metadata.name` as `KAFKA_BROKER_ID`, which would produce values like `kafka-0` instead of a broker identifier derived from the ordinal. Changed it to use the StatefulSet pod index label through the Downward API.
- The Kafka example referenced `$(POD_NAME)` before defining `POD_NAME`. Kubernetes only expands environment variables that are already defined earlier in the `env` list, so `POD_NAME` was moved before `KAFKA_ADVERTISED_LISTENERS`.
- The Kafka example configured advertised listener names without an explicit `KAFKA_LISTENERS` binding. Added `KAFKA_LISTENERS` so the named listeners are defined consistently with the advertised listeners, protocol map, and inter-broker listener.
- The Kafka ZooKeeper connection was unqualified for the `messaging` namespace. Updated it to `zookeeper.messaging.svc.cluster.local:2181`.

## Review Notes
The Kubernetes StatefulSet DNS claims, headless Service behavior, stable pod identity discussion, and `kubectl apply`, `kubectl get`, and `kubectl logs job/...` commands are consistent with the official documentation. The PostgreSQL, Cassandra, and Kafka examples are still illustrative and would need production-specific clustering, security, readiness probes, and storage-class decisions before real production use.
