# Validation Summary: How to Restore a Deleted ArgoCD Application

## Status
validated

## Post Type
Tutorial / Recovery guide

## Technologies Covered
- Argo CD Applications
- Argo CD CLI
- Kubernetes custom resources and CronJobs
- Git
- Velero
- External Secrets Operator
- Sealed Secrets
- yq

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_set/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Velero resource filtering documentation: https://velero.io/docs/main/resource-filtering/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- Sealed Secrets project documentation: https://github.com/bitnami-labs/sealed-secrets
- yq select operator documentation: https://mikefarah.gitbook.io/yq/operators/select
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The Git recovery example wrote the recovered Application manifest to `my-app-recovered.yaml` but then told the reader to `git add apps/my-app.yaml`. Updated the recovery commands to restore directly to `apps/my-app.yaml`, apply that file, and clarify that the specific commit must be one where the file still existed.
- The Argo CD backup example used `kubectl get -f argocd-backup.yaml -o json` to extract a deleted Application. `kubectl get -f` queries the cluster for the referenced resources; it does not extract objects from an export file. Replaced it with a `yq select(...)` pipeline over the exported YAML.
- The backup section said Argo CD export includes all Application definitions. Current Argo CD export behavior always includes Applications from the control-plane namespace and includes additional application namespaces only when configured or requested. Clarified the wording.
- The Velero restore example used `--selector metadata.name=my-app`. Velero selectors are Kubernetes label selectors, not field selectors. Updated the example to restore Argo CD Application resources by namespace/resource type, and added a separate label-selector example for environments that label Applications for per-app restore.
- The emergency recovery script used `git show` in a conditional without suppressing stdout, which would print the manifest during detection. Redirected stdout and stderr for the existence check.
- The backup CronJob snippet was marked as `bash` even though it was Kubernetes YAML. Changed the code fence to `yaml`.
- The backup CronJob used a fixed, outdated Argo CD image tag. Updated the example to a current Argo CD 3.4 tag and added a note to match the tag to the installed Argo CD version.
- The backup CronJob ran `argocd admin export` without specifying a service account. Added `serviceAccountName: argocd-backup` so readers know the job needs an explicitly permissioned identity.

## Review Notes
- The recovery flow and Argo CD cascade/non-cascade behavior are technically correct. Argo CD uses the `resources-finalizer.argocd.argoproj.io` finalizer for cascading deletion, and non-cascade deletion leaves managed resources in the cluster.
- Existing-resource adoption after recreating an Application depends on the recreated Application matching the original tracked resources and on the configured Argo CD tracking method. The post's guidance is reasonable for the common same-application-name recovery case.
- The CronJob backup example still assumes the referenced service account, RBAC, and PVC exist. That is acceptable for a short example, but a future post could include complete RBAC and storage manifests.
