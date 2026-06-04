# Validation Summary: How to Build a Custom Grafana Plugin for Kubernetes Topology Visualization

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana panel plugins
- Grafana Plugin Tools
- React
- TypeScript
- D3.js
- Kubernetes
- kube-state-metrics
- Prometheus

## Sources Consulted
- Grafana Plugin Tools: Build a panel plugin: https://grafana.com/developers/plugin-tools/tutorials/build-a-panel-plugin
- Grafana Plugin Tools: Get started: https://grafana.com/developers/plugin-tools
- Grafana Plugin Tools: Migrate from toolkit: https://grafana.com/developers/plugin-tools/migration-guides/migrate-from-toolkit
- Grafana Plugin Tools: Sign a plugin: https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin
- Grafana documentation: Plugin signatures: https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-sign/
- kube-state-metrics: Pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics: Service metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/service-metrics.md
- kube-state-metrics: Deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics: Node metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- Replaced deprecated `@grafana/toolkit` setup and signing commands with current `@grafana/create-plugin@latest` and `npm run sign` workflow.
- Added missing `metadata` fields to the `KubernetesNode` interface because later snippets read `node.metadata`.
- Removed an unused `TopologyData` import from the React panel example.
- Fixed the transformer snippet to implement previously missing `extractServices` and `extractDeployments` functions.
- Corrected kube-state-metrics usage: pod phase and owner data come from `kube_pod_status_phase` and `kube_pod_owner`, not only `kube_pod_info`; service labels come from `kube_service_labels`, and kube-state-metrics does not expose Service selectors directly.
- Updated the Prometheus query list to include `kube_pod_status_phase`, `kube_pod_owner`, `kube_pod_labels`, and `kube_service_labels`.
- Adjusted D3 TypeScript calls with explicit casts where Grafana plugin TypeScript builds commonly need them.
- Normalized generated namespace hue values so negative hash values do not produce negative HSL hues.

## Review Notes
The topology service-to-pod relationship remains a simplified label-convention example. A production plugin that needs exact Service selector matching should query Kubernetes API object specs through a backend component or another trusted API source, because kube-state-metrics service metrics do not expose the Service selector.
