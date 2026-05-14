# Validation Summary: How to Deploy Goldilocks for Resource Recommendations with Flux CD - Cd

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Fairwinds Goldilocks
- Kubernetes Vertical Pod Autoscaler
- Metrics Server
- kube-state-metrics
- Prometheus Operator PrometheusRule
- NGINX Ingress basic authentication

## Sources Consulted
- Fairwinds Goldilocks advanced usage documentation: https://goldilocks.docs.fairwinds.com/advanced/
- Fairwinds Goldilocks Helm chart values from https://charts.fairwinds.com/stable/goldilocks-9.1.0.tgz
- Fairwinds VPA Helm chart values from https://charts.fairwinds.com/stable/vpa-4.7.2.tgz
- Fairwinds Helm repository index: https://charts.fairwinds.com/stable/index.yaml
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA flags documentation: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- kube-state-metrics VPA custom resource metric documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- ingress-nginx basic authentication documentation: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/

## Issues Found
- The Goldilocks Helm values placed `exclude-containers` under `controller.flags`, but Goldilocks documents this as a dashboard/summary display option and workload label, not a controller flag. Removed the controller flag and set `dashboard.excludeContainers` instead.
- The deployment example used `goldilocks.fairwinds.com/exclude-containers` as an annotation. Goldilocks documents container exclusions as workload labels, so the example now uses a label while keeping `vpa-update-mode` as an annotation.
- The Prometheus example attempted to scrape a nonexistent Goldilocks controller service and used outdated/nonstandard VPA metric names. Replaced it with a PrometheusRule based on kube-state-metrics VPA recommendation metrics.
- The Flux Kustomization example was shown as `clusters/my-cluster/goldilocks/kustomization.yaml`, which would conflict with Kustomize's own `kustomization.yaml` handling. Moved it to `clusters/my-cluster/flux-system/goldilocks-kustomization.yaml`.
- The Flux Kustomization health checks targeted Helm-rendered Deployments. Updated them to check the `HelmRelease` resources directly, matching Flux guidance for Kustomizations that apply HelmRelease objects.
- The Flux CLI verification command used `flux get helmrelease`; the official command is `flux get helmreleases`.
- The VPA recommender log selector used `app=vpa-recommender`, which does not match the Fairwinds VPA chart labels. Updated it to the chart's `app.kubernetes.io/*` labels.
- The Ingress example referenced an NGINX basic auth secret without noting the required htpasswd-backed `auth` key. Added a short prerequisite note before the Ingress manifest.

## Review Notes
The VPA Prometheus alert examples assume kube-state-metrics is configured to expose VerticalPodAutoscaler custom resource metrics. The post now states that prerequisite explicitly.
