# Validation Summary: How to Fix GKE Node NotReady Status and Kubelet Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes nodes and kubelet
- kubectl
- gcloud CLI
- Cloud Monitoring
- Kubernetes Pod resource requests and limits
- Kubernetes PodDisruptionBudget

## Sources Consulted
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- GKE troubleshooting documentation for NotReady nodes: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/node-notready
- GKE node auto-repair documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-auto-repair
- Google Cloud SDK reference for `gcloud container node-pools create`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain
- Cloud Monitoring GKE system metrics documentation: https://cloud.google.com/monitoring/api/metrics_kubernetes
- GKE documentation with PromQL examples for `kubernetes.io/node/status_condition`: https://cloud.google.com/kubernetes-engine/docs/how-to/tpus-autopilot
- Cloud Monitoring PromQL alerting policy documentation: https://cloud.google.com/monitoring/promql/create-promql-alerts

## Issues Found
- The post stated that the control plane marks a node NotReady after a default timeout of 40 seconds. Current Kubernetes node status documentation says the `node-monitor-grace-period` default is 50 seconds for the node controller to stop hearing from a node and mark the Ready condition as Unknown. Updated the explanation to avoid over-narrowly equating NotReady with lost communication and to use the current 50-second default.
- The JSONPath command for checking `.status.conditions[*]` was piped to `python3 -m json.tool`, but that JSONPath output is not reliably valid JSON. Replaced it with a JSONPath range that prints each node condition and status on its own line.
- The Cloud Monitoring alerting command used the `status="false"` metric label value and an incomplete `gcloud monitoring policies create` condition for the boolean `kubernetes.io/node/status_condition` metric. Replaced the command with the official PromQL-style metric expression using `status="False"` for nodes whose Ready condition is false.

## Review Notes
The remaining commands and Kubernetes manifests are technically valid for the described troubleshooting workflow. The GKE `kubernetes.io/node/status_condition` system metric is version-dependent, so older clusters might need an alternative metric source such as kube-state-metrics.
