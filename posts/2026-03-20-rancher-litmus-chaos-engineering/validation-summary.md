# Validation Summary: How to Set Up Chaos Engineering with Litmus on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- LitmusChaos
- ChaosCenter
- Rancher
- Rancher Monitoring
- Kubernetes
- Helm
- GitHub Actions
- Prometheus
- PromQL

## Sources Consulted
- CNCF project status for LitmusChaos: https://www.cncf.io/blog/2022/01/11/litmuschaos-becomes-a-cncf-incubating-project/
- Litmus docs home: https://docs.litmuschaos.io/
- Litmus Helm repo: https://litmuschaos.github.io/litmus-helm/
- Litmus Helm chart README: https://github.com/litmuschaos/litmus-helm/blob/master/README.md
- Litmus core Helm chart README: https://github.com/litmuschaos/litmus-helm/blob/master/charts/litmus-core/README.md
- Litmus `litmus` chart values: https://github.com/litmuschaos/litmus-helm/blob/master/charts/litmus/values.yaml
- Litmus `litmus-core` chart values: https://github.com/litmuschaos/litmus-helm/blob/master/charts/litmus-core/values.yaml
- Litmus Chaos Charts repository: https://github.com/litmuschaos/chaos-charts
- Pod Delete experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- Pod CPU Hog docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-cpu-hog/
- Node Drain docs: https://litmuschaos.github.io/litmus/experiments/categories/nodes/node-drain/
- ChaosEngine runtime details: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-engine/runtime-details/
- HTTP probe docs: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/httpProbe/
- Prometheus probe docs: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/promProbe/
- ChaosResult status spec: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-result/status-specification/
- Litmus chaos exporter metrics: https://github.com/litmuschaos/chaos-exporter
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Prometheus comparison operator semantics: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Rancher Prometheus configuration: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher ServiceMonitor and PodMonitor guidance: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors

## Issues Found
- The post described LitmusChaos as a CNCF-graduated project. Current CNCF sources still list LitmusChaos as incubating, so this was corrected.
- The install section only installed the `litmus` chart, which provides ChaosCenter, but the later `ChaosEngine` and `ChaosResult` examples require the execution plane as well. The post was updated to install `litmus-core` with `operatorMode=admin`, plus the ChaosCenter chart.
- The Helm install example used an invalid current chart value (`portal.server.graphqlServer.replicaCount`) and referenced an outdated frontend service name. These were replaced with the supported current chart values and the correct generated service name.
- The ChaosHub commands used old `charts/generic/.../experiments.yaml` paths that no longer resolve. They were replaced with working `faults/kubernetes/.../fault.yaml` URLs from the current ChaosHub API.
- The pod-level ChaosEngine examples installed experiments in `litmus` but created ChaosEngines in `production`, which breaks namespaced experiment lookup and service-account usage. The examples were corrected to run the ChaosEngines in `litmus` while targeting workloads in `production` via `appinfo.appns`.
- The pod delete, pod CPU hog, and probe examples were missing execution fields needed for reliable runs with the current setup (`engineState`, `annotationCheck`, and `chaosServiceAccount`). These were added and aligned to the installed `litmus-admin` RBAC.
- The node drain example omitted the requirement to cordon the target node before running the drain experiment. A corrective note was added because the official docs call this out as a prerequisite.
- The Prometheus alert rule used the wrong Litmus metric label names (`verdict` and `chaosengine`). These were corrected to `chaosresult_verdict` and `chaosengine_name` based on the exporter’s documented metric labels.
- The GitHub Actions example exported `KUBECONFIG` only inside a single step, so later steps would not see it. This was fixed by writing `KUBECONFIG` into `$GITHUB_ENV`.
- The GitHub Actions example queried the wrong namespace and used the wrong JSONPath field casing for ChaosResult (`experimentstatus` instead of `experimentStatus`). Both were corrected.
- The probe example used invalid current probe syntax: duration strings like `5s` where Litmus expects integer probe run properties, an unsupported `comparator.type` field, and a PromQL expression that was compared as if it returned `1`/`0`. The probe example was updated to use valid integer run properties, remove the unsupported field, and compare the numeric error-rate expression directly against `0.01`.

## Review Notes
- The monitoring examples assume Rancher Monitoring is installed and that the cluster Prometheus still uses the default `rancher-monitoring` release label for ServiceMonitor discovery.
- The Prometheus probe endpoint is cluster-specific, so the example now uses a placeholder service name instead of a misleading hard-coded default.
- Litmus documentation currently shows some inconsistencies around defaults such as `annotationCheck` and `jobCleanUpPolicy`; the post now sets explicit values instead of relying on ambiguous defaults.
