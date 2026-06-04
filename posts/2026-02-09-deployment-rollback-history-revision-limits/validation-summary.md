# Validation Summary: How to Configure Deployment Rollback History and Revision Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes ReplicaSets
- kubectl rollout commands
- Kubernetes Python client
- Kubernetes RBAC
- Kubernetes CronJobs
- jq

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- Kubernetes apps/v1 Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post stated that every Deployment update creates a new ReplicaSet. Kubernetes only creates a new rollout revision when the Deployment Pod template changes, so the wording was corrected.
- The change-cause example used the deprecated `--record=true` flag. It was replaced with the current annotation-based approach using `kubectl annotate --overwrite` before the image update.
- The rollback shell script documented an optional namespace but parsed arguments as if the namespace were always supplied. Argument handling was corrected so a deployment-only invocation defaults to the `default` namespace.
- The Python rollback example patched `spec.rollbackTo`, which was removed from `apps/v1` Deployments. It now finds the target revision's ReplicaSet via owner references and patches the Deployment Pod template from that ReplicaSet.
- The Python health check did not account for `.spec.replicas` being omitted. It now treats an omitted replica count as Kubernetes' default of 1.
- The ReplicaSet cleanup CronJob selected ReplicaSets by an `app=<deployment-name>` label, which is not guaranteed, and its `tail` usage would delete newer excess ReplicaSets instead of the oldest ones. It now filters ReplicaSets by Deployment owner UID and deletes only the oldest inactive ReplicaSets beyond the configured limit.
- The paused Deployment example included a nonessential `deployment.kubernetes.io/paused` annotation. It was removed in favor of the supported `.spec.paused` field.

## Review Notes
Kubernetes already garbage-collects old ReplicaSets according to `.spec.revisionHistoryLimit` after a Deployment reaches a complete state, so manual cleanup should be used cautiously. The cleanup examples also assume `jq` is available in the execution environment.
