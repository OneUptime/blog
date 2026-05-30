# Validation Summary: How to Troubleshoot AKS etcd Latency Issues Affecting API Server Responsiveness

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes API server
- etcd
- Azure Monitor metrics and diagnostic logs
- KQL
- PromQL
- kubectl
- Azure CLI
- Kubernetes Jobs, Events, Secrets, ConfigMaps, ReplicaSets, and CronJobs

## Sources Consulted
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Jobs and TTL-after-finished cleanup: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL controller for finished resources: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes Secrets size limit: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes ConfigMaps size limit: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes kube-apiserver options, including event TTL: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- etcd performance guide: https://etcd.io/docs/v3.5/op-guide/performance/
- etcd hardware recommendations: https://etcd.io/docs/v3.3/op-guide/hardware/
- AKS monitoring documentation: https://learn.microsoft.com/en-us/azure/aks/monitor-aks
- AKS control plane metrics documentation: https://learn.microsoft.com/en-us/azure/aks/control-plane-metrics-monitor
- Azure Monitor supported metrics for Microsoft.ContainerService/managedClusters: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerservice-managedclusters-metrics
- AKSControlPlane table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/akscontrolplane
- AKS pricing tiers documentation: https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers

## Issues Found
- The post described all Kubernetes reads as direct etcd reads. Updated the wording to explain that requests go through the API server storage layer, which is backed by etcd.
- The health check example used `/healthz`, which Kubernetes marks as deprecated since v1.16. Replaced it with `/livez` and kept `/readyz`.
- The KQL examples only worked for Azure diagnostics mode with `AzureDiagnostics.log_s`. Updated them to work with both the current resource-specific `AKSControlPlane.Message` table and the older Azure diagnostics mode table.
- The Azure Monitor metrics command used `apiserver_request_duration_seconds`, which is a Prometheus histogram metric and not listed as a standard AKS platform metric. Replaced the platform metric examples with `apiserver_current_inflight_requests` and `etcd_database_usage_percentage`, and clarified that request latency histograms require Prometheus.
- The watch metric example referenced `apiserver_registered_watchers`, which is not a current stable Kubernetes API server metric in the official metrics reference. Replaced it with `apiserver_longrunning_requests{verb="WATCH"}`.
- The completed Job cleanup command claimed to delete Jobs older than one hour but actually selected every succeeded Job. Added a `completionTime` and `fromdateiso8601` filter so the command matches the comment.
- The post stated a 1.5MB individual object limit for Kubernetes objects. Updated the large Secret and ConfigMap section to the documented 1MiB per-object data limits for those resource types.
- The AKS tier section claimed Free tier clusters get a less powerful control plane and that Standard/Premium improves etcd performance. Reworded this to match Microsoft documentation: tiers affect SLA, production suitability, and supported scale targets.
- The event cleanup CronJob was incomplete because it assumed a service account with cluster-wide event deletion permissions and an image with `jq`. Replaced it with the documented Kubernetes event TTL behavior and an observation command.
- The stale ReplicaSet cleanup comment claimed it would keep the two most recent ReplicaSets, but the command deleted all scaled-down ReplicaSets. Updated the comment to reflect the command and warn about rollback history.

## Review Notes
The post remains a useful AKS troubleshooting guide after the corrections. Some diagnostic examples depend on cluster monitoring configuration, especially managed Prometheus and diagnostic log destination mode, so readers should confirm their AKS monitoring setup before running the queries.
