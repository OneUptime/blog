# Validation Summary: How to Backup ArgoCD Configuration and State

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Custom Resources, ConfigMaps, and Secrets
- Argo CD CLI
- kubectl
- AWS CLI for Amazon S3
- Google Cloud CLI for Cloud Storage
- Bash
- Python YAML processing

## Sources Consulted
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_export/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Notifications services documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/overview/
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Google Cloud Storage lifecycle management documentation: https://cloud.google.com/storage/docs/managing-lifecycles
- Google Cloud `gcloud storage cp` command reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp

## Issues Found
- The opening explanation implied Argo CD state is always in the `argocd` namespace. Argo CD can be configured to manage Applications and ApplicationSets in additional namespaces, and the current `argocd admin export` command has flags for those namespace globs. Updated the wording to include that caveat.
- The Google Cloud Storage example used `gsutil lifecycle set` with inline JSON. Current Google Cloud documentation recommends `gcloud storage`, and lifecycle configuration is applied from a JSON file. Updated the example to use `gcloud storage cp`, write a temporary lifecycle JSON file, and apply it with `gcloud storage buckets update --lifecycle-file`.
- The restore cleanup script removed Kubernetes-managed metadata only from top-level YAML documents. Backups created with `kubectl get ... -o yaml` are often `List` objects containing resources under `items`, so nested item metadata would remain. Updated the Python cleanup script to clean both document metadata and `items` entries.

## Review Notes
The local workspace does not have the `argocd` CLI or `shellcheck` installed, so CLI verification was performed against official Argo CD documentation and Bash snippets were checked with `bash -n`. The guide remains version-neutral; future updates may want to mention `--application-namespaces` and `--applicationset-namespaces` explicitly for installations that use multi-namespace Argo CD resources.
