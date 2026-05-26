# Validation Summary: How to Backup and Restore AWX

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- AWX
- AWX Operator
- Kubernetes
- PostgreSQL backup and restore tools
- Bash
- AWS CLI / S3
- GPG

## Sources Consulted
- AWX Operator backup role documentation: https://github.com/ansible/awx-operator/blob/devel/roles/backup/README.md
- AWX Operator restore role documentation: https://github.com/ansible/awx-operator/blob/devel/roles/restore/README.md
- AWX Operator CRD definitions for AWXBackup and AWXRestore: https://github.com/ansible/awx-operator/tree/devel/config/crd/bases
- AWX Operator admin and secret key documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/admin-user-account-configuration.html
- AWX secret handling documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/secret_handling.html
- AWX projects documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/projects.html
- AWX Operator projects persistence documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/persisting-projects-directory.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/15/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/17/app-pgrestore.html
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The post said projects and playbooks are stored in Git and do not need AWX backup. AWX supports SCM-backed projects and manual projects under the project base path, and the operator can persist `/var/lib/projects`. Updated the statement to say SCM-backed projects do not need AWX backup, while manual or persisted project storage must be backed up separately.
- The manual internal database backup hard-coded `awx-postgres-13-0`. Current AWX Operator deployments can use different PostgreSQL versions and pod names. Replaced the hard-coded pod name with a lookup for the PostgreSQL pod in the AWX namespace.
- The automated backup script labeled the S3 upload as optional but always ran `aws s3 cp` under `set -euo pipefail`. Added an `S3_BUCKET` variable and only upload when it is set.
- The Kubernetes CronJob used `bitnami/postgresql:15`, which supplies PostgreSQL tools but not the full toolchain used by the script, especially `kubectl` and optionally `aws`. Changed the image to a custom backup-tools image with an inline note about required binaries.
- The operator restore section omitted the AWX Operator prerequisite for restoring over an existing deployment: remove the old AWX custom resource and old PostgreSQL PVC while preserving the namespace that holds the backup PVC. Added that warning.
- The manual restore section did not mention that exported namespaced Secret manifests must have `metadata.namespace` updated when restoring into a different namespace. Added a note in the command block.
- The backup test commands applied exported Secret YAML with `-n awx-restore-test`, which does not reliably change the namespace when the manifest already contains `metadata.namespace: awx`. Updated the example to rewrite the namespace before applying the secrets.

## Review Notes
Local `kubectl`, `pg_dump`, and `pg_restore` binaries were not installed in the review environment, so CLI verification was performed against official Kubernetes and PostgreSQL documentation instead of local help output.
