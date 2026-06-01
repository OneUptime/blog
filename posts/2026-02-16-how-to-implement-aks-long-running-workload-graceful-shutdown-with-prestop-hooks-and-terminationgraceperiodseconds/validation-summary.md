# Validation Summary: How to Use AKS Long-Running Workload Graceful Shutdown

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Pods, lifecycle hooks, EndpointSlices, and graceful termination
- `terminationGracePeriodSeconds`
- `preStop` lifecycle hooks
- PodDisruptionBudgets
- Azure Spot Virtual Machines and AKS Spot node pools
- Azure CLI
- Python signal handling
- Go `net/http` graceful shutdown
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes documentation: Pod Lifecycle and Pod Termination Flow - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes API reference: PodDisruptionBudget v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Microsoft Learn: AKS upgrade options and recommendations - https://learn.microsoft.com/en-us/azure/aks/upgrade-options
- Microsoft Learn: Azure CLI `az aks nodepool update` - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest#az-aks-nodepool-update
- Microsoft Learn: Add an Azure Spot node pool to AKS - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: About Azure Spot Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- kube-state-metrics pod metrics reference - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Python documentation: `signal` module - https://docs.python.org/3/library/signal.html
- Go documentation: `net/http.Server.Shutdown` and `os/signal` - https://pkg.go.dev/net/http#Server.Shutdown and https://pkg.go.dev/os/signal

## Issues Found
- The post said pods are removed from Service endpoints before `preStop` and that no new traffic arrives. Kubernetes documents endpoint updates as happening while pod shutdown begins, with terminating endpoints marked not ready rather than always being immediately removed. Updated the termination sequence and explanation to describe EndpointSlice terminating / not-ready behavior more accurately.
- The post implied a very large `terminationGracePeriodSeconds` directly means AKS upgrades wait that long per pod. AKS node drains also have a configurable drain timeout. Updated the wording to note managed upgrade drain timeouts may need to be increased.
- The AKS node pool command discussed drain timeout but only set `--max-surge`. Added `--drain-timeout 60`, which is the Azure CLI flag for node pool drain timeout in minutes.
- The Python example referenced `get_next_job()` without defining it. Added a small sample job list and `get_next_job()` function so the snippet is syntactically and minimally runnable.
- The AKS Spot workload example used only `nodeSelector` plus toleration. Microsoft recommends using a toleration and node affinity for Spot node pools. Added required node affinity matching the Spot node label.
- The monitoring section used `reason="OOMKilled"` as a SIGKILL / graceful-shutdown alert. OOM kills are a different failure mode. Replaced the alert expression with a kube-state-metrics exit-code 137 check that excludes `OOMKilled` containers.

## Review Notes
- The Kubernetes and AKS YAML snippets parse as valid YAML.
- The Python snippet was checked with in-memory Python compilation and is syntactically valid.
- `az` and `kubectl` are not installed in this workspace, so CLI verification used official Microsoft Learn and Kubernetes documentation instead of local `--help` output.
- Go is not installed in this workspace, so the Go example was reviewed against the official Go standard library documentation but not compiled locally.
