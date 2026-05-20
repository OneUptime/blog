# Validation Summary: How to Deploy Apache Flink with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Flink
- Flink Kubernetes Operator
- ArgoCD
- Kubernetes
- Helm
- Prometheus / ServiceMonitor
- S3-compatible state storage

## Sources Consulted
- Apache Flink Kubernetes Operator 1.8 Helm documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.8/docs/operations/helm/
- Apache Flink Kubernetes Operator 1.8 custom resource reference: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.8/docs/custom-resource/reference/
- Apache Flink Kubernetes Operator 1.8 job management documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.8/docs/custom-resource/job-management/
- Apache Flink Kubernetes Operator 1.8 autoscaler documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.8/docs/custom-resource/autoscaler/
- Apache Flink Kubernetes Operator 1.8 configuration reference: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.8/docs/operations/configuration/
- Apache Flink 1.18 state backend documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/state/state_backends/
- Apache Flink 1.18 Kubernetes HA documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/ha/kubernetes_ha/
- Apache Flink 1.18 metric reporter documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/metric_reporters/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/

## Issues Found
- The ArgoCD note said the Flink operator updates `spec.job.savepointTriggerNonce`. The official operator documentation says users trigger a savepoint by changing that nonce, and savepoint information is stored in status. Updated the explanation to say this ignore rule is useful when savepoints are triggered outside Git.
- The autoscaling example used `scheduler-mode: reactive` while describing Flink operator autoscaling. For Flink Kubernetes Operator 1.8 in-place scaling, the documented scheduler setting is `jobmanager.scheduler: adaptive`. Updated the snippet and wording.
- The autoscaling example used the old `kubernetes.operator.job.autoscaler.*` prefix. Operator 1.8 documentation notes that FLIP-334 removed the `kubernetes.operator.` prefix from autoscaler options. Updated the keys to `job.autoscaler.*`.

## Review Notes
- The operator version in the post is 1.8.0 and the FlinkDeployment examples use `flinkVersion: v1_18`, which are compatible in the operator 1.8 reference.
- The Helm chart source format, FlinkDeployment fields, `upgradeMode: savepoint`, S3-backed checkpoint/savepoint paths, Kubernetes HA configuration, and Prometheus reporter keys align with the cited official documentation.
- The ServiceMonitor assumes a matching Kubernetes Service exposes a port named `metrics`; in production, verify the generated Service labels and port names for the specific Flink deployment or add an explicit Service.
