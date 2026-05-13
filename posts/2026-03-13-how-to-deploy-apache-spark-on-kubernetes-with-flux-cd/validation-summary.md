# Validation Summary: How to Deploy Apache Spark on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Spark on Kubernetes
- Kubeflow Spark Operator
- SparkApplication custom resources
- Flux CD HelmRepository, HelmRelease, and Kustomization
- Kubernetes namespaces, service accounts, RBAC, Secrets, and pod logs
- Prometheus metrics

## Sources Consulted
- Kubeflow Spark Operator getting started guide: https://www.kubeflow.org/docs/components/spark-operator/getting-started/
- Kubeflow Spark Operator current chart values: https://raw.githubusercontent.com/kubeflow/spark-operator/master/charts/spark-operator-chart/values.yaml
- Kubeflow Spark Operator API reference: https://raw.githubusercontent.com/kubeflow/spark-operator/master/docs/api-docs.md
- Kubeflow Spark Operator example SparkApplication: https://raw.githubusercontent.com/kubeflow/spark-operator/master/examples/spark-pi.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Apache Spark 3.5.0 Kubernetes documentation: https://archive.apache.org/dist/spark/docs/3.5.0/running-on-kubernetes.html

## Issues Found
- The HelmRelease used `spec.createNamespace`, but Flux configures namespace creation under `spec.install.createNamespace`. I moved the setting under `install`.
- The HelmRelease pinned chart version `1.x`, but the current Kubeflow Spark Operator Helm repository is on the 2.x chart line. I updated the constraint to `2.x`.
- The Spark Operator Helm values used older or incorrect chart keys: top-level `metrics`, top-level `sparkJobNamespace`, and top-level `leaderElection.lockName`. I updated them to the current chart schema: `prometheus.metrics`, `spark.jobNamespaces`, and `controller.leaderElection.enable`.
- The webhook comment described SparkApplication validation, but the documented Spark Operator webhook is primarily for Spark pod customization, with validation used for specific features such as resource quota enforcement. I corrected the comment.
- The SparkApplication argument `--date=$(date +%Y-%m-%d)` would be passed literally by Kubernetes/Spark rather than shell-expanded. I replaced it with a literal example date.
- The S3 credential environment variables were only present on the driver. I added the same secret-backed variables to the executor spec so executor-side S3 access has credentials as well.
- The Flux `dependsOn` comment implied a dependency on the HelmRelease itself. Flux Kustomization dependencies refer to other Flux Kustomization objects, so I clarified that the name must be the Kustomization that reconciles the Spark Operator HelmRelease.
- The introduction and conclusion overstated cleanup and failure tracking. I adjusted the text to describe cleanup policies for completed applications and Git tracking of Spark job spec changes rather than failed runtime state.

## Review Notes
The local `helm`, `kubectl`, and `flux` binaries were not installed in the review workspace, so CLI syntax was checked against official documentation rather than local `--help` output. The example assumes the referenced `aws-credentials` Secret exists in `spark-jobs` and that the custom Spark image includes the Python application plus any required S3/Hadoop dependencies.
