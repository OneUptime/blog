# Validation Summary: How to Deploy Apache Beam Runner on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Beam
- Apache Flink Runner
- Apache Flink Kubernetes Operator
- Kubernetes Jobs and CronJobs
- Kubernetes RBAC
- Flux CD HelmRelease
- Flux CD Kustomization

## Sources Consulted
- Apache Beam Flink Runner documentation: https://beam.apache.org/documentation/runners/flink/
- Apache Beam SDK Harness Configuration: https://beam.apache.org/documentation/runtime/sdk-harness-config/
- Apache Flink Kubernetes Operator Helm documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.14/docs/operations/helm/
- Apache Flink Kubernetes Operator custom resource overview: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.14/docs/custom-resource/overview/
- Apache Flink Kubernetes Operator CRD reference: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-release-1.14/docs/custom-resource/reference/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes TTL-after-finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The post described a "Kubernetes-based Portable Runner" that could execute directly on Kubernetes without Flink or Spark. Apache Beam runners execute on supported backends; the corrected text now describes the Kubernetes pattern as submitting Beam jobs to Flink running in the cluster.
- The HelmRelease used Flink Kubernetes Operator `1.9.x`, which is outdated for a current 2026 tutorial. Updated the chart version to `1.14.x`.
- The Flink operator was configured to watch `beam-jobs`, but the `FlinkDeployment` resource is created in `beam-infrastructure`. Updated `watchNamespaces` to `beam-infrastructure`.
- The Flink session cluster used the stock `flink:1.18-scala_2.12-java11` image while the examples submit Python Beam pipelines with a `PROCESS` SDK harness. Updated the prerequisite and example image to require a custom Flink image containing Python, `apache_beam`, worker dependencies, and the Beam SDK harness bootloader.
- The `FlinkDeployment` used `serviceAccount: flink-service-account`, but the referenced service account was not created by the examples. Updated it to the Flink operator chart's default job service account name, `flink`.
- The session cluster snippet set `mode: session`, but the Flink Kubernetes Operator defines session clusters by omitting the `job` spec; `mode` controls native versus standalone Kubernetes deployment mode. Removed the invalid session mode setting.
- The Beam Job and CronJob used `--environment_type=EXTERNAL` with `beam-job-runner:50000`, but no external SDK worker pool Service was defined. Updated the examples to use the Beam `PROCESS` environment with a bootloader command.
- The Kubernetes Job and CronJob passed `$(date ...)` directly as container args, which Kubernetes does not shell-expand. Updated the commands to run through `/bin/sh -c` so the date values are evaluated at runtime.
- The Flux `beam-infrastructure` Kustomization used `dependsOn` to reference a HelmRelease. Flux Kustomization dependencies only reference other Kustomization objects. Removed that dependency from the example.

## Review Notes
The corrected examples assume the referenced `HelmRepository`, namespaces, secrets, object-store credentials, and custom Beam/Flink image are supplied elsewhere in the repository. For a production post, a future improvement would be to show the custom image build or an external SDK worker pool manifest, but that would be additional content rather than a correction to the existing tutorial.
