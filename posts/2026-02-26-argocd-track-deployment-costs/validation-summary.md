# Validation Summary: How to Track Deployment Costs per Application with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications and resource tracking
- Kubernetes Deployments, labels, namespaces, Pods, and PVCs
- kube-state-metrics and Prometheus recording rules
- Grafana dashboard JSON
- GitHub Actions
- Shell scripting with `kubectl`, `jq`, `awk`, and `bc`

## Sources Consulted
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/resource_tracking/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD sync options and `managedNamespaceMetadata`: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes recommended labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics label conversion documentation: https://github.com/kubernetes/kube-state-metrics
- GitHub-hosted runners documentation: https://docs.github.com/actions/reference/runners/github-hosted-runners
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- The Argo CD Application example said `managedNamespaceMetadata` ensured labels propagated to managed resources. That field applies labels and annotations to the destination namespace when namespace creation is enabled, so the comment was corrected and `CreateNamespace=true` was added.
- The Deployment example was not a valid `apps/v1` Deployment because it omitted `spec.selector` and the pod template container spec. Those fields were added.
- The examples queried Pods by `app.kubernetes.io/instance`, but the pod template did not set that label. The label was added to the Deployment metadata and pod template labels so workload-created Pods can be selected by the later `kubectl` and Prometheus examples.
- `argocd app resources payment-service --output json` is not supported by the official Argo CD command reference. The example now uses `argocd app get payment-service -o json` and reads `.status.resources[]`.
- `argocd app get payment-service --resource-tree` is not a documented flag. The example now uses `argocd app get payment-service --output tree`.
- The PromQL team rollup could produce a many-to-many vector matching error because multiple pod label series can exist for one application. The query now aggregates pod labels with `max by (label_app_kubernetes_io_instance, label_team)` before joining.
- The `actions/github-script` PR comment example did not await the REST API call. It now uses `await github.rest.issues.createComment(...)`.

## Review Notes
- The cost calculations are intentionally estimates based on resource requests and simple monthly unit prices; they do not model node bin-packing, reserved instances, spot pricing, idle/shared costs, network transfer, or cloud-specific storage classes.
- The Prometheus examples assume kube-state-metrics is deployed and configured to expose the Kubernetes labels used in the PromQL queries.
- The Prometheus recording rules cover CPU and memory costs. Storage is included in the shell script but not in the recording-rule total.
