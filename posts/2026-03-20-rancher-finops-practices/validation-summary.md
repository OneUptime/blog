# Validation Summary: How to Configure FinOps Practices with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- FinOps
- OpenCost
- Kubewarden
- Prometheus
- Grafana
- Bash
- Python

## Sources Consulted
- FinOps Foundation phases: https://www.finops.org/framework/phases/
- Kubewarden tracing quickstart: https://docs.kubewarden.io/howtos/telemetry/tracing-qs
- Kubewarden 1.26 release notes: https://www.kubewarden.io/blog/2025/06/kubewarden-1.26-release
- OpenCost API reference: https://opencost.io/docs/integrations/api/
- OpenCost API examples: https://opencost.io/docs/integrations/api-examples/
- OpenCost installation and access docs: https://opencost.io/docs/installation/install
- OpenCost metrics reference: https://opencost.io/docs/integrations/metrics/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Service Accounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes system metrics: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics
- Kubernetes metrics reference: https://v1-34.docs.kubernetes.io/docs/reference/instrumentation/metrics/
- GKE Spot VMs: https://cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- AKS Spot node pools: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Rancher persistent Grafana dashboards: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/reference/dashboard/

## Issues Found
- The Kubewarden example referenced `registry://ghcr.io/kubewarden/policies/require-labels:v0.2.0`, which did not line up with Kubewarden’s documented label-validation policy examples. I changed it to the documented `safe-labels` policy and kept the `mandatory_labels` configuration.
- The OpenCost examples used port `9090` for API calls, even though OpenCost documents `9003` as the API port and `9090` as the UI port. I changed all API examples to use `9003`.
- The OpenCost scripts used `accumulate=true` on allocation queries, which is not part of the documented allocation API query model. I removed that parameter.
- The monthly review script used `window=${MONTH}` with values like `2026-03`, which is not a documented OpenCost window format. I changed it to `window=lastmonth` while keeping the formatted month string only for display.
- The real-time cost dashboard command piped pretty-printed JSON into `sort`, which would not reliably sort the result set. I moved the sorting into `jq` so the command actually returns sorted output.
- The Python aggregation example imported `json` unnecessarily and used the wrong OpenCost port. I removed the unused import, fixed the port, and added a request timeout.
- The “find oversized workloads” shell script did not actually identify underutilized workloads; it only printed current usage and the first container’s request. I changed it to sum CPU requests across all containers and filter for pods below 20% of requested CPU.
- The spot/preemptible scheduling Deployment was incomplete for `apps/v1` because it omitted the required selector, pod template labels, and container definition. I added the required fields and aligned the GKE and AKS spot label/taint matching with their documented patterns.
- The “Scale Down Non-Production Clusters at Night” section only scaled namespace workloads, not clusters. I corrected the heading and description to “workloads” and added `serviceAccountName` because Kubernetes default service accounts do not have the required RBAC permissions by default.
- The PrometheusRule used nonexistent OpenCost metrics (`opencost_container_cpu_cost_hourly` and `opencost_container_memory_cost_hourly`). I replaced the expression with one built from documented OpenCost-generated metrics.
- The Grafana dashboard ConfigMap used `cattle-monitoring-system`, but Rancher documents `cattle-dashboards` as the default namespace watched for `grafana_dashboard` ConfigMaps. I changed the namespace accordingly.
- The Grafana dashboard JSON was only a minimal stub and would not be a valid usable dashboard model. I replaced it with a valid Grafana JSON model containing concrete panels and queries.

## Review Notes
- The CronJob example now correctly references a dedicated service account, but the post still assumes the reader will create the corresponding RBAC permissions separately.
- The dashboard example uses Kubernetes and OpenCost metrics that must already be scraped into Prometheus; clusters with different scrape setups may need query adjustments.
- The GKE and AKS spot scheduling example is intentionally multi-cloud. In a single-provider cluster, keeping only the provider-specific toleration and node affinity pair would be cleaner.
