# Validation Summary: How to Configure Job Parallelism and Completions for Batch Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes Job parallelism, completions, and Indexed completion mode
- kubectl
- Kubernetes PodDisruptionBudget
- Kubernetes resource requests and CPU quantities
- Redis queue access with Python

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Indexed Job task guide: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes coarse parallel processing work queue guide: https://kubernetes.io/docs/tasks/job/coarse-parallel-processing-work-queue/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes resource management and CPU quantity documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Redis LPOP command documentation: https://redis.io/docs/latest/commands/lpop/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Python sys module documentation: https://docs.python.org/3/library/sys.html

## Issues Found
- The work queue section described setting a high `completions` value as typical for work queue patterns. Kubernetes documentation says true work queue Jobs leave `.spec.completions` unset; fixed the wording to describe the shown manifest as a pod-per-item queue pattern with a known task count, and added the caveat for unknown queue sizes.
- The Python worker exited with status `0` when no queue item was found, which would count as a successful Job completion even though no task was processed. Changed it to `sys.exit(1)`.
- The active-pod monitoring command and PodDisruptionBudget selector used the deprecated unprefixed `job-name` label. Updated both to use `batch.kubernetes.io/job-name`.
- The resource-based parallelism calculation used `kubectl top nodes` and treated CPU output as plain cores. `kubectl top` reports current usage, and Kubernetes CPU quantities often use millicores such as `500m`. Replaced the calculation with one based on node allocatable CPU parsed into millicores.
- The resource calculation claimed it ensured no overcommit. Changed the wording to present it as a capacity-based ceiling and note that existing workload CPU must be subtracted for production use.
- The PodDisruptionBudget section stated that at least 10 pods would keep running during cluster operations. PDBs only constrain voluntary disruptions that respect the Eviction API. Updated the wording to reflect that limitation.

## Review Notes
The remaining Kubernetes Job examples use current `batch/v1` APIs and valid Job fields. Indexed Jobs are stable, and `JOB_COMPLETION_INDEX` is available as described. The dynamic `kubectl patch job ... spec.parallelism` commands are valid for the non-indexed fixed-completion example shown; elastic Indexed Jobs have additional scaling rules when changing both completions and parallelism together.
