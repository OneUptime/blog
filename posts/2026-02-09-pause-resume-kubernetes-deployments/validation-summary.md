# Validation Summary: How to Pause and Resume Kubernetes Deployments for Multi-Step Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- kubectl rollout pause/resume/status/history
- kubectl set image/env/resources
- kubectl patch and annotate
- Prometheus alerting with kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Update a Deployment Without Downtime - https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference: Deployment v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes kubectl reference: rollout pause - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_pause/
- Kubernetes kubectl reference: rollout resume - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_resume/
- Kubernetes kubectl reference: set resources - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes kubectl reference: set env - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes kubectl reference: patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl reference: annotate - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- kube-state-metrics Deployment metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md

## Issues Found
- The post described a paused/resumed Deployment update as a "single atomic operation." Kubernetes applies the changes in a single rollout, but a rolling update is not atomic because pods are replaced gradually according to the Deployment strategy. Changed the wording to "single rollout" and "through one rollout."
- The Prometheus alert used `kube_deployment_status_condition_last_transition_time`, which is not listed in the current kube-state-metrics Deployment metrics. Replaced the expression with `kube_deployment_spec_paused == 1` and used Prometheus' `for: 1h` to detect a deployment that remains paused for more than an hour.
- The `kubectl annotate` examples would fail if the annotation already existed, because `kubectl annotate` requires `--overwrite` to update an existing annotation. Added `--overwrite` to the examples.

## Review Notes
- `kubectl` is not installed in this workspace, so command validation was performed against current official Kubernetes command reference documentation rather than local `kubectl --help` output.
- The Kubernetes behavior described for pausing, staging multiple PodTemplateSpec changes, resuming, rollout history, and pausing during an in-progress rollout matches the current Kubernetes documentation.
