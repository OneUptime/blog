# Validation Summary: How to Roll Back Deployments to a Specific Revision Using kubectl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- kubectl rollout commands
- Kubernetes ReplicaSets and revision history
- Kubernetes Events
- Prometheus alerting rules
- GitLab CI/CD environments

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl rollout command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes field selectors documentation: https://v1-32.docs.kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.55/configuration/alerting_rules/
- GitLab CI/CD environments documentation: https://docs.gitlab.com/ci/environments/

## Issues Found
- Corrected the claim that every Deployment update creates a new revision. Kubernetes creates a new revision only when the Deployment pod template changes; scaling and other non-template changes do not create revisions.
- Added a retained-history caveat to rollback wording because old revisions can be garbage-collected based on `.spec.revisionHistoryLimit`.
- Replaced deprecated `kubectl --record` examples with non-deprecated `kubernetes.io/change-cause` annotation workflows.
- Corrected the sample rollout history after rolling back to revision 2. The new revision is a copy of the older pod template and carries the older change cause, rather than automatically showing "Rolled back to revision 2" in the `CHANGE-CAUSE` column.
- Clarified that `revisionHistoryLimit: 0` removes old ReplicaSets after rollout completion, preventing undo of that rollout, rather than disabling all rollback behavior immediately.
- Replaced the Prometheus generation-mismatch alert example. `kube_deployment_status_observed_generation != kube_deployment_metadata_generation` indicates that the controller has not observed the latest Deployment generation; it does not specifically mean a rollback happened. The post now uses rollback Events as the signal and notes that metric names depend on the event exporter.

## Review Notes
- `kubectl` was not installed in the workspace, so command verification was performed against current official Kubernetes documentation instead of local `kubectl --help`.
- The script examples assume Pods are selectable with `app=<deployment-name>`, which matches the article's `api-server` examples but may need adjustment in clusters that use different labels.
