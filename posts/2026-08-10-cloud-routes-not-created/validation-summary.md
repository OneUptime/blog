# Validation Summary: Why Cloud Routes Are Not Created by cloud-controller-manager

## Status
validated

## Post Type
Troubleshooting guide and technical reference

## Technologies Covered

- Kubernetes v1.35 and v1.36
- Kubernetes Cloud Controller Manager (CCM)
- `k8s.io/cloud-provider` v0.36.0 route controller and `Routes` interface
- Node Pod CIDR allocation, including dual-stack `.spec.podCIDRs`
- Cloud route tables, provider permissions, quotas, and audit logs
- CNI networking models, overlays, BGP, and provider-native networking
- `kubectl`, `jq`, Kubernetes Events, Node conditions, and Prometheus metrics

## Sources Consulted

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: kube-controller-manager Configuration API](https://kubernetes.io/docs/reference/config-api/kube-controller-manager-config.v1alpha1/)
- [Kubernetes: Feature Gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes: Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes v1.35: Watch Based Route Reconciliation in the Cloud Controller Manager](https://kubernetes.io/blog/2025/12/30/kubernetes-v1-35-watch-based-route-reconciliation-in-ccm/)
- [Kubernetes v1.36: New Metric for Route Sync in the Cloud Controller Manager](https://kubernetes.io/blog/2026/05/15/ccm-new-metric-route-sync-total/)
- [Kubernetes cloud-provider v0.36.0: Route Controller Startup](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)
- [Kubernetes cloud-provider v0.36.0: Route Reconciliation](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/route/route_controller.go)
- [Kubernetes cloud-provider v0.36.0: Route Controller Metric](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/route/metrics.go)
- [Kubernetes cloud-provider v0.36.0: Provider and Routes Interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)
- [Kubernetes cloud-provider v0.36.0: Canonical Controller Names and Aliases](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/names/controller_names.go)
- [Kubernetes cloud-provider v0.36.0: Controller Manager Resync Period](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/controllermanager.go)
- [jq 1.8 Manual](https://jqlang.org/manual/v1.8/)

## Issues Found

- The unsupported-provider warning was shown as two log lines, but upstream v0.36.0 emits one warning message. The example was changed to the exact single-line message.
- The controller-selection discussion named only the legacy `route` alias and described canonical names vaguely. It now identifies `node-route-controller` as the v0.36.0 canonical name and `route` as its backward-compatible alias, while retaining the downstream-provider caveat.
- The route pipeline and condition explanation overstated `NetworkUnavailable` as a complete reconciliation result. They now describe `RouteCreated` and `NoRouteCreated` in terms of resolved or unresolved per-Node create/update actions and clarify that `ListRoutes` failures leave the condition unchanged while `DeleteRoute` failures are logged.
- The stale-route paragraph did not fully qualify deletion scope. It now states that the controller considers routes returned by `ListRoutes(clusterName)` and applies its configured cluster-CIDR responsibility filter before deleting blackhole or stale routes.
- The watch-based cleanup resync was presented as an unconditional 12-to-24-hour interval. It is randomized from `--min-resync-period` to twice that value; 12 to 24 hours is the default range. The text was corrected accordingly.
- The v1.36 route-sync counter was described as incrementing when routes are synchronized. Upstream increments it before `ListRoutes`, so it counts synchronization attempts, including failures. The wording now states this exact behavior.

## Review Notes

- All shell commands and filters are syntactically valid. The `kubectl` resource selection, field selector, sorting, log duration, custom columns, and `jq` Pod CIDR extraction were checked; no command changes were needed.
- `CloudControllerManagerWatchBasedRoutesReconciliation` and `route_controller_route_sync_total` are alpha in Kubernetes v1.36. A downstream provider CCM must vendor the corresponding upstream `k8s.io/cloud-provider` code; watch-based behavior also requires the feature gate to be enabled, and the metric is registered when the route controller is constructed.
- All external links in the post resolved to the described official documentation or tagged upstream source during validation.
