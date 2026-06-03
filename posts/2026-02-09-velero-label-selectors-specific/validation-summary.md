# Validation Summary: How to Use Velero Label Selectors to Backup Specific Resources Only

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Velero
- Kubernetes labels and label selectors
- Kubernetes manifests and CRDs
- kubectl
- PrometheusRule / kube-state-metrics
- Bash

## Sources Consulted
- Velero Resource Filtering documentation: https://velero.io/docs/main/resource-filtering/
- Velero Backup API Type documentation: https://velero.io/docs/main/api-types/backup/
- Velero Schedule API Type documentation: https://velero.io/docs/main/api-types/schedule/
- Velero Backup Reference documentation: https://velero.io/docs/main/backup-reference/
- Velero Output File Format documentation: https://velero.io/docs/v1.13/output-file-format/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The Deployment example only put `backup`, `backup-frequency`, and `environment` labels on the Deployment object, not the Pod template. Added those labels to `spec.template.metadata.labels` so selectors using those labels can match created Pods and related workload resources where applicable.
- The set-based `NotIn` explanation said development and test tiers were excluded. Kubernetes `NotIn` selectors also match objects missing the key, so the wording now says it excludes resources labeled with those tier values.
- Several Velero Schedule examples used `spec.template.labels`, which is not the documented field for labels applied to Backup objects created by a Schedule. Changed these to `spec.template.metadata.labels`.
- The stateful backup example described `defaultVolumesToFsBackup: false` as a longer timeout. Replaced it with `csiSnapshotTimeout: 30m`, which is the relevant Velero Backup spec field for CSI snapshot readiness timeout.
- The monitoring and verification examples implied `kubectl get all` previews or counts every resource Velero may back up. Adjusted comments and notes to clarify that it only checks common workload resources and that other resource types should be included when relevant.
- The backup download inspection commands used `test-label-selector.tar.gz`, but Velero's default download filename is `<backup-name>-data.tar.gz`. Updated the commands to use `test-label-selector-data.tar.gz`.

## Review Notes
The post is technically relevant and valid after the corrections. Some examples remain intentionally generic and assume the Velero server has the relevant snapshot provider, storage locations, and node-agent/file-system backup configuration installed.
