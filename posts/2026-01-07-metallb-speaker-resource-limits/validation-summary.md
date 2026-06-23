# Validation Summary: How to Configure MetalLB Speaker Resource Limits

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- MetalLB
- Kubernetes DaemonSets, Services, ResourceQuota, PriorityClass, tolerations, resource requests and limits
- Helm
- Kustomize
- Prometheus Operator ServiceMonitor and PrometheusRule
- Prometheus / PromQL
- Grafana dashboard JSON
- Vertical Pod Autoscaler

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB v0.14.5 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
- MetalLB v0.14.5 Helm values: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/charts/metallb/values.yaml
- MetalLB v0.14.5 Helm speaker template: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/charts/metallb/templates/speaker.yaml
- MetalLB v0.14.5 Helm ServiceMonitor template: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/charts/metallb/templates/servicemonitor.yaml
- MetalLB GitHub latest release metadata: https://api.github.com/repos/metallb/metallb/releases/latest
- Kubernetes resource requests and limits documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Vertical Pod Autoscaler API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Several DaemonSet examples defined `spec.selector.matchLabels` but omitted matching `spec.template.metadata.labels`. Kubernetes requires the selector to match the pod template labels, so the examples would be rejected or invalid as full DaemonSet manifests. Added matching pod template labels.
- The resource-usage factors listed "Network traffic volume", which could imply service data-plane traffic passes through the MetalLB speaker. MetalLB speaker announces addresses and handles control-plane activity; it does not proxy service traffic. Reworded this to ARP/NDP request volume or BGP control-plane activity.
- Helm toleration examples omitted `operator: Exists` for common control-plane taints. Added `operator: Exists` to match the official chart's toleration shape and avoid depending on empty taint values.
- The memory sizing formula and memory distribution chart were presented too definitively. Reworded them as approximate starting points that must be validated with observed cluster usage.
- The Kustomize example used `commonLabels`, which modern Kustomize warns is deprecated. Replaced it with the current `labels` field format.
- The ServiceMonitor example selected a Service but did not define one. Added a headless Service with matching labels and a named `monitoring` port, plus an explicit namespace selector in the ServiceMonitor.
- Prometheus queries used `pod=~"speaker-.*"`, which matches native manifest pod names but can miss Helm-generated names such as `metallb-speaker-*`. Broadened the regex to `.*speaker.*`.
- The "Complete Production Configuration" snippet was not truly complete because it assumed standard MetalLB RBAC, service accounts, memberlist secret, webhook resources, and configmap existed. Renamed the section to "Production Speaker Configuration" and stated those assumptions.
- The production speaker example omitted the upstream `metallb-excludel2` volume mount and used an unnecessary memberlist `hostPort`. Added the exclude-interface mount/configmap and removed memberlist host ports.
- The `node.kubernetes.io/not-ready` toleration used `NoSchedule`, while Kubernetes commonly uses a `NoExecute` not-ready taint for eviction behavior. Updated it to `NoExecute` with `operator: Exists`.

## Review Notes
- The post still uses MetalLB `v0.14.5` in examples. That is valid for the version shown, but the latest GitHub release metadata checked during review reported `metallb-chart-0.16.1` published on 2026-05-27. Readers should check the current MetalLB release and generated manifests before copying production configuration.
- The article focuses on the `speaker` container. Helm's current MetalLB chart can also run FRR, reloader, and metrics sidecars for BGP mode; those containers have separate resource settings and may need their own sizing.
- All fenced YAML and JSON snippets were parsed successfully after the edits, and DaemonSet selector/template-label consistency was checked.
