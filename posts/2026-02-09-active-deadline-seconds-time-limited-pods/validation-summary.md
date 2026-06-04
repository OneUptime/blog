# Validation Summary: How to Configure activeDeadlineSeconds for Time-Limited Pod Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes Jobs
- Kubernetes CronJobs
- kubectl
- Kubernetes Python client
- YAML manifests
- Linux container termination signals

## Sources Consulted
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The post described the pod `activeDeadlineSeconds` timer as starting when the pod is scheduled to a node. Kubernetes defines the field relative to the pod's `status.startTime`, which is set when the kubelet acknowledges the pod and before image pulls. Updated the wording to match the API definition while preserving the point that startup time counts toward the deadline.
- The CronJob best practice said to set the deadline shorter than the schedule interval to prevent overlapping executions. Kubernetes controls CronJob overlap with `.spec.concurrencyPolicy`; `activeDeadlineSeconds` only bounds how long each Job can run. Updated the guidance to recommend `concurrencyPolicy: Forbid` or `Replace` and added `concurrencyPolicy: Forbid` to the CronJob example.

## Review Notes
The YAML examples use current Kubernetes API versions (`v1` for Pod and `batch/v1` for Job/CronJob), and the `activeDeadlineSeconds`, `terminationGracePeriodSeconds`, `startingDeadlineSeconds`, and `restartPolicy` fields are valid in the shown locations. `kubectl` was not installed in the local environment, so CLI syntax was checked against Kubernetes documentation rather than local `kubectl --help` output.
