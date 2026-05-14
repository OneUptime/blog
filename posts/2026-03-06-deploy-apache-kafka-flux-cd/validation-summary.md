# Validation Summary: How to Deploy Apache Kafka with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Bitnami Kafka Helm chart
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Namespace, Job, and Pod manifests
- Kustomize
- Prometheus JMX exporter and ServiceMonitor

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Bitnami Kafka chart README for chart 30.1.8: https://raw.githubusercontent.com/bitnami/charts/kafka/30.1.8/bitnami/kafka/README.md
- Bitnami Kafka chart values for chart 30.1.8: https://raw.githubusercontent.com/bitnami/charts/kafka/30.1.8/bitnami/kafka/values.yaml
- Bitnami Kafka chart templates for generated SASL Secret and client notes: https://raw.githubusercontent.com/bitnami/charts/kafka/30.1.8/bitnami/kafka/templates/secrets.yaml and https://raw.githubusercontent.com/bitnami/charts/kafka/30.1.8/bitnami/kafka/templates/NOTES.txt
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/39/operations/kraft/
- Apache Kafka quickstart and topic CLI examples: https://kafka.apache.org/quickstart
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The introduction said the guide included ZooKeeper setup even though the manifests deploy KRaft mode without ZooKeeper. Changed this to KRaft controller setup.
- The storage prerequisite said 100 GB, but the example requests 3 broker PVCs of 50Gi plus 3 controller PVCs of 10Gi. Updated the prerequisite to recommend at least 200 GB.
- The Bitnami chart values used root-level `pdb` and `podAntiAffinityPreset` settings, which are not the correct chart 30.x paths. Moved them under `controller` and `broker`.
- The intended architecture described 3 controllers and 3 brokers, but Bitnami chart 30.x controller nodes also run brokers unless `controller.controllerOnly` is set. Added `controllerOnly: true`.
- The metrics example used `metrics.kafka.enabled`, which is not a Bitnami Kafka chart 30.x value. Moved the resource settings under `metrics.jmx`.
- The Kafka CLI examples used a SASL listener but did not provide client authentication configuration. Added `client.properties` generation from the Bitnami-generated `kafka-user-passwords` Secret and passed it with the correct Kafka CLI flags.
- Step 7 claimed to deploy a producer and consumer but only included a producer manifest. Renamed the step and description to match the content.
- The verification section used `kafka-metadata.sh`, which is not the documented KRaft quorum status tool. Replaced it with `kafka-metadata-quorum.sh describe --status` and added SASL command config usage for verification commands.

## Review Notes
- The post pins the Bitnami Kafka chart to `30.x`. Later Bitnami chart versions have changed some KRaft-related values, so the examples should be revisited before changing the chart constraint.
- The topic creation Job is acceptable for a basic GitOps example, but a dedicated Kafka operator or topic management tool would provide a stronger long-term reconciliation model for production topic lifecycle management.
