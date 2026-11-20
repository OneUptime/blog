# Validation Summary: How to Persist Knative ConfigMap Changes When the Operator Keeps Reverting Them

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands and Knative Operator configuration examples.

## Technologies Covered
- Knative Operator and the KnativeServing custom resource
- Knative Serving, autoscaling, Revisions, deployment configuration, and feature flags
- Kubernetes ConfigMaps, reconciliation, kubectl, and JSONPath
- JSON Merge Patch and GitOps configuration ownership

## Sources Consulted
- Knative Operator configuration: https://knative.dev/docs/install/operator/configuring-with-operator/
- Knative deployment configuration: https://knative.dev/docs/serving/configuration/deployment/
- Knative feature flags: https://knative.dev/docs/serving/configuration/feature-flags/
- Knative autoscaling windows: https://knative.dev/docs/serving/autoscaling/kpa-specific/
- Knative Revision behavior: https://knative.dev/docs/serving/revisions/
- Knative deployment configuration implementation: https://raw.githubusercontent.com/knative/serving/main/pkg/deployment/config.go
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- RFC 7396, JSON Merge Patch: https://www.rfc-editor.org/rfc/rfc7396.txt
- Argo CD automated synchronization and self-healing: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/

## Issues Found
- Qualified “An existing Revision is immutable” as “An existing Revision is generally immutable.” Knative documents exceptions involving mutable referenced ConfigMaps and Secrets and changes to Revision defaults. This minimal correction preserves the post's advice to verify activation for each setting.

## Review Notes
- Confirmed that the Operator propagates spec.config entries to config-prefixed system ConfigMaps and overwrites manual changes. The autoscaler, deployment, and features mappings are correct.
- The operator.knative.dev/v1beta1 API matches the Operator configuration documentation. No deprecated API usage was identified in the post.
- The stable-window value of 90s falls within the documented 6s to 1h range. The progress-deadline key accepts a duration, making 12m valid. Deployment configuration also includes the queue-sidecar image.
- Reviewed namespace and resource selection, all-namespace listing, YAML output, merge-patch flags, shell quoting, and JSONPath field selection. The merge patch updates the specified nested key while preserving unrelated map entries; it correctly avoids strategic merge patch, which is unsupported for custom resources.
- ConfigMap data values are strings. Feature flags use textual states such as enabled, allowed, and disabled rather than Kubernetes boolean values.
- The distinction between accepted API writes, reconciled ConfigMaps, and effective workload behavior is appropriate. Creating a new Revision is setting-dependent; the post does not claim that every change requires one. Per-Revision autoscaling annotations can override global defaults when testing behavior.
- GitOps can restore its declared configuration during synchronization. Automatic drift correction depends on the controller and its settings; the post appropriately says a live patch can be reversed.
- All three technical documentation links in the post resolved to the intended official resources. The author profile link is attribution, not technical evidence.
- Bash examples passed shell syntax checks and the inline patch parsed as JSON. This was a documentation and static review; no live Kubernetes or Knative installation was used to execute reconciliation or workload tests.
