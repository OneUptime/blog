# Validation Summary: How to Configure Priority-Based GPU Scheduling for Mixed ML Training

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass and scheduler preemption
- Kubernetes Jobs and CronJobs
- Kubernetes GPU extended resources
- Kubernetes PodDisruptionBudget
- kube-scheduler configuration
- kubectl
- Prometheus Operator PrometheusRule
- kube-state-metrics
- Python signal handling for ML checkpointing
- PyTorch checkpoint save/load APIs

## Sources Consulted
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes GPU scheduling: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes kube-scheduler configuration API v1: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1
- Kubernetes Pod disruptions and PodDisruptionBudget behavior: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API v1: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes Job controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes generated kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Python signal documentation: https://docs.python.org/3/library/signal.html
- PyTorch serialization documentation: https://docs.pytorch.org/docs/stable/notes/serialization.html

## Issues Found
- The Job preemption handling example exited with `sys.exit(0)` after checkpointing, which could let a Job treat an interrupted training run as successful. Changed it to `sys.exit(143)` and updated the explanation so the Job retries rather than marking the work complete.
- The training Job notes said `restartPolicy: OnFailure` restarts the pod if preempted. Kubernetes restarts failed containers in a pod, while the Job controller creates a replacement pod when a pod is deleted. Updated the wording to distinguish those behaviors.
- The kube-scheduler configuration used `plugins.preemption`, which is not a valid scheduler framework extension point. Updated the example to configure `DefaultPreemption` under `postFilter` and added the `DefaultPreemptionArgs` `apiVersion` and `kind`.
- The PodDisruptionBudget section implied PDBs protect inference capacity during all maintenance or autoscaling scenarios. Updated it to clarify that PDBs constrain voluntary disruptions and do not block every termination path, including higher-priority scheduler preemption.
- The CronJob examples used time-of-day schedules without specifying a time zone. Added `spec.timeZone: "Etc/UTC"` to make the schedule interpretation explicit.
- The monitoring alert named `HighPreemptionRate` used `kube_pod_container_status_restarts_total`, which measures container restarts rather than direct scheduler preemptions. Renamed the alert and summary to describe restart rate accurately.
- The test command used `kubectl wait --for=condition=Running`, but `Running` is a pod phase rather than a pod condition. Updated it to the documented JSONPath form: `--for=jsonpath='{.status.phase}'=Running`.

## Review Notes
- The Kubernetes manifests are examples and assume required namespaces, GPU node labels, NVIDIA device plugin setup, PVCs, RBAC permissions, and referenced container scripts/images exist in the target cluster.
- Kubernetes permits specifying GPU resources in both `requests` and `limits` only when the values are equal; the examples follow that rule.
- Local `kubectl` was not installed in the review environment, so CLI behavior was checked against the official generated Kubernetes command reference rather than local `--help` output.
