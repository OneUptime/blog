# Validation Summary: How to Configure Kafka MirrorMaker with Strimzi via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka MirrorMaker 2
- Strimzi Operator and `KafkaMirrorMaker2` / `KafkaUser` custom resources
- Kubernetes
- Flux CD Kustomizations
- Kafka TLS authentication and ACL authorization

## Sources Consulted
- Strimzi 0.42.0 Deploying and Managing documentation: https://strimzi.io/docs/operators/0.42.0/full/deploying
- Strimzi 0.42.0 Configuring documentation and CRD schema reference: https://strimzi.io/docs/operators/0.42.0/configuring.html
- Strimzi latest Deploying documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi latest Custom Resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Apache Kafka 3.7 MirrorMaker configuration reference: https://kafka.apache.org/37/configuration/mirrormaker-configs/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The `KafkaMirrorMaker2` example omitted `spec.connectCluster`, which is required for the Strimzi `v1beta2` API shape used with Kafka 3.7.1. Added `connectCluster: target` so Kafka Connect internal topics are associated with the target cluster alias.
- The MirrorMaker namespace/secret relationship was incomplete. Strimzi mounts referenced TLS user and CA secrets from the namespace where MirrorMaker runs, so the post now states that the generated Kafka user and cluster CA secrets must be present in that namespace.
- The source connector config included `source.cluster.alias`, which is not a documented Apache Kafka MirrorMaker 2 source connector configuration property. Removed it and kept the explanation that the default replication policy prefixes mirrored topics with the source alias.
- The connector status command used an incorrect connector name and left `>` characters unquoted, which would be interpreted by the shell as redirection. Updated the command to quote the URL and use Strimzi's documented connector naming format: `source->target.MirrorSourceConnector`.
- The consumer group check command used a duplicate namespace flag and an inconsistent pod name. Updated it to execute against `target-cluster-kafka-0` in the `kafka-target` namespace.

## Review Notes
The post is technically valid for a Strimzi `v1beta2` deployment aligned with Kafka 3.7.1, such as Strimzi 0.42.0. Newer Strimzi releases introduce the `v1` `KafkaMirrorMaker2` API shape, where target cluster configuration moves to `.spec.target`, and current Strimzi documentation notes changes around heartbeat connector configuration. A future refresh should update the examples to the latest Strimzi API if the article is intended to target current Strimzi rather than Kafka 3.7.1-era deployments.
