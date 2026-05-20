# Validation Summary: ArgoCD for Telecom: Network Function Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications, sync waves, ApplicationSets, AppProjects, sync windows, and custom health checks
- Kubernetes Deployments, rolling updates, Pod Disruption Budgets, huge pages, node selectors, tolerations, and extended resources
- Multus NetworkAttachmentDefinition and SR-IOV CNI resource attachments
- Prometheus Operator PrometheusRule resources and Prometheus alerting rules
- Cloud-native telecom / 5G CNF deployment patterns

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD resource health customization: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes huge pages documentation: https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/
- Kubernetes resource managers / CPU Manager documentation: https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Multus CNI usage guide: https://k8snetworkplumbingwg.github.io/multus-cni/docs/how-to-use.html
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The secondary Argo CD `Application` examples were incomplete because they omitted `metadata.namespace`, `source.repoURL`, `source.targetRevision`, and `destination.server`. Added those fields so the examples match the official Application spec.
- The sync-wave explanation implied that waves alone guarantee child Application readiness. Clarified that app-of-apps deployments need Argo CD Application health assessment restored for later waves to wait for earlier Applications to become healthy.
- The UPF `apps/v1` Deployment omitted the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels`.
- The UPF SR-IOV example requested two interfaces but did not attach Multus networks to the pod and only defined one `NetworkAttachmentDefinition`. Added the `k8s.v1.cni.cncf.io/networks` annotation, CNI `name` fields, and a second SR-IOV network attachment for N6.
- The UPF comment described node selection as CPU pinning. Adjusted it to describe scheduling to performance-profile nodes; CPU exclusivity depends on Kubernetes CPU Manager configuration and Guaranteed pods.
- The custom Argo CD health check returned an empty health object when `.status` was absent. Added a default `Progressing` status and message, consistent with Argo CD health check examples.
- The AMF `apps/v1` Deployment omitted the required `spec.selector` and matching pod template labels. Added both fields.
- The sync-window snippet showed only a nested `spec.syncWindows` block and used an all-day `allow` window that would permit automated syncs continuously. Converted it into a complete `AppProject` manifest and kept emergency changes as manual overrides on the maintenance window.
- The final OneUptime link pointed to an unrelated gaming deployments URL. Updated it to the main OneUptime URL.

## Review Notes
The remaining examples are illustrative and depend on environment-specific CNF images, CRDs, node labels, SR-IOV device plugin resources, Argo CD project permissions, Prometheus metric names, and telecom function behavior. The Kubernetes and Argo CD API usage is now consistent with the consulted official documentation.
