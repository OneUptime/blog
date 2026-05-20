# Validation Summary: How to Implement GitOps for Data Pipelines with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD Applications, automated sync, sync options, and sync waves
- Kubernetes manifests and Deployments
- Strimzi Kafka Operator, KafkaNodePool, Kafka, and KafkaTopic resources
- Apache Airflow Helm chart
- Kubeflow Spark Operator and ScheduledSparkApplication resources
- Apache Flink Kubernetes Operator and FlinkDeployment resources
- Confluent Schema Registry
- Prometheus Operator PrometheusRule resources

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Strimzi latest deploying guide and KRaft examples: https://strimzi.io/docs/operators/latest/deploying
- Strimzi latest custom resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Apache Kafka ZooKeeper deprecation notes: https://kafka.apache.org/36/operations/zookeeper/
- Apache Airflow Helm chart documentation: https://airflow.apache.org/docs/helm-chart/stable/index.html
- Apache Airflow Helm chart parameters reference: https://airflow.apache.org/docs/helm-chart/stable/parameters-ref.html
- Kubeflow Spark Operator getting started guide: https://www.kubeflow.org/docs/components/spark-operator/getting-started/
- Kubeflow Spark Operator API docs: https://kubeflow.github.io/spark-operator/docs/api-docs.html
- Apache Flink Kubernetes Operator custom resource overview: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.10/docs/custom-resource/overview/
- Confluent Schema Registry Docker configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- PrometheusRule API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1
- Bitnami PostgreSQL chart parameters: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md

## Issues Found
- The Strimzi Kafka examples used `kafka.strimzi.io/v1beta2` and a ZooKeeper-based Kafka cluster. Current Strimzi examples use `kafka.strimzi.io/v1` with KRaft and `KafkaNodePool`, so the Kafka cluster and topic examples were updated to the current API and a KRaft node pool.
- The Airflow chart example pinned chart `1.13.0` and used `postgresql.persistence.size`, which does not match the Bitnami PostgreSQL subchart shape. Updated the chart to `1.21.0`, changed PostgreSQL persistence to `postgresql.primary.persistence.size`, and changed git-sync polling to the current `period`/`ref` values.
- The Spark Operator chart was pinned to `2.0.0` while the current release is `2.5.0`. Updated the chart target revision.
- The `ScheduledSparkApplication` example used the Airflow macro `{{ ds }}`, but Spark Operator schedules do not render Airflow DAG macros. Replaced it with a plain scheduled-job argument.
- The Schema Registry `Deployment` selector did not match any pod template labels, making the manifest invalid. Added matching `template.metadata.labels`.
- The sync-wave wording implied independent ArgoCD Applications would be globally ordered. Clarified that waves order resources within the same sync operation, such as a parent app-of-apps pattern.

## Review Notes
- The examples are still illustrative and assume required operators, CRDs, service accounts, object storage credentials, container images, and metrics exporters exist in the cluster.
- Embedded PostgreSQL in the Airflow chart is useful for examples but should normally be replaced with an externally managed production database.
