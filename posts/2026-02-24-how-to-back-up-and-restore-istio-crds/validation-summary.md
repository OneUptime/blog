# Validation Summary: How to Back Up and Restore Istio CRDs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio CRDs and custom resources
- Kubernetes kubectl
- YAML backup and restore workflows
- Velero backups and restores
- Argo CD GitOps Application manifests

## Sources Consulted
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio configuration API references for networking, security, telemetry, and proxy extension resources: https://istio.io/latest/docs/reference/config/
- Velero resource filtering documentation: https://velero.io/docs/v1.17/resource-filtering/
- Velero backup reference and schedule documentation: https://velero.io/docs/v1.17/backup-reference/
- Velero AWS plugin setup and compatibility documentation: https://github.com/velero-io/velero-plugin-for-aws
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/

## Issues Found
- The first CRD export command used `grep -A1000 "istio.io"` against a YAML dump, which could miss CRDs, include unrelated CRDs, or produce an invalid partial backup. Replaced it with a CRD-name based loop that selects CRDs whose names end in `.istio.io`.
- The CRD backup loops used a broad `grep istio`; changed them to `grep '\.istio\.io$'` and quoted variables to target Istio CRDs more precisely.
- The complete backup script described the secrets export as "non-sensitive metadata only", but `kubectl get secrets -o yaml` exports secret data as well. Updated the message so it no longer misstates what is being backed up.
- The restore commands omitted `workloadentries`, `workloadgroups`, and `wasmplugins`, even though the backup script captured them. Replaced the individual apply commands with an ordered loop that includes all backed-up Istio resource types.
- The restore commands attempted to apply fixed file paths that may not exist when a resource type has zero instances. Added a file existence check before each `kubectl apply`.
- The verification loop used short names and omitted several backed-up resource types. Updated it to verify the full set of resource types captured by the script.
- The Velero AWS install command omitted the required AWS provider plugin and region configuration. Updated it to include the compatible AWS plugin and backup/snapshot location region settings.

## Review Notes
The examples are generally version-neutral, but Istio CRD sets evolve over time. For future updates, consider deriving the backed-up Istio resource types from `kubectl api-resources` so newly added Istio CRDs are included automatically.
