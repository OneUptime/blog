# Validation Summary: How to Configure Velero Backup Include and Exclude Resource Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero Backup and Schedule custom resources
- Kubernetes labels and label selectors
- Kubernetes ConfigMaps

## Sources Consulted
- Velero v1.18 Resource filtering: https://velero.io/docs/v1.18/resource-filtering/
- Velero v1.18 Backup API type: https://velero.io/docs/v1.18/api-types/backup/
- Velero v1.17 Resource filtering: https://velero.io/docs/v1.17/resource-filtering/
- Velero backup create command source: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/cli/backup/create.go
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The post described resource-specific exclusion as an annotation using `backup.velero.io/backup-exclude`. Velero documents exclusion with the `velero.io/exclude-from-backup=true` label. Updated the heading, explanation, and YAML example to use the correct label.
- The resource policy example used an unsupported schema with arbitrary status expressions such as `status.succeeded >= 1`. Current Velero resource policies use `includeExcludePolicy` and `volumePolicies`. Replaced the example with a valid resource policy ConfigMap.
- The backup command used `--resource-policy-configmap`, but Velero documents the flag as `--resource-policies-configmap`. Updated the command.
- The temporary-resource example used `*.events.k8s.io` in `--exclude-resources`, but Velero states wildcard excludes are ignored. Replaced it with the fully qualified `events.events.k8s.io` resource.
- The optimized backup example said excluding `pods` excludes pod logs. Velero backs up Kubernetes pod objects, not runtime pod log streams. Updated the comment to say pod objects can be recreated by workload controllers.
- The validation example used `--dry-run -o yaml` with `velero backup create`. The backup-create command supports `-o yaml` to print the Backup object without submitting it, so the example was updated to remove `--dry-run`.
- The resource-count check used `velero backup describe validation-backup | grep "Resource List:"`, but the resource list is shown with detailed output. Updated the command to use `--details`.
- The filter precedence section referred to resource-specific annotations and overstated generic exclusion precedence. Updated it to refer to exclusion labels and Velero's documented ordering between include/exclude filters and volume policies.

## Review Notes
The remaining commands and CRD fields match Velero's documented include namespace, exclude namespace, include resource, exclude resource, label selector, Backup, and Schedule APIs. The examples are version-neutral for current Velero v1.18 behavior, with the caveat that resource policy support and exact policy validation may vary across older Velero releases.
