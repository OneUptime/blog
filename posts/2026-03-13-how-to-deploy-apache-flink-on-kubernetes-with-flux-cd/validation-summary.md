# Validation Summary: How to Deploy Apache Flink on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Flink
- Apache Flink Kubernetes Operator
- Kubernetes
- Flux CD
- HelmRepository and HelmRelease
- Kustomization
- FlinkDeployment and FlinkStateSnapshot custom resources
- S3-compatible checkpoint and savepoint storage

## Sources Consulted
- Apache Flink Kubernetes Operator Helm documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.13/docs/operations/helm/
- Apache Flink Kubernetes Operator Job Management documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.13/docs/custom-resource/job-management/
- Apache Flink Kubernetes Operator CRD Reference: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.13/docs/custom-resource/reference/
- Apache Flink Kubernetes Operator Snapshots documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.13/docs/custom-resource/snapshots/
- Apache Flink 1.20 configuration reference: https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/deployment/config/
- Apache Flink 1.20 Amazon S3 filesystem documentation: https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/deployment/filesystems/s3/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The HelmRepository and HelmRelease examples used Apache Flink Kubernetes Operator 1.9.0. Updated them to 1.13.x, matching the current operator documentation consulted during review.
- The Helm values used `operatorConfiguration` and top-level `resources`, which are not the documented chart value keys. Changed them to `defaultConfiguration` and `operatorPod.resources`.
- The operator metrics keys were missing the `kubernetes.operator.` prefix required for operator metrics configuration. Updated the Prometheus reporter keys accordingly.
- The checkpoint configuration used older state backend and checkpoint directory keys. Replaced them with `state.backend.type`, `execution.checkpointing.storage`, `execution.checkpointing.incremental`, `execution.checkpointing.dir`, and `execution.checkpointing.savepoint-dir`.
- The S3 prerequisite did not mention the required S3 filesystem plugin in the Flink image. Added that prerequisite and simplified the S3 endpoint configuration to the documented Flink key.
- The FlinkDeployment used `flinkVersion: v1_18`; updated it to `v1_20`, which is supported by the current operator reference and matches the Flink configuration references checked.
- The high availability configuration used the implementation class directly. Updated it to the documented `high-availability.type: KUBERNETES` setting.
- The FlinkDeployment used `serviceAccount: flink-service-account` without creating matching RBAC. Changed it to the Helm chart's default job service account name, `flink`.
- The job used `upgradeMode: stateful`, which is not a valid operator value. Replaced it with `upgradeMode: savepoint` and updated surrounding text and best practices.
- The job used `savepointTriggerNonce` with a misleading restore comment. Removed it from the main job spec and changed the manual savepoint workflow to use a `FlinkStateSnapshot` resource.
- The manual savepoint status command read from the deprecated `FlinkDeployment` savepoint status. Updated it to read `.status.path` from the `FlinkStateSnapshot`.
- The Flux Kustomization `dependsOn` example pointed at a HelmRelease name, but Flux Kustomization dependencies refer to other Kustomization objects. Updated the example to depend on the Kustomization that applies the infrastructure HelmRelease.
- The best-practice note about referencing a ConfigMap from `FlinkDeployment` was too specific for the operator CRD. Reworded it to recommend reusable shared manifests or overlays.

## Review Notes
The edited YAML snippets were parsed successfully with PyYAML. The examples remain illustrative and still require real namespaces, secrets, bucket names, image names, and repository structure in a production cluster.
