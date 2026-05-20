# Validation Summary: How to Manage Data Pipeline Configuration with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD and ApplicationSet
- GitOps
- Kubernetes manifests, ConfigMaps, Jobs, CronJobs, and Namespaces
- Kustomize-style environment overlays
- Strimzi KafkaTopic and KafkaConnector custom resources
- Apache Flink Kubernetes Operator
- Confluent Schema Registry REST API
- GitHub CLI
- Bash

## Sources Consulted
- Argo CD ApplicationSet list generator documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/
- Argo CD ApplicationSet generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Strimzi 0.47.0 KafkaTopic documentation: https://strimzi.io/docs/operators/0.47.0/deploying.html
- Apache Flink Kubernetes Operator custom resource overview: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.9/docs/custom-resource/overview/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- Local `gh pr create --help` output

## Issues Found
- The schema registration Job looped over `/schemas/avro/*.avsc`, but the ConfigMap volume was mounted at `/schemas`, which would project `order-event.avsc` as `/schemas/order-event.avsc`. Changed the mount path to `/schemas/avro` so the file path matches the loop.
- The named Argo CD PostSync schema registration Job used only `HookSucceeded` as its hook delete policy. Changed it to `HookSucceeded,BeforeHookCreation` so repeated syncs can recreate the named hook resource cleanly, including after a previous unsuccessful run leaves the Job behind.

## Review Notes
- The sync-wave examples are intentionally partial manifests to demonstrate ordering annotations; they are not complete standalone Kubernetes resources because several custom resources omit their `spec`.
- The Strimzi `KafkaTopic` examples use `apiVersion: kafka.strimzi.io/v1beta2`, `spec.partitions`, `spec.replicas`, and Kafka topic `config` fields consistently with current Strimzi documentation.
- The Flink `FlinkDeployment` API group and version shown for sync ordering are consistent with the Apache Flink Kubernetes Operator documentation.
- The `gh pr create --title ... --body ...` command uses current GitHub CLI flags.
- Local CLI validation was limited because `kubectl`, `yamllint`, `shellcheck`, and Ruby were not installed in the workspace.
