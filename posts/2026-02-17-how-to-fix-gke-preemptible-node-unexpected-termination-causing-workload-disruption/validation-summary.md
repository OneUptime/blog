# Validation Summary: Fix GKE Preemptible Node Unexpected Termination Causing Workload Disruption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Deployments, StatefulSets, PodDisruptionBudgets, lifecycle hooks, and topology spread constraints
- Google Cloud preemptible VMs and Spot VMs
- Google Cloud CLI, Cloud Logging, and Cloud Monitoring
- Node.js and Go graceful shutdown handlers

## Sources Consulted
- Google Cloud GKE preemptible VMs documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/preemptible-vms
- Google Cloud GKE Spot VMs documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Google Cloud Compute Engine preemptible VM documentation: https://docs.cloud.google.com/compute/docs/instances/preemptible
- Google Cloud SDK `gcloud container node-pools create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud GKE cluster autoscaler documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- Google Cloud Logging log-based metrics documentation: https://docs.cloud.google.com/logging/docs/logs-based-metrics
- Google Cloud SDK `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK `gcloud alpha monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Kubernetes graceful node shutdown documentation: https://kubernetes.io/docs/concepts/cluster-administration/node-shutdown/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Pod lifecycle and container lifecycle hook documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- GKE Compute Engine Persistent Disk CSI Driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver

## Issues Found
- Corrected the shutdown notice wording. Compute Engine sends a best-effort short shutdown notice; for GKE preemptible nodes, non-system Pods get a best-effort maximum of 15 seconds, not the full 30 seconds.
- Updated application shutdown examples from 25 seconds to 10 seconds so they fit within the corrected GKE preemptible shutdown window when a 5-second `preStop` hook is also used.
- Fixed `terminationGracePeriodSeconds` examples from 25 seconds to 15 seconds for preemptible nodes.
- Clarified that `preStop` runs before SIGTERM but counts against the Pod termination grace period.
- Added required `selector` and template labels to the `apps/v1` Deployment examples.
- Added Spot VM label exclusion to the stable-node affinity example so critical replicas are not accidentally scheduled onto Spot nodes.
- Updated the Spot VM section to mention the current default 15-second regular Pod shutdown period and the supported Preview option to extend Spot VM graceful termination in Standard clusters.
- Replaced the Kubernetes event command using `reason=Preempted`, which refers to scheduler preemption rather than GKE VM preemption, with a command that lists failed Pods from node shutdown scenarios.
- Replaced the Cloud Monitoring alert example that used the unrelated VM uptime metric with a log-based metric for `compute.instances.preempted` events and an alert policy on that metric.
- Fixed the StatefulSet example by adding required `serviceName`, selector, and template labels.
- Changed the GKE storage class from non-standard `standard-rw` to the documented `standard-rwo`.
- Updated the summary guidance from "under 30 seconds" to "within the graceful shutdown window."

## Review Notes
- The Google Cloud CLI and `kubectl` binaries were not installed in the local environment, so command syntax was verified against official Google Cloud and Kubernetes documentation rather than local `--help` output.
- The Go compiler was not installed locally, so the Go snippet was reviewed against standard Go API usage but not compiled.
