# Validation Summary: How to Deploy Event-Driven Microservices with Kafka and Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Strimzi Kafka Operator
- Kubernetes
- Flux CD GitOps
- Flux image automation
- Avro event schemas
- Kafka ACLs and TLS client configuration

## Sources Consulted
- Strimzi Operator documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi Custom Resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Apache Kafka authorization and ACL documentation: https://kafka.apache.org/42/security/authorization-and-acls/
- Apache Kafka consumer group command documentation: https://kafka.apache.org/10/operations/basic-kafka-operations/
- Apache Avro specification: https://avro.apache.org/docs/1.8.0/spec.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Avro `timestamp-millis` logical type was placed as a field attribute instead of annotating the `long` schema. Updated the schema to use `{"type": "long", "logicalType": "timestamp-millis"}` and changed the fence to valid JSON.
- Strimzi `KafkaTopic` and `KafkaUser` examples used the older `kafka.strimzi.io/v1beta2` API. Updated them to the current `kafka.strimzi.io/v1` API used by current Strimzi documentation.
- The transactional producer ACLs omitted the cluster-level `IdempotentWrite` operation. Added it to the order service KafkaUser ACLs.
- The Kubernetes Deployment mounted only the KafkaUser Secret and used `ca.crt` as a truststore. Updated the example to mount both the KafkaUser Secret and the Strimzi cluster CA Secret, using PKCS#12 keystore and truststore settings.
- The Deployment referenced KafkaUser-generated Secrets from a different namespace without noting that Kubernetes Secrets are namespace-scoped. Updated comments to state that the user and cluster CA Secrets must be copied or synced into the application namespace.
- The Flux image automation example defined an ImageRepository and ImagePolicy but did not include the image policy marker or an ImageUpdateAutomation resource, so it would not actually update Git. Added the marker and ImageUpdateAutomation resource.
- The Flux `dependsOn` explanation overstated readiness guarantees. Added `wait: true` and `timeout` to the topic Kustomization and clarified that `dependsOn` must be combined with health checks or wait behavior to gate on readiness.
- The schema registry best-practice line claimed generic topic-level schema validation. Updated it to distinguish producer/consumer validation from broker-side validation available only in distributions that support it.

## Review Notes
- The Kafka CLI verification commands use the plaintext `9092` bootstrap service. They are valid Kafka commands, but they assume the Strimzi cluster exposes an internal plaintext listener. If the cluster is TLS-only, the commands need `--bootstrap-server production-kafka-bootstrap:9093` plus a client properties file.
