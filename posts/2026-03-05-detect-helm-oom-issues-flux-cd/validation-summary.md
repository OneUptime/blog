# Validation Summary: How to Detect Helm OOM Issues with Flux CD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes
- kubectl
- Kustomize
- HelmRelease custom resources
- Prometheus and Prometheus Operator
- Flux notification-controller

## Sources Consulted
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux Helm Controller documentation: https://fluxcd.io/flux/components/helm/
- Flux Helm Controller options: https://fluxcd.io/flux/components/helm/options/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux near OOM detection for Helm: https://fluxcd.io/flux/installation/configuration/helm-oom-detection/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Current Flux install manifests: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The drift detection explanation was too specific about Flux holding both desired and live state in memory. Updated it to match Flux documentation: drift detection uses server-side dry-run comparison between the Helm storage manifest and current cluster state.
- The frequent reconciliation explanation implied short intervals increase concurrency. Updated it to clarify that short intervals keep reconciliation workers busy more often; actual parallelism is bounded by the helm-controller `--concurrent` setting.
- The post did not mention Flux's built-in near-OOM watcher for helm-controller. Added the documented `OOMWatch` feature gate example because it is directly relevant to detecting Helm controller memory pressure before Kubernetes forcefully kills the pod.

## Review Notes
- Current Flux documentation lists Kubernetes v1.33+ support requirements for current releases, with v1.34 requiring at least v1.34.1.
- The current Flux install manifest sets helm-controller `limits.memory` to `1Gi` and `requests.memory` to `64Mi`; increasing those values for large charts or many HelmReleases is a valid mitigation.
- HelmRelease `apiVersion: helm.toolkit.fluxcd.io/v2`, `.spec.maxHistory`, and `.spec.driftDetection.mode` are current and valid.
- Flux Alert `apiVersion: notification.toolkit.fluxcd.io/v1beta3`, `.spec.eventSources`, and `.spec.eventSeverity` are current and valid.
- The Prometheus alerting examples assume kube-state-metrics and cAdvisor/container metrics are scraped with the labels shown; some Prometheus installations may use different labels or omit `container_spec_memory_limit_bytes`.
